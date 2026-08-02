import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import * as z from 'zod';
import { parseError } from './lib/error';

const app = new Hono<{ Bindings: CloudflareBindings }>()
	.use(cors())
	.get(
		'/api/questions/:session_id',
		zValidator('param', z.object({ session_id: z.string() })),
		zValidator('query', z.object({ shown: z.enum(['true', 'false', 'all']) })),
		async (c) => {
			const { session_id } = c.req.valid('param');
			const { shown } = c.req.valid('query');
			const { results } = await c.env.Database.prepare(
				`SELECT questions.*, likes.user_name
				 FROM questions
				 LEFT JOIN likes ON questions.id = likes.question_id AND questions.session_id = likes.session_id
				 WHERE questions.session_id = ? ${shown !== 'all' ? `AND shown = ${shown === 'true' ? 1 : 0}` : ''}
				 ORDER BY id`
			)
				.bind(session_id)
				.run<{
					id: number;
					question: string;
					answer: string;
					comment: string;
					shown: boolean;
					shown_at: string;
					user_name: string | null;
				}>();

			const grouped = results.reduce<
				{
					id: number;
					question: string;
					answer: string;
					comment: string;
					shown: boolean;
					shownAt: string;
					likedBy: string[];
				}[]
			>((acc, { id, question, answer, comment, shown, shown_at, user_name }) => {
				const q = acc.find((q) => q.id === id);

				if (q) {
					q.likedBy.push(user_name!);
				} else {
					acc.push({
						id,
						question,
						answer,
						comment,
						shown,
						shownAt: shown_at,
						likedBy: user_name != null ? [user_name] : []
					});
				}

				return acc;
			}, []);

			grouped.sort((a, b) => (a.shownAt ?? '').localeCompare(b.shownAt ?? '') || a.id - b.id);

			return c.json(grouped);
		}
	)
	.put(
		'/api/questions',
		zValidator(
			'json',
			z.object({
				sessionID: z.string(),
				questions: z.array(
					z.object({
						id: z.number(),
						question: z.string(),
						answer: z.string(),
						comment: z.string()
					})
				)
			})
		),
		async (c) => {
			try {
				const { sessionID, questions } = c.req.valid('json');

				await c.env.Database.prepare('DELETE FROM questions WHERE session_id = ?')
					.bind(sessionID)
					.run();

				let totalChanges = 0;

				while (questions.length > 0) {
					const chunk = questions.splice(0, 10);

					const {
						meta: { changes }
					} = await c.env.Database.prepare(
						`INSERT INTO questions (id, session_id, question, answer, comment)
						 VALUES ${chunk.map(() => '(?, ?, ?, ?, ?)').join(', ')}`
					)
						.bind(
							...chunk.flatMap(({ id, question, answer, comment }) => [
								id,
								sessionID,
								question,
								answer,
								comment
							])
						)
						.run();

					totalChanges += changes;
				}

				return c.json({ success: true, totalChanges });
			} catch (error) {
				return c.json({ success: false, error: parseError(error) }, 400);
			}
		}
	)
	.post(
		'/api/question/show',
		zValidator('json', z.object({ sessionID: z.string(), questionID: z.number() })),
		async (c) => {
			try {
				const { sessionID, questionID } = c.req.valid('json');
				await c.env.Database.prepare(
					`UPDATE questions
					 SET shown = TRUE, shown_at = CURRENT_TIMESTAMP
					 WHERE id = ? AND session_id = ?`
				)
					.bind(questionID, sessionID)
					.run();

				return c.json({ success: true });
			} catch (error) {
				return c.json({ success: false, error: parseError(error) }, 400);
			}
		}
	)
	.get(
		'/api/likes/:session_id',
		zValidator('param', z.object({ session_id: z.string() })),
		async (c) => {
			const { session_id } = c.req.valid('param');
			const { results } = await c.env.Database.prepare(
				`SELECT question_id, COUNT(*) as like_count FROM likes
				 WHERE question_id IN (SELECT id FROM questions WHERE session_id = ?)
				 GROUP BY question_id`
			)
				.bind(session_id)
				.run<{ question_id: number; like_count: number }>();

			return c.json(results);
		}
	)
	.put(
		'/api/like',
		zValidator(
			'json',
			z.object({ questionID: z.number(), sessionID: z.string(), userName: z.string() })
		),
		async (c) => {
			try {
				const { questionID, sessionID, userName } = c.req.valid('json');
				await c.env.Database.prepare(
					'INSERT INTO likes (question_id, session_id, user_name) VALUES (?, ?, ?)'
				)
					.bind(questionID, sessionID, userName)
					.run();

				return c.json({ success: true });
			} catch (error) {
				return c.json({ success: false, error: parseError(error) }, 400);
			}
		}
	);

export default app;
export type AppType = typeof app;

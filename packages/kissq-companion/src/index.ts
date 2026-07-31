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
		async (c) => {
			const { session_id } = c.req.valid('param');
			const { results } = await c.env.Database.prepare(
				`SELECT questions.*, likes.user_name
				 FROM questions
				 LEFT JOIN likes ON questions.id = likes.question_id
				 WHERE session_id = ? AND shown = TRUE
				 ORDER BY id`
			)
				.bind(session_id)
				.run<{ id: number; question: string; answer: string; user_name: string | null }>();

			const grouped = results.reduce<
				{ id: number; question: string; answer: string; likedBy: string[] }[]
			>((acc, { id, question, answer, user_name }) => {
				const q = acc.find((q) => q.id === id);

				if (q) {
					q.likedBy.push(user_name!);
				} else {
					acc.push({ id, question, answer, likedBy: user_name != null ? [user_name] : [] });
				}

				return acc;
			}, []);

			return c.json(grouped);
		}
	)
	.put(
		'/api/questions',
		zValidator(
			'json',
			z.object({
				sessionID: z.string(),
				questions: z.array(z.object({ id: z.number(), question: z.string(), answer: z.string() }))
			})
		),
		async (c) => {
			try {
				const { sessionID, questions } = c.req.valid('json');

				await c.env.Database.prepare('DELETE FROM questions WHERE session_id = ?')
					.bind(sessionID)
					.run();

				const {
					meta: { changes }
				} = await c.env.Database.prepare(
					`INSERT INTO questions (id, session_id, question, answer)
					 VALUES ${questions.map(() => '(?, ?, ?, ?)').join(', ')}`
				)
					.bind(
						...questions.flatMap(({ id, question, answer }) => [id, sessionID, question, answer])
					)
					.run();

				return c.json({ success: true, changes });
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
					'UPDATE questions SET shown = TRUE WHERE id = ? AND session_id = ?'
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
		zValidator('json', z.object({ questionID: z.number(), userName: z.string() })),
		async (c) => {
			try {
				const { questionID, userName } = c.req.valid('json');
				await c.env.Database.prepare('INSERT INTO likes (question_id, user_name) VALUES (?, ?)')
					.bind(questionID, userName)
					.run();

				return c.json({ success: true });
			} catch (error) {
				return c.json({ success: false, error: parseError(error) }, 400);
			}
		}
	);

export default app;
export type AppType = typeof app;

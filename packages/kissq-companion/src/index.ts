import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import * as z from 'zod';
import { parseError } from './lib/error';

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.get(
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
			.run();

		const grouped = results.reduce<
			{ id: number; question: string; answer: string; likes: string[] }[]
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		>((acc, { id, question, answer, user_name }: Record<string, any>) => {
			const q = acc.find((q) => q.id === id);

			if (q) {
				q.likes.push(user_name);
			} else {
				acc.push({ id, question, answer, likes: user_name != null ? [user_name] : [] });
			}

			return acc;
		}, []);

		return c.json(grouped);
	}
);

app.put(
	'/api/questions',
	zValidator(
		'json',
		z.object({
			sessionID: z.string(),
			questions: z.array(z.object({ question: z.string(), answer: z.string() })),
			truncate: z.boolean()
		})
	),
	async (c) => {
		try {
			const { sessionID, questions, truncate } = c.req.valid('json');

			if (truncate) {
				await c.env.Database.prepare('DELETE FROM questions WHERE session_id = ?')
					.bind(sessionID)
					.run();
			}

			const {
				meta: { changes }
			} = await c.env.Database.prepare(
				`INSERT INTO questions (session_id, question, answer)
				 VALUES ${questions.map(() => '(?, ?, ?)').join(', ')}`
			)
				.bind(...questions.flatMap(({ question, answer }) => [sessionID, question, answer]))
				.run();

			return c.json({ success: true, changes });
		} catch (error) {
			return c.json({ success: false, error: parseError(error) }, 400);
		}
	}
);

app.post(
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
);

app.put(
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

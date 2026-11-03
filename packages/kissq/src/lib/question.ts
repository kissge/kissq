import type { InferResponseType } from 'hono/client';
import { csv2json } from 'json-2-csv';
import type { APIClient } from './api';

export const qZero: CSVQuestion = {
	id: 0,
	question: 'ここに問題が表示されます',
	answer: 'ここに答えが表示されます',
	comment: 'ここにコメントが表示されます',
	slashOffset: undefined as number | undefined
};

export interface CSVQuestion {
	id: number;
	question: string;
	answer: string;
	comment: string;
	slashOffset: number | undefined;
}

export function parseCSV(rawInput: string, googleSheetsMode: boolean): CSVQuestion[] {
	if (googleSheetsMode) {
		return parseGoogleSheetsText(rawInput);
	}

	const tabCount = rawInput.match(/\t/g)?.length ?? 0;
	const commaCount = rawInput.match(/,/g)?.length ?? 0;
	const delimiter = tabCount > commaCount ? '\t' : ',';

	let lines = rawInput
		.trim()
		.split('\n')
		.filter((line) => line.trim() !== '')
		.join('\n');

	return [
		qZero,
		...(
			csv2json(lines, {
				delimiter: { field: delimiter },
				headerFields: ['question', 'answer', 'comment']
			}) as { question: unknown; answer: unknown; comment?: unknown }[]
		).map(({ question, answer, comment }, id) => ({
			id: id + 1,
			question: String(question),
			answer: String(answer),
			comment: String(comment ?? ''),
			slashOffset: undefined
		}))
	];
}

function parseGoogleSheetsText(rawInput: string): CSVQuestion[] {
	const results = [];

	while (rawInput) {
		const line = [];
		let eol = false;
		// 行を読み始める
		for (;;) {
			const chunk = rawInput.match(/^(.*?)(\t|$)/m);

			if (!chunk) {
				break;
			}

			if (chunk[1].startsWith('"')) {
				// ここからダブルクオート処理
				rawInput = rawInput.slice(chunk[0].length);
				let cell = chunk[1].slice(1);
				for (;;) {
					const firstLine = rawInput.match(/^.*$/m)!;
					const cellEnd = firstLine[0].match(/"(\t|$)/m);
					if (cellEnd) {
						cell += '\n' + firstLine[0].slice(0, cellEnd.index!);
						rawInput = rawInput.slice(cellEnd.index! + 1);

						if (cellEnd[1] === '\t') {
							// まだ行は終わっていない
							continue;
						} else {
							// 行が終わった
							line.push(cell);
							eol = true;
							results.push(line);
							rawInput = rawInput.slice(1);
							break;
						}
					} else if (!rawInput) {
						// 全部終わった
						line.push(cell);
						results.push(line);
						eol = true;
						break;
					} else {
						cell += '\n' + firstLine[0];
						rawInput = rawInput.slice(firstLine[0].length + 1);
					}
				}
			} else {
				line.push(chunk[1]);
				rawInput = rawInput.slice(chunk[0].length);

				if (chunk[2] === '\t') {
					// まだ行は終わっていない
					continue;
				} else {
					// 行が終わった
					results.push(line);
					rawInput = rawInput.slice(1);
					eol = true;
					break;
				}
			}

			if (eol) {
				break;
			}
		}
	}

	return [
		qZero,
		...results.map(([question, answer, comment], id) => ({
			id: id + 1,
			question: String(question),
			answer: String(answer),
			comment: String(comment ?? ''),
			slashOffset: undefined
		}))
	];
}

export function parseComment<Q extends { comment: string }>(
	q: Q
): Q & { imageURL: string | undefined } {
	const split = String(q.comment).split(/(?:\n|^)--\n+/);
	return { ...q, comment: split[0].trim(), imageURL: split[1]?.replace(/^img:/, '').trim() };
}

export type CompanionParsedQuestion = InferResponseType<
	APIClient['api']['questions'][':session_id']['$get'],
	200
>[number] & {
	imageURL: string | undefined;
};

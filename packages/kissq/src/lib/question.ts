import type { InferResponseType } from 'hono/client';
import { csv2json } from 'json-2-csv';
import type { APIClient } from './api';

export const qZero: BaseQuestion = {
	id: 0,
	question: 'ここに問題が表示されます',
	answer: 'ここに答えが表示されます',
	comment: 'ここにコメントが表示されます',
	slashOffset: undefined as number | undefined
};

export interface BaseQuestion {
	id: number;
	question: string;
	answer: string;
	comment: string;
	slashOffset: number | undefined;
}

export function parseCSV(
	rawInput: string,
	options: { delimiter: 'comma' | 'tab' | 'auto'; googleSheetsMode: boolean }
): Record<number, string>[] {
	if (options.googleSheetsMode) {
		return parseGoogleSheetsText(rawInput);
	}

	if (options.delimiter === 'auto') {
		const tabCount = rawInput.match(/\t/g)?.length ?? 0;
		const commaCount = rawInput.match(/,/g)?.length ?? 0;
		options.delimiter = tabCount > commaCount ? 'tab' : 'comma';
	}

	return (
		csv2json(rawInput, {
			delimiter: { field: options.delimiter === 'comma' ? ',' : '\t' },
			headerFields: Array.from({ length: 99 }, (_, i) => String(i))
		}) as Record<number, unknown>[]
	).map((row) =>
		Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value ? String(value) : '']))
	);
}

function parseGoogleSheetsText(rawInput: string): Record<number, string>[] {
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

	return results.map((row) => Object.fromEntries(row.map((cell, i) => [i, cell])));
}

export function parseComment<Q extends { comment: string }>(
	q: Q
): Q & { media: Media | undefined } {
	const [comment, footer] = String(q.comment).split(/(?:\n|^)--\n+/);
	const media = (() => {
		if (!footer || !footer.match(/.+?:.+/)) {
			return undefined;
		}

		const [type, locator] = footer.match(/(.+?):(.+)/)!.slice(1) as [Media['type'], string];

		return type === 'img' ? { type, url: locator } : { type, videoID: parseYouTubeURL(locator) };
	})();

	return { ...q, comment: comment.trim(), media };
}

function parseYouTubeURL(url: string): string {
	const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
	if (!match) {
		throw new Error(`Invalid YouTube URL: ${url}`);
	}
	return match[1];
}

export type Media =
	| {
			type: 'img';
			url: string;
	  }
	| {
			type: 'youtube';
			videoID: string;
	  };
type APIQuestion = InferResponseType<
	APIClient['api']['questions'][':session_id']['$get'],
	200
>[number];
export interface CompanionParsedQuestion extends APIQuestion {
	media: Media | undefined;
}

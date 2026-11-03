import { csv2json } from 'json-2-csv';

export const qZero = {
	id: 0,
	question: 'ここに問題が表示されます',
	answer: 'ここに答えが表示されます',
	comment: 'ここにコメントが表示されます',
	slashOffset: undefined as number | undefined
};

export function parseCSV(
	rawInput: string,
	googleSheetsMode: boolean
): {
	id: number;
	question: string;
	answer: string;
	comment: string;
	slashOffset: number | undefined;
}[] {
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

function parseGoogleSheetsText(rawInput: string): {
	id: number;
	question: string;
	answer: string;
	comment: string;
	slashOffset: number | undefined;
}[] {
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

	return results.map(([question, answer, comment], id) => ({
		id: id + 1,
		question: String(question),
		answer: String(answer),
		comment: String(comment ?? ''),
		slashOffset: undefined
	}));
}

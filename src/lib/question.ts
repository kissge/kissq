import { csv2json } from 'json-2-csv';

export const qZero = {
	id: 0,
	question: 'ここに問題が表示されます',
	answer: 'ここに答えが表示されます',
	comment: 'ここにコメントが表示されます'
};

export function parseCSV(
	rawInput: string
): { id: number; question: string; answer: string; comment: string }[] {
	const tabCount = rawInput.match(/\t/g)?.length ?? 0;
	const commaCount = rawInput.match(/,/g)?.length ?? 0;
	const delimiter = tabCount > commaCount ? '\t' : ',';

	let lines = rawInput
		.trim()
		.split('\n')
		.filter((line) => line.trim() !== '')
		.join('\n');

	if (delimiter === '\t') {
		// Remedy for Google Sheets' broken TSV
		lines = lines
			.split('\n')
			.map((line) =>
				line
					.split('\t')
					.map((field) => {
						if (field.startsWith('"') && field.endsWith('"')) {
							return field;
						}

						return '"' + field.replace(/"/g, '""') + '"';
					})
					.join('\t')
			)
			.join('\n');
	}

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
			comment: String(comment ?? '')
		}))
	];
}

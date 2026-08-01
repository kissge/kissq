import { csv2json } from 'json-2-csv';

export const qZero = {
	id: 0,
	question: 'ここに問題が表示されます',
	answer: 'ここに答えが表示されます'
};

export function parseCSV(rawInput: string): { id: number; question: string; answer: string }[] {
	const tabCount = rawInput.match(/\t/g)?.length ?? 0;
	const commaCount = rawInput.match(/,/g)?.length ?? 0;
	const delimiter = tabCount > commaCount ? '\t' : ',';

	const lines = rawInput
		.trim()
		.split('\n')
		.filter((line) => line.trim() !== '')
		.join('\n');

	return [
		qZero,
		...(
			csv2json(lines, {
				delimiter: { field: delimiter },
				headerFields: ['question', 'answer']
			}) as { question: unknown; answer: unknown }[]
		).map(({ question, answer }, id) => ({
			id: id + 1,
			question: String(question),
			answer: String(answer)
		}))
	];
}

export function arrayCompare(a: number[], b: number[]): number {
	for (let i = 0; i < Math.max(a.length, b.length); ++i) {
		if (a[i] === b[i]) {
			continue;
		} else {
			return (a[i] ?? 0) - (b[i] ?? 0);
		}
	}

	return 0;
}

export function collapseArray<T extends string | number>(array: T[]): Record<T, number> {
	const result = {} as Record<T, number>;

	for (const item of array) {
		if (result[item] === undefined) {
			result[item] = 1;
		} else {
			result[item]++;
		}
	}

	return result;
}

const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

export function splitQuestion(
	question: string
): { c: string | undefined; next: string; dimmed: boolean }[] {
	const full = [...segmenter.segment(question)].map(({ segment }) => segment);
	let offset = 0;

	return question.split(/(（.+?）|\(.+?\)|【.+?】|［.+?］)/).flatMap((part, i) =>
		[...segmenter.segment(part)].map(({ segment: c }) => ({
			c,
			next: full[++offset],
			dimmed: i % 2 === 1
		}))
	);
}

export function getGroupSymbol(groupID: number): string {
	return String.fromCodePoint(groupID + 65);
}

/** 値は変えずに `T | undefined` 型にキャストして返す */
export function maybeUndefined<T>(value: T): T | undefined {
	return value;
}

/** 任意のスコアづけでのランキング（AttendantIDなど -> 順位（同率あり）） */
export function getRankingOf<T>(array: T[], scorer: (item: T) => number[]): number[] {
	const ranking = array
		.map((_, i) => i)
		.sort((ai, bi) => arrayCompare(scorer(array[bi]), scorer(array[ai])));

	const ranks: number[] = [];
	ranking.forEach((ai, rank) => {
		const me = array[ai];
		const previous = array[ranking[rank - 1]];
		if (rank === 0 || arrayCompare(scorer(me), scorer(previous)) !== 0) {
			ranks[ai] = rank + 1;
		} else {
			ranks[ai] = ranks[ranking[rank - 1]];
		}
	});

	return ranks;
}

export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & { [P in K]: T[P] | undefined };
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

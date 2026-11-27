import type { BrandedArray } from './types';

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
	question: string,
	slashOffset?: number
): {
	c: string;
	next: string | undefined;
	kind: 'normal' | 'dimmed' | 'proper';
	slash: 'before' | 'on' | 'after' | undefined;
}[] {
	return question
		.split(/(『.+?』)/)
		.flatMap<{ c: string; kind: 'normal' | 'dimmed' | 'proper' }>((part, i) =>
			i % 2 === 0
				? // 『』の外
					part.split(/(（.+?）|\(.+?\)|［.+?］|【.+?】)/).flatMap((subpart, j) =>
						[...segmenter.segment(subpart)].map(({ segment: c }) => ({
							c,
							kind: j % 2 === 0 ? 'normal' : 'dimmed'
						}))
					)
				: // 『』の中 → 隅付き括弧は無視する
					part.split(/(（.+?）|\(.+?\)|［.+?］)/).flatMap((subpart, j) =>
						[...segmenter.segment(subpart)].map(({ segment: c }) => ({
							c,
							kind: j % 2 === 0 ? 'proper' : 'dimmed'
						}))
					)
		)
		.map((el, i, arr) => ({
			...el,
			next: arr[i + 1]?.c,
			slash:
				slashOffset == undefined
					? undefined
					: i === slashOffset
						? 'on'
						: i > slashOffset
							? 'after'
							: 'before'
		}));
}

export function getGroupSymbol(groupID: number): string {
	return String.fromCodePoint(groupID + 65);
}

/** 値は変えずに `T | undefined` 型にキャストして返す */
export function maybeUndefined<T>(value: T): T | undefined {
	return value;
}

/** 任意のスコアづけでのランキング（AttendantIDなど -> 順位（同率あり）） */
export function getRankingOf<T, _Index extends number>(
	array: T[],
	scorer: (item: T) => number[]
): number[];
export function getRankingOf<T, Index extends number>(
	array: BrandedArray<T, Index>,
	scorer: (item: T) => number[]
): BrandedArray<number, Index>;
export function getRankingOf<T, Index extends number>(
	array: T[] | BrandedArray<T, Index>,
	scorer: (item: T) => number[]
): number[] | BrandedArray<number, Index> {
	array = array as T[];

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

/** 出現回数をカウントし、多い順に並べる */
export function countAndSort<T extends string | number>(
	array: readonly T[]
): { value: T; count: number; rank: number }[] {
	const counts = array.reduce(
		(acc, item) => {
			acc[item] = (acc[item] ?? 0) + 1;
			return acc;
		},
		{} as Record<T, number>
	);

	const values = Object.entries(counts).map(([value, count]) => ({
		value: value as T,
		count: count as number
	}));

	const ranks = getRankingOf(values, (item) => [item.count]);

	return values.map((item, i) => ({ ...item, rank: ranks[i] })).sort((a, b) => a.rank - b.rank);
}

export function NotAvailable(..._args: unknown[]): never {
	throw new Error('Not available');
}

export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & { [P in K]: T[P] | undefined };
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

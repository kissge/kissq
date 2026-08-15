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

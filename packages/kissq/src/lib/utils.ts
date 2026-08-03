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

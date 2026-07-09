export interface Attendant {
	name: string;
	group: number;
	team: number;
	seat: number;
	trophyCount: number;
	totalScore: { num: number; den: number };
	manualOrder: number;
}

export function loadFromHash(team?: boolean): Attendant[] | null {
	try {
		const url = new URL(document.URL);
		if (url.hash.length > 1) {
			const names = JSON.parse(decodeURIComponent(url.hash.slice(1)));
			if (team) {
				if (
					Array.isArray(names) &&
					names.length > 0 &&
					names.every(
						(team) =>
							Array.isArray(team) &&
							team.length > 0 &&
							team.every((name) => typeof name === 'string')
					)
				) {
					let order = 0;
					return names.flatMap((team, ti) =>
						(team as string[]).flatMap((name, si) => ({
							name,
							group: 0,
							team: ti,
							seat: si,
							trophyCount: 0,
							totalScore: { num: 0, den: 0 },
							manualOrder: order++
						}))
					);
				}
			} else {
				if (Array.isArray(names) && names.length > 0 && names.every((n) => typeof n === 'string')) {
					return names.map((name, manualOrder) => ({
						name,
						group: 0,
						team: 0,
						seat: 0,
						trophyCount: 0,
						totalScore: { num: 0, den: 0 },
						manualOrder
					}));
				}
			}
		}
	} catch {
		/* ignore */
	}

	return null;
}

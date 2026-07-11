export interface Attendant {
	name: string;
	group: number;
	team: number;
	seat: number;
	trophyCount: number;
	totalScore: { num: number; den: number };
	manualOrder: number;
	buttonID?: number;
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
					names.every((team) => Array.isArray(team) && team.length > 0)
				) {
					if (
						names.every(
							(team) => Array.isArray(team) && team.every((name) => typeof name === 'string')
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
					} else if (
						names.every(
							(team) =>
								Array.isArray(team) &&
								team.every(
									(nb) =>
										Array.isArray(nb) &&
										typeof nb[0] === 'string' &&
										(nb[1] == undefined || typeof nb[1] === 'number')
								)
						)
					) {
						let order = 0;
						return names.flatMap((team, ti) =>
							(team as [string, number | undefined][]).flatMap(([name, buttonID], si) => ({
								name,
								group: 0,
								team: ti,
								seat: si,
								trophyCount: 0,
								totalScore: { num: 0, den: 0 },
								manualOrder: order++,
								buttonID
							}))
						);
					}
				}
			} else {
				if (Array.isArray(names) && names.length > 0) {
					if (
						names.every(
							(nb) =>
								Array.isArray(nb) &&
								typeof nb[0] === 'string' &&
								(nb[1] == undefined || typeof nb[1] === 'number')
						)
					) {
						return names.map(([name, buttonID], manualOrder) => ({
							name,
							group: 0,
							team: 0,
							seat: 0,
							trophyCount: 0,
							totalScore: { num: 0, den: 0 },
							manualOrder,
							buttonID
						}));
					} else if (names.every((n) => typeof n === 'string')) {
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
		}
	} catch {
		/* ignore */
	}

	return null;
}

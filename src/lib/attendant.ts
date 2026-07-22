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

export function loadFromHash(
	team?: boolean
): { attendants: Attendant[]; buttonMapping?: Record<number, number> } | null {
	try {
		const url = new URL(document.URL);
		if (url.hash.length > 1) {
			const names = JSON.parse(decodeURIComponent(url.hash.slice(1)));

			if ('attendants' in names) {
				const attendants = names.attendants as Attendant[];
				const buttonMapping = names.buttonMapping as Record<number, number> | undefined;

				if (attendants.every(({ team, seat }) => team === 0 && seat === 0)) {
					const half = Math.ceil(attendants.length / 2);
					attendants.forEach((attendant, index) => {
						attendant.team = Math.floor(index / half);
						attendant.seat = index % half;
					});
				}

				return { attendants, buttonMapping };
			}

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
						return {
							attendants: names.flatMap((team, ti) =>
								(team as string[]).flatMap((name, si) => ({
									name,
									group: 0,
									team: ti,
									seat: si,
									trophyCount: 0,
									totalScore: { num: 0, den: 0 },
									manualOrder: order++
								}))
							)
						};
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
						return {
							attendants: names.flatMap((team, ti) =>
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
							)
						};
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
						return {
							attendants: names.map(([name, buttonID], manualOrder) => ({
								name,
								group: 0,
								team: 0,
								seat: 0,
								trophyCount: 0,
								totalScore: { num: 0, den: 0 },
								manualOrder,
								buttonID
							}))
						};
					} else if (names.every((n) => typeof n === 'string')) {
						return {
							attendants: names.map((name, manualOrder) => ({
								name,
								group: 0,
								team: 0,
								seat: 0,
								trophyCount: 0,
								totalScore: { num: 0, den: 0 },
								manualOrder
							}))
						};
					}
				}
			}
		}
	} catch {
		/* ignore */
	}

	return null;
}

export function han2zen(str: string) {
	// 全ASCII（4文字以上連続をどこかに含む場合は無視）
	return /[!-~]{4}/gi.test(str)
		? str
		: str.replace(/[!-~]+/gi, (s) =>
				[...s].map((c) => String.fromCodePoint(c.charCodeAt(0) + 0xfee0)).join('')
			);
}

export interface Attendant {
	name: string;
	group: number;
	trophyCount: number;
	totalScore: { num: number; den: number };
	manualOrder: number;
}

export interface TeamAttendant extends Attendant {
	team: number;
	seat: number;
}

export function loadFromHash(team: true): TeamAttendant[] | null;
export function loadFromHash(): Attendant[] | null;
export function loadFromHash(team: boolean = false): Attendant[] | null {
	try {
		const url = new URL(document.URL);
		if (url.hash.length > 1) {
			const names = JSON.parse(decodeURIComponent(url.hash.slice(1)));
			if (Array.isArray(names) && names.length > 0 && names.every((n) => typeof n === 'string')) {
				return names.map((name, manualOrder) => ({
					name,
					group: 0,
					...(team ? { team: 0, seat: 0 } : {}),
					trophyCount: 0,
					totalScore: { num: 0, den: 0 },
					manualOrder
				}));
			}
		}
	} catch {
		/* ignore */
	}

	return null;
}

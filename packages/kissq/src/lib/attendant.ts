import { untrack } from 'svelte';
import type { AttendantID, ButtonID } from './types';

export interface Attendant {
	name: string;
	group: number;
	team: number;
	seat: number;
	trophyCount: number;
	totalScore: { maru: number; batsu: number };
	manualOrder: number;
}

export function loadFromHash(
	team?: boolean
): { attendants: Attendant[]; buttonMapping?: Record<AttendantID, ButtonID> } | null {
	try {
		const url = new URL(document.URL);
		if (url.hash.length <= 1) {
			return null;
		}

		const names = JSON.parse(decodeURIComponent(url.hash.slice(1)));

		if (!('attendants' in names)) {
			return null;
		}

		const attendants = names.attendants as Attendant[];
		const buttonMapping = names.buttonMapping as Record<AttendantID, ButtonID> | undefined;

		if (team && attendants.every(({ team, seat }) => team === 0 && seat === 0)) {
			const half = Math.ceil(attendants.length / 2);
			attendants.forEach((attendant, index) => {
				attendant.team = Math.floor(index / half);
				attendant.seat = index % half;
			});
		}

		return { attendants, buttonMapping };
	} catch {
		return null;
	}
}

export function saveToHash(
	attendants: Attendant[] | undefined,
	buttonMapping: Record<AttendantID, ButtonID>
): void {
	if (!attendants) {
		return;
	}
	const data = {
		attendants: attendants.map((att) => ({
			...att,
			totalScore: { maru: 0, batsu: 0 },
			trophyCount: 0
		})),
		buttonMapping
	};
	void data;

	untrack(() => {
		if (data.attendants.every(({ name }) => name === '')) {
			window.history.replaceState(null, '', ' ');
		} else {
			const url = new URL(document.URL);
			url.hash = encodeURIComponent(JSON.stringify(data));
			location.replace(url);
		}
	});
}

export function han2zen(str: string) {
	// 全ASCII（4文字以上連続をどこかに含む場合は無視）
	return /[!-~]{4}/gi.test(str)
		? str
		: str.replace(/[!-~]+/gi, (s) =>
				[...s].map((c) => String.fromCodePoint(c.charCodeAt(0) + 0xfee0)).join('')
			);
}

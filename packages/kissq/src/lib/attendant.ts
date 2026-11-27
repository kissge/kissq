import { untrack } from 'svelte';

import { TeamID, type AttendantID, type BrandedArray, type ButtonID } from './types';

export interface Attendant {
	name: string;
	group: number;
	team: TeamID;
	seat: number;
	trophyCount: number;
	starCount: number;
	totalScore: { maru: number; batsu: number };
	manualOrder: number;
	nickname?: string;
}

export function loadFromHash(team?: boolean): {
	attendants: BrandedArray<Attendant, AttendantID>;
	buttonMapping?: Record<AttendantID, ButtonID>;
} | null {
	try {
		const url = new URL(document.URL);
		if (url.hash.length <= 1) {
			return null;
		}

		const names = JSON.parse(decodeURIComponent(url.hash.slice(1))) as object;

		if (!('attendants' in names) || !('buttonMapping' in names)) {
			return null;
		}

		const attendants = names.attendants as BrandedArray<Attendant, AttendantID>;
		const buttonMapping = names.buttonMapping as Record<AttendantID, ButtonID> | undefined;

		if (team && attendants.every(({ team, seat }) => team === 0 && seat === 0)) {
			const half = Math.ceil(attendants.length / 2);
			attendants.forEach((attendant, index) => {
				attendant.team = TeamID(Math.floor(index / half));
				attendant.seat = index % half;
			});
		}

		return { attendants, buttonMapping };
	} catch {
		return null;
	}
}

export function saveToHash(
	attendants: BrandedArray<Attendant, AttendantID> | undefined,
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

const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

export function han2zen(str: string) {
	// 全ASCII（4文字以上連続をどこかに含む場合は無視）
	return /[!-~]{4}/gi.test(str)
		? str
		: str.replace(/[!-~]+/gi, (s) =>
				[...segmenter.segment(s)]
					.map(({ segment: c }) => String.fromCodePoint(c.codePointAt(0)! + 0xfee0))
					.join('')
			);
}

import * as Rules from '$lib/components/rules.svelte';
import type { HistoryEntry } from '$lib/historyEntry';
import { GameState, type Attendant } from '$lib/state';

export const state = $state({
	history: [] as HistoryEntry[],
	attendants: loadFromHash() ?? [
		{ name: '', group: 0, trophyCount: 0, totalScore: { num: 0, den: 0 }, manualOrder: 0 },
		{ name: '', group: 0, trophyCount: 0, totalScore: { num: 0, den: 0 }, manualOrder: 1 }
	],
	orderingMode: 'ranking' as 'ranking' | 'manual'
});

const _current = $derived(
	state.history.reduce(
		(state, entry) => entry.reducer(state.clearLatestEvent()).checkIfLastSurvivor().updateRanking(),
		new GameState(state.attendants, Rules.state.rules).updateRanking()
	)
);
export const current = () => _current;

export const orderedAttendants: () => number[] = () => {
	switch (state.orderingMode) {
		case 'ranking':
			return _current.ranking;

		case 'manual':
			return _current.attendants
				.flatMap(({ life, manualOrder }, i) => (life === 'removed' ? [] : [[manualOrder, i]]))
				.toSorted(([a], [b]) => a - b)
				.map(([, i]) => i);
	}
};

export function clearHistory() {
	_current.attendants.forEach((att, i) => {
		state.attendants[i].trophyCount = att.trophyCount;
		state.attendants[i].totalScore = {
			num: att.totalScore.num + (_current.attendants.length - _current.ranking.indexOf(i) - 1),
			den: att.totalScore.den + 1
		};
	});
	state.attendants = state.attendants.filter((_, i) => _current.attendants[i].life !== 'removed');
	state.history = [];
}

function loadFromHash(): Attendant[] | null {
	try {
		const url = new URL(document.URL);
		if (url.hash.length > 1) {
			const names = JSON.parse(decodeURIComponent(url.hash.slice(1)));
			if (Array.isArray(names) && names.length > 0 && names.every((n) => typeof n === 'string')) {
				return names.map((name, manualOrder) => ({
					name,
					group: 0,
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

export function addAttendant(name: string = '') {
	state.attendants.push({
		name,
		group: 0,
		trophyCount: 0,
		totalScore: { num: 0, den: 0 },
		manualOrder: state.attendants.length
	});
}

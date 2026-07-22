import type { Attendant } from '$lib/attendant';
import type { HistoryEntry } from '$lib/historyEntry';
import { Rule } from '$lib/rule';
import { GameState } from '$lib/state';

export const Game = $state({
	attendants: [] as Attendant[],
	teams: [] as string[],
	rules: [new Rule('aql', 200, null, 1, 'updown', false, null, 'constant', 0, null)],
	history: [] as HistoryEntry[]
});

export function currentState_() {
	return Game.history.reduce(
		(state, entry) => entry.reducerTeam(state.clearLatestEvent()).updateRanking(),
		new GameState(Game.attendants, Game.rules, Game.teams).updateRanking()
	);
}

export function attendantsPerTeam_() {
	const atts = Game.attendants.reduce<({ att: Attendant; i: number; j: number }[] | undefined)[][]>(
		(acc, att, i) => {
			acc[att.team] ??= [];
			acc[att.team][att.seat] ??= [];
			acc[att.team][att.seat]!.push({ att, i, j: 0 });
			return acc;
		},
		Game.teams.map(() => [])
	);

	let j = 0;
	atts.forEach((team) => team.forEach((seat) => seat!.forEach((att) => (att.j = j++))));

	return atts;
}

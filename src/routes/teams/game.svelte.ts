import se1 from '$lib/assets/se1.mp3';
import se2 from '$lib/assets/se2.mp3';
import se3 from '$lib/assets/se3.mp3';
import { han2zen, type Attendant } from '$lib/attendant';
import {
	BatsuHistoryEntry,
	MaruHistoryEntry,
	ThroughHistoryEntry,
	type HistoryEntry
} from '$lib/historyEntry';
import { Rule } from '$lib/rule';
import type { WasedashikiMode } from '$lib/serial';
import { playSound } from '$lib/sound';
import { GameState } from '$lib/state';

export const Game = $state({
	attendants: [] as Attendant[],
	teams: [] as string[],
	rules: [new Rule('aql', 200, null, 1, 'updown', false, null, 'constant', 0, null)],
	history: [] as HistoryEntry[],
	playSounds: true,
	wasedashikiMode: undefined as WasedashikiMode | undefined
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

export function addAttendant_(teamID: number, seatID: number, name: string = '') {
	Game.attendants.push({
		name: han2zen(name),
		group: 0,
		team: teamID,
		seat: seatID,
		trophyCount: 0,
		totalScore: { num: 0, den: 0 },
		manualOrder: Game.attendants.length
	});
}

export function clickMaru(attendantID: number, playSounds_: boolean = true) {
	Game.history.push(new MaruHistoryEntry(attendantID));
	if (Game.playSounds && playSounds_) {
		playSound(se1);
	}
}

export async function clickBatsu(attendantID: number, playSounds_: boolean = true) {
	const single = Game.wasedashikiMode === 'single' || Game.wasedashikiMode === 'handicap';

	Game.history.push(new BatsuHistoryEntry(attendantID, single));
	if (Game.playSounds && playSounds_) {
		playSound(se2);
	}
}

export function clickThrough() {
	Game.history.push(new ThroughHistoryEntry());
	if (Game.playSounds) playSound(se3);
}

export function clickUndo() {
	Game.history.pop();
}

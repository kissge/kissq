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
import { getActiveRulesText, Rule } from '$lib/rule';
import type { WasedashikiMode } from '$lib/serial';
import { playSound } from '$lib/sound';
import { GameState } from '$lib/state';

export class GameClass {
	attendants = $state<Attendant[]>([]);
	teams = $state<string[]>([]);
	rules = $state([new Rule('aql', 200, null, 1, 'updown', false, null, 'constant', 0, null)]);
	history = $state<HistoryEntry[]>([]);
	playSounds = $state(true);
	wasedashikiMode = $state<WasedashikiMode>();

	currentState = $derived(
		this.history.reduce(
			(state, entry) => entry.reducerTeam(state.clearLatestEvent()).updateRanking(),
			new GameState(this.attendants, this.rules, this.teams).updateRanking()
		)
	);

	attendantsPerTeam = $derived.by(() => {
		const atts = this.attendants.reduce<
			({ att: Attendant; i: number; j: number }[] | undefined)[][]
		>(
			(acc, att, i) => {
				acc[att.team] ??= [];
				acc[att.team][att.seat] ??= [];
				acc[att.team][att.seat]!.push({ att, i, j: 0 });
				return acc;
			},
			this.teams.map(() => [])
		);

		let j = 0;
		atts.forEach((team) => team.forEach((seat) => seat!.forEach((att) => (att.j = j++))));

		return atts;
	});

	activeRules = $derived(this.rules.flatMap((rule, i) => (rule.isRemoved ? [] : { rule, i })));
	activeRulesText = $derived(getActiveRulesText(this.rules, 'team').activeRulesText);

	addAttendant(teamID: number, name: string = '') {
		this.attendants.push({
			name: han2zen(name),
			group: 0,
			team: teamID,
			seat: Math.max(0, this.attendantsPerTeam[teamID].length - 1),
			trophyCount: 0,
			totalScore: { num: 0, den: 0 },
			manualOrder: this.attendants.length
		});
	}

	handlePasteEvent(event: ClipboardEvent, attendantID: number, teamID: number): void {
		const text = (event.clipboardData?.getData('text') || '').trim();
		const lines = text.split(/[\r\n]+/);
		if (lines.length >= 2) {
			event.preventDefault();
			const atts = this.attendantsPerTeam[teamID].flat().filter((a) => a != null);
			const offset = atts.findIndex(({ i }) => i === attendantID);
			lines.forEach((line, i) => {
				if (offset + i < atts.length) {
					atts[offset + i].att.name = line;
					atts[offset + i].att.trophyCount = 0;
				} else {
					this.addAttendant(teamID, line);
				}
			});
		}
	}

	clickMaru(attendantID: number, playSounds_: boolean = true) {
		this.history.push(new MaruHistoryEntry(attendantID));
		if (this.playSounds && playSounds_) {
			playSound(se1);
		}
	}

	async clickBatsu(attendantID: number, playSounds_: boolean = true) {
		const single = this.wasedashikiMode === 'single' || this.wasedashikiMode === 'handicap';
		this.history.push(new BatsuHistoryEntry(attendantID, single));
		if (this.playSounds && playSounds_) {
			playSound(se2);
		}
	}

	clickThrough() {
		this.history.push(new ThroughHistoryEntry());
		if (this.playSounds) playSound(se3);
	}

	clickUndo() {
		this.history.pop();
	}
}

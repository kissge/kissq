import { createContext } from 'svelte';
import se2 from '$lib/assets/se2.mp3';
import { han2zen, type Attendant } from '$lib/attendant';
import { GameClassBase } from '$lib/game';
import { BatsuHistoryEntry, type HistoryEntry } from '$lib/historyEntry';
import { getActiveRulesText, Rule } from '$lib/rule';
import type { WasedashikiMode } from '$lib/serial';
import { playSound } from '$lib/sound';
import { GameState } from '$lib/state';

export class GameClass extends GameClassBase<'team'> {
	battleMode = 'team' as const;

	attendants = $state<Attendant[]>([]);
	teams = $state<string[]>([]);
	rules = $state([new Rule('aql', 200, null, 1, 'updown', false, null, 'constant', 0, null)]);
	history = $state<HistoryEntry[]>([]);
	gameTitle = $state('');
	playSounds = $state(true);
	wasedashikiMode = $state<WasedashikiMode>();

	// dummy
	orderingMode = 'manual' as const;
	orderedAttendants = [];
	enableRating = false;

	currentState = $derived(
		this.history.reduce(
			(state, entry) => entry.reducerTeam(state.clearLatestEvent()).updateRanking(),
			new GameState(this.attendants, this.rules, this.teams).updateRanking()
		)
	);

	attendantsPerTeam = $derived.by(() => {
		const atts = this.attendants.reduce<({ att: Attendant; ai: number }[] | undefined)[][]>(
			(acc, att, ai) => {
				acc[att.team] ??= [];
				acc[att.team][att.seat] ??= [];
				acc[att.team][att.seat]!.push({ att, ai });
				return acc;
			},
			this.teams.map(() => [])
		);

		return atts;
	});

	activeRules = $derived(this.rules.flatMap((rule, i) => (rule.isRemoved ? [] : { rule, i })));
	activeRulesText = $derived(getActiveRulesText(this.activeRules, 'team'));

	windowTitle = $derived(
		`kissQ -
		${this.gameTitle ? this.gameTitle + ' - ' : ''}
		${this.currentState.attendants
			.flatMap(({ name, life }) => (life !== 'removed' ? [name.slice(0, 3) || '👤'] : []))
			.join('・')}
		- クイズカウンター（得点表示機）のkissQ`
	);

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
			const offset = atts.findIndex(({ ai }) => ai === attendantID);
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

	async clickBatsu(attendantID: number, playSounds_: boolean = true) {
		const single = this.wasedashikiMode === 'single' || this.wasedashikiMode === 'handicap';
		this.history.push(new BatsuHistoryEntry(attendantID, single));
		if (this.playSounds && playSounds_) {
			playSound(se2);
		}
	}
}

export const [getGameContext, setGameContext] = createContext<GameClass>();

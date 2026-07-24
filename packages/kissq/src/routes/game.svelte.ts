import { createContext } from 'svelte';
import se2 from '$lib/assets/se2.mp3';
import { han2zen, type Attendant } from '$lib/attendant';
import { GameClassBase } from '$lib/game';
import { BatsuHistoryEntry, type HistoryEntry } from '$lib/historyEntry';
import { getActiveRulesText, Rule, type Penalty } from '$lib/rule';
import type { WasedashikiMode } from '$lib/serial';
import { playSound } from '$lib/sound';
import { GameState } from '$lib/state';

export class GameClass extends GameClassBase<'single'> {
	battleMode = 'single' as const;

	attendants = $state<Attendant[]>([]);
	rules = $state([new Rule('marubatsu', 7, 3, 1, 1, false, null, 'constant', 0, null)]);
	history = $state<HistoryEntry[]>([]);
	gameTitle = $state('');
	playSounds = $state(true);
	wasedashikiMode = $state<WasedashikiMode>();

	orderingMode = $state<'ranking' | 'manual'>('ranking');
	enableRating = $state(false);

	// dummy
	attendantsPerTeam = [];

	penaltyRoulette?: { run: (choices: Penalty[]) => Promise<number> };

	currentState = $derived(
		this.history.reduce(
			(state, entry) =>
				entry.reducer(state.clearLatestEvent()).checkIfLastSurvivor().updateRanking(),
			new GameState(this.attendants, this.rules).updateRanking()
		)
	);

	consecutive = $derived.by<{ attendantID: number; count: number } | null>(() => {
		const i = this.history.findLastIndex((entry) => entry.type === 'maru');

		if (i === -1) {
			return null;
		}

		const attendantID = (this.history[i] as { attendantID: number }).attendantID;
		const j = this.history.findLastIndex(
			(entry) =>
				(entry.type === 'batsu' && entry.attendantID === attendantID) ||
				(entry.type === 'maru' && entry.attendantID !== attendantID)
		);

		if (i <= j) {
			return null;
		}

		return {
			attendantID,
			count: this.history
				.slice(j + 1, i + 1)
				.filter((entry) => entry.type === 'maru' && entry.attendantID === attendantID).length
		};
	});

	orderedAttendants = $derived.by<number[]>(() => {
		switch (this.orderingMode) {
			case 'ranking':
				return this.currentState.ranking;
			case 'manual':
				return this.currentState.attendants
					.flatMap(({ life, manualOrder }, i) => (life === 'removed' ? [] : [[manualOrder, i]]))
					.toSorted(([a], [b]) => a - b)
					.map(([, i]) => i);
		}
	});

	activeRules = $derived(this.rules.flatMap((rule, i) => (rule.isRemoved ? [] : { rule, i })));
	activeRulesText = $derived(getActiveRulesText(this.activeRules, 'single'));

	windowTitle = $derived(
		`kissQ -
		${this.gameTitle ? this.gameTitle + ' - ' : ''}
		${this.currentState.attendants
			.flatMap(({ name, life }) => (life !== 'removed' ? [name.slice(0, 3) || '👤'] : []))
			.join('・')}
		- クイズカウンター（得点表示機）のkissQ`
	);

	addAttendant(name: string = '') {
		this.attendants.push({
			name: han2zen(name),
			group: 0,
			team: 0,
			seat: 0,
			trophyCount: 0,
			totalScore: { num: 0, den: 0 },
			manualOrder: this.attendants.length
		});
	}

	handlePasteEvent(event: ClipboardEvent, ord: number) {
		const text = (event.clipboardData?.getData('text') || '').trim();
		const lines = text.split(/[\r\n]+/);
		if (lines.length >= 2) {
			event.preventDefault();
			lines.forEach((line, i) => {
				if (ord + i < this.attendants.length) {
					this.attendants[this.orderedAttendants[ord + i]].name = line;
					this.attendants[this.orderedAttendants[ord + i]].trophyCount = 0;
				} else {
					this.addAttendant(line);
				}
			});
		} else if (text.length > 0) {
			event.preventDefault();
			document.execCommand('insertText', false, han2zen(text));
		}
	}

	async clickBatsu(attendantID: number, playSounds_: boolean = true) {
		if (this.playSounds && playSounds_) {
			playSound(se2);
		}

		const single = this.wasedashikiMode === 'single' || this.wasedashikiMode === 'handicap';

		const rule = this.currentState.attendants[attendantID].rule;
		if (rule.yasuMode === 'roulette' && this.penaltyRoulette) {
			const selection = await this.penaltyRoulette.run(rule.roulette!.choices);
			this.history.push(
				new BatsuHistoryEntry(attendantID, single, rule.roulette!.choices[selection])
			);
		} else {
			this.history.push(new BatsuHistoryEntry(attendantID, single));
		}
	}
}

export const [getGameContext, setGameContext] = createContext<GameClass>();

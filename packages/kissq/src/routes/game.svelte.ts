import { createContext } from 'svelte';
import se1 from '$lib/assets/se1.mp3';
import se2 from '$lib/assets/se2.mp3';
import se3 from '$lib/assets/se3.mp3';
import { han2zen, type Attendant } from '$lib/attendant';
import { GameClassBase } from '$lib/game';
import {
	BatsuHistoryEntry,
	MaruHistoryEntry,
	ThroughHistoryEntry,
	type HistoryEntry
} from '$lib/historyEntry';
import { pushLog } from '$lib/logs';
import { getActiveRulesText, Rule, type Penalty } from '$lib/rule';
import type { WasedashikiMode } from '$lib/serial';
import { playSound } from '$lib/sound';
import { GameState } from '$lib/state';
import type { WasedashikiClass } from '$lib/wasedashiki.svelte';

export class GameClass extends GameClassBase {
	attendants = $state<Attendant[]>([]);
	rules = $state([new Rule('marubatsu', 7, 3, 1, 1, false, null, 'constant', 0, null)]);
	history = $state<HistoryEntry[]>([]);
	gameTitle = $state('');
	playSounds = $state(true);
	wasedashikiMode = $state<WasedashikiMode>();

	orderingMode = $state<'ranking' | 'manual'>('ranking');
	enableRating = $state(false);

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

	clearHistory(Wasedashiki: WasedashikiClass) {
		this.currentState.attendants.forEach((att, i) => {
			this.attendants[i].trophyCount = att.trophyCount;
			if (this.enableRating) {
				this.attendants[i].totalScore = {
					num:
						att.totalScore.num +
						(this.currentState.attendants.length - this.currentState.ranking.indexOf(i) - 1),
					den: att.totalScore.den + 1
				};
			}
		});

		pushLog('single', this.gameTitle, this.activeRulesText, this.currentState, this.attendants);

		const newAttendants = [...this.attendants];
		const removedIndex = [];
		for (let i = 0, j = 0; i < newAttendants.length; i++) {
			if (this.currentState.attendants[i]?.life === 'removed') {
				removedIndex.push(i);
				j--;
			} else {
				if (j < 0) {
					Wasedashiki.buttonMapping[i + j] = Wasedashiki.buttonMapping[i];
					delete Wasedashiki.buttonMapping[i];
				}
			}
		}
		removedIndex.toReversed().forEach((i) => {
			newAttendants.splice(i, 1);
		});
		this.attendants = newAttendants;

		this.history = [];
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

	clickMaru(attendantID: number, playSounds_: boolean = true) {
		this.history.push(new MaruHistoryEntry(attendantID));
		if (this.playSounds && playSounds_) {
			playSound(se1);
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

	clickThrough() {
		this.history.push(new ThroughHistoryEntry());
		if (this.playSounds) playSound(se3);
	}

	clickUndo() {
		this.history.pop();
	}
}

export const [getGameContext, setGameContext] = createContext<GameClass>();

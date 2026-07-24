import se1 from '$lib/assets/se1.mp3';
import se3 from '$lib/assets/se3.mp3';
import type { Attendant } from './attendant';
import { MaruHistoryEntry, ThroughHistoryEntry, type HistoryEntry } from './historyEntry';
import { pushLog } from './logs';
import type { WasedashikiMode } from './serial';
import { playSound } from './sound';
import type { GameState } from './state';
import type { WasedashikiClass } from './wasedashiki.svelte';

export abstract class GameClassBase<BattleMode extends 'single' | 'team'> {
	abstract readonly battleMode: BattleMode;

	abstract attendants: Attendant[];
	abstract history: HistoryEntry[];
	abstract gameTitle: string;
	abstract currentState: GameState;
	abstract playSounds: boolean;
	abstract wasedashikiMode: WasedashikiMode | undefined;
	abstract activeRulesText: string;
	abstract orderingMode: 'ranking' | 'manual';
	abstract orderedAttendants: number[];
	abstract attendantsPerTeam: ({ att: Attendant; ai: number }[] | undefined)[][];
	abstract enableRating: boolean;

	abstract addAttendant(
		...args: BattleMode extends 'single' ? [string | undefined] : [number, string | undefined]
	): void;
	abstract clickBatsu(attendantID: number, playSounds_?: boolean): Promise<void>;

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

		pushLog(
			this.battleMode,
			this.gameTitle,
			this.activeRulesText,
			this.currentState,
			this.attendants
		);

		const newAttendants = [...this.attendants];
		const removedIndex = [];
		for (let i = 0, j = 0; i < newAttendants.length; i++) {
			if (this.currentState.attendants[i].life === 'removed') {
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

	clickMaru(attendantID: number, playSounds_: boolean = true) {
		this.history.push(new MaruHistoryEntry(attendantID));
		if (this.playSounds && playSounds_) {
			playSound(se1);
		}
	}

	clickThrough() {
		this.history.push(new ThroughHistoryEntry());
		if (this.playSounds) {
			playSound(se3);
		}
	}

	clickUndo() {
		this.history.pop();
	}
}

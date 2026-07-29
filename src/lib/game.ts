import se1 from '$lib/assets/se1.mp3';
import se3 from '$lib/assets/se3.mp3';
import type { Attendant } from './attendant';
import { MaruHistoryEntry, ThroughHistoryEntry, type HistoryEntry } from './historyEntry';
import { LoggerClass } from './logs';
import type { Rule } from './rule';
import type { WasedashikiMode } from './serial';
import { playSound } from './sound';
import type { GameState } from './state';
import type { WasedashikiClass } from './wasedashiki.svelte';

export abstract class GameClassBase<BattleMode extends 'single' | 'team'> {
	abstract readonly battleMode: BattleMode;

	abstract attendants: Attendant[];
	abstract teams: string[];
	abstract rules: Rule[];
	abstract history: HistoryEntry[];
	abstract gameTitle: string;
	abstract totalQuestionCount: number;
	abstract currentState: GameState;
	abstract playSounds: boolean;
	abstract wasedashikiMode: WasedashikiMode | undefined;
	abstract activeRulesText: string;
	abstract orderingMode: 'ranking' | 'manual';
	abstract orderedAttendants: number[];
	abstract attendantsPerTeam: ({ att: Attendant; ai: number }[] | undefined)[][];
	abstract enableRating: boolean;

	abstract Logger?: LoggerClass<BattleMode>;

	abstract addAttendant(
		...args: BattleMode extends 'single' ? [string | undefined] : [number, string | undefined]
	): void;
	abstract clickBatsu(attendantID: number, playSounds_?: boolean): Promise<void>;

	clearHistory(Wasedashiki: WasedashikiClass) {
		this.currentState.attendants.forEach((att, ai) => {
			this.attendants[ai].trophyCount = att.trophyCount;
			this.attendants[ai].totalScore = {
				num:
					att.totalScore.num +
					(this.currentState.attendants.length - this.currentState.ranking.indexOf(ai) - 1),
				den: att.totalScore.den + 1,
				maru: att.totalScore.maru + att.maruCount,
				batsu: att.totalScore.batsu + att.batsuCount
			};
		});
		this.totalQuestionCount += this.currentState.questionCount - 1;

		this.Logger!.push();

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

	updateRules(rules: Rule[], Wasedashiki: WasedashikiClass) {
		if (
			this.history.length > 0 &&
			confirm(
				'全員のスコアのリセットも行いますか？\n\n※ しない場合、トロフィーが消えることなどがあります\n※ まだゲームの途中であれば無視してください'
			)
		) {
			this.clearHistory(Wasedashiki);
		}

		const activeRuleCount = rules.filter(({ isRemoved }) => !isRemoved).length;
		if (activeRuleCount === 1) {
			this.rules = rules.filter(({ isRemoved }) => !isRemoved);
			this.attendants.forEach((att) => {
				att.group = 0;
			});
		} else {
			const removedIndices = rules.flatMap(({ isRemoved }, i) => (isRemoved ? [i] : []));
			this.rules = rules.filter(({ isRemoved }) => !isRemoved);
			this.attendants.forEach((att) => {
				att.group = Math.max(0, att.group - removedIndices.filter((i) => i <= att.group).length);
			});
		}
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

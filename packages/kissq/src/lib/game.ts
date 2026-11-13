import { SvelteDate } from 'svelte/reactivity';

import se1 from '$lib/assets/se1.mp3';
import se3 from '$lib/assets/se3.mp3';

import {
	BatsuHistoryEntry,
	BulkAdjustHistoryEntry,
	EditHistoryEntry,
	LoseHistoryEntry,
	MaruHistoryEntry,
	RemoveHistoryEntry,
	ThroughHistoryEntry,
	WinHistoryEntry,
	type HistoryEntry
} from './historyEntry';
import { LoggerClass } from './logs';
import { Rule, type RulePOJO } from './rule';
import { playSound } from './sound';
import { AttendantID } from './types';

import type { Attendant } from './attendant';
import type { WasedashikiMode } from './serial';
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
	abstract previousTrophyGetters: AttendantID[];
	abstract currentState: GameState;
	abstract playSounds: boolean;
	abstract wasedashikiMode: WasedashikiMode | undefined;
	abstract activeRulesText: string;
	abstract orderingMode: 'ranking' | 'manual';
	abstract orderedAttendants: AttendantID[];
	abstract attendantsPerTeam: ({ att: Attendant; ai: AttendantID }[] | undefined)[][];
	abstract enableRating: boolean;
	abstract effect2Name: string | undefined;
	abstract effect3Name: string | undefined;
	abstract isConventionAssistActive: boolean;
	abstract showBanner: (options: { type: 'effect2' | 'effect3'; attendantID: AttendantID }) => void;
	abstract bulkAdjustmentScore: number | null;
	abstract bulkAdjust(): void;
	abstract addBulkAdjustmentTarget(attendantID: AttendantID): void;
	abstract gameStartedAt: SvelteDate;

	abstract Logger?: LoggerClass;

	abstract addAttendant(options: { name?: string; teamID?: number }): void;
	abstract clickBatsu(attendantID: AttendantID, playSounds_?: boolean): Promise<void>;

	abstract get scoreRanks(): number[];

	get _windowTitle() {
		return `kissQ -
		${this.gameTitle ? this.gameTitle + ' - ' : ''}
		${this.currentState.attendants
			.flatMap(({ name, life }) => (life !== 'removed' ? [name.slice(0, 3) || '👤'] : []))
			.join('・')}
		- クイズ得点板のkissQ`;
	}

	toJSON() {
		return Object.fromEntries([
			...Keys.map((key) => [key, this[key]]),
			['serializedAt', new Date()]
		]);
	}

	clearHistory(Wasedashiki: WasedashikiClass) {
		this.previousTrophyGetters = [];
		this.currentState.attendants.forEach((att, ai) => {
			if (att.life === 'won') {
				this.previousTrophyGetters.push(AttendantID(ai));
			}

			this.attendants[ai].trophyCount = att.trophyCount;
			this.attendants[ai].totalScore = {
				maru: att.totalScore.maru + att.trueMaruCount,
				batsu: att.totalScore.batsu + att.trueBatsuCount
			};
		});
		this.totalQuestionCount += this.currentState.questionCount - 1;

		this.Logger!.push();

		const newAttendants = [...this.attendants];
		const removedIndex: number[] = [];
		for (let i = 0, j = 0; i < newAttendants.length; i++) {
			if (this.currentState.attendants[i].life === 'removed') {
				removedIndex.push(i);
				j--;
			} else {
				if (j < 0) {
					Wasedashiki.buttonMapping[AttendantID(i + j)] = Wasedashiki.buttonMapping[AttendantID(i)];
					delete Wasedashiki.buttonMapping[AttendantID(i)];
				}
			}
		}
		removedIndex.toReversed().forEach((i) => {
			newAttendants.splice(i, 1);
		});
		this.attendants = newAttendants;

		this.previousTrophyGetters = this.previousTrophyGetters.flatMap((ai) => {
			if (removedIndex.includes(ai)) {
				return [];
			} else {
				const newIndex = ai - removedIndex.filter((i) => i < ai).length;
				return [AttendantID(newIndex)];
			}
		});

		this.history = [];
		this.gameStartedAt = new SvelteDate();
	}

	updateRules(
		rules: Rule[],
		Wasedashiki: WasedashikiClass,
		doClear: boolean,
		resetGroups: 'reset' | 'keep'
	) {
		if (doClear) {
			this.clearHistory(Wasedashiki);
		}

		if (resetGroups === 'reset') {
			this.attendants.forEach((att) => (att.group = 0));
			this.rules = rules.filter(({ isRemoved }) => !isRemoved);
		} else {
			const removedIndices = rules.flatMap(({ isRemoved }, i) => (isRemoved ? [i] : []));
			this.attendants.forEach((att) => {
				att.group = Math.max(0, att.group - removedIndices.filter((i) => i <= att.group).length);
			});
			this.rules = rules.filter(({ isRemoved }) => !isRemoved);
		}
	}

	clickMaru(attendantID: AttendantID, playSounds_: boolean = true) {
		this.history.push(new MaruHistoryEntry(attendantID));
		if (this.playSounds && playSounds_) {
			playSound(se1);
		}
	}

	clickEffect2(attendantID: AttendantID) {
		this.history.push(new MaruHistoryEntry(attendantID, 2));
		if (this.playSounds) {
			playSound(se1);
			setTimeout(() => playSound(se1), 150);
		}
		this.showBanner({ type: 'effect2', attendantID });
	}

	clickEffect3(attendantID: AttendantID) {
		this.history.push(new MaruHistoryEntry(attendantID, 3));
		if (this.playSounds) {
			playSound(se1);
			setTimeout(() => playSound(se1), 150);
			setTimeout(() => playSound(se1), 300);
		}
		this.showBanner({ type: 'effect3', attendantID });
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

	setChance(chance: WasedashikiMode) {
		this.wasedashikiMode = chance;
		this.rules.forEach((rule) => {
			rule.chance = chance === 'single' || chance === 'handicap' ? 'single' : 'endless';
		});
	}

	loadFromSerialized(
		serialized: GameClassSerialized,
		target: 'attendants' | 'rules' | 'scores'
	): void {
		Object.entries(serialized).forEach(([key, value]) => {
			if (key === 'rules') {
				if (target === 'attendants') {
					// ルールは復元しないので、グループ数と矛盾がないようにだけする
					const groups = Math.max(...serialized.attendants.map(({ group }) => group)) + 1;
					if (groups > serialized.rules.length) {
						this.rules.push(
							...Array.from({ length: groups - this.rules.length }, () => this.rules[0])
						);
					}
				} else {
					this.rules = value.map((rule: RulePOJO) => Rule.from(rule));
				}
			} else if (key === 'history') {
				if (target === 'scores') {
					this.history = value.map((entry: HistoryEntry) => {
						switch (entry.type) {
							case 'maru':
								return new MaruHistoryEntry(entry.attendantID, entry.multiplier);
							case 'batsu':
								return new BatsuHistoryEntry(
									entry.attendantID,
									entry.increaseQuestionCount,
									entry.penalty
								);
							case 'through':
								return new ThroughHistoryEntry();
							case 'remove':
								return new RemoveHistoryEntry(entry.attendantID);
							case 'win':
								return new WinHistoryEntry(entry.attendantID);
							case 'lose':
								return new LoseHistoryEntry(entry.attendantID);
							case 'edit':
								return new EditHistoryEntry(entry.attendantID, entry.newState);
							case 'bulk-adjust':
								return new BulkAdjustHistoryEntry(entry.attendantIDs, entry.scoreDiff);
							default:
								throw new Error(
									`Unknown history entry type: ${(entry satisfies never as any).type}`
								);
						}
					});
				}
			} else if (key === 'gameStartedAt') {
				if (target === 'scores') {
					this.gameStartedAt = new SvelteDate(value);
				}
			} else if (key !== 'serializedAt') {
				if (!(key in this)) {
					throw new Error(`Unknown key: ${key}: ${value}`);
				}

				this[key as keyof this] = value;
			}
		});
	}

	get ratingList(): number[] {
		const ratings = this.currentState.attendants.map((att) => att.rate);
		const mean = ratings.reduce((acc, val) => acc + val, 0) / ratings.length;
		const variance = ratings.reduce((acc, val) => acc + (val - mean) ** 2, 0) / ratings.length;
		const stddev = Math.sqrt(variance);
		const tScore = ratings.map((rating) => (stddev ? 50 + ((rating - mean) / stddev) * 10 : 50));

		return tScore;
	}
}

export class GameClassSerialized {
	battleMode: 'single' | 'team' = 'single';
	attendants: Attendant[] = [];
	teams: string[] = [];
	rules: RulePOJO[] = []; // <------------ !!!!!
	history: HistoryEntry[] = [];
	gameTitle: string = '';
	totalQuestionCount: number = 0;
	previousTrophyGetters: string[] = [];
	// currentState (derived)
	playSounds: boolean = true;
	wasedashikiMode: WasedashikiMode | undefined;
	// activeRulesText (derived)
	orderingMode: 'ranking' | 'manual' = 'ranking';
	// orderedAttendants (derived)
	// attendantsPerTeam (derived)
	enableRating: boolean = false;
	effect2Name: string | undefined;
	effect3Name: string | undefined;
	isConventionAssistActive: boolean = false;
	// showBanner (injected)
	bulkAdjustmentScore: number | null = null;
	// bulkAdjustmentTarget (ephemeral)
	gameStartedAt: string = ''; // <------------ !!!!!

	serializedAt: Date = new Date();
}

const Keys = Object.keys(new GameClassSerialized()).filter(
	(key) => key !== 'serializedAt'
) as (keyof Omit<GameClassSerialized, 'serializedAt'>)[];

import { createContext } from 'svelte';
import { SvelteDate } from 'svelte/reactivity';

import se2 from '$lib/assets/se2.mp3';
import { han2zen, type Attendant } from '$lib/attendant';
import { GameClassBase } from '$lib/game';
import { BatsuHistoryEntry, BulkAdjustHistoryEntry, type HistoryEntry } from '$lib/historyEntry';
import { LoggerClass } from '$lib/logs';
import { Rule, type Penalty } from '$lib/rule';
import { playSound } from '$lib/sound';
import { GameState } from '$lib/state';
import { AttendantID } from '$lib/types';
import { getRankingOf } from '$lib/utils';

import type { WasedashikiMode } from '$lib/serial';

export class SingleGameClass extends GameClassBase<'single'> {
	battleMode = 'single' as const;

	attendants = $state<Attendant[]>([]);
	rules = $state([
		Rule.from({
			mode: 'marubatsu',
			chance: 'endless',
			win: 7,
			lose: 3,
			questionLimit: null,
			attendantLimit: null,
			maru: 1,
			batsu: 1,
			transit: false,
			yasuPerMaru: null,
			yasuMode: 'constant',
			yasuPerBatsu: 0,
			roulette: null,
			bulkAdjustment: null,
			multiplyMinimum: 0,
			attendantLimitOverall: null
		})
	]);
	history = $state<HistoryEntry[]>([]);
	gameTitle = $state('');
	totalQuestionCount = $state(0);
	previousTrophyGetters = $state<AttendantID[]>([]);
	playSounds = $state(true);
	wasedashikiMode = $state<WasedashikiMode>();

	orderingMode = $state<'ranking' | 'manual'>('ranking');
	enableRating = $state(false);
	effect2Name = $state<string>();
	effect3Name = $state<string>();
	isConventionAssistActive = $state(false);
	showBanner = (options: { type: 'effect2' | 'effect3'; attendantID: AttendantID }) => {
		void options;
	};
	bulkAdjustmentScore = $state<number | null>(null);
	bulkAdjustmentTarget = $state<boolean[]>([]);
	gameStartedAt = $state(new SvelteDate());

	Logger?: LoggerClass;

	// dummy
	teams: string[] = [];
	attendantsPerTeam: ({ att: Attendant; ai: AttendantID }[] | undefined)[][] = [];

	penaltyRoulette?: { run: (choices: Penalty[]) => Promise<number> };

	currentState = $derived(
		this.history.reduce(
			(state, entry) =>
				entry
					.reducer(state.clearLatestEvent())
					.checkIfLastSurvivor()
					.updateRanking()
					.checkIfFinished(),
			new GameState(this.attendants, this.rules).updateRanking(this.enableRating)
		)
	);

	consecutive = $derived.by<{ attendantID: AttendantID; count: number } | null>(() => {
		const i = this.history.findLastIndex((entry) => entry.type === 'maru');

		if (i === -1) {
			return null;
		}

		const attendantID = (this.history[i] as { attendantID: AttendantID }).attendantID;
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

	orderedAttendants = $derived.by<AttendantID[]>(() => {
		switch (this.orderingMode) {
			case 'ranking':
				return this.currentState.ranking;
			case 'manual':
				return this.currentState.attendants
					.flatMap(({ life, manualOrder }, i) =>
						life === 'removed' ? [] : [[manualOrder, AttendantID(i)] as const]
					)
					.toSorted(([a], [b]) => a - b)
					.map(([, i]) => i);
		}
	});

	activeRules = $derived(this.rules.flatMap((rule, i) => (rule.isRemoved ? [] : { rule, i })));
	activeRulesText = $derived(Rule.getActiveRulesText(this.activeRules, 'single'));

	windowTitle = $derived.by(() => this._windowTitle);

	/**
	 * 現在のスコアでの個人ランキング（同率を考慮）
	 * 添字はattendantID、値は順位（1位が1、2位が2、同率の場合は同じ順位）
	 */
	get scoreRanks(): number[] {
		const mixed = this.currentState.attendants.some(
			(a, _, all) => a.rule.mode !== all[0].rule.mode
		);

		return getRankingOf(this.currentState.attendants, (a) =>
			a.sortScore(this.enableRating, mixed ? 'mixed' : a.rule.mode)
		);
	}

	/**
	 * 通算スコアでの個人ランキング（同率を考慮）
	 * 添字はattendantID、値は順位（1位が1、2位が2、同率の場合は同じ順位）
	 */
	get totalScoreRanks(): number[] {
		return getRankingOf(this.currentState.attendants, (a) => a.sortTotalScore(this.enableRating));
	}

	addAttendant({ name }: { name?: string }): Attendant {
		const attendant: Attendant = {
			name: han2zen(name ?? ''),
			group: 0,
			team: 0,
			seat: 0,
			trophyCount: 0,
			totalScore: { maru: 0, batsu: 0 },
			manualOrder: this.attendants.length
		};
		this.attendants.push(attendant);
		return attendant;
	}

	handlePasteEvent(event: ClipboardEvent, ord: number): Attendant[] {
		const text = (event.clipboardData?.getData('text') || '').trim();
		const lines = text.split(/[\r\n]+/);
		const added: Attendant[] = [];
		if (lines.length >= 2) {
			event.preventDefault();
			lines.forEach((line, i) => {
				if (ord + i < this.attendants.length) {
					this.attendants[this.orderedAttendants[ord + i]].name = line;
					this.attendants[this.orderedAttendants[ord + i]].trophyCount = 0;
				} else {
					added.push(this.addAttendant({ name: line }));
				}
			});
		} else if (text.length > 0) {
			event.preventDefault();
			document.execCommand('insertText', false, han2zen(text));
		}

		return added;
	}

	async clickBatsu(attendantID: AttendantID, playSounds_: boolean = true) {
		if (this.playSounds && playSounds_) {
			playSound(se2);
		}

		const rule = this.currentState.attendants[attendantID].rule;
		const single =
			rule.chance === 'single' ||
			this.wasedashikiMode === 'single' ||
			this.wasedashikiMode === 'handicap';

		if (rule.yasuMode === 'roulette' && this.penaltyRoulette) {
			const selection = await this.penaltyRoulette.run(rule.roulette!.choices);
			this.history.push(
				new BatsuHistoryEntry(attendantID, single, rule.roulette!.choices[selection])
			);
		} else {
			this.history.push(new BatsuHistoryEntry(attendantID, single));
		}
	}

	bulkAdjust() {
		if (
			Object.values(this.bulkAdjustmentTarget).some((v) => v) &&
			this.bulkAdjustmentScore !== null
		) {
			const attendantIDs = [...this.bulkAdjustmentTarget.entries()]
				.filter(([, v]) => v)
				.map(([i]) => i);
			this.history.push(new BulkAdjustHistoryEntry(attendantIDs, this.bulkAdjustmentScore));
			this.bulkAdjustmentScore = null;
			this.bulkAdjustmentTarget = [];
		}
	}

	addBulkAdjustmentTarget(attendantID: AttendantID) {
		this.bulkAdjustmentTarget[attendantID] = true;
	}
}

export const [getSingleGameContext, setSingleGameContext] = createContext<SingleGameClass>();

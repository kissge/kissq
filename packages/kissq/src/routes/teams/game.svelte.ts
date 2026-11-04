import { createContext } from 'svelte';
import { SvelteDate } from 'svelte/reactivity';
import se2 from '$lib/assets/se2.mp3';
import { han2zen, type Attendant } from '$lib/attendant';
import { GameClassBase } from '$lib/game';
import { BatsuHistoryEntry, type HistoryEntry } from '$lib/historyEntry';
import type { LoggerClass } from '$lib/logs';
import { Rule } from '$lib/rule';
import type { WasedashikiMode } from '$lib/serial';
import { playSound } from '$lib/sound';
import { GameState } from '$lib/state';
import { AttendantID, TeamID } from '$lib/types';
import { getRankingOf } from '$lib/utils';

export class TeamGameClass extends GameClassBase<'team'> {
	battleMode = 'team' as const;

	attendants = $state<Attendant[]>([]);
	teams = $state<string[]>([]);
	rules = $state([
		Rule.from({
			mode: 'aql',
			chance: 'endless',
			win: 200,
			lose: null,
			questionLimit: null,
			attendantLimit: null,
			maru: 1,
			batsu: 'updown',
			transit: false,
			yasuPerMaru: null,
			yasuMode: 'constant',
			yasuPerBatsu: 0,
			roulette: null,
			bulkAdjustment: null,
			multiplyMinimum: 0,
			attendantLimitOverall: null,
			isRemoved: false
		})
	]);
	history = $state<HistoryEntry[]>([]);
	gameTitle = $state('');
	totalQuestionCount = $state(0);
	previousTrophyGetters = $state<AttendantID[]>([]);
	playSounds = $state(true);
	wasedashikiMode = $state<WasedashikiMode>();
	isConventionAssistActive = $state(false);
	gameStartedAt = $state(new SvelteDate());

	// dummy
	orderingMode = 'manual' as const;
	orderedAttendants = [];
	enableRating = false;
	effect2Name = undefined;
	effect3Name = undefined;
	showBanner = () => {};
	bulkAdjustmentScore = null;
	bulkAdjust = () => {};
	addBulkAdjustmentTarget = () => {};

	Logger?: LoggerClass;

	currentState = $derived(
		this.history.reduce(
			(state, entry) =>
				entry.reducerTeam(state.clearLatestEvent()).updateRanking().checkIfFinished(),
			new GameState(this.attendants, this.rules, this.teams).updateRanking(this.enableRating)
		)
	);

	attendantsPerTeam = $derived.by(() => {
		const atts = this.attendants.reduce<({ att: Attendant; ai: AttendantID }[] | undefined)[][]>(
			(acc, att, ai) => {
				acc[att.team] ??= [];
				acc[att.team][att.seat] ??= [];
				acc[att.team][att.seat]!.push({ att, ai: AttendantID(ai) });
				return acc;
			},
			this.teams.map(() => [])
		);

		return atts;
	});

	activeRules = $derived(this.rules.flatMap((rule, i) => (rule.isRemoved ? [] : { rule, i })));
	activeRulesText = $derived(Rule.getActiveRulesText(this.activeRules, 'team'));

	windowTitle = $derived.by(() => this._windowTitle);

	/**
	 * 現在のスコアでのチームランキング（同率を考慮）
	 * 添字はteamID、値は順位（1位が1、2位が2、同率の場合は同じ順位）
	 */
	get scoreRanks(): number[] {
		return getRankingOf(this.currentState.teams, (t) => t.sortScore());
	}

	addAttendant({ name, teamID }: { name?: string; teamID?: TeamID }): Attendant {
		if (teamID === undefined) {
			throw new Error('teamID is required');
		}

		const attendant: Attendant = {
			name: han2zen(name ?? ''),
			group: 0,
			team: teamID,
			seat: Math.max(0, this.attendantsPerTeam[teamID].length - 1),
			trophyCount: 0,
			totalScore: { maru: 0, batsu: 0 },
			manualOrder: this.attendants.length
		};
		this.attendants.push(attendant);
		return attendant;
	}

	handlePasteEvent(event: ClipboardEvent, attendantID: AttendantID, teamID: TeamID): Attendant[] {
		const text = (event.clipboardData?.getData('text') || '').trim();
		const lines = text.split(/[\r\n]+/);
		const added: Attendant[] = [];
		if (lines.length >= 2) {
			event.preventDefault();
			const atts = this.attendantsPerTeam[teamID].flat().filter((a) => a != null);
			const offset = atts.findIndex(({ ai }) => ai === attendantID);
			lines.forEach((line, i) => {
				if (offset + i < atts.length) {
					atts[offset + i].att.name = line;
					atts[offset + i].att.trophyCount = 0;
				} else {
					added.push(this.addAttendant({ teamID, name: line }));
				}
			});
		}

		return added;
	}

	async clickBatsu(attendantID: AttendantID, playSounds_: boolean = true) {
		const single =
			this.currentState.attendants[attendantID].rule.chance === 'single' ||
			this.wasedashikiMode === 'single' ||
			this.wasedashikiMode === 'handicap';
		this.history.push(new BatsuHistoryEntry(attendantID, single));
		if (this.playSounds && playSounds_) {
			playSound(se2);
		}
	}
}

export const [getTeamGameContext, setTeamGameContext] = createContext<TeamGameClass>();

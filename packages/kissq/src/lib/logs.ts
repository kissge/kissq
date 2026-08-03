import { createContext } from 'svelte';
import type { GameClassBase } from './game';
import type { WasedashikiMode } from './serial';
import type { Life } from './state';

export type LogStateEntry = LogStateSingleEntry | LogStateTeamEntry;

export type LogStateSingleEntry =
	| {
			mode: 'marubatsu';
			name: string;
			group: number;
			maruCount: number;
			batsuCount: number;
			life: Life;
			i: number;
	  }
	| {
			mode: 'score' | 'MbyN' | 'survival';
			name: string;
			group: number;
			score: number;
			life: Life;
			i: number;
	  };
export type LogStateTeamEntry = {
	mode: 'aql' | 'product' | 'sum';
	name: string;
	group: number;
	team: number;
	seat: number | null;
	score: number;
	life: Life;
	teamScore: number;
	teamLife: Life;
	i: number;
};

export interface LogEntry {
	startAt: string;
	mode?: 'single' | 'team';
	chance?: WasedashikiMode;
	gameTitle: string;
	questionCount: number;
	rules: string;
	teams?: string[];
	state: LogStateEntry[];
}

export class LoggerClass<T extends 'single' | 'team' = 'single' | 'team'> {
	constructor(
		public battleMode: T,
		public Game: GameClassBase<T>
	) {}

	push(): void {
		const logs = this.load();

		logs.push({
			startAt: new Date().toLocaleString('ja', {
				timeZone: 'Asia/Tokyo',
				dateStyle: 'short',
				timeStyle: 'long'
			}),
			mode: this.battleMode,
			chance: this.Game.rules[0].chance,
			gameTitle: this.Game.gameTitle,
			questionCount: this.Game.currentState.questionCount - 1,
			rules: this.Game.activeRulesText,
			teams: this.battleMode === 'team' ? this.Game.teams : undefined,
			state: this._stateToLog()
		});

		window.localStorage.setItem('logs', JSON.stringify(logs.slice(-100)));
	}

	_stateToLog(): LogStateEntry[] {
		const entries = this.Game.currentState.attendants.flatMap<LogStateEntry>((att, ai) => {
			if (att.life === 'removed') {
				return [];
			}

			switch (att.rule.mode) {
				case 'marubatsu':
					return {
						mode: 'marubatsu',
						name: att.name,
						group: this.Game.attendants[ai].group,
						maruCount: att.maruCount,
						batsuCount: att.batsuCount,
						life: att.life,
						i: ai
					};
				case 'score':
				case 'MbyN':
				case 'survival':
					return {
						mode: att.rule.mode,
						name: att.name,
						group: this.Game.attendants[ai].group,
						score: att.score,
						life: att.life,
						i: ai
					};
				case 'aql':
				case 'product':
				case 'sum':
					return {
						mode: att.rule.mode,
						name: att.name,
						group: this.Game.attendants[ai].group,
						score: att.score,
						life: att.life,
						team: this.Game.attendants[ai].team,
						seat: att.rule.mode === 'sum' ? null : this.Game.attendants[ai].seat,
						teamScore: this.Game.currentState.teams[this.Game.attendants[ai].team].teamScore,
						teamLife: this.Game.currentState.teams[this.Game.attendants[ai].team].teamLife,
						i: ai
					};
			}
		});

		if (this.battleMode === 'single') {
			return entries.toSorted(
				(a, b) =>
					this.Game.currentState.ranking.indexOf(a.i) - this.Game.currentState.ranking.indexOf(b.i)
			);
		} else {
			return (entries as LogStateTeamEntry[]).toSorted(
				(a, b) =>
					this.Game.currentState.ranking.indexOf(a.team) -
						this.Game.currentState.ranking.indexOf(b.team) ||
					(a.seat ?? Infinity) - (b.seat ?? Infinity) ||
					b.score - a.score
			);
		}
	}

	update(): void {
		const logs = this.load();

		if (logs.length === 0) {
			return;
		}

		logs[logs.length - 1] = {
			...logs[logs.length - 1],
			chance: this.Game.rules[0].chance,
			gameTitle: this.Game.gameTitle,
			questionCount: this.Game.currentState.questionCount - 1,
			rules: this.Game.activeRulesText,
			state: this._stateToLog(),
			teams: this.battleMode === 'team' ? this.Game.teams : undefined
		};

		window.localStorage.setItem('logs', JSON.stringify(logs));
	}

	load(): LogEntry[] {
		return JSON.parse(window.localStorage.getItem('logs') ?? '[]');
	}
}

export const [getLoggerContext, setLoggerContext] = createContext<LoggerClass>();

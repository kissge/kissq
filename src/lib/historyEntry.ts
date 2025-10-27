import { AttendantState, GameState } from './state';

abstract class HistoryEntry {
	abstract type: string;
	abstract toString(state: GameState): string;
	abstract reducer(state: GameState): GameState;
}

type HistoryEntryType =
	| MaruHistoryEntry
	| BatsuHistoryEntry
	| ThroughHistoryEntry
	| RemoveHistoryEntry
	| LoseHistoryEntry
	| EditHistoryEntry;

export type { HistoryEntryType as HistoryEntry };

export class MaruHistoryEntry implements HistoryEntry {
	type = 'maru' as const;

	constructor(
		public attendantID: number,
		public multiplier: number = 1
	) {}

	toString(state: GameState): string {
		return `${state.attendants[this.attendantID].name || 'プレイヤー ' + (this.attendantID + 1)} 正解`;
	}

	reducer(state: GameState): GameState {
		const att = state.attendants[this.attendantID];

		state.increaseQuestionCount();
		const { maruCount, score, life, trophyCount, yasuCount, otherScoreDiff } = att.processMaru(
			this.multiplier
		);

		if (att.life === 'alive' && life === 'won') {
			state.latestEvent = { type: 'won', attendantID: this.attendantID };
		}

		att.maruCount = maruCount;
		att.score = score;
		att.life = life;
		att.trophyCount = trophyCount;
		att.yasuCount = yasuCount;

		if (life === 'alive' && att.processMaru().life === 'won') {
			state.latestEvent = { type: 'lizhi', attendantID: this.attendantID };
		}

		if (otherScoreDiff !== 0) {
			state.attendants.forEach((a, i) => {
				if (i !== this.attendantID && a.life === 'alive') {
					a.score += otherScoreDiff;
					if (a.score <= 0) {
						a.life = 'lost';
					}
				}
			});
		}

		return state;
	}
}

export class BatsuHistoryEntry implements HistoryEntry {
	type = 'batsu' as const;

	constructor(public attendantID: number) {}

	toString(state: GameState): string {
		return `${state.attendants[this.attendantID].name || 'プレイヤー ' + (this.attendantID + 1)} 誤答`;
	}

	reducer(state: GameState): GameState {
		const att = state.attendants[this.attendantID];

		const { maruCount, batsuCount, score, life, yasuCount } = att.processBatsu();
		att.maruCount = maruCount;
		att.batsuCount = batsuCount;
		att.score = score;
		att.life = life;
		att.yasuCount = yasuCount;

		return state;
	}
}

export class ThroughHistoryEntry implements HistoryEntry {
	type = 'through' as const;

	toString(): string {
		return 'スルー';
	}

	reducer(state: GameState): GameState {
		state.increaseQuestionCount();
		return state;
	}
}

export class RemoveHistoryEntry implements HistoryEntry {
	type = 'remove' as const;

	constructor(public attendantID: number) {}

	toString(state: GameState): string {
		return `${state.attendants[this.attendantID].name || 'プレイヤー ' + (this.attendantID + 1)} 削除`;
	}

	reducer(state: GameState): GameState {
		state.attendants[this.attendantID].life = 'removed';
		state.ranking = state.ranking.filter((i) => i !== this.attendantID);
		return state;
	}
}

export class LoseHistoryEntry implements HistoryEntry {
	type = 'lose' as const;

	constructor(public attendantID: number) {}

	toString(state: GameState): string {
		return `${state.attendants[this.attendantID].name || 'プレイヤー ' + (this.attendantID + 1)} 失格`;
	}

	reducer(state: GameState): GameState {
		state.attendants[this.attendantID].life = 'lost';
		return state;
	}
}

export class EditHistoryEntry implements HistoryEntry {
	type = 'edit' as const;

	constructor(
		public attendantID: number,
		public newState: AttendantState
	) {}

	toString(state: GameState): string {
		return `${state.attendants[this.attendantID].name || 'プレイヤー ' + (this.attendantID + 1)} 手編集`;
	}

	reducer(state: GameState): GameState {
		state.attendants[this.attendantID].trophyCount = this.newState.trophyCount;
		state.attendants[this.attendantID].life = this.newState.life;
		state.attendants[this.attendantID].maruCount = this.newState.maruCount;
		state.attendants[this.attendantID].batsuCount = this.newState.batsuCount;
		state.attendants[this.attendantID].yasuCount = this.newState.yasuCount;
		return state;
	}
}

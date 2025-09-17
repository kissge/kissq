import { GameState } from './state';

export abstract class HistoryEntry {
	abstract toString(state: GameState): string;
	abstract reducer(state: GameState): GameState;
}

export class MaruHistoryEntry implements HistoryEntry {
	type = 'maru' as const;

	constructor(public attendantID: number) {}

	toString(state: GameState): string {
		return `${state.attendants[this.attendantID].name} 正解`;
	}

	reducer(state: GameState): GameState {
		const att = state.attendants[this.attendantID];

		state.increaseQuestionCount();
		const { maruCount, score, life, trophyCount, yasuCount, otherScoreDiff } = att.processMaru();

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
		return `${state.attendants[this.attendantID].name} 誤答`;
	}

	reducer(state: GameState): GameState {
		const att = state.attendants[this.attendantID];

		const { batsuCount, score, life, yasuCount } = att.processBatsu();
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
		return `${state.attendants[this.attendantID].name} 削除`;
	}

	reducer(state: GameState): GameState {
		state.attendants[this.attendantID].life = 'removed';
		state.ranking = state.ranking.filter((i) => i !== this.attendantID);
		return state;
	}
}

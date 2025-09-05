import { GameState } from './state';

export abstract class HistoryEntry {
	abstract toString(state: GameState): string;
	abstract reducer(state: GameState): GameState;
}

export class MaruHistoryEntry implements HistoryEntry {
	constructor(public attendantID: number) {}

	toString(state: GameState): string {
		return `${state.attendants[this.attendantID].name} 正解`;
	}

	reducer(state: GameState): GameState {
		const att = state.attendants[this.attendantID];

		att.score += att.rule.maru;
		att.maruCount += att.rule.maru;
		state.increaseQuestionCount();

		switch (att.rule.mode) {
			case 'marubatsu':
				if (att.maruCount >= att.rule.win) {
					att.life = 'won';
				}
				return state;

			case 'score':
				if (att.score >= att.rule.win) {
					att.life = 'won';
				}
				return state;
		}
	}
}

export class BatsuHistoryEntry implements HistoryEntry {
	constructor(public attendantID: number) {}

	toString(state: GameState): string {
		return `${state.attendants[this.attendantID].name} 誤答`;
	}

	reducer(state: GameState): GameState {
		const att = state.attendants[this.attendantID];

		att.score += att.rule.batsu;
		att.batsuCount += att.rule.batsu;

		if (att.rule.lose !== null) {
			switch (att.rule.mode) {
				case 'marubatsu':
					if (att.batsuCount >= att.rule.lose) {
						att.life = 'lost';
					} else {
						att.yasuCount = 'next';
					}
					return state;

				case 'score':
					if (att.score <= att.rule.lose) {
						att.life = 'lost';
					} else {
						att.yasuCount = 'next';
					}
					return state;
			}
		}
	}
}

export class ThroughHistoryEntry implements HistoryEntry {
	toString(): string {
		return `スルー`;
	}

	reducer(state: GameState): GameState {
		state.increaseQuestionCount();
		return state;
	}
}

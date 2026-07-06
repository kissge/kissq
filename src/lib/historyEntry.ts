import type { Penalty } from './rule';
import { GameState, type AttendantStateValue } from './state';

abstract class HistoryEntry {
	abstract type: string;
	abstract toString(state: GameState): string;
	abstract reducer(state: GameState): GameState;
	abstract reducerTeam(state: GameState): GameState;
}

type HistoryEntryType =
	| MaruHistoryEntry
	| BatsuHistoryEntry
	| ThroughHistoryEntry
	| RemoveHistoryEntry
	| WinHistoryEntry
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
			if (att.rule.transit) {
				state.latestEvent = { type: 'transit', attendantID: this.attendantID };
			} else {
				state.latestEvent = { type: 'lizhi', attendantID: this.attendantID };
			}
		}

		if (otherScoreDiff === 'transit') {
			if (state.latestEvent?.type !== 'transit') {
				state.attendants.forEach((a) => {
					if (a.isLizhi) {
						a.score = 0;
					}
				});
			}
		} else if (otherScoreDiff !== 0) {
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

	reducerTeam(state: GameState): GameState {
		const { team } = state.getTeamByAttendantID(this.attendantID);
		const att = state.attendants[this.attendantID];

		state.increaseQuestionCount();
		const { maruCount, score, life, trophyCount, yasuCount, otherScoreDiff, teamScore, teamLife } =
			team.processMaru(this.attendantID, this.multiplier);

		if (team.teamLife === 'alive' && teamLife === 'won') {
			state.latestEvent = { type: 'won', team };
		}

		att.maruCount = maruCount;
		att.score = score;
		att.life = life;
		att.trophyCount = trophyCount;
		att.yasuCount = yasuCount;
		team.teamScore = teamScore;
		team.teamLife = teamLife;

		if (
			teamLife === 'alive' &&
			team.processMaru(this.attendantID, this.multiplier).teamLife === 'won'
		) {
			if (att.rule.transit) {
				state.latestEvent = { type: 'transit', team };
			} else {
				state.latestEvent = { type: 'lizhi', team };
			}
		}

		// if (otherScoreDiff === 'transit') {
		// 	if (state.latestEvent?.type !== 'transit') {
		// 		state.attendants.forEach((a) => {
		// 			if (a.isLizhi) {
		// 				a.score = 0;
		// 			}
		// 		});
		// 	}
		// } else if (otherScoreDiff !== 0) {
		// 	state.attendants.forEach((a, i) => {
		// 		if (i !== this.attendantID && a.life === 'alive') {
		// 			a.score += otherScoreDiff;
		// 			if (a.score <= 0) {
		// 				a.life = 'lost';
		// 			}
		// 		}
		// 	});
		// }

		return state;
	}
}

export class BatsuHistoryEntry implements HistoryEntry {
	type = 'batsu' as const;

	constructor(
		public attendantID: number,
		public penalty: Penalty | null = null
	) {}

	toString(state: GameState): string {
		return `${state.attendants[this.attendantID].name || 'プレイヤー ' + (this.attendantID + 1)} 誤答`;
	}

	reducer(state: GameState): GameState {
		const att = state.attendants[this.attendantID];

		const { maruCount, batsuCount, score, life, yasuCount } = att.processBatsu(this.penalty);
		att.maruCount = maruCount;
		att.batsuCount = batsuCount;
		att.score = score;
		att.life = life;
		att.yasuCount = yasuCount;
		att.lastPenalty = this.penalty;

		return state;
	}

	reducerTeam(state: GameState): GameState {
		const { ti, team } = state.getTeamByAttendantID(this.attendantID);
		const att = state.attendants[this.attendantID];

		const { maruCount, batsuCount, score, life, yasuCount, teamScore, teamLife } =
			team.processBatsu(this.attendantID, this.penalty);
		att.maruCount = maruCount;
		att.batsuCount = batsuCount;
		att.score = score;
		att.life = life;
		att.yasuCount = yasuCount;
		att.lastPenalty = this.penalty;
		team.teamScore = teamScore;
		team.teamLife = teamLife;

		if (att.rule.mode === 'aql') {
			// TODO: 相手チームの封鎖を解除し、1×に戻す
			for (const [ti2, team2] of state.teams.entries()) {
				if (ti === ti2) {
					continue;
				}

				for (const seat of team2.attendantIDsPerSeat) {
					for (const ai of seat) {
						const att = state.attendants[ai];
						if (att.life === 'lost') {
							att.life = 'alive';
							--att.batsuCount;
							break;
						}
					}
				}
			}
		}

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

	reducerTeam(state: GameState): GameState {
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

	reducerTeam(state: GameState): GameState {
		state.attendants[this.attendantID].life = 'removed';
		state.ranking = state.ranking.filter((i) => i !== this.attendantID);
		return state;
	}
}

export class WinHistoryEntry implements HistoryEntry {
	type = 'win' as const;

	constructor(public attendantID: number) {}

	toString(state: GameState): string {
		return `${state.attendants[this.attendantID].name || 'プレイヤー ' + (this.attendantID + 1)} 勝利`;
	}

	reducer(state: GameState): GameState {
		state.attendants[this.attendantID].life = 'won';
		state.attendants[this.attendantID].trophyCount++;
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
		public newState: AttendantStateValue
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
		state.attendants[this.attendantID].score = this.newState.score;
		return state;
	}
}

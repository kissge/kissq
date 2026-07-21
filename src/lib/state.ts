import type { Attendant } from './attendant';
import { Rule, type Penalty } from './rule';

export type Life = 'alive' | 'won' | 'lost' | 'removed';
export class AttendantState {
	lastPenalty: Penalty | null = null;

	constructor(
		public name: string,
		public attendantID: number,
		public manualOrder: number,
		public rule: Rule,
		public team: TeamState | null = null,
		public trophyCount: number = 0,
		public totalScore: { num: number; den: number } = { num: 0, den: 0 },
		public life: Life = 'alive',
		public score: number = 0,
		public maruCount: number = 0,
		public batsuCount: number = 0,
		public yasuCount: number | 'next' = 0
	) {
		if (rule.mode === 'survival') {
			this.score = rule.lose!;
		}
	}

	/** マルを受けた場合のstateの変化を求める（破壊的にはしない） */
	processMaru(multiplier: number = 1): {
		maruCount: number;
		score: number;
		life: Life;
		trophyCount: number;
		yasuCount: number | 'next';
		otherScoreDiff: number | 'transit';
	} {
		let maruCount = this.maruCount;
		let score = this.score;
		let life = this.life;
		let trophyCount = this.trophyCount;
		let yasuCount = this.yasuCount;
		let otherScoreDiff: number | 'transit' = 0;

		if (this.life !== 'alive') {
			return { maruCount, score, life, trophyCount, yasuCount, otherScoreDiff };
		}

		switch (this.rule.mode) {
			case 'marubatsu':
				maruCount += this.rule.maru * multiplier;
				if (maruCount >= this.rule.win) {
					life = 'won';
					trophyCount++;
				} else if (this.rule.yasuPerMaru && maruCount % this.rule.yasuPerMaru.maru === 0) {
					yasuCount = this.rule.yasuPerMaru.yasu;
				}
				return { maruCount, score, life, trophyCount, yasuCount, otherScoreDiff };

			case 'score':
				maruCount++;
				score += this.rule.maru * multiplier;
				if (score >= this.rule.win) {
					life = 'won';
					trophyCount++;
				} else if (this.rule.yasuPerMaru && maruCount % this.rule.yasuPerMaru.maru === 0) {
					yasuCount = this.rule.yasuPerMaru.yasu;
				}

				if (this.rule.transit) {
					otherScoreDiff = 'transit';
				}
				return { maruCount, score, life, trophyCount, yasuCount, otherScoreDiff };

			case 'MbyN':
				maruCount += this.rule.maru * multiplier;
				score = maruCount * (this.rule.win - this.batsuCount);
				if (score >= this.rule.win ** 2) {
					life = 'won';
					trophyCount++;
				} else if (this.rule.yasuPerMaru && maruCount % this.rule.yasuPerMaru.maru === 0) {
					yasuCount = this.rule.yasuPerMaru.yasu;
				}
				return { maruCount, score, life, trophyCount, yasuCount, otherScoreDiff };

			case 'survival':
				maruCount++;
				otherScoreDiff = -this.rule.maru * multiplier;
				if (this.rule.yasuPerMaru && maruCount % this.rule.yasuPerMaru.maru === 0) {
					yasuCount = this.rule.yasuPerMaru.yasu;
				}
				return { maruCount, score, life, trophyCount, yasuCount, otherScoreDiff };

			case 'aql':
			case 'product':
			case 'sum':
				if (this.rule.yasuPerMaru && maruCount % this.rule.yasuPerMaru.maru === 0) {
					yasuCount = this.rule.yasuPerMaru.yasu;
				}

				maruCount++;
				score += this.rule.maru * multiplier;

				return { maruCount, score, life, trophyCount, yasuCount, otherScoreDiff };
		}
	}

	/** バツを受けた場合のstateの変化を求める（破壊的にはしない） */
	processBatsu(
		penalty: Penalty | null = null,
		attendantsPerSeat?: (AttendantState[] | undefined)[]
	): {
		maruCount: number;
		batsuCount: number;
		score: number;
		life: Life;
		yasuCount: number | 'next';
	} {
		let maruCount = this.maruCount;
		let batsuCount = this.batsuCount;
		let score = this.score;
		let life = this.life;
		let yasuCount = this.yasuCount;

		switch (this.rule.mode) {
			case 'marubatsu':
				batsuCount +=
					this.rule.batsu === 'batsu'
						? /** dummy */ 1
						: this.rule.batsu === 'updown'
							? 1
							: this.rule.batsu;

				if (
					this.rule.batsu === 'updown' ||
					(this.rule.yasuMode === 'roulette' && penalty?.type === 'zero')
				) {
					maruCount = 0;
				}

				if (this.rule.lose !== null && batsuCount >= this.rule.lose) {
					life = 'lost';
				} else {
					yasuCount = 'next';
				}

				return { maruCount, batsuCount, score, life, yasuCount };

			case 'score':
				batsuCount++;
				score +=
					this.rule.batsu === 'batsu'
						? -batsuCount
						: this.rule.batsu === 'updown'
							? /** dummy */ -batsuCount
							: this.rule.batsu;

				if (this.rule.transit && this.isLizhi) {
					score = 0;
				}

				if (this.rule.yasuMode === 'roulette' && penalty?.type === 'zero') {
					score = 0;
				}

				if (this.rule.lose !== null && score <= this.rule.lose) {
					life = 'lost';
				} else {
					yasuCount = 'next';
				}

				return { maruCount, batsuCount, score, life, yasuCount };

			case 'MbyN':
				batsuCount +=
					this.rule.batsu === 'batsu' || this.rule.batsu === 'updown'
						? /** dummy */ 1
						: this.rule.batsu;
				score = this.maruCount * (this.rule.win - batsuCount);
				if (this.rule.yasuMode === 'roulette' && penalty?.type === 'zero') {
					score = 0;
				}

				if (this.rule.win - batsuCount <= 0) {
					life = 'lost';
				} else {
					yasuCount = 'next';
				}

				return { maruCount, batsuCount, score, life, yasuCount };

			case 'survival':
				batsuCount++;
				score +=
					this.rule.batsu === 'batsu'
						? -batsuCount
						: this.rule.batsu === 'updown'
							? /** dummy */ 1
							: this.rule.batsu;
				if (this.rule.yasuMode === 'roulette' && penalty?.type === 'zero') {
					score = 0;
				}

				if (score <= 0) {
					score = 0;
					life = 'lost';
				} else {
					yasuCount = 'next';
				}

				return { maruCount, batsuCount, score, life, yasuCount };

			case 'aql':
				++batsuCount;
				if (
					(attendantsPerSeat
						?.find((seat) => seat?.includes(this))
						?.reduce((sum, att) => sum + att.batsuCount, 1) ?? 0) >= 2
				) {
					life = 'lost';
				}
				score = 0;

				return { maruCount, batsuCount, score, life, yasuCount };

			case 'product':
				++batsuCount;
				score = Math.max(
					score +
						(this.rule.batsu === 'batsu'
							? -batsuCount
							: this.rule.batsu === 'updown'
								? -score
								: this.rule.batsu),
					0
				);

				if (this.rule.lose !== null && score <= this.rule.lose) {
					life = 'lost';
				} else {
					yasuCount = 'next';
				}

				return { maruCount, batsuCount, score, life, yasuCount };

			case 'sum':
				++batsuCount;
				score +=
					this.rule.batsu === 'batsu'
						? -batsuCount
						: this.rule.batsu === 'updown'
							? -score
							: this.rule.batsu;

				if (this.rule.lose !== null && score <= this.rule.lose) {
					life = 'lost';
				} else {
					yasuCount = 'next';
				}

				return { maruCount, batsuCount, score, life, yasuCount };
		}
	}

	decreaseYasu(): void {
		if (this.yasuCount === 'next') {
			this.yasuCount = this.yasuDisplay;
		} else if (this.yasuCount > 0) {
			this.yasuCount--;
		}
	}

	get yasuDisplay(): number {
		if (this.yasuCount === 'next') {
			if (this.rule.yasuMode === 'maru') {
				return (this.maruCount || 1) * this.rule.yasuPerBatsu;
			} else if (this.rule.yasuMode === 'batsu') {
				return this.batsuCount * this.rule.yasuPerBatsu;
			} else if (this.rule.yasuMode === 'roulette') {
				return this.lastPenalty?.type === 'yasu' ? this.lastPenalty.count : 0;
			} else {
				return this.rule.yasuPerBatsu;
			}
		} else {
			return this.yasuCount;
		}
	}

	get isLizhi(): boolean {
		if (this.team) {
			return (
				this.team.teamLife === 'alive' && this.team.processMaru(this.attendantID).teamLife === 'won'
			);
		} else {
			return this.life === 'alive' && this.processMaru().life === 'won';
		}
	}

	get isLoseLizhi(): boolean {
		return this.life === 'alive' && this.processBatsu().life === 'lost';
	}

	toJSON() {
		return {
			...this,
			yasuDisplay: this.yasuDisplay,
			isLizhi: this.isLizhi,
			isLoseLizhi: this.isLoseLizhi
		};
	}
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _ = { ...({} as AttendantState) };
export type AttendantStateValue = typeof _;

export class TeamState {
	teamScore: number = 0;
	teamLife: Life = 'alive';

	constructor(
		public attendantIDsPerSeat: (number[] | undefined)[],
		public attendants: AttendantState[]
	) {
		if (this.attendants[0].rule.mode === 'aql') {
			this.teamScore = 1;
		}
	}

	processMaru(
		attendantID: number,
		multiplier: number = 1
	): {
		maruCount: number;
		score: number;
		life: Life;
		trophyCount: number;
		yasuCount: number | 'next';
		otherScoreDiff: number | 'transit';
		teamScore: number;
		teamLife: Life;
	} {
		// eslint-disable-next-line prefer-const
		let { maruCount, score, life, trophyCount, yasuCount, otherScoreDiff } =
			this.attendants[attendantID].processMaru(multiplier);
		let teamScore, teamLife;

		switch (this.attendants[0].rule.mode) {
			case 'aql':
			case 'sum':
				teamScore = this.calculateTeamScore(attendantID, score);
				teamLife = this.attendants[0].rule.win <= teamScore ? 'won' : this.teamLife;

				return {
					maruCount,
					score,
					life,
					trophyCount,
					yasuCount,
					otherScoreDiff,
					teamScore,
					teamLife
				};

			case 'product':
				teamScore = this.calculateTeamScore(attendantID, score);
				teamLife = this.attendants[0].rule.win <= teamScore ? 'won' : this.teamLife;

				if (this.attendants[attendantID].rule.lose != null) {
					if (score >= this.attendants[attendantID].rule.lose) {
						life = 'lost';
					}
				}

				return {
					maruCount,
					score,
					life,
					trophyCount,
					yasuCount,
					otherScoreDiff,
					teamScore,
					teamLife
				};

			case 'marubatsu':
			case 'MbyN':
			case 'score':
			case 'survival':
				throw new Error();
		}
	}

	processBatsu(
		attendantID: number,
		penalty: Penalty | null = null
	): {
		maruCount: number;
		batsuCount: number;
		score: number;
		life: Life;
		yasuCount: number | 'next';
		teamScore: number;
		teamLife: Life;
	} {
		const { maruCount, batsuCount, score, life, yasuCount } = this.attendants[
			attendantID
		].processBatsu(
			penalty,
			this.attendantIDsPerSeat.map((seat) => seat?.map((id) => this.attendants[id]))
		);

		let teamScore, teamLife;

		switch (this.attendants[0].rule.mode) {
			case 'aql':
			case 'product':
			case 'sum':
				teamScore = this.calculateTeamScore(attendantID, score);
				teamLife = this.teamLife;

				return { maruCount, batsuCount, score, life, yasuCount, teamScore, teamLife };

			case 'marubatsu':
			case 'MbyN':
			case 'score':
			case 'survival':
				throw new Error();
		}
	}

	calculateTeamScore(attendantID?: number, score?: number): number {
		switch (this.attendants[0].rule.mode) {
			case 'aql':
				return Math.min(
					this.attendantIDsPerSeat.reduce(
						(prod, seat) =>
							prod *
							(seat ?? []).reduce(
								(sum, id) =>
									sum +
									(this.attendants[id].life === 'removed'
										? 0
										: id === attendantID
											? score!
											: this.attendants[id].score),
								1
							),
						1
					),
					this.attendants[0].rule.win
				);

			case 'product':
				return this.attendantIDsPerSeat.reduce(
					(prod, seat) =>
						prod *
						(seat ?? []).reduce(
							(sum, id) =>
								sum +
								(this.attendants[id].life === 'removed'
									? 0
									: id === attendantID
										? score!
										: this.attendants[id].score),
							0
						),
					1
				);

			case 'sum':
				return this.attendantIDsPerSeat
					.filter((seat): seat is number[] => seat != undefined)
					.flat()
					.reduce(
						(sum, id) =>
							sum +
							(this.attendants[id].life === 'removed'
								? 0
								: id === attendantID
									? score!
									: this.attendants[id].score),
						0
					);

			case 'marubatsu':
			case 'MbyN':
			case 'score':
			case 'survival':
				throw new Error();
		}
	}
}

export type GameEventType = 'won' | 'lizhi' | 'double-lizhi' | 'effect2' | 'effect3' | 'transit';

export type GameEvent =
	| {
			type: GameEventType;
			attendantID: number;
	  }
	| {
			type: GameEventType;
			teamID: number;
	  };

export class GameState {
	attendants: AttendantState[];
	teams: TeamState[];
	questionCount: number = 1;
	defaultRule: Rule;
	/** 個人ランキング (single) or チームランキング (team) */
	ranking: number[] = [];
	latestEvent: GameEvent | null = null;

	constructor(attendants: Attendant[], rules: Rule[], teams: string[] = []) {
		this.attendants = attendants.map(
			({ name, group, trophyCount, totalScore, manualOrder }, attendantID) =>
				new AttendantState(
					name,
					attendantID,
					manualOrder,
					rules[group],
					null,
					trophyCount,
					totalScore
				)
		);
		this.teams = attendants
			.reduce<number[][][]>(
				(acc, att, i) => {
					acc[att.team] ??= [];
					acc[att.team][att.seat] ??= [];
					acc[att.team][att.seat].push(i);
					return acc;
				},
				teams.map(() => [])
			)
			.map((attendantIDsPerSeat) => new TeamState(attendantIDsPerSeat, this.attendants));

		if (teams.length > 0) {
			this.attendants.forEach((att) => {
				att.team = this.teams[attendants[att.attendantID].team];
			});
		}

		this.defaultRule = rules[0];
		this.ranking = (
			this.defaultRule.mode === 'aql' ||
			this.defaultRule.mode === 'product' ||
			this.defaultRule.mode === 'sum'
				? this.teams
				: this.attendants
		).map((_, i) => i);
	}

	increaseQuestionCount(): void {
		this.questionCount++;
		this.attendants.forEach((att) => {
			if (att.life === 'alive') {
				att.decreaseYasu();
			}
		});
	}

	clearLatestEvent(): GameState {
		this.latestEvent = null;
		return this;
	}

	updateRanking(): GameState {
		// sortが安定ソートであることに依存している

		switch (this.defaultRule.mode) {
			case 'score':
			case 'MbyN':
			case 'survival':
				this.ranking.sort((ai, bi) => {
					const a = this.attendants[ai];
					const b = this.attendants[bi];

					const bothAlive = a.life === 'alive' && b.life === 'alive';

					if (bothAlive) {
						// 両方生存している場合はスコア順
						return (
							b.score - a.score ||
							b.totalScore.num * a.totalScore.den - a.totalScore.num * b.totalScore.den
						);
					} else {
						const aWon = a.life === 'won' ? 1 : 0;
						const bWon = b.life === 'won' ? 1 : 0;
						const aLost = a.life === 'lost' ? 1 : 0;
						const bLost = b.life === 'lost' ? 1 : 0;
						return bWon - aWon || aLost - bLost;
					}
				});
				return this;

			case 'marubatsu':
				this.ranking.sort((ai, bi) => {
					const a = this.attendants[ai];
					const b = this.attendants[bi];

					const bothAlive = a.life === 'alive' && b.life === 'alive';

					if (bothAlive) {
						// 両方生存している場合はマル数順、バツ数逆順
						return (
							b.maruCount - a.maruCount ||
							a.batsuCount - b.batsuCount ||
							b.totalScore.num * a.totalScore.den - a.totalScore.num * b.totalScore.den
						);
					} else {
						const aWon = a.life === 'won' ? 1 : 0;
						const bWon = b.life === 'won' ? 1 : 0;
						const aLost = a.life === 'lost' ? 1 : 0;
						const bLost = b.life === 'lost' ? 1 : 0;
						return bWon - aWon || aLost - bLost;
					}
				});
				return this;

			case 'aql':
			case 'product':
			case 'sum':
				this.ranking.sort((ai, bi) => {
					const a = this.teams[ai];
					const b = this.teams[bi];

					const bothAlive = a.teamLife === 'alive' && b.teamLife === 'alive';

					if (bothAlive) {
						// 両方生存している場合はスコア順
						return b.teamScore - a.teamScore;
					} else {
						const aWon = a.teamLife === 'won' ? 1 : 0;
						const bWon = b.teamLife === 'won' ? 1 : 0;
						const aLost = a.teamLife === 'lost' ? 1 : 0;
						const bLost = b.teamLife === 'lost' ? 1 : 0;
						return bWon - aWon || aLost - bLost;
					}
				});
				return this;
		}
	}

	checkIfLastSurvivor(): GameState {
		if (this.defaultRule.mode === 'survival') {
			let survivor = null;

			for (const [id, att] of this.attendants.entries()) {
				if (att.life === 'alive') {
					if (survivor !== null) {
						// 2人以上生き残っている
						return this;
					}

					survivor = id;
				}
			}

			if (survivor !== null) {
				this.attendants[survivor].life = 'won';
				this.attendants[survivor].trophyCount++;
				this.latestEvent = { type: 'won', attendantID: survivor };
			}
		}

		return this;
	}

	getTeamByAttendantID(attendantID: number) {
		const ti = this.teams.findIndex((team) =>
			team.attendantIDsPerSeat.some((ids) => ids?.includes(attendantID))
		);

		return { ti, team: this.teams[ti] };
	}
}

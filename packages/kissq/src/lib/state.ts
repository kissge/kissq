import { Rule, type Penalty, type RuleType } from './rule';
import { AttendantID, BrandedArray, TeamID } from './types';
import { arrayCompare } from './utils';

import type { Attendant } from './attendant';
import type { HistoryEntry } from './historyEntry';

export type Life = 'alive' | 'won' | 'lost' | 'removed';
export class AttendantState {
	lastPenalty: Penalty | null = null;

	constructor(
		public name: string,
		public attendantID: AttendantID,
		public manualOrder: number,
		public group: number,
		public nickname: string | undefined,
		public rule: Rule,
		public history: HistoryEntry[],
		public team: TeamState | null = null,
		public trophyCount: number = 0,
		public totalScore: { maru: number; batsu: number } = { maru: 0, batsu: 0 },
		public life: Life = 'alive',
		public lifeChangedAt: number | null = null,
		public score: number = 0,
		public maruCount: number = 0,
		public batsuCount: number = 0,
		public yasuCount: number | 'next' = 0,
		public trueMaruCount: number = 0,
		public trueBatsuCount: number = 0
	) {
		if (rule.mode === 'survival') {
			this.score = rule.lose!;
		}
	}

	/** マルを受けた場合のstateの変化を求める（破壊的にはしない） */
	processMaru(
		multiplier: number,
		assumeNextMaru: boolean
	): {
		maruCount: number;
		score: number;
		life: Life;
		trophyCount: number;
		yasuCount: number | 'next';
		otherScoreDiff: number | 'transit';
	} {
		const comboBonus = this.calculateComboBonus(assumeNextMaru);

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
				maruCount += this.rule.maru * multiplier * comboBonus;
				if (maruCount >= this.rule.win) {
					life = 'won';
					trophyCount++;
				} else if (this.rule.yasuPerMaru) {
					if ('mode' in this.rule.yasuPerMaru) {
						const loopLength = Math.max(
							...Object.keys(this.rule.yasuPerMaru.dict).map((m) => Number(m))
						);
						const maruCountMod = maruCount % loopLength || loopLength;
						if (maruCountMod in this.rule.yasuPerMaru.dict) {
							yasuCount = this.rule.yasuPerMaru.dict[maruCountMod];
						}
					} else {
						if (maruCount % this.rule.yasuPerMaru.maru === 0) {
							if (this.rule.yasuPerMaru.yasu === 'maru') {
								yasuCount = maruCount;
							} else {
								yasuCount = this.rule.yasuPerMaru.yasu;
							}
						}
					}
				}
				return { maruCount, score, life, trophyCount, yasuCount, otherScoreDiff };

			case 'score':
				maruCount++;
				score += this.rule.maru * multiplier * comboBonus;
				if (score >= this.rule.win) {
					life = 'won';
					trophyCount++;
				} else if (this.rule.yasuPerMaru) {
					if ('mode' in this.rule.yasuPerMaru) {
						const loopLength = Math.max(
							...Object.keys(this.rule.yasuPerMaru.dict).map((m) => Number(m))
						);
						const maruCountMod = maruCount % loopLength || loopLength;
						if (maruCountMod in this.rule.yasuPerMaru.dict) {
							yasuCount = this.rule.yasuPerMaru.dict[maruCountMod];
						}
					} else {
						if (maruCount % this.rule.yasuPerMaru.maru === 0) {
							if (this.rule.yasuPerMaru.yasu === 'maru') {
								yasuCount = maruCount;
							} else {
								yasuCount = this.rule.yasuPerMaru.yasu;
							}
						}
					}
				}

				if (this.rule.transit) {
					otherScoreDiff = 'transit';
				}
				return { maruCount, score, life, trophyCount, yasuCount, otherScoreDiff };

			case 'MbyN':
				maruCount += this.rule.maru * multiplier * comboBonus;
				score = maruCount * (this.rule.win - this.batsuCount);
				if (score >= this.rule.win ** 2) {
					life = 'won';
					trophyCount++;
				} else if (this.rule.yasuPerMaru) {
					if ('mode' in this.rule.yasuPerMaru) {
						const loopLength = Math.max(
							...Object.keys(this.rule.yasuPerMaru.dict).map((m) => Number(m))
						);
						const maruCountMod = maruCount % loopLength || loopLength;
						if (maruCountMod in this.rule.yasuPerMaru.dict) {
							yasuCount = this.rule.yasuPerMaru.dict[maruCountMod];
						}
					} else {
						if (maruCount % this.rule.yasuPerMaru.maru === 0) {
							if (this.rule.yasuPerMaru.yasu === 'maru') {
								yasuCount = maruCount;
							} else {
								yasuCount = this.rule.yasuPerMaru.yasu;
							}
						}
					}
				}
				return { maruCount, score, life, trophyCount, yasuCount, otherScoreDiff };

			case 'survival':
				maruCount++;
				otherScoreDiff = -this.rule.maru * multiplier * comboBonus;
				if (this.rule.yasuPerMaru) {
					if ('mode' in this.rule.yasuPerMaru) {
						const loopLength = Math.max(
							...Object.keys(this.rule.yasuPerMaru.dict).map((m) => Number(m))
						);
						const maruCountMod = maruCount % loopLength || loopLength;
						if (maruCountMod in this.rule.yasuPerMaru.dict) {
							yasuCount = this.rule.yasuPerMaru.dict[maruCountMod];
						}
					} else {
						if (maruCount % this.rule.yasuPerMaru.maru === 0) {
							if (this.rule.yasuPerMaru.yasu === 'maru') {
								yasuCount = maruCount;
							} else {
								yasuCount = this.rule.yasuPerMaru.yasu;
							}
						}
					}
				}
				return { maruCount, score, life, trophyCount, yasuCount, otherScoreDiff };

			case 'aql':
			case 'product':
			case 'sum':
				maruCount++;
				score += this.rule.maru * multiplier * comboBonus;

				if (this.rule.yasuPerMaru) {
					if ('mode' in this.rule.yasuPerMaru) {
						const loopLength = Math.max(
							...Object.keys(this.rule.yasuPerMaru.dict).map((m) => Number(m))
						);
						const maruCountMod = maruCount % loopLength || loopLength;
						if (maruCountMod in this.rule.yasuPerMaru.dict) {
							yasuCount = this.rule.yasuPerMaru.dict[maruCountMod];
						}
					} else {
						if (maruCount % this.rule.yasuPerMaru.maru === 0) {
							if (this.rule.yasuPerMaru.yasu === 'maru') {
								yasuCount = maruCount;
							} else {
								yasuCount = this.rule.yasuPerMaru.yasu;
							}
						}
					}
				}

				return { maruCount, score, life, trophyCount, yasuCount, otherScoreDiff };
		}
	}

	calculateComboBonus(assumeNextMaru: boolean): number {
		if (this.rule.combo == null) {
			return 1;
		}

		const i = assumeNextMaru
			? this.history.length
			: this.history.findLastIndex((entry) => entry.type === 'maru');
		if (
			!assumeNextMaru &&
			(i === -1 ||
				(this.history[i].type === 'maru' && this.history[i].attendantID !== this.attendantID))
		) {
			return 1;
		}

		const j = this.history.findLastIndex(
			(entry) =>
				(entry.type === 'batsu' && entry.attendantID === this.attendantID) ||
				(entry.type === 'maru' && entry.attendantID !== this.attendantID)
		);
		if (i <= j) {
			return 1;
		}

		const consecutiveMaruCount =
			this.history
				.slice(j + 1, i + 1)
				.filter((entry) => entry.type === 'maru' && entry.attendantID === this.attendantID).length +
			(assumeNextMaru ? 1 : 0);

		switch (this.rule.combo) {
			case '1212':
				return consecutiveMaruCount % 2 === 1 ? 1 : 2;
			case '1222':
				return consecutiveMaruCount === 1 ? 1 : 2;
			case '1234':
				return consecutiveMaruCount;
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
				} else if (this.rule.chance === 'single') {
					yasuCount = this.yasuActual(maruCount, this.trueBatsuCount + 1);
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
				} else if (this.rule.chance === 'single') {
					yasuCount = this.yasuActual(maruCount, this.trueBatsuCount + 1);
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

				if (
					this.rule.lose === null ? this.rule.win - batsuCount <= 0 : this.rule.lose <= batsuCount
				) {
					life = 'lost';
				} else if (this.rule.chance === 'single') {
					yasuCount = this.yasuActual(maruCount, this.trueBatsuCount + 1);
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
				} else if (this.rule.chance === 'single') {
					yasuCount = this.yasuActual(maruCount, this.trueBatsuCount + 1);
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
					this.rule.multiplyMinimum
				);

				if (this.rule.chance === 'single') {
					yasuCount = this.yasuActual(maruCount, this.trueBatsuCount + 1);
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

				if (this.rule.chance === 'single') {
					yasuCount = this.yasuActual(maruCount, this.trueBatsuCount + 1);
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

	sortScore(enableRating: boolean, mode: RuleType | 'mixed'): number[] {
		switch (mode) {
			case 'score':
			case 'MbyN':
			case 'survival':
			case 'aql':
			case 'product':
			case 'sum':
				return [
					// Life
					this.life === 'won' ? 1 : this.life === 'lost' ? -1 : 0,
					// When did life change (inverse)
					-(this.lifeChangedAt ?? 0),
					// Score
					this.score,
					// Rate
					enableRating ? this.rate : 0
				];

			case 'marubatsu':
				return [
					// Life
					this.life === 'won' ? 1 : this.life === 'lost' ? -1 : 0,
					// When did life change (inverse)
					-(this.lifeChangedAt ?? 0),
					// Maru
					this.maruCount,
					// Batsu (inverse)
					-this.batsuCount,
					// Rate
					enableRating ? this.rate : 0
				];

			case 'mixed':
				return [
					// Life
					this.life === 'won' ? 1 : this.life === 'lost' ? -1 : 0,
					// When did life change (inverse)
					-(this.lifeChangedAt ?? 0),
					// Rate
					enableRating ? this.rate : 0
				];
		}
	}

	sortTotalScore(enableRating: boolean): number[] {
		return [
			// Maru
			this.totalScore.maru + this.maruCount,
			// Batsu (inverse)
			-(this.totalScore.batsu + this.batsuCount),
			// Trophy
			this.trophyCount + (this.life === 'won' ? 1 : 0),
			// Rate
			enableRating ? this.rate : 0
		];
	}

	get yasuDisplay(): number {
		if (this.yasuCount === 'next') {
			return this.yasuActual(this.maruCount, this.trueBatsuCount);
		} else {
			return this.yasuCount;
		}
	}

	yasuActual(maruCount: number, trueBatsuCount: number): number {
		if (this.rule.yasuMode === 'maru') {
			return (maruCount || 1) * this.rule.yasuPerBatsu;
		} else if (this.rule.yasuMode === 'batsu') {
			return trueBatsuCount * this.rule.yasuPerBatsu;
		} else if (this.rule.yasuMode === 'roulette') {
			return this.lastPenalty?.type === 'yasu' ? this.lastPenalty.count : 0;
		} else {
			return this.rule.yasuPerBatsu;
		}
	}

	get isLizhi(): boolean {
		if (this.team) {
			return (
				this.team.teamLife === 'alive' &&
				this.team.processMaru(this.attendantID, 1, true).teamLife === 'won'
			);
		} else {
			return this.life === 'alive' && this.processMaru(1, true).life === 'won';
		}
	}

	get isLoseLizhi(): boolean {
		return this.life === 'alive' && this.processBatsu().life === 'lost';
	}

	get rate(): number {
		const alpha = 20;
		const beta = 30;

		const maru = this.totalScore.maru + this.maruCount;
		const batsu = this.totalScore.batsu + this.batsuCount;

		return ((maru + alpha) / (maru + batsu + beta)) * Math.log10(maru + batsu + 1);
	}

	toJSON() {
		return {
			// oxlint-disable-next-line no-misused-spread
			...this,
			// oxlint-disable-next-line no-unused-vars
			team: this.team && (({ attendants, ...rest }) => rest)(this.team), // Avoid circular reference
			yasuDisplay: this.yasuDisplay,
			isLizhi: this.isLizhi,
			isLoseLizhi: this.isLoseLizhi
		};
	}
}

// oxlint-disable-next-line no-misused-spread
const _ = { ...({} as AttendantState) };
export type AttendantStateValue = typeof _;

export class TeamState {
	teamScore: number = 0;
	teamLife: Life = 'alive';

	constructor(
		public attendantIDsPerSeat: (AttendantID[] | undefined)[],
		public attendants: BrandedArray<AttendantState, AttendantID>,
		public lifeChangedAt: number | null = null
	) {
		if (this.attendants[AttendantID(0)].rule.mode === 'aql') {
			this.teamScore = 1;
		} else if (this.attendants[AttendantID(0)].rule.mode === 'product') {
			this.teamScore = this.attendants[AttendantID(0)].rule.multiplyMinimum;
		}
	}

	processMaru(
		attendantID: AttendantID,
		multiplier: number = 1,
		assumeNextMaru: boolean = false
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
		let { maruCount, score, life, trophyCount, yasuCount, otherScoreDiff } = this.attendants[
			attendantID
		].processMaru(multiplier, assumeNextMaru);
		let teamScore, teamLife;

		switch (this.attendants[AttendantID(0)].rule.mode) {
			case 'aql':
			case 'sum':
				teamScore = this.calculateTeamScore(attendantID, score);
				teamLife = this.attendants[AttendantID(0)].rule.win <= teamScore ? 'won' : this.teamLife;

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
				teamLife = this.attendants[AttendantID(0)].rule.win <= teamScore ? 'won' : this.teamLife;

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
		attendantID: AttendantID,
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

		switch (this.attendants[AttendantID(0)].rule.mode) {
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
		switch (this.attendants[AttendantID(0)].rule.mode) {
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
					this.attendants[AttendantID(0)].rule.win
				);

			case 'product':
				return this.attendantIDsPerSeat.reduce(
					(prod, seat) =>
						prod *
						(seat ?? []).reduce<number>(
							(sum, id) =>
								sum +
								(this.attendants[id].life === 'removed'
									? 0
									: id === attendantID
										? score!
										: this.attendants[id].score),
							this.attendants[AttendantID(0)].rule.multiplyMinimum
						),
					1
				);

			case 'sum':
				return this.attendantIDsPerSeat
					.filter((seat): seat is AttendantID[] => seat != undefined)
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

	sortScore(): number[] {
		return [
			// Life
			this.teamLife === 'won' ? 1 : this.teamLife === 'lost' ? -1 : 0,
			// When did life change (inverse)
			-(this.lifeChangedAt ?? 0),
			// Score
			this.teamScore
		];
	}

	/** attendantsがあるとGameStateが循環参照を含んでしまいJSON-serializableにならないため、それを除く */
	get serializable() {
		// oxlint-disable-next-line no-misused-spread
		return { ...this, attendants: [] };
	}
}

export type GameEventType =
	| 'won'
	| 'lizhi'
	| 'double-lizhi'
	| 'effect2'
	| 'effect3'
	| 'transit'
	| 'finished';

export type GameEvent =
	| {
			type: 'finished';
	  }
	| {
			type: GameEventType;
			attendantID: AttendantID;
	  }
	| {
			type: GameEventType;
			teamID: TeamID;
	  };

export class GameState {
	attendants: BrandedArray<AttendantState, AttendantID>;
	teams: BrandedArray<TeamState, TeamID>;
	questionCount: number = 1;
	rules: Rule[];
	/** attendant IDの配列（個人ランキング） */
	ranking: AttendantID[] = [];
	/** 順位 (1-indexed) の配列（個人ランキング） */
	ranks = BrandedArray<number, AttendantID>([]);
	/** 順位 (1-indexed) の配列（チームランキング） */
	teamRanks: number[] = [];
	latestEvent: GameEvent | null = null;

	constructor(
		attendants: BrandedArray<Attendant, AttendantID>,
		rules: Rule[],
		teams: BrandedArray<string, TeamID> = BrandedArray<string, TeamID>([])
	) {
		this.attendants = attendants.map(
			({ name, nickname, group, trophyCount, totalScore, manualOrder }, attendantID) =>
				new AttendantState(
					name,
					AttendantID(attendantID),
					manualOrder,
					group,
					nickname,
					rules[group],
					[],
					null,
					trophyCount,
					totalScore
				)
		);
		this.teams = attendants
			.reduce<BrandedArray<AttendantID[][], TeamID>>(
				(acc, att, ai) => {
					// oxlint-disable-next-line typescript/no-unnecessary-condition
					acc[att.team] ??= [];
					acc[att.team][att.seat] ??= [];
					acc[att.team][att.seat].push(AttendantID(ai));
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

		this.rules = rules;
		this.ranking = this.attendants.map<AttendantID, true>((_, i) => AttendantID(i));
	}

	get defaultRule(): Rule {
		return this.rules[0];
	}

	increaseQuestionCount(): void {
		this.questionCount++;
		this.attendants.forEach((att) => {
			if (att.life === 'alive') {
				att.decreaseYasu();
			}
		});
	}

	clearLatestEvent(): this {
		this.latestEvent = null;
		return this;
	}

	setHistory(history: HistoryEntry[]): this {
		this.attendants.forEach((att) => {
			att.history = history;
		});
		return this;
	}

	updateRanking(enableRating: boolean = false): this {
		// sortが安定ソートであることに依存している

		// 個人ランキング
		const mixed = this.attendants.some((a, _, all) => a.rule.mode !== all[0].rule.mode);

		this.ranking.sort((a, b) =>
			arrayCompare(
				this.attendants[b].sortScore(enableRating, mixed ? 'mixed' : this.attendants[b].rule.mode),
				this.attendants[a].sortScore(enableRating, mixed ? 'mixed' : this.attendants[a].rule.mode)
			)
		);

		this.ranks = BrandedArray<number, AttendantID>([]);
		this.ranking.forEach((ai, rank) => {
			const me = this.attendants[ai];
			const previous = this.attendants[this.ranking[rank - 1]];
			if (
				rank === 0 ||
				arrayCompare(
					me.sortScore(enableRating, mixed ? 'mixed' : me.rule.mode),
					previous.sortScore(enableRating, mixed ? 'mixed' : previous.rule.mode)
				) !== 0
			) {
				this.ranks[ai] = rank + 1;
			} else {
				this.ranks[ai] = this.ranks[this.ranking[rank - 1]];
			}
		});

		// チームランキング
		const teamRanking = this.teams
			.map((t, ti) => ({ t, ti }))
			.toSorted((a, b) => arrayCompare(b.t.sortScore(), a.t.sortScore()));

		this.teamRanks = [];
		teamRanking.forEach((team, rank) => {
			const previous = teamRanking[rank - 1];
			if (rank === 0 || arrayCompare(team.t.sortScore(), previous.t.sortScore()) !== 0) {
				this.teamRanks[team.ti] = rank + 1;
			} else {
				this.teamRanks[team.ti] = this.teamRanks[previous.ti];
			}
		});

		return this;
	}

	checkIfLastSurvivor(): this {
		if (this.defaultRule.mode === 'survival') {
			let survivor: AttendantID | null = null;

			for (const [id, att] of this.attendants.entries()) {
				if (att.life === 'alive') {
					if (survivor !== null) {
						// 2人以上生き残っている
						return this;
					}

					survivor = AttendantID(id);
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

	checkIfFinished(): this {
		if (this.ifFinished) {
			this.latestEvent = { type: 'finished' };
		}

		return this;
	}

	getTeamByAttendantID(attendantID: AttendantID) {
		const ti = this.teams.findIndex((team) =>
			team.attendantIDsPerSeat.some((ids) => ids?.includes(attendantID))
		);

		return { ti, team: this.teams[ti] };
	}

	get ifFinished(): boolean {
		return (this.defaultRule.questionLimit ?? Infinity) < this.questionCount;
	}

	/** JSON-serializableでない要素を削除する（循環参照をなくす） */
	get serializable(): GameState {
		return {
			// oxlint-disable-next-line no-misused-spread
			...this,
			teams: this.teams.map((team) => team.serializable)
		};
	}
}

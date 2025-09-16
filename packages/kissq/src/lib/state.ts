import { Rule } from './rule';

type Life = 'alive' | 'won' | 'lost' | 'removed';

export interface Attendant {
	name: string;
	group: number;
	trophyCount: number;
}

export class AttendantState {
	constructor(
		public name: string,
		public rule: Rule,
		public trophyCount: number = 0,
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
	processMaru(): {
		maruCount: number;
		score: number;
		life: Life;
		trophyCount: number;
		otherScoreDiff: number;
	} {
		let maruCount = this.maruCount;
		let score = this.score;
		let life = this.life;
		let trophyCount = this.trophyCount;
		let otherScoreDiff = 0;

		switch (this.rule.mode) {
			case 'marubatsu':
				maruCount += this.rule.maru;
				score += this.rule.maru;
				if (maruCount >= this.rule.win) {
					life = 'won';
					trophyCount++;
				}
				return { maruCount, score, life, trophyCount, otherScoreDiff };

			case 'score':
				maruCount++;
				score += this.rule.maru;
				if (score >= this.rule.win) {
					life = 'won';
					trophyCount++;
				}
				return { maruCount, score, life, trophyCount, otherScoreDiff };

			case 'MbyN':
				maruCount += this.rule.maru;
				score = maruCount * (this.rule.win - this.batsuCount);
				if (score >= this.rule.win ** 2) {
					life = 'won';
					trophyCount++;
				}
				return { maruCount, score, life, trophyCount, otherScoreDiff };

			case 'survival':
				maruCount++;
				otherScoreDiff = -this.rule.maru;
				return { maruCount, score, life, trophyCount, otherScoreDiff };
		}
	}

	/** バツを受けた場合のstateの変化を求める（破壊的にはしない） */
	processBatsu(): { batsuCount: number; score: number; life: Life; yasuCount: number | 'next' } {
		let batsuCount = this.batsuCount;
		let score = this.score;
		let life = this.life;
		let yasuCount = this.yasuCount;

		switch (this.rule.mode) {
			case 'marubatsu':
				batsuCount += this.rule.batsu === 'batsu' ? 1 : this.rule.batsu; // dummy
				score += this.rule.batsu === 'batsu' ? batsuCount : this.rule.batsu;
				if (this.rule.lose !== null && batsuCount >= this.rule.lose) {
					life = 'lost';
				} else {
					yasuCount = 'next';
				}

				return { batsuCount, score, life, yasuCount };

			case 'score':
				batsuCount++;
				score += this.rule.batsu === 'batsu' ? -batsuCount : this.rule.batsu;
				if (this.rule.lose !== null && score <= this.rule.lose) {
					life = 'lost';
				} else {
					yasuCount = 'next';
				}

				return { batsuCount, score, life, yasuCount };

			case 'MbyN':
				batsuCount += this.rule.batsu === 'batsu' ? 1 : this.rule.batsu; // dummy
				score = this.maruCount * (this.rule.win - batsuCount);
				if (this.rule.win - batsuCount <= 0) {
					life = 'lost';
				} else {
					yasuCount = 'next';
				}

				return { batsuCount, score, life, yasuCount };

			case 'survival':
				batsuCount++;
				score += this.rule.batsu === 'batsu' ? -batsuCount : this.rule.batsu;
				if (score <= 0) {
					score = 0;
					life = 'lost';
				} else {
					yasuCount = 'next';
				}

				return { batsuCount, score, life, yasuCount };
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
			if (this.rule.yasu === 'maru') {
				return this.maruCount || 1;
			} else if (this.rule.yasu === 'batsu') {
				return this.batsuCount;
			} else {
				return this.rule.yasu;
			}
		} else {
			return this.yasuCount;
		}
	}

	get isLizhi(): boolean {
		return this.life === 'alive' && this.processMaru().life === 'won';
	}
}

export class GameState {
	attendants: AttendantState[];
	questionCount: number = 1;
	defaultRule: Rule;
	ranking: number[] = [];
	latestEvent: { type: 'won' | 'lizhi'; attendantID: number } | null = null;

	constructor(attendants: { name: string; group: number; trophyCount: number }[], rules: Rule[]) {
		this.attendants = attendants.map(
			({ name, group, trophyCount }) => new AttendantState(name, rules[group], trophyCount)
		);
		this.defaultRule = rules[0];
		this.ranking = this.attendants.map((_, i) => i);
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
						return b.score - a.score || b.maruCount - a.maruCount || a.batsuCount - b.batsuCount;
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
						return b.maruCount - a.maruCount || a.batsuCount - b.batsuCount;
					} else {
						const aWon = a.life === 'won' ? 1 : 0;
						const bWon = b.life === 'won' ? 1 : 0;
						const aLost = a.life === 'lost' ? 1 : 0;
						const bLost = b.life === 'lost' ? 1 : 0;
						return bWon - aWon || aLost - bLost;
					}
				});
				return this;
		}
	}
}

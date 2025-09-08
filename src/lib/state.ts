import { Rule } from './rule';

type Life = 'alive' | 'won' | 'lost' | 'removed';

export class AttendantState {
	constructor(
		public name: string,
		public rule: Rule,
		public life: Life = 'alive',
		public score: number = 0,
		public maruCount: number = 0,
		public batsuCount: number = 0,
		public yasuCount: number | 'next' = 0
	) {}

	/** マルを受けた場合のstateの変化を求める（破壊的にはしない） */
	processMaru(): { maruCount: number; score: number; life: Life } {
		const maruCount = this.maruCount + this.rule.maru;
		let score = this.score;
		let life = this.life;

		switch (this.rule.mode) {
			case 'marubatsu':
				score += this.rule.maru;
				if (maruCount >= this.rule.win) {
					life = 'won';
				}
				return { maruCount, score, life };

			case 'score':
				score += this.rule.maru;
				if (score >= this.rule.win) {
					this.life = 'won';
				}
				return { maruCount, score, life };

			case 'MbyN':
				score = maruCount * (this.rule.win - this.batsuCount);
				if (score >= this.rule.win ** 2) {
					life = 'won';
				}
				return { maruCount, score, life };
		}
	}

	/** バツを受けた場合のstateの変化を求める（破壊的にはしない） */
	processBatsu(): { batsuCount: number; score: number; life: Life; yasuCount: number | 'next' } {
		const batsuCount = this.batsuCount + this.rule.batsu;
		let score = this.score;
		let life = this.life;
		let yasuCount = this.yasuCount;

		switch (this.rule.mode) {
			case 'marubatsu':
				score += this.rule.batsu;
				if (this.rule.lose !== null && batsuCount >= this.rule.lose) {
					life = 'lost';
				} else {
					yasuCount = 'next';
				}

				return { batsuCount, score, life, yasuCount };

			case 'score':
				score += this.rule.batsu;
				if (this.rule.lose !== null && score <= this.rule.lose) {
					life = 'lost';
				} else {
					yasuCount = 'next';
				}

				return { batsuCount, score, life, yasuCount };

			case 'MbyN':
				score = this.maruCount * (this.rule.win - batsuCount);
				if (this.rule.win <= batsuCount) {
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

	constructor(attendants: { name: string; group: number }[], rules: Rule[]) {
		this.attendants = attendants.map(({ name, group }) => new AttendantState(name, rules[group]));
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

	updateRanking(): GameState {
		// sortが安定ソートであることに依存している

		switch (this.defaultRule.mode) {
			case 'score':
			case 'MbyN':
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

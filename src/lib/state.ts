import { Rule } from './rule';

export class AttendantState {
	constructor(
		public name: string,
		public rule: Rule,
		public life: 'alive' | 'won' | 'lost' | 'removed' = 'alive',
		public score: number = 0,
		public maruCount: number = 0,
		public batsuCount: number = 0,
		public yasuCount: number | 'next' = 0
	) {}

	decreaseYasu(): void {
		if (this.yasuCount === 'next') {
			if (this.rule.yasu === 'maru') {
				this.yasuCount = this.maruCount || 1;
			} else if (this.rule.yasu === 'batsu') {
				this.yasuCount = this.batsuCount || 1;
			} else {
				this.yasuCount = this.rule.yasu;
			}
		} else if (this.yasuCount > 0) {
			this.yasuCount--;
		}
	}

	get scoreString(): string {
		if (this.rule.mode === 'score') {
			return `${this.score}`;
		} else {
			return `${this.maruCount}O ${this.batsuCount}X`;
		}
	}

	get yasuDisplay(): number {
		if (this.yasuCount === 'next') {
			if (this.rule.yasu === 'maru') {
				return this.maruCount || 1;
			} else if (this.rule.yasu === 'batsu') {
				return this.batsuCount || 1;
			} else {
				return this.rule.yasu;
			}
		} else {
			return this.yasuCount;
		}
	}
}

export class GameState {
	attendants: AttendantState[];
	questionCount: number = 1;
	defaultRule: Rule;
	ranking: number[] = [];

	constructor(attendants: { name: string; group: number; removed: boolean }[], rules: Rule[]) {
		this.attendants = attendants.map(
			({ name, group, removed }) =>
				new AttendantState(name, rules[group], removed ? 'removed' : 'alive')
		);
		this.defaultRule = rules[0];
		this.ranking = this.attendants.flatMap(({ life }, i) => (life === 'removed' ? [] : [i]));
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

		if (this.defaultRule.mode === 'score') {
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
		} else {
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
		}

		return this;
	}
}

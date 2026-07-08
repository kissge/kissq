export type Penalty = { type: 'yasu'; count: number } | { type: 'zero' };

export class Rule {
	constructor(
		/** ゲームモード */
		public mode: 'score' | 'marubatsu' | 'MbyN' | 'survival' | 'aql',
		/** 勝利に必要なスコアまたはマル数またはスコアの平方根 */
		public win: number,
		/** 敗北に必要なスコア（負数）またはバツ数（正数） */
		public lose: number | null,
		/** 1問正解で得られるスコアまたはマル数 */
		public maru: number,
		/** 1問誤答で得られるスコア（負数）またはバツ数（正数）またはその時点のバツ数 */
		public batsu: number | 'batsu' | 'updown',
		/** 通過席ルール */
		public transit: boolean,
		/** N問正解で得られる休みの数M */
		public yasuPerMaru: { maru: number; yasu: number } | null,
		/** 1問誤答で得られる休みの方式（定数またはその時点のマル数・バツ数） */
		public yasuMode: 'constant' | 'maru' | 'batsu' | 'roulette',
		/** 1問誤答で得られる休みの数 */
		public yasuPerBatsu: number,
		/** ルーレット */
		public roulette: { name: string; choices: Penalty[] } | null,
		/** 削除済みかどうか */
		public isRemoved: boolean = false
	) {}

	toString(): string {
		let str = '';

		switch (this.mode) {
			case 'score':
				str = `${this.win}点先取`;

				if (this.lose !== null) {
					str += `、${this.lose}点で失格`;
				}

				if (this.maru !== 1) {
					str += `、正解+${this.maru}点`;
				}

				if (this.batsu === 'batsu') {
					str += `、N回目の誤答で-N点`;
				} else if (this.batsu === 'updown') {
					// dummy
					str += `、誤答でゼロ○に`;
				} else if (this.batsu < 0 && this.batsu !== -1) {
					str += `、誤答${this.batsu}点`;
				}

				if (this.transit) {
					str += `、${this.win - 1}点で通過席`;
				}
				break;

			case 'marubatsu':
				str = `${this.win}○`;

				if (this.lose !== null) {
					str += `${this.lose}×`;
				}

				if (this.maru !== 1) {
					str += `、正解+${this.maru}○`;
				}

				if (this.batsu === 'batsu') {
					str += `、N回目の誤答でN×`;
				} else if (this.batsu === 'updown') {
					str += `、誤答でゼロ○に`;
				} else if (this.batsu !== 1 && this.batsu !== 0) {
					str += `、誤答+${this.batsu}×`;
				}
				break;

			case 'MbyN':
				str = `${this.win} by ${this.win}（${this.win ** 2}点先取）`;

				// loseは無視される

				if (this.maru !== 1) {
					str += `、正解+${this.maru}点`;
				}

				if (this.batsu === 'batsu') {
					str += `、N回目の誤答で-N点`;
				} else if (this.batsu === 'updown') {
					// dummy
					str += `、誤答でゼロ○に`;
				} else if (this.batsu < 0 && this.batsu !== -1) {
					str += `、誤答${this.batsu}点`;
				}
				break;

			case 'survival':
				str = `${this.lose} アタサバ`;
				if (this.maru !== 1) {
					str += `、正解${-this.maru}点`;
				}
				if (this.batsu === 'batsu') {
					str += `、N回目の誤答で-N点`;
				} else if (this.batsu === 'updown') {
					// dummy
					str += `、誤答でゼロ○に`;
				} else {
					str += `、誤答${this.batsu}点`;
				}
				break;

			case 'aql':
				return `AQL（${this.win}点先取）`;

			default:
				this.mode satisfies never;
		}

		if (this.yasuPerMaru) {
			str += `、${this.yasuPerMaru.maru}○ごとに${this.yasuPerMaru.yasu}休`;
		}

		if (this.yasuMode === 'maru') {
			str += `、誤答（現在のマル数）${this.yasuPerBatsu !== 1 ? '×' + this.yasuPerBatsu : ''}休`;
		} else if (this.yasuMode === 'batsu') {
			str += `、N回目の誤答で${this.yasuPerBatsu !== 1 ? this.yasuPerBatsu : ''}N休`;
		} else if (this.yasuMode === 'roulette') {
			str += `、誤答で？？？`;
		} else if (this.yasuPerBatsu > 0) {
			str += `、誤答${this.yasuPerBatsu}休`;
		}

		return str;
	}

	get max(): number {
		switch (this.mode) {
			case 'marubatsu':
			case 'score':
			case 'aql':
				return this.win;

			case 'MbyN':
				return this.win ** 2;

			case 'survival':
				return this.lose!;
		}
	}
}

export function getActiveRulesText(rules: Rule[]): {
	activeRules: { rule: Rule; i: number }[];
	activeRulesText: string;
} {
	const activeRules = rules.flatMap((rule, i) => (rule.isRemoved ? [] : { rule, i }));

	if (activeRules.length === 1) {
		return { activeRules, activeRulesText: String(activeRules[0].rule) };
	}

	return {
		activeRules,
		activeRulesText: activeRules
			.slice(1)
			.reduce(
				(acc, { rule, i }) => {
					if (String(rule) === acc.at(-1)!.text) {
						acc.at(-1)!.end = i;
						return acc;
					} else {
						return [...acc, { start: i, end: i, text: String(rule) }];
					}
				},
				[{ start: activeRules[0].i, end: activeRules[0].i, text: String(activeRules[0].rule) }]
			)
			.map(({ start, end, text }) =>
				start === end
					? String.fromCodePoint(65 + start) + ': ' + text
					: String.fromCodePoint(65 + start) + '–' + String.fromCodePoint(65 + end) + ': ' + text
			)
			.join(' / ')
	};
}

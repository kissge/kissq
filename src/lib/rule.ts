export type Penalty = { type: 'yasu'; count: number } | { type: 'zero' };

export type RuleType = 'score' | 'marubatsu' | 'MbyN' | 'survival' | 'aql' | 'product' | 'sum';

export class Rule {
	constructor(
		/** ゲームモード */
		public mode: RuleType,
		/** シングルチャンス／エンドレスチャンス */
		public chance: 'single' | 'endless',
		/** 勝利に必要なスコアまたはマル数またはスコアの平方根 */
		public win: number,
		/** 敗北に必要なスコア（負数）またはバツ数（正数） */
		public lose: number | null,
		/** 限定問題数 */
		public questionLimit: number | null,
		/** 勝ち抜け人数 */
		public attendantLimit: number | null,
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
		/** まとめて加減点 */
		public bulkAdjustment: number[] | null,
		/** 掛け算ルールでの点数の下限 */
		public multiplyMinimum: 0 | 1,
		/** 削除済みかどうか */
		public isRemoved: boolean = false
	) {}

	toString(useNamedRule: boolean = false): string {
		if (useNamedRule) {
			if (!this.yasuPerMaru && !this.transit) {
				if (
					this.mode === 'score' &&
					this.maru === 1 &&
					typeof this.batsu === 'number' &&
					this.batsu < 0 &&
					this.yasuMode === 'constant' &&
					this.yasuPerBatsu === 0
				) {
					if (this.lose === null) {
						return `+${this.win} New York`;
					} else {
						return `+${this.win}/${this.lose} New York`;
					}
				} else if (
					this.mode === 'score' &&
					this.lose != null &&
					this.win + this.lose === 0 &&
					this.maru === 1 &&
					this.batsu === 'batsu' &&
					this.yasuMode === 'constant' &&
					this.yasuPerBatsu === 0
				) {
					return `${this.win} Backstream`;
				} else if (
					this.mode === 'survival' &&
					this.yasuMode === 'constant' &&
					this.yasuPerBatsu === 0
				) {
					return `${this.lose} アタサバ`;
				} else if (
					this.mode === 'marubatsu' &&
					this.lose == null &&
					this.maru === 1 &&
					this.batsu === 1 &&
					this.yasuMode === 'batsu'
				) {
					if (this.yasuPerBatsu === 1) {
						return `Freeze ${this.win}`;
					} else {
						return `Freeze ${this.win}（×${this.yasuPerBatsu}）`;
					}
				} else if (
					this.mode === 'marubatsu' &&
					this.lose == null &&
					this.maru === 1 &&
					this.batsu === 1 &&
					this.yasuMode === 'maru'
				) {
					if (this.yasuPerBatsu === 1) {
						return `Crescendo ${this.win}`;
					} else {
						return `Crescendo ${this.win}（×${this.yasuPerBatsu}）`;
					}
				} else if (
					this.mode === 'marubatsu' &&
					this.maru === 1 &&
					this.batsu === 'updown' &&
					this.yasuMode === 'constant' &&
					this.yasuPerBatsu === 0
				) {
					return `${this.win}-Updown`;
				}
			} else if (this.transit) {
				return '通過席クイズ';
			}
		}

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
					str += '、N回目の誤答で-N点';
				} else if (this.batsu === 'updown') {
					// dummy
					str += '、誤答でゼロ〇に';
				} else if (this.batsu < 0 && this.batsu !== -1) {
					str += `、誤答${this.batsu}点`;
				}

				if (this.transit) {
					str += `、${this.win - 1}点で通過席`;
				}
				break;

			case 'marubatsu':
				str = `${this.win}〇`;

				if (this.lose !== null) {
					str += `${this.lose}✕`;
				}

				if (this.maru !== 1) {
					str += `、正解+${this.maru}〇`;
				}

				if (this.batsu === 'batsu') {
					str += '、N回目の誤答でN✕';
				} else if (this.batsu === 'updown') {
					str += '、誤答でゼロ〇に';
				} else if (this.batsu !== 1 && this.batsu !== 0) {
					str += `、誤答+${this.batsu}✕`;
				}
				break;

			case 'MbyN':
				str = `${this.win} by ${this.win}（${this.win ** 2}点先取）`;

				if (this.lose !== null) {
					str += `、${this.lose}✕で失格`;
				}

				if (this.maru !== 1) {
					str += `、正解+${this.maru}点`;
				}

				if (this.batsu === 'batsu') {
					str += '、N回目の誤答で-N点';
				} else if (this.batsu === 'updown') {
					// dummy
					str += '、誤答でゼロ〇に';
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
					str += '、N回目の誤答で-N点';
				} else if (this.batsu === 'updown') {
					// dummy
					str += '、誤答でゼロ〇に';
				} else {
					str += `、誤答${this.batsu}点`;
				}
				break;

			case 'aql':
				str = `AQL（${this.win}点先取）`;

				if (this.maru !== 1) {
					str += `、正解+${this.maru}点`;
				}
				break;

			case 'product':
				str = `掛けて${this.win}点先取`;

				if (this.maru !== 1) {
					str += `、正解+${this.maru}点`;
				}

				if (this.lose != null) {
					str += `、${this.lose}点で個人封鎖`;
				}

				if (this.batsu === 'batsu') {
					str += '、N回目の誤答で-N点';
				} else if (this.batsu === 'updown') {
					// dummy
					str += '、誤答でゼロ〇に';
				} else if (this.batsu < 0 && this.batsu !== -1) {
					str += `、誤答${this.batsu}点`;
				}

				break;

			case 'sum':
				str = `足して${this.win}点先取`;

				if (this.lose !== null) {
					str += `、${this.lose}点で失格`;
				}

				if (this.maru !== 1) {
					str += `、正解+${this.maru}点`;
				}

				if (this.batsu === 'batsu') {
					str += '、N回目の誤答で-N点';
				} else if (this.batsu === 'updown') {
					// dummy
					str += '、誤答でゼロ〇に';
				} else if (this.batsu < 0 && this.batsu !== -1) {
					str += `、誤答${this.batsu}点`;
				}

				break;

			default:
				this.mode satisfies never;
		}

		if (this.yasuPerMaru) {
			str += `、${this.yasuPerMaru.maru}〇ごとに${this.yasuPerMaru.yasu}休`;
		}

		if (this.yasuMode === 'maru') {
			str += `、誤答（現在のマル数）${this.yasuPerBatsu !== 1 ? '✕' + this.yasuPerBatsu : ''}休`;
		} else if (this.yasuMode === 'batsu') {
			str += `、N回目の誤答で${this.yasuPerBatsu !== 1 ? this.yasuPerBatsu : ''}N休`;
		} else if (this.yasuMode === 'roulette') {
			str += '、誤答で？？？';
		} else if (this.yasuPerBatsu > 0) {
			str += `、誤答${this.yasuPerBatsu}休`;
		}

		if (this.attendantLimit !== null) {
			str += `（${this.attendantLimit}人）`;
		}

		return str;
	}

	toDetailsStrings(): string[] {
		const arr: string[] = [];

		switch (this.mode) {
			case 'score':
				arr.push(`${this.win}点獲得で勝ち抜け`);

				if (this.lose !== null) {
					arr.push(`${this.lose}点で失格`);
				}

				arr.push(`1問正解で${this.maru}点獲得`);

				if (this.batsu === 'batsu') {
					arr.push(`N回目の誤答で-N点`);
				} else if (this.batsu === 'updown') {
					arr.push(`誤答でゼロ〇に`);
				} else if (this.batsu !== 0) {
					arr.push(`1問誤答で${this.batsu}点`);
				}

				if (this.transit) {
					arr.push(`${this.win - 1}点で通過席`);
				}
				break;

			case 'marubatsu':
				arr.push(`正解数が${this.win}問到達で勝ち抜け`);

				if (this.lose !== null) {
					arr.push(`誤答数が${this.lose}問到達で失格`);
				}

				if (this.maru !== 1) {
					arr.push(`※ 1問正解で正解数 +${this.maru}`);
				}

				if (this.batsu === 'batsu') {
					arr.push(`N回目の誤答で誤答数がN増える`);
				} else if (this.batsu === 'updown') {
					arr.push(`誤答するたびに正解数がゼロにリセット`);
				} else if (this.batsu !== 1 && this.batsu !== 0) {
					arr.push(`※ 1問誤答で誤答数 +${this.batsu}`);
				}
				break;

			case 'MbyN':
				arr.push(`はじめ、正答ポイントをゼロ点、誤答ポイントを${this.win}点持った状態でスタート`);
				arr.push('スコアは正答ポイントと誤答ポイントを掛け算した値');
				arr.push(`掛けて${this.win ** 2}点獲得で勝ち抜け`);

				if (this.lose !== null) {
					arr.push(`誤答ポイントが${this.lose}点減ってしまうと失格`);
				}

				if (this.maru !== 1) {
					arr.push(`※ 1問正解で正答ポイント +${this.maru}`);
				}

				if (this.batsu === 'batsu') {
					arr.push(`N回目の誤答で誤答ポイントがN減る`);
				} else if (this.batsu === 'updown') {
					// dummy
					arr.push(`誤答するたびに正答ポイントがゼロにリセット`);
				} else if (this.batsu < 0 && this.batsu !== -1) {
					arr.push(`※ 1問誤答で誤答ポイント ${this.batsu}`);
				}
				break;

			case 'survival':
				arr.push(`はじめ、ポイントを${this.lose}点持った状態でスタート`);
				arr.push(`1問正解で自分以外全員のポイントが${this.maru}点減る`);

				if (this.batsu === 'batsu') {
					arr.push(`N回目の誤答で自分のポイントがN点減る`);
				} else if (this.batsu === 'updown') {
					// dummy
					arr.push(`誤答するたびに自分のポイントがゼロにリセット`);
				} else {
					arr.push(`1問誤答で自分のポイントが${-this.batsu}点減る`);
				}
				break;

			case 'aql':
				arr.push('チームメンバーを1枠、2枠、3枠……に振り分ける');
				arr.push(
					`各枠のスコアは、はじめ1点で、その枠のメンバーが1問正解するごとに${this.maru}点増える`
				);
				arr.push('チームのスコアは、各枠のスコアを全て掛けた値');
				arr.push(`${this.win}点に到達したチームが勝ち抜け`);
				arr.push('枠のメンバーが誤答すると、枠に✕がつき、枠のスコアが1点にリセットされる');
				arr.push(
					'枠に✕がついている状態で枠のメンバーが誤答すると、2個目の✕がつき、その枠は封鎖状態になり、解答権を失う'
				);
				arr.push('誰かが誤答すると、他のチームの枠の封鎖状態は解除される');
				break;

			case 'product':
				arr.push('チームメンバーを1枠、2枠、3枠……に振り分ける');
				arr.push(
					`各枠のスコアは、はじめ${this.multiplyMinimum}点で、その枠のメンバーが1問正解するごとに${this.maru}点増える`
				);
				arr.push('チームのスコアは、各枠のスコアを全て掛けた値');
				arr.push(`${this.win}点に到達したチームが勝ち抜け`);

				if (this.lose !== null) {
					arr.push(`${this.lose}点に到達すると、そのプレイヤーは封鎖状態になり、解答権を失う`);
				}

				if (this.batsu === 'batsu') {
					arr.push('枠のメンバーが誤答すると、N回目の誤答で-N点');
				} else if (this.batsu === 'updown') {
					// dummy
					arr.push('誤答するたびにゼロ点にリセット');
				} else if (this.batsu < 0 && this.batsu !== -1) {
					arr.push(`枠のメンバーが誤答すると、1問誤答で枠のスコアが${this.batsu}点`);
				}
				break;

			case 'sum':
				arr.push(`チームメンバー全員のスコアを合計して${this.win}点に到達したチームが勝ち抜け`);

				if (this.lose !== null) {
					arr.push(`チームのスコアが${this.lose}点になると失格`);
				}

				if (this.maru !== 1) {
					arr.push(`1問正解で +${this.maru}点`);
				}

				if (this.batsu === 'batsu') {
					arr.push('N回目の誤答で-N点');
				} else if (this.batsu === 'updown') {
					// dummy
					arr.push('誤答するたびにゼロ点にリセット');
				} else if (this.batsu < 0 && this.batsu !== -1) {
					arr.push(`1問誤答で${this.batsu}点`);
				}
				break;

			default:
				this.mode satisfies never;
		}

		if (this.yasuPerMaru) {
			arr.push(`${this.yasuPerMaru.maru}問正解ごとに${this.yasuPerMaru.yasu}問休み`);
		}

		if (this.yasuMode === 'maru') {
			arr.push(
				`1問誤答で（現在の正解数）${this.yasuPerBatsu !== 1 ? '✕' + this.yasuPerBatsu : ''}問休み`
			);
		} else if (this.yasuMode === 'batsu') {
			arr.push(`N回目の誤答で${this.yasuPerBatsu !== 1 ? this.yasuPerBatsu : ''}N問休み`);
		} else if (this.yasuMode === 'roulette') {
			arr.push('1問誤答で？？？');
		} else if (this.yasuPerBatsu > 0) {
			arr.push(`1問誤答で${this.yasuPerBatsu}問休み`);
		}

		if (this.attendantLimit !== null) {
			arr.push(`このグループでの勝ち抜け人数は最大${this.attendantLimit}人`);
		}

		return arr;
	}

	toSharedStrings(): string[] {
		const arr: string[] = [];

		if (this.chance === 'single') {
			arr.push('解答権は先着1人まで（シングルチャンス）');
		} else if (this.chance === 'endless') {
			arr.push('誤答すると次に早くボタンを押した人に解答権が順番に移る（エンドレスチャンス）');
		}

		if (this.questionLimit !== null) {
			arr.push(`問題数は最大で${this.questionLimit}問`);
		}

		return arr;
	}

	get max(): number {
		switch (this.mode) {
			case 'marubatsu':
			case 'score':
			case 'aql':
			case 'product':
			case 'sum':
				return this.win;

			case 'MbyN':
				return this.win ** 2;

			case 'survival':
				return this.lose!;
		}
	}

	static from(rule: Rule | RulePOJO): Rule {
		return new Rule(
			rule.mode,
			rule.chance,
			rule.win,
			rule.lose,
			rule.questionLimit,
			rule.attendantLimit,
			rule.maru,
			rule.batsu,
			rule.transit,
			rule.yasuPerMaru,
			rule.yasuMode,
			rule.yasuPerBatsu,
			rule.roulette,
			rule.bulkAdjustment ?? null,
			rule.multiplyMinimum ?? 0,
			rule.isRemoved
		);
	}

	static getActiveRulesText(
		activeRules: { rule: Rule | RulePOJO; i: number }[],
		battleMode: 'single' | 'team'
	): string;
	static getActiveRulesText(
		activeRules: { rule: Rule | RulePOJO; i: number }[],
		battleMode: 'single' | 'team',
		style: 'long'
	): { shared: string[]; groups: { teams: string; text: string[]; shortText: string }[] };
	static getActiveRulesText(
		activeRules: { rule: Rule | RulePOJO; i: number }[],
		battleMode: 'single' | 'team',
		style: 'short' | 'long' = 'short'
	): string | { shared: string[]; groups: { teams: string; text: string[]; shortText: string }[] } {
		for (let i = 0; i < activeRules.length; i++) {
			if (!(activeRules[i].rule instanceof Rule)) {
				activeRules[i].rule = Rule.from(activeRules[i].rule);
			}
		}

		const rules = activeRules.map(({ rule, i }) => ({ rule: Rule.from(rule), i }));

		const [equals, stringify] =
			style === 'short'
				? [(a: string, b: string) => a === b, (rule: Rule) => rule.toString()]
				: [
						(a: string[], b: string[]) => a.length === b.length && a.every((v, i) => v === b[i]),
						(rule: Rule) => rule.toDetailsStrings()
					];

		if (style === 'short' && rules.length === 1) {
			return String(rules[0].rule);
		}

		const groupedBy = rules.slice(1).reduce(
			(acc, { rule, i }) => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				if (equals(stringify(rule) as any, acc.at(-1)!.text as any)) {
					acc.at(-1)!.end = i;
					return acc;
				} else {
					return [...acc, { start: i, end: i, text: stringify(rule), rule }];
				}
			},
			[{ start: rules[0].i, end: rules[0].i, text: stringify(rules[0].rule), rule: rules[0].rule }]
		);

		if (style === 'short') {
			return groupedBy
				.map(({ start, end, text }) => {
					if (battleMode === 'team' && start > 0 && typeof text === 'string') {
						text = text.split('、').slice(1).join('、');
					}

					return start === end
						? String.fromCodePoint(65 + start) + ': ' + text
						: String.fromCodePoint(65 + start) + '–' + String.fromCodePoint(65 + end) + ': ' + text;
				})
				.join(' / ');
		} else {
			return {
				shared: rules[0].rule.toSharedStrings(),
				groups: groupedBy.map(({ start, end, text, rule }) => ({
					teams:
						start === end
							? String.fromCodePoint(65 + start)
							: String.fromCodePoint(65 + start) + '–' + String.fromCodePoint(65 + end),
					text: text as string[],
					shortText: rule.toString(true)
				}))
			};
		}
	}
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _ = { ...({} as Rule) };
export type RulePOJO = Omit<typeof _, 'max'>;

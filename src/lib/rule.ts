export class Rule {
	constructor(
		/** 勝利判定の基準がスコアかマル数・バツ数かMbyNか */
		public mode: 'score' | 'marubatsu' | 'MbyN',
		/** 勝利に必要なスコアまたはマル数またはスコアの平方根 */
		public win: number,
		/** 敗北に必要なスコア（負数）またはバツ数（正数） */
		public lose: number | null,
		/** 1問正解で得られるスコアまたはマル数 */
		public maru: number,
		/** 1問誤答で得られるスコア（負数）またはバツ数（正数） */
		public batsu: number,
		/** 1問誤答で得られる休みの数（定数またはその時点のマル数・バツ数） */
		public yasu: number | 'maru' | 'batsu'
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

				if (this.batsu < 0 && this.batsu !== -1) {
					str += `、誤答${this.batsu}点`;
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

				if (this.batsu !== 1 && this.batsu !== 0) {
					str += `、誤答+${this.batsu}×`;
				}
				break;

			case 'MbyN':
				str = `${this.win} by ${this.win}（${this.win ** 2}点先取）`;

				// loseは無視される

				if (this.maru !== 1) {
					str += `、正解+${this.maru}点`;
				}

				if (this.batsu < 0 && this.batsu !== -1) {
					str += `、誤答${this.batsu}点`;
				}
				break;
		}

		if (this.yasu === 'maru') {
			str += `、誤答で（現在のマル数）問休み`;
		} else if (this.yasu === 'batsu') {
			str += `、N回目の誤答でN問休み`;
		} else if (this.yasu > 0) {
			str += `、誤答で${this.yasu}問休み`;
		}

		return str;
	}
}

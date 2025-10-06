export class Rule {
	// クローンを容易にするため、オブジェクトプロパティを使わない

	constructor(
		/** ゲームモード */
		public mode: 'score' | 'marubatsu' | 'MbyN' | 'survival',
		/** 勝利に必要なスコアまたはマル数またはスコアの平方根 */
		public win: number,
		/** 敗北に必要なスコア（負数）またはバツ数（正数） */
		public lose: number | null,
		/** 1問正解で得られるスコアまたはマル数 */
		public maru: number,
		/** 1問誤答で得られるスコア（負数）またはバツ数（正数）またはその時点のバツ数 */
		public batsu: number | 'batsu' | 'updown',
		/** N問正解で得られる休みの数N */
		public yasuPerMaru: number | null,
		/** 1問誤答で得られる休みの数（定数またはその時点のマル数・バツ数） */
		public yasu: number | 'maru' | 'batsu',
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

			default:
				this.mode satisfies never;
		}

		if (this.yasuPerMaru) {
			str += `、${this.yasuPerMaru}○ごとに${this.yasuPerMaru}休`;
		}

		if (this.yasu === 'maru') {
			str += `、誤答（現在のマル数）休`;
		} else if (this.yasu === 'batsu') {
			str += `、N回目の誤答でN休`;
		} else if (this.yasu > 0) {
			str += `、誤答${this.yasu}休`;
		}

		return str;
	}
}

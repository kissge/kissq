import { Spring } from 'svelte/motion';
import { getGameContext } from './game.svelte';

export class LayoutClass {
	Game = getGameContext();

	innerWidth = $state(0);
	innerHeight = $state(0);
	headerClientHeight = $state(0);
	footerClientHeight = $state(0);
	fontSize = $state<number>();

	nameWidth = $state([0, 0]);
	nameHeight = $state([0, 0]);
	nameDirection = $state<'vertical-rl' | ''>('vertical-rl');

	container: HTMLDivElement | undefined;

	columnCount = $derived.by(() => {
		// 画面に収まる範囲でなるべく多い列数を求める
		const attCount = this.Game.currentState.ranking.length;
		const isSafari =
			typeof navigator !== 'undefined' &&
			/safari/i.test(navigator.userAgent) &&
			!/chrome|android/i.test(navigator.userAgent);
		if (attCount <= 4) {
			return 4;
		} else if (!this.container || isSafari) {
			return Math.floor(innerWidth / 250) || 7;
		}

		const totalHeight = innerHeight - this.headerClientHeight - this.footerClientHeight + 1;
		document.querySelectorAll('.attendant .name').forEach((el) => {
			(el as HTMLElement).style.display = 'none';
		});

		let bestCols = Infinity;

		for (let rows = attCount; rows >= 1; --rows) {
			const cols = Math.ceil(attCount / rows);
			this.container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

			if (this.container.clientWidth > innerWidth || innerWidth / cols < 140) {
				break;
			}

			if (this.container.clientHeight > totalHeight) {
				continue;
			}

			bestCols = Math.ceil(attCount / rows);
		}

		if (!Number.isFinite(bestCols)) {
			bestCols = Math.floor(innerWidth / 250);
		}

		// これでベストな行数の方が逆に定まったので、あらためてその中で列数を決める
		const bestRows = Math.ceil(attCount / bestCols);
		bestCols = Math.ceil(attCount / bestRows);

		document.querySelectorAll('.attendant .name').forEach((el) => {
			(el as HTMLElement).style.display = '';
		});

		this.container.style.gridTemplateColumns = `repeat(${bestCols}, 1fr)`;
		return bestCols;
	});

	barMax = $derived.by(() => {
		if (this.Game.attendants.length === 0) {
			return null;
		}

		if (
			this.Game.currentState.attendants.some(
				({ rule }) => rule.mode !== this.Game.currentState.attendants[0].rule.mode
			)
		) {
			return null;
		}

		return Math.max(...this.Game.currentState.attendants.map((a) => a.rule.max));
	});
	barHeightRatioArray = $state<Spring<number>[]>([]);

	constructor() {
		$effect(() => {
			if (this.nameWidth.length === 0 || this.nameHeight.length === 0) {
				return;
			}

			if (this.nameWidth[0] > this.nameHeight[0] * 1.2) {
				this.nameDirection = '';
				this.fontSize = Math.floor(
					Math.min(
						(this.container?.clientWidth ?? 0 / this.columnCount) * 0.15,
						(this.container?.clientHeight ??
							0 / Math.ceil(this.Game.currentState.ranking.length / this.columnCount)) * 0.15
					)
				);
			} else {
				this.nameDirection = 'vertical-rl';
				this.fontSize = Math.floor(
					Math.min(
						(this.container?.clientWidth ?? 0 / this.columnCount) * 0.3,
						(this.container?.clientHeight ??
							0 / Math.ceil(this.Game.currentState.ranking.length / this.columnCount)) * 0.09
					)
				);
			}
		});

		$effect(() => {
			if (this.Game.attendants.length < this.barHeightRatioArray.length) {
				this.barHeightRatioArray = this.barHeightRatioArray.slice(0, this.Game.attendants.length);
			} else if (this.Game.attendants.length > this.barHeightRatioArray.length) {
				for (let i = this.barHeightRatioArray.length; i < this.Game.attendants.length; ++i) {
					this.barHeightRatioArray.push(new Spring(0, { stiffness: 0.2, damping: 0.2 }));
				}
			}

			for (let i = 0; i < this.barHeightRatioArray.length; ++i) {
				const ratio = (() => {
					switch (this.Game.currentState.attendants[i].rule.mode) {
						case 'marubatsu':
							return this.Game.currentState.attendants[i].maruCount;
						case 'score':
						case 'MbyN':
						case 'survival':
							return this.Game.currentState.attendants[i].score;
						case 'aql':
						case 'product':
						case 'sum':
							throw new Error();
					}
				})();
				this.barHeightRatioArray[i].set(ratio);
			}
		});
	}
}

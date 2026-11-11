import { createContext } from 'svelte';

import { isSafari } from './browser';
import { getGameContext } from './gameContext';

export class LayoutClass {
	Game = getGameContext();

	innerWidth = $state(0);
	innerHeight = $state(0);
	headerClientHeight = $state(0);
	footerClientHeight = $state(0);
	fontSize = $state<number>();

	attendantsWrapperClientHeight = $state(0);
	attendantsClientHeight = $state(0);

	nameWidth = $state([0, 0]);
	nameHeight = $state([0, 0]);
	nameDirection = $state<'vertical-rl' | ''>('vertical-rl');

	container: HTMLDivElement | undefined;

	columnCount = $derived.by(() => {
		// 画面に収まる範囲でなるべく多い列数を求める
		const attCount = this.Game.currentState.ranking.length;
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

	constructor() {
		$effect(() => {
			if (this.nameWidth.length === 0 || this.nameHeight.length === 0) {
				return;
			}

			if (this.nameWidth[0] > this.nameHeight[0] * 1.2) {
				this.nameDirection = '';
				this.fontSize = Math.floor(
					Math.min(
						((this.container?.clientWidth ?? 0) / this.columnCount) * 0.15,
						((this.container?.clientHeight ?? 0) /
							Math.ceil(this.Game.currentState.ranking.length / this.columnCount)) *
							0.15
					)
				);
			} else {
				this.nameDirection = 'vertical-rl';
				this.fontSize = Math.floor(
					Math.min(
						((this.container?.clientWidth ?? 0) / this.columnCount) * 0.3,
						((this.container?.clientHeight ?? 0) /
							Math.ceil(this.Game.currentState.ranking.length / this.columnCount)) *
							0.09
					)
				);
			}
		});
	}
}

export const [getLayoutContext, setLayoutContext] = createContext<LayoutClass>();

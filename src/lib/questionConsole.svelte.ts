import { qZero } from '$lib/question';
import type { AttendantState } from '$lib/state';
import { getWasedashikiContext } from '$lib/wasedashiki.svelte';
import type { GameClassBase } from './game';

const urlParams = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');

export class QuestionConsoleClass {
	Wasedashiki = getWasedashikiContext();

	subWindow = $state<Window>();
	showQuestionWindow = $state(urlParams.has('qw'));
	currentQuestion = $state(qZero);

	constructor(public Game: GameClassBase<'single'> | GameClassBase<'team'>) {}

	openSubWindow() {
		this.subWindow = window.open('./question', 'questionWindow', 'popup') || undefined;
	}

	processWindowMessage(event: MessageEvent) {
		if (!this.subWindow) {
			try {
				this.subWindow = event.source as Window;
			} catch {
				/* ignore */
			}
		}

		switch (event.data.command) {
			case 'toggleQuestionWindow':
				this.showQuestionWindow = !this.showQuestionWindow;
				break;

			case 'updateQuestion':
				this.currentQuestion = { question: event.data.question, answer: event.data.answer };
				break;

			case 'clickMaru':
				this.Game.clickMaru(event.data.attendantID);
				break;

			case 'clickBatsu':
				this.Game.clickBatsu(event.data.attendantID);
				break;

			case 'clickThrough':
				this.Game.clickThrough();
				break;

			case 'clickUndo':
				this.Game.clickUndo();
				break;

			case 'clickReset':
				this.Game.clearHistory(this.Wasedashiki);
				break;

			case 'addAttendant':
				if (this.Game.battleMode === 'single') {
					this.Game.addAttendant(event.data.name);
				} else {
					if (this.Game.attendantsPerTeam.length > 0) {
						this.Game.addAttendant(this.Game.attendantsPerTeam.length - 1, event.data.name);
					}
				}
				break;

			case 'reorderAttendants': // single-only
				this.Game.attendants[this.Game.orderedAttendants[event.data.attendantID]].manualOrder =
					event.data.newOrder;
				this.Game.orderedAttendants.forEach((a, i) => (this.Game.attendants[a].manualOrder = i));
				break;

			case 'ping':
				this.syncState();
				break;
		}
	}

	syncState() {
		if (this.subWindow && !this.subWindow.closed) {
			// Prevent circular object (only necessary for team, fyi)
			const state = Object.fromEntries(
				Object.entries(this.Game.currentState).flatMap(([k, v]) =>
					k === 'teams'
						? []
						: k === 'attendants'
							? [
									[
										k,
										v.map((v: AttendantState) =>
											Object.fromEntries(Object.entries(v).filter(([k]) => k !== 'team'))
										)
									]
								]
							: [[k, v]]
				)
			);

			this.subWindow.postMessage(
				JSON.parse(
					JSON.stringify({
						command: 'syncState',
						mode: this.Game.battleMode,
						currentState: state,
						history: this.Game.history,
						orderedAttendants: this.Game.orderedAttendants,
						orderingMode: this.Game.orderingMode,
						answerers: this.Wasedashiki.answerers,
						buttonMapping: this.Wasedashiki.buttonMapping,
						wasedashikiMode: this.Game.wasedashikiMode
					})
				)
			);
		}
	}
}

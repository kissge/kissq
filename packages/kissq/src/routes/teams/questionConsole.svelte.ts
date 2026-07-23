import { qZero } from '$lib/question';
import type { AttendantState } from '$lib/state';
import { getWasedashikiContext } from '$lib/wasedashiki.svelte';
import { getGameContext } from './game.svelte';

const urlParams = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');

export class QuestionConsoleClass {
	Game = getGameContext();
	Wasedashiki = getWasedashikiContext();

	subWindow = $state<Window>();
	showQuestionWindow = $state(urlParams.has('qw'));
	currentQuestion = $state(qZero);

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
				if (this.Game.attendantsPerTeam.length > 0) {
					this.Game.addAttendant(this.Game.attendantsPerTeam.length - 1, event.data.name);
				}
				break;

			case 'ping':
				this.syncState();
				break;
		}
	}

	syncState() {
		if (this.subWindow && !this.subWindow.closed) {
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
						mode: 'team',
						currentState: state,
						history: this.Game.history,
						answerers: this.Wasedashiki.answerers,
						buttonMapping: this.Wasedashiki.buttonMapping,
						wasedashikiMode: this.Game.wasedashikiMode
					})
				)
			);
		}
	}
}

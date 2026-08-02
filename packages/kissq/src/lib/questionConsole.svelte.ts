import { createContext } from 'svelte';
import { SvelteURLSearchParams } from 'svelte/reactivity';
import { qZero } from '$lib/question';
import { getWasedashikiContext } from '$lib/wasedashiki.svelte';
import type { GameClassBaseType } from './game';
import { Rule, type RulePOJO } from './rule';

const urlParams = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');

export class QuestionConsoleClass {
	Wasedashiki = getWasedashikiContext();

	subWindow = $state<Window>();
	showQuestionWindow = $state(urlParams.has('qw'));
	showQRCode = $state(false);
	currentQuestion = $state(qZero);

	constructor(public Game: GameClassBaseType) {}

	openSubWindow() {
		const search = '?' + new SvelteURLSearchParams(location.search).toString();
		this.subWindow = window.open('./question' + search, 'questionWindow', 'popup') || undefined;
	}

	processWindowMessage(event: MessageEvent) {
		if (!this.subWindow) {
			try {
				this.subWindow = event.source as Window;
			} catch {
				/* ignore */
			}
		}

		const message: Message = event.data;

		switch (message.command) {
			case 'toggleQuestionWindow':
				this.showQuestionWindow = !this.showQuestionWindow;
				break;

			case 'updateQuestion':
				this.currentQuestion = message;
				break;

			case 'clickMaru':
				this.Game.clickMaru(message.attendantID);
				break;

			case 'clickBatsu':
				this.Game.clickBatsu(message.attendantID);
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
					this.Game.addAttendant(message.name);
				} else {
					if (this.Game.attendantsPerTeam.length > 0) {
						this.Game.addAttendant(this.Game.attendantsPerTeam.length - 1, message.name);
					}
				}
				break;

			case 'updateRules':
				this.Game.updateRules(
					message.rules.map((r: RulePOJO) => Rule.from(r)),
					this.Wasedashiki,
					message.doClear,
					message.resetGroups
				);
				break;

			case 'updateAttendantGroup':
				this.Game.attendants[message.attendantID].group = message.group;
				break;

			case 'reorderAttendants': // single-only
				this.Game.attendants[this.Game.orderedAttendants[message.attendantID]].manualOrder =
					event.data.newOrder;
				this.Game.orderedAttendants.forEach((a, i) => (this.Game.attendants[a].manualOrder = i));
				break;

			case 'toggleQRCode':
				this.showQRCode = !this.showQRCode;
				break;

			case 'ping':
				this.syncState();
				break;

			default:
				message satisfies never;
		}
	}

	syncState() {
		if (this.subWindow && !this.subWindow.closed) {
			// Prevent circular object (only necessary for team, fyi)
			const state = Object.fromEntries(
				Object.entries(this.Game.currentState).flatMap(([k, v]) => (k === 'teams' ? [] : [[k, v]]))
			);

			this.subWindow.postMessage(
				JSON.parse(
					JSON.stringify({
						command: 'syncState',
						mode: this.Game.battleMode,
						attendants: this.Game.attendants,
						currentState: state,
						history: this.Game.history,
						rules: this.Game.rules,
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

export const [getQuestionConsoleContext, setQuestionConsoleContext] =
	createContext<QuestionConsoleClass>();

export type Message =
	| { command: 'toggleQuestionWindow' }
	| { command: 'updateQuestion'; id: number; question: string; answer: string; comment: string }
	| { command: 'clickMaru'; attendantID: number }
	| { command: 'clickBatsu'; attendantID: number }
	| { command: 'clickThrough' }
	| { command: 'clickUndo' }
	| { command: 'clickReset' }
	| { command: 'addAttendant'; name: string }
	| { command: 'updateRules'; rules: RulePOJO[]; doClear: boolean; resetGroups: 'reset' | 'keep' }
	| { command: 'updateAttendantGroup'; attendantID: number; group: number }
	| { command: 'reorderAttendants'; attendantID: number; newOrder: number }
	| { command: 'toggleQRCode' }
	| { command: 'ping' };

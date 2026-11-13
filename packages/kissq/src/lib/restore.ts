import type { GameClassBase, GameClassSerialized } from '$lib/game';
import type { AttendantID, ButtonID } from '$lib/types';
import type { WasedashikiClass } from '$lib/wasedashiki.svelte';

export function loadRecovery(): RecoveryData | undefined {
	const raw = window.localStorage.getItem('kissQ.recovery');
	if (!raw) {
		return;
	}

	try {
		return JSON.parse(raw) as RecoveryData;
	} catch (e) {
		console.error('Failed to parse recovery data', e);
	}
}

export function saveRecoveryIfNecessary(
	Game: GameClassBase,
	Wasedashiki: WasedashikiClass
): boolean {
	if (Game.attendants.length === 0) {
		return false;
	}

	if (
		Game.history.length === 0 &&
		Game.attendants.every((att) => att.totalScore.maru === 0 && att.totalScore.batsu === 0)
	) {
		return false;
	}

	window.localStorage.setItem(
		'kissQ.recovery',
		JSON.stringify({ Game, buttonMapping: Wasedashiki.buttonMapping })
	);

	return true;
}

export function removeRecovery(): void {
	window.localStorage.removeItem('kissQ.recovery');
}

export interface RecoveryData {
	Game: GameClassSerialized;
	buttonMapping: Record<AttendantID, ButtonID>;
}

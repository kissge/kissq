import { getSingleGameContext, SingleGameClass } from '../routes/game.svelte';
import { getTeamGameContext, TeamGameClass } from '../routes/teams/game.svelte';

export function getGameContext(): GameClass {
	try {
		return getSingleGameContext();
	} catch {
		return getTeamGameContext();
	}
}

export type GameClass = SingleGameClass | TeamGameClass;

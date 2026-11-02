import { getSingleGameContext } from '../routes/game.svelte';
import { getTeamGameContext } from '../routes/teams/game.svelte';

export function getGameContext() {
	try {
		return getSingleGameContext();
	} catch {
		return getTeamGameContext();
	}
}

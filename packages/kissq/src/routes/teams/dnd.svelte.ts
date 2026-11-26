import { createContext } from 'svelte';

import type { TeamID } from '$lib/types';

export class DnDClass {
	dragTarget = $state<{ ai: number; ti: TeamID; si: number; mi: number }>();
	dropTarget = $state<{ ti: TeamID; si: number }>();

	setDragTarget(target?: { ai: number; ti: TeamID; si: number; mi: number }) {
		this.dragTarget = target;
	}

	setDropTarget(target?: { ti: TeamID; si: number }) {
		this.dropTarget = target;
	}
}

export const [getDnDContext, setDnDContext] = createContext<DnDClass>();

import { createContext } from 'svelte';

import type { AttendantID, TeamID } from '$lib/types';

export class DnDClass {
	dragTarget = $state<{ ai: AttendantID; ti: TeamID; si: number; mi: number }>();
	dropTarget = $state<{ ti: TeamID; si: number }>();

	setDragTarget(target?: { ai: AttendantID; ti: TeamID; si: number; mi: number }) {
		this.dragTarget = target;
	}

	setDropTarget(target?: { ti: TeamID; si: number }) {
		this.dropTarget = target;
	}
}

export const [getDnDContext, setDnDContext] = createContext<DnDClass>();

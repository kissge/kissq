import { createContext } from 'svelte';

export class DnDClass {
	dragTarget = $state<{ ai: number; ti: number; si: number; mi: number }>();
	dropTarget = $state<{ type: 'team'; ti: number } | { type: 'seat'; ti: number; si: number }>();

	setDragTarget(target?: { ai: number; ti: number; si: number; mi: number }) {
		this.dragTarget = target;
	}

	setDropTarget(target?: { type: 'team'; ti: number } | { type: 'seat'; ti: number; si: number }) {
		this.dropTarget = target;
	}
}

export const [getDnDContext, setDnDContext] = createContext<DnDClass>();

import { createContext } from 'svelte';

export class DnDClass {
	dragTarget = $state<{ ai: number; ti: number; si: number; mi: number }>();
	dropTarget = $state<{ ti: number; si: number }>();

	setDragTarget(target?: { ai: number; ti: number; si: number; mi: number }) {
		this.dragTarget = target;
	}

	setDropTarget(target?: { ti: number; si: number }) {
		this.dropTarget = target;
	}
}

export const [getDnDContext, setDnDContext] = createContext<DnDClass>();

import { createContext } from 'svelte';

export class WasedashikiClass {
	serialPort = $state<SerialPort | undefined>();
	answerers = $state<({ rank: 1 | 2 | 'late'; delay: number } | null)[]>([]);
	lastButtonID = $state<number | undefined>();
	/** attendant ID -> button ID */
	buttonMapping = $state<Record<number, number>>({});
	buttonMappingRestored = $state(false);
	connected = $state(false);
	pushers = $state<number[]>([]);

	/** button ID -> attendant ID */
	buttonReverseMapping = $derived.by(() => {
		const reverse: Record<number, number> = {};
		for (const [attendantID, buttonID] of Object.entries(this.buttonMapping)) {
			reverse[buttonID] = Number(attendantID);
		}
		return reverse;
	});

	answererRanking = $derived(
		Object.entries(this.answerers)
			.filter(([, v]) => v != null)
			.toSorted((a, b) => a[1]!.delay - b[1]!.delay)
			.map(([k, v]) => [this.buttonReverseMapping[Number(k) + 1], v!] as const)
	);
}

export const [getWasedashikiContext, setWasedashikiContext] = createContext<WasedashikiClass>();

export const Wasedashiki = $state({
	serialPort: undefined as SerialPort | undefined,
	answerers: [] as ({ rank: 1 | 2 | 'late'; delay: number } | null)[],
	lastButtonID: undefined as number | undefined,
	/** attendant ID -> button ID */
	buttonMapping: {} as Record<number, number>,
	buttonMappingRestored: false,
	connected: false,
	pushers: [] as number[]
});

export function buttonReverseMapping_() {
	const reverse: Record<number, number> = {};
	for (const [attendantID, buttonID] of Object.entries(Wasedashiki.buttonMapping)) {
		reverse[buttonID] = Number(attendantID);
	}
	return reverse;
}

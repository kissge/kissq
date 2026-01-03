export const state = $state({ playSounds: true });

export function playSound(src: string) {
	if (state.playSounds) {
		const audio = new Audio(src);
		audio.volume = 0.25;
		audio.play().catch(() => {
			/* noop */
		});
	}
}

export function playSound(src: string) {
	const audio = new Audio(src);
	audio.volume = 0.25;
	audio.play().catch(() => {
		/* noop */
	});
}

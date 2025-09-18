<script lang="ts">
	let emoji = $state<string>();
	let speed = $state(0.8); // seconds

	let now = new Date();

	if (now.getMonth() == 11 && 23 <= now.getDate() && now.getDate() <= 25) {
		emoji = '❄';
		speed = 2;
	} else if (Math.random() < 0.05) {
		emoji = '🍔';
	}
</script>

{#if emoji}
	<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1920 1080">
		{#each [40, 90, 180] as size (size)}
			<g style="font-size: {size}px; filter: blur({180 / size}px);">
				{#each Array.from({ length: 10 }), i (i)}
					{@const x = Math.floor((Math.random() * 1920) / 50) * 50}
					{@const y = Math.floor((Math.random() * 1080) / 50) * 50}
					<text transform="translate({x} {y})">
						<tspan x="0" y="0">{emoji}</tspan>
					</text>
					<text transform="translate({x} {y - 1080})">
						<tspan x="0" y="0">{emoji}</tspan>
					</text>
				{/each}

				<animateTransform
					dur="{speed}s"
					type="translate"
					from="0 0"
					to="0 1080"
					attributeName="transform"
					repeatCount="indefinite"
				/>
			</g>
		{/each}
	</svg>
{/if}

<style>
	svg {
		width: 95dvw;
		height: 95dvh;
		font-family:
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			Roboto,
			Helvetica,
			Arial,
			sans-serif,
			'Apple Color Emoji',
			'Segoe UI Emoji',
			'Segoe UI Symbol';
		user-select: none;
	}
</style>

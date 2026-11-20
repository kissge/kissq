<script lang="ts">
	import { fade } from 'svelte/transition';

	import { getGameContext } from '$lib/gameContext';

	const Game = getGameContext();

	let show = $state(false);
</script>

<button
	onclick={() => Game.clickUndo()}
	onmouseenter={() => (show = true)}
	onmouseleave={() => (show = false)}
	disabled={Game.history.length === 0}
>
	{#key Game.history.length}
		↩
		<span in:fade>
			{Game.history.at(-1)?.toString(Game.currentState) || 'この世の始まり'}
		</span>を元に戻す
	{/key}
</button>

{#if show && Game.history.length > 1}
	<div class="popover" transition:fade={{ duration: 100 }}>
		{#each Game.history.slice(-5, -1) as entry, i (i)}
			<div class="entry">{entry.toString(Game.currentState)}</div>
			<div class="arrow">▼</div>
		{/each}
	</div>
{/if}

<style>
	button {
		max-width: 25dvw !important;
		anchor-name: --undo-button;
	}

	.popover {
		position: absolute;
		right: anchor(right);
		bottom: calc(anchor(top) + 0.25em);
		left: anchor(left);
		z-index: 9999;
		padding: 0.5em;
		position-anchor: --undo-button;
		font-size: 0.8em;
		text-align: center;
		background: rgb(255 255 255 / 50%);
		border-radius: 0.25rem;
		box-shadow: 0 2px 30px rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(0.5em);
	}

	.arrow {
		padding: 0.25em;
		font-size: 0.6em;
		font-weight: bold;
		opacity: 0.4;
	}
</style>

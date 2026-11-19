<script lang="ts">
	import { fade } from 'svelte/transition';

	import { getGameContext } from '$lib/gameContext';
	import { tooltip } from '$lib/tooltip.svelte';

	const Game = getGameContext();
</script>

<button
	onclick={() => Game.clickUndo()}
	disabled={Game.history.length === 0}
	{@attach tooltip('直前の操作を無かったことにします。')}
>
	{#key Game.history.length}
		↩
		<span in:fade>
			{Game.history.at(-1)?.toString(Game.currentState) || 'この世の始まり'}
		</span>を元に戻す
	{/key}
</button>

<style>
	button {
		max-width: 25dvw !important;
	}
</style>

<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';

	import { getGameContext } from '$lib/gameContext';
	import { getTimeElapsedString } from '$lib/time';

	let { show }: { show: boolean } = $props();
	let Game = getGameContext();

	let timeElapsed = $state('');

	onMount(() => {
		timeElapsed = getTimeElapsedString(Game.gameStartedAt);
		const interval = setInterval(() => {
			timeElapsed = getTimeElapsedString(Game.gameStartedAt);
		}, 1000);

		return () => clearInterval(interval);
	});
</script>

{#if show}
	<div class="counter-popover" transition:fly={{ y: -10, duration: 200 }}>
		{timeElapsed}<br />
		<small>全</small>
		{Game.attendants.length} <small>人</small><br />
		<small>勝抜</small>
		{Game.currentState.attendants.filter((a) => a.life === 'won').length}
		<small>人</small><br />
		<small>失格</small>
		{Game.currentState.attendants.filter((a) => a.life === 'lost').length}
		<small>人</small>
	</div>
{/if}

<style>
	.counter-popover {
		position: fixed;
		position-anchor: --global-header;
		top: calc(anchor(bottom) + 0.25em);
		left: calc(anchor(left) + 0.5em);
		z-index: 1000;
		box-shadow: 0 2px 30px rgba(0, 0, 0, 0.5);
		border-radius: 0.25rem;
		background: rgb(255 255 255 / 50%);
		backdrop-filter: blur(0.5em);
		padding: 0.6em;
		font-size: 1.5em;
		text-align: right;
		text-shadow: 0 0 0.25em #fff;
	}

	small {
		font-size: 0.6em;
	}
</style>

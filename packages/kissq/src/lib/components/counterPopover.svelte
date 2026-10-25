<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import type { GameClassBaseType } from '$lib/game';

	let { Game, show }: { Game: GameClassBaseType; show: boolean } = $props();

	let timeElapsed = $state('');

	function setTimeElapsed() {
		let totalSeconds = Math.floor((new Date().getTime() - Game.gameStartedAt.getTime()) / 1000);
		let hours = Math.floor(totalSeconds / 3600);
		let minutes = Math.floor((totalSeconds % 3600) / 60);
		let seconds = totalSeconds % 60;

		if (hours > 0) {
			timeElapsed = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
		} else {
			timeElapsed = `${minutes}:${seconds.toString().padStart(2, '0')}`;
		}
	}

	onMount(() => {
		setTimeElapsed();
		const interval = setInterval(setTimeElapsed, 1000);

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
		background: #eee;
		padding: 0.6em;
		font-size: 1.5em;
		text-align: right;
	}

	small {
		font-size: 0.6em;
	}
</style>

<script lang="ts">
	import type { WasedashikiMode } from '$lib/serial';
	import { tooltipInDialog as tooltip } from '$lib/tooltip.svelte';

	let { chance }: { chance: WasedashikiMode | undefined } = $props();
</script>

{#if chance === 'single' || chance === 'handicap'}
	<span class="single" {@attach tooltip('シングルチャンス')}>1C</span>
{:else if chance === 'double'}
	<span class="double" {@attach tooltip('ダブルチャンス')}>2C</span>
{:else if chance === 'endless'}
	<span class="endless" {@attach tooltip('エンドレスチャンス')}>∞C</span>
{/if}

<style>
	span {
		box-sizing: border-box;
		display: inline-block;
		height: 1.8em;
		translate: 0 -0.15em;
		border-radius: 0.2em;
		padding: 0.1em 0.3em;
		color: white;
		font-weight: bold;
		font-size: 0.8em;
	}

	.single {
		background-color: #4caf50;
	}

	.double {
		background-color: #2196f3;
	}

	.endless {
		background-color: #cf810b;
	}
</style>

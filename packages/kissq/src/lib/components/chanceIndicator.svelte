<script lang="ts">
	import { tooltipInDialog as tooltip } from '$lib/tooltip.svelte';

	import type { WasedashikiMode } from '$lib/serial';

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
		padding: 0.1em 0.3em;
		font-size: 0.8em;
		font-weight: bold;
		color: white;
		border-radius: 0.2em;
		translate: 0 -0.15em;
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

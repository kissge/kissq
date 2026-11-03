<script lang="ts">
	import { tooltipInDialog as tooltip } from '$lib/tooltip.svelte';

	let { limit, style }: { limit: number | undefined; style: 'rest' | 'total' } = $props();
</script>

{#if limit != undefined}
	{#if style === 'rest'}
		<span class="attendant-limit" {@attach tooltip('全体での残り勝ち抜け人数')}>
			残{limit}
		</span>
	{:else}
		<span class="attendant-limit" {@attach tooltip('全体での勝ち抜け人数')}>
			全{limit}
		</span>
	{/if}
{/if}

<style>
	.attendant-limit {
		box-sizing: border-box;
		display: inline-block;
		height: 1.8em;
		translate: 0 -0.1em;
		border: 1px solid black;
		border-radius: 0.2em;
		padding: 0.1em 0.3em;
		font-weight: bold;
		font-size: 0.8em;
	}
</style>

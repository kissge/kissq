<script lang="ts">
	import { tooltipInDialog as tooltip } from '$lib/tooltip.svelte';

	let { limit, type }: { limit: number | undefined; type: 'rest' | 'total' } = $props();
</script>

{#if limit != undefined}
	{#if type === 'rest'}
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
		padding: 0.1em 0.3em;
		font-size: 0.8em;
		font-weight: bold;
		border: 1px solid black;
		border-radius: 0.2em;
		translate: 0 -0.1em;
	}
</style>

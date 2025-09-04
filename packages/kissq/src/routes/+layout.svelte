<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children?.()}

<style>
	:global(html, body) {
		margin: 0;
		padding: 0;
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
	}
</style>

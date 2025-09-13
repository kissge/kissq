<script lang="ts">
	let { children } = $props();
</script>

{@render children?.()}

<style>
	:global(html, body) {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		margin: 0;
		padding: 0;
		min-height: 100dvh;
		font-family: sans-serif;
	}
</style>

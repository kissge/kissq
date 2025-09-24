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
		overflow-x: hidden;
		font-family: sans-serif;
	}

	:global(button) {
		border-radius: 0.3em;
		padding: 0.2em 0.5em;
		font-size: 1.2rem;
		user-select: none;

		:global(&:not(:disabled)) {
			cursor: pointer;

			&:hover,
			&:focus {
				box-shadow: 3px 3px 5px 3px #ccc;
			}

			&:active {
				box-shadow: inset 3px 3px 5px 3px #ccc;
			}
		}
	}

	:global(label:has([disabled])) {
		color: #aaa;
	}

	:global(label:not(:has([disabled]))) {
		cursor: pointer;
		border-radius: 0.5em;

		&:hover {
			background-color: #eee;
		}
	}

	:global(.crossfade[inert]) {
		/** アニメーションががたがたしないように */
		display: inline-block;
		width: 0;
		height: 0;
	}

	:global(dialog) {
		cursor: default;
		box-shadow: 8px 8px 10px 0 #444;
		border-radius: 0.5em;
		width: min(90%, 800px);
		max-height: 90dvh;
		font-size: 1.5rem;
		user-select: none;

		:global(.buttons) {
			display: flex;
			justify-content: end;
			gap: 0.5em;

			:global(.primary:not([disabled])) {
				background-color: #06f;
				color: white;
			}
		}
	}
</style>

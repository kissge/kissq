<script lang="ts">
	let { children } = $props();
</script>

{@render children?.()}

<style>
	:global {
		html,
		body {
			display: flex;
			flex-direction: column;
			justify-content: space-between;
			margin: 0;
			padding: 0;
			min-height: 100dvh;
			overflow-x: hidden;
			font-family: sans-serif;
		}

		button {
			border-radius: 0.3em;
			padding: 0.2em 0.5em;
			font-size: 1.2rem;
			user-select: none;

			&:not(:disabled) {
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

		label:has([disabled]) {
			color: #aaa;
		}

		label:not(:has([disabled])) {
			cursor: pointer;
			border-radius: 0.5em;

			&:hover {
				background-color: #eee;
			}
		}

		.crossfade[inert] {
			/** アニメーションががたがたしないように */
			display: inline-block;
			width: 0;
			height: 0;
		}

		dialog {
			cursor: default;
			box-sizing: border-box;
			box-shadow: 8px 8px 10px 0 #444;
			border-radius: 0.5em;
			width: min(90%, 800px);
			max-height: 90dvh;
			font-size: 1.5rem;
			user-select: none;

			.buttons {
				display: flex;
				justify-content: end;
				gap: 0.5em;

				.primary:not([disabled]) {
					background-color: #06f;
					color: white;
				}
			}

			.table {
				display: grid;
				grid-template-columns: auto 1fr;
				gap: 1em 0;
				margin-bottom: 2em;

				> div {
					padding: 1em 0;
				}

				> :nth-child(2n + 1) {
					display: flex;
					justify-content: end;
					align-items: center;
					border-right: 1px solid #ccc;
					padding-right: 0.6em;
					font-weight: bold;
					font-size: 1rem;
				}

				> :nth-child(2n + 2) {
					padding-left: 0.6em;
				}

				> :nth-child(4n + 3),
				> :nth-child(4n + 4) {
					background-color: #f6f6f6;
				}

				input[type='number'],
				button {
					padding: 0 0.5rem;
					height: 2.5rem;
				}

				input[type='number'] {
					width: 3em;
					font-size: 2rem;
					text-align: right;
				}

				.error {
					display: block;
					color: red;
				}

				hr {
					margin: 1.5em 0;
					border: none;
					border-top: 1px solid #ccc;
				}
			}
		}
	}
</style>

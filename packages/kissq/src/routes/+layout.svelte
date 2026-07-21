<script lang="ts">
	// @ts-expect-error PWA
	import { pwaInfo } from 'virtual:pwa-info';

	let { children } = $props();
</script>

<svelte:head>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html pwaInfo?.webManifest.linkTag}
</svelte:head>

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
			font-size: 0.8em;
			user-select: none;

			&:not(:disabled) {
				cursor: pointer;

				&:hover,
				&:focus {
					box-shadow: 3px 3px 5px 3px #ccc;
				}

				&:active,
				&.active {
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
			width: min(90%, 900px);
			max-height: 90dvh;
			font-size: 1.5rem;

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

		main.main {
			display: grid;
			grid-template-rows: auto 1fr auto;
			flex: 1 0 100dvh;
			gap: 0 1em;
			background-image: url('$lib/assets/wallpaper.jpg');
			background-position: center center;
			background-size: cover;
			background-color: rgb(15 18 33);
			font-size: 2rem;

			> * {
				padding: 0.7rem 1.5rem;
			}
		}

		.banner-bg {
			position: fixed;
			z-index: 9998;
			inset: 0;
			background-color: rgba(0, 0, 0, 0.3);
		}

		.banner {
			display: flex;
			position: fixed;
			top: calc(50% - 0.7em);
			right: 0;
			bottom: calc(50% - 0.7em);
			left: 0;
			justify-content: center;
			align-items: center;
			z-index: 9999;
			box-shadow: 0 0 20px #222;
			overflow: hidden;
			pointer-events: none;
			font-weight: bold;
			font-size: min(8dvw, 20dvh);
			line-height: 1;
			user-select: none;
			text-align: center;
			text-shadow: 0 0 15px #444;
			white-space: nowrap;

			&.won {
				backdrop-filter: blur(10px);
				background-color: rgba(255 100 100 / 0.3);
				color: white;
			}
			&.lizhi,
			&.double-lizhi,
			&.effect2,
			&.effect3,
			&.transit {
				backdrop-filter: blur(10px);
				background-color: rgba(240 240 175 / 0.4);
				color: rgb(255 231 231);
			}
		}

		header.console,
		main.console,
		footer.console {
			padding: 1em;
		}
		:global(html) {
			font-size: var(--root-font-size);
		}

		:global(body) {
			height: 100vh;
		}

		header.console > div {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 0.5em;
			margin-bottom: 1em;

			button.blink {
				animation: blink-animation 0.5s ease infinite;
				background-color: red;
				color: white;
			}

			.spacer {
				flex-grow: 1;
			}

			label {
				display: flex;
				gap: 0.25em;
			}

			input[type='number'] {
				width: 3em;
				font-size: 1rem;
			}

			.attendant {
				border: 1px solid #ccc;
				padding: 0.5em;
				line-height: 2.1;
			}

			.lizhi,
			.won,
			.lost {
				border-radius: 1em;
				padding: 0 0.5em;
			}

			.lizhi {
				background: #dddd0e;
			}
			.won {
				background: #7cfc00;
			}
			.lost {
				background: #ff4500;
				color: white;
			}
		}

		@keyframes blink-animation {
			to {
				opacity: 0.3;
			}
		}

		main.console {
			flex-grow: 1;
			overflow: auto;

			table {
				border-collapse: collapse;
				width: 100%;
			}

			tr:nth-child(odd) {
				background-color: #f0f0f0;
			}

			tr.current {
				background-color: #ffff99;
				font-weight: bold;
			}

			td {
				vertical-align: top;
				border: 1px solid #ccc;
				padding: 0.5em;

				&:first-child {
					text-align: right;
				}

				&.error {
					animation: errorFlash 0.5s ease-in-out infinite;
				}

				em {
					color: #888;
					font-style: normal;
				}
			}
		}

		.show-keyboard button.labeled {
			position: relative;

			&:after {
				display: block;
				position: absolute;
				top: -0.5em;
				right: -0.5em;
				border-radius: 0.25em;
				background: rgb(89 89 228);
				width: 1em;
				content: attr(data-label);
				color: white;
			}
		}
	}
</style>

<script lang="ts">
	import 'toastify-js/src/toastify.css';

	import { onMount } from 'svelte';
	import Toastify from 'toastify-js';
	// @ts-expect-error PWA
	import { pwaInfo } from 'virtual:pwa-info';

	import { isSafari } from '$lib/browser';

	let { children } = $props();

	onMount(() => {
		if (isSafari) {
			Toastify({ text: 'SafariじゃなくてChromeかEdgeを使ってください＞＜' }).showToast();
		}
	});
</script>

<svelte:head>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html pwaInfo?.webManifest.linkTag}
</svelte:head>

{@render children?.()}

<style>
	@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@100..900&display=swap');
	:global {
		html,
		body {
			display: flex;
			flex-direction: column;
			justify-content: space-between;
			min-height: 100dvh;
			padding: 0;
			margin: 0;
			overflow-x: hidden;
			font-family: 'Noto Sans JP', sans-serif;
		}

		button {
			padding: 0.2em 0.5em;
			font-size: 0.8em;
			user-select: none;
			border-radius: 0.3em;

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

		.spacer {
			flex: 1 0 0;
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
			box-sizing: border-box;
			width: min(90%, 40em);
			max-height: 90dvh;
			font-size: 1.5rem;
			cursor: default;
			border-radius: 0.5em;
			box-shadow: 8px 8px 10px 0 #444;

			p:first-child {
				margin-top: 0;
			}

			.buttons {
				display: flex;
				gap: 0.5em;
				justify-content: end;
				margin-top: 0.5em;

				.primary:not([disabled]) {
					color: white;
					background-color: #06f;
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
					align-items: center;
					justify-content: end;
					padding-right: 0.6em;
					padding-left: 0.6em;
					font-size: 0.6666em;
					font-weight: bold;
					border-right: 1px solid #ccc;
				}

				> :nth-child(2n + 2) {
					padding-left: 0.6em;
				}

				> :nth-child(4n + 3),
				> :nth-child(4n + 4) {
					background-color: #f6f6f6;
				}

				input {
					font-size: 1em;
				}

				input[type='number'] {
					height: 1.3em;
					padding: 0 0.27778em;
				}

				input[type='number'] {
					width: 3em;
					font-size: 1.3333em;
					text-align: right;
				}

				input[type='radio'],
				input[type='checkbox'] {
					width: 0.8em;
					height: 0.8em;
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
			flex: 0 0 100dvh;
			grid-template-rows: auto 1fr auto;
			gap: 0 1em;
			font-size: 2rem;
			background-color: rgb(15 18 33);
			background-image: url('$lib/assets/wallpaper.jpg');
			background-position: center center;
			background-size: cover;

			> * {
				padding: 0.7rem 1.5rem;
			}
		}

		.banner-bg {
			position: fixed;
			inset: 0;
			z-index: 9998;
			background-color: rgba(0, 0, 0, 0.3);
		}

		.banner {
			position: fixed;
			top: calc(50% - 0.7em);
			right: 0;
			bottom: calc(50% - 0.7em);
			left: 0;
			z-index: 9999;
			display: flex;
			align-items: center;
			justify-content: center;
			overflow: hidden;
			font-size: min(8dvw, 20dvh);
			font-weight: bold;
			line-height: 1;
			text-align: center;
			white-space: nowrap;
			text-shadow: 0 0 15px #444;
			pointer-events: none;
			user-select: none;
			box-shadow: 0 0 20px #222;

			&.won,
			&.finished {
				color: white;
				background-color: rgba(255 100 100 / 0.3);
				backdrop-filter: blur(10px);
			}
			&.lizhi,
			&.double-lizhi,
			&.effect2,
			&.effect3,
			&.transit {
				color: rgb(255 231 231);
				background-color: rgba(240 240 175 / 0.4);
				backdrop-filter: blur(10px);
			}
		}

		:global(html) {
			font-size: var(--root-font-size);
		}

		:global(body) {
			height: 100dvh;
			text-autospace: normal;
		}

		.toastify {
			font-size: 2rem;
		}

		.textbook-font {
			font-family:
		    /* macOS 向け */
				'Yu Kyokasho',
				'游教科書体',
				'YuKyokasho',
				/* Windows 10/11 向け */ 'UD Digi Kyokasho NP',
				'UD Digi Kyokasho NP-R',
				'UD デジタル 教科書体 NP',
				'UD デジタル 教科書体 NP-R',
				/* 古いWindowsやOffice搭載環境向け（予備） */ 'HGKyokashotai',
				'HG教科書体',
				/* どの教科書体も無い場合の最終フォールバック */ sans-serif;
			font-weight: bold;
			color: #fff;
		}

		.other-menu-button {
			flex: 0 0 2em;
			height: 2em;
			padding: 0;
			margin-right: -0.8em;
			font-weight: bold;
			border: 0;
			border-radius: 5em;

			&:focus {
				box-shadow: none !important;
			}
		}

		#other-menu:popover-open {
			position: absolute;
			display: flex;
			flex-direction: column;
			gap: 0.2em;
			max-height: 80dvh;
			padding: 0.25em;
			margin-bottom: 0.25em;
			position-area: top;
			font-size: max(1.5dvw * 1.1, 24px * 1.1);
			border: 0;
			box-shadow: 0 0 5px #0008;

			h3 {
				padding: 0.2em 0.5em;
				margin: 0;
				font-size: 0.8em;
				font-weight: inherit;
				color: #888;
				cursor: default;

				&:not(:first-child) {
					padding-top: 0.5em;
					border-top: 1px solid #ddd;
				}
			}

			button {
				margin-left: 0.5em;
				text-align: left;
				background: none;
				border: 0;

				&:not([disabled]):hover {
					background-color: #0002;
					box-shadow: none;
				}

				&:active {
					color: white;
					background-color: #003 !important;
				}
			}
		}

		[popover] {
			animation: fadeIn 0.2s ease-in-out;
		}

		@keyframes fadeIn {
			from {
				opacity: 0;
				translate: 0 0.5em;
			}
			to {
				opacity: 1;
				translate: 0 0;
			}
		}
	}
</style>

<script lang="ts">
	import { getGameContext } from '$lib/gameContext';
	import { getLayoutContext } from '$lib/layout.svelte';
	import { tooltip } from '$lib/tooltip.svelte';

	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet<[]> } = $props();

	let Game = getGameContext();
	let Layout = getLayoutContext();
</script>

<footer class="footer" bind:clientHeight={Layout.footerClientHeight}>
	<div class="left">
		<a href="https://github.com/kissge/kissq" target="_blank">ソース</a>
		<a
			href="https://x.com/_kidochan"
			target="_blank"
			{@attach tooltip('kissQの最新情報を得たり🍔をおごったりしてください')}
		>
			🍔作者
		</a>
		<a
			href="https://docs.google.com/forms/d/e/1FAIpQLSdpwAsY5k5LKnnbntsMo1USadZczeuq-SZqlFcNMpbj255u4Q/viewform?pli=1&usp=pp_url&entry.2107805527={encodeURIComponent(
				JSON.stringify(Game)
			)}"
			target="_blank"
			{@attach tooltip(
				'デバッグに役立つ情報を送れるので、バグに出会ったらなるべくすぐクリックしてほしいです＞＜'
			)}
		>
			バグ・要望
		</a>
	</div>

	{@render children?.()}
</footer>

<style>
	footer {
		z-index: 9999;
		box-sizing: border-box;
		display: flex;
		gap: 0.5em;
		justify-content: end;
		width: 100dvw;
		anchor-name: --footer;
		overflow: hidden;
		user-select: none;
		background: #eee;

		.left {
			display: flex;
			flex-grow: 1;
			gap: 1em;
			align-items: center;
			font-size: 0.8em;

			a {
				text-decoration: none;
			}

			a:hover {
				opacity: 0.6;
			}
		}

		a,
		:global(button) {
			max-width: 10dvw;
			overflow: hidden;
			white-space: nowrap;

			&.blink {
				color: white;
				background-color: red;
				animation: blink-animation 0.5s ease infinite;
			}
		}
	}

	@keyframes blink-animation {
		to {
			opacity: 0.3;
		}
	}

	@media (max-width: 799px) {
		footer {
			gap: 0.2em;

			.left {
				gap: 0.2em;

				& > a {
					font-size: 0;

					&::first-letter {
						font-size: 1.6rem;
					}
				}
			}

			:global(button) {
				max-width: unset;
			}
		}
	}

	@media (max-width: 599px) {
		/* (mainly) for Smartphone */
		footer {
			font-size: 0.5em;

			.left {
				gap: 0.2em;

				& > a {
					font-size: 0;

					&::first-letter {
						font-size: 1rem;
					}
				}
			}
		}
	}
</style>

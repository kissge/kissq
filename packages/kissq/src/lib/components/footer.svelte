<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HistoryEntry } from '$lib/historyEntry';
	import type { Rule } from '$lib/rule';
	import type { Attendant } from '$lib/state';
	import { tooltip } from '$lib/tooltip.svelte';

	let {
		footerClientHeight = $bindable(),
		attendants,
		rules,
		history,
		children
	}: {
		footerClientHeight: number;
		attendants: Attendant[];
		rules: Rule[];
		history: HistoryEntry[];
		children: Snippet<[]>;
	} = $props();
</script>

<footer class="footer" bind:clientHeight={footerClientHeight}>
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
				JSON.stringify({
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					a: attendants.map(({ name, ...rest }) => rest),
					r: rules,
					h: history
				})
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
		display: flex;
		justify-content: end;
		gap: 0.5em;
		box-sizing: border-box;
		background: #eee;
		width: 100dvw;
		overflow: hidden;
		user-select: none;
		anchor-name: --footer;

		.left {
			display: flex;
			flex-grow: 1;
			gap: 1em;
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
				animation: blink-animation 0.5s ease infinite;
				background-color: red;
				color: white;
			}
		}
	}
</style>

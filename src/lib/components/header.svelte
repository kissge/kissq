<script lang="ts">
	import { fade } from 'svelte/transition';
	import type { Attendant } from '$lib/attendant';
	import HelpDialog from '$lib/components/helpDialog.svelte';
	import { getActiveRulesText, type Rule } from '$lib/rule';
	import type { WasedashikiMode } from '$lib/serial';
	import { tooltip } from '$lib/tooltip.svelte';

	let {
		headerClientHeight = $bindable(),
		questionCount,
		hideQuestionCount,
		gameTitle = $bindable(),
		battleMode,
		onBattleModeChange,
		attendants,
		buttonMapping,
		wasedashikiMode,
		rules,
		editRule
	}: {
		headerClientHeight: number;
		questionCount: number;
		hideQuestionCount: boolean;
		gameTitle: string;
		battleMode: 'single' | 'team';
		onBattleModeChange: (event: MouseEvent) => void;
		attendants: Attendant[];
		buttonMapping: Record<number, number>;
		wasedashikiMode: WasedashikiMode | undefined;
		rules: Rule[];
		editRule: () => void;
	} = $props();

	// svelte-ignore non_reactive_update ...?
	let helpDialog: { open: () => void };

	let { activeRulesText } = $derived(getActiveRulesText(rules, battleMode));

	const search = typeof location !== 'undefined' ? location.search : '';
	let hash = $derived(encodeURIComponent(JSON.stringify({ attendants, buttonMapping })));
</script>

<header bind:clientHeight={headerClientHeight}>
	<div>
		Next:
		{#key questionCount}
			<span class="crossfade" in:fade={{ delay: 500 }} out:fade>
				Q{hideQuestionCount ? '???' : questionCount}
			</span>
		{/key}
	</div>
	<h1>
		<span
			contenteditable
			class="editable-title"
			bind:textContent={gameTitle}
			{@attach tooltip('クリックでゲームのタイトルを設定')}
		></span>
		{#if battleMode === 'single'}
			<a
				data-sveltekit-reload
				href="./teams{search}#{hash}"
				onclick={onBattleModeChange}
				{@attach tooltip('団体戦に切り替えます')}
			>
				個人戦 ▾
			</a>
		{:else}
			<a
				data-sveltekit-reload
				href="./{search}#{hash}"
				onclick={onBattleModeChange}
				{@attach tooltip('個人戦に切り替えます')}
			>
				団体戦 <small>β</small> ▾
			</a>
		{/if}
		<button
			onclick={helpDialog.open}
			{@attach tooltip(
				`はじめにお読みください！！！！！！！！！！！！
        ！！！！！！！！！！！！！！！！！！！！！！！
        ！！！！！！！！！！！！！！！！！！！！！！！
        ！！！！！！！！！！！！！！！！！！！！！！！
        ！！！！！！！！！！！！！！！！！！！！！！！`
			)}
		>
			？
		</button>
	</h1>
	<div>
		Rule:
		{activeRulesText}
		{#if wasedashikiMode}
			({wasedashikiMode === 'single'
				? '1C'
				: wasedashikiMode === 'double'
					? '2C'
					: wasedashikiMode === 'endless'
						? '∞C'
						: '1C'})
		{/if}
		<button onclick={editRule} {@attach tooltip('ルールとルールグループを編集します。')}>
			編集
		</button>
	</div>
</header>

<HelpDialog bind:this={helpDialog} />

<style>
	header {
		display: flex;
		justify-content: space-between;
		gap: 1em;
		z-index: 9999;
		box-sizing: border-box;
		background: #eee;
		width: 100dvw;
		font-weight: bold;
		font-size: 2rem;

		h1 {
			all: unset;
		}

		.editable-title {
			position: relative;
			top: -0.3em;
			padding-right: 3px;
			anchor-name: --title;

			&:before {
				content: 'kissQ: ';
			}
			&:empty:before {
				content: 'kissQ';
			}
		}
	}

	a {
		position: absolute;
		position-anchor: --title;
		top: calc(anchor(bottom) - 0.5em);
		left: anchor(left);
		z-index: 9999;
		color: blue;
		font-size: 0.6em;
	}

	a:not(:focus, :hover) {
		color: inherit;
		text-decoration: none;
	}
</style>

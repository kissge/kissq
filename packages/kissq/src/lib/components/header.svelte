<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import HelpDialog from '$lib/components/helpDialog.svelte';
	import type { GameClassBaseType } from '$lib/game';
	import { getLayoutContext } from '$lib/layout.svelte';
	import { tooltip } from '$lib/tooltip.svelte';
	import { isUnlocked } from '$lib/unlock';
	import { getWasedashikiContext } from '$lib/wasedashiki.svelte';
	import ChanceIndicator from './chanceIndicator.svelte';

	let {
		Game,
		battleMode,
		showTotalOverride,
		editRule
	}: {
		Game: GameClassBaseType;
		battleMode: 'single' | 'team';
		showTotalOverride: boolean;
		editRule: () => void;
	} = $props();

	let Layout = getLayoutContext();
	let Wasedashiki = getWasedashikiContext();

	let unlocked = $state(false);

	let helpDialog: { open: () => void };

	let hideQuestionCount = $derived(Game.currentState.defaultRule.mode === 'aql');
	let chance = $derived(Game.wasedashikiMode || Game.rules[0].chance);

	const search = typeof location !== 'undefined' ? location.search : '';
	let hash = $derived(
		Game.attendants.some(({ name }) => name) || Object.keys(Wasedashiki.buttonMapping).length > 0
			? encodeURIComponent(
					JSON.stringify({
						attendants: Game.attendants,
						buttonMapping: Wasedashiki.buttonMapping
					})
				)
			: ''
	);

	onMount(async () => {
		unlocked = await isUnlocked();
	});
</script>

<header bind:clientHeight={Layout.headerClientHeight}>
	{#if showTotalOverride}
		<div>
			Total: {Game.totalQuestionCount + Game.currentState.questionCount - 1} Q's
		</div>
	{:else}
		<div>
			{#key Game.currentState.questionCount}
				<div in:fly={unlocked ? { x: -100 } : { x: 100 }}>
					Next: Q{hideQuestionCount ? '???' : Game.currentState.questionCount}
				</div>
			{/key}
		</div>
	{/if}
	<h1>
		<span
			contenteditable
			class="editable-title"
			bind:textContent={Game.gameTitle}
			{@attach tooltip('クリックでゲームのタイトルを設定')}
		></span>
		{#if battleMode === 'single'}
			<a
				data-sveltekit-reload
				href="./teams{search}#{hash}"
				onclick={() => Game.clearHistory(Wasedashiki)}
				{@attach tooltip('団体戦に切り替えます')}
			>
				個人戦 ▾
			</a>
		{:else}
			<a
				data-sveltekit-reload
				href="./{search}#{hash}"
				onclick={() => Game.clearHistory(Wasedashiki)}
				{@attach tooltip('個人戦に切り替えます')}
			>
				団体戦 <small>β</small> ▾
			</a>
		{/if}
		<button
			onclick={() => helpDialog.open()}
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
		{Game.activeRulesText}
		<ChanceIndicator {chance} />
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
			&:empty:not(:focus):before {
				content: 'kissQ';
			}
			&:empty:focus:after {
				animation: blink 1s infinite;
				border-right: 1px solid #000;
				content: '';
				font-weight: lighter;
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

	@keyframes blink {
		to {
			opacity: 0;
		}
	}
</style>

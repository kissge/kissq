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

	function calcSize() {
		const header = document.getElementById('global-header')!;
		header.classList.add('calculating');

		const space = [...document.querySelectorAll('#global-header .spacer')].reduce(
			(sum, el) => sum + el.clientWidth,
			0
		);

		const ruleSpan = document.getElementById('rule')!;
		ruleSpan.style.maxWidth = `${space}px`;
		header.classList.remove('calculating');

		const ruleInnerSpan = document.querySelector<HTMLDivElement>('.rule-inner')!;
		const scroller = document.querySelector<HTMLDivElement>('.scroller')!;
		if (ruleSpan.clientWidth < ruleInnerSpan.clientWidth) {
			scroller.classList.add('truncated');
		} else {
			scroller.classList.remove('truncated');
		}

		scroller.style.animationDuration = `${Math.max(7, (ruleInnerSpan.clientWidth / ruleSpan.clientWidth) * 5)}s`;
	}

	onMount(async () => {
		unlocked = await isUnlocked();
		calcSize();
	});

	$effect(() => {
		void Game.activeRulesText;
		calcSize();
	});
</script>

<svelte:window onresize={calcSize} />

<header id="global-header" bind:clientHeight={Layout.headerClientHeight}>
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
	<div class="spacer"></div>
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
			id="help-btn"
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
	<div class="spacer"></div>
	<div class="rule-wrapper">
		<span id="rule">
			<span class="scroller">
				<span class="rule-inner">
					Rule:
					{Game.activeRulesText}
				</span>
				<span class="rule-inner">
					Rule:
					{Game.activeRulesText}
				</span>
			</span>
		</span>
		<ChanceIndicator {chance} />
		<button
			id="edit-rule-btn"
			onclick={editRule}
			{@attach tooltip('ルールとルールグループを編集します。')}
		>
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

	.spacer {
		display: none;
		flex: 1 1 0;
	}

	.rule-wrapper {
		display: flex;
		align-items: flex-end;
		gap: 0.25em;
	}

	#rule {
		display: inline-block;
		translate: 0 -0.15em;
		overflow: hidden;
		text-align: right;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.scroller {
		display: inline-block;

		:global(&:not(.truncated) .rule-inner:last-child) {
			display: none;
		}
	}

	.rule-inner {
		display: inline-block;
	}

	:global(.scroller.truncated) {
		animation: scroll 7s linear infinite;
	}

	:global(.calculating) {
		#rule {
			display: none;
		}

		.rule-inner + .rule-inner {
			display: none;
		}

		.spacer {
			display: block;
		}
	}

	@keyframes blink {
		to {
			opacity: 0;
		}
	}

	@keyframes scroll {
		0% {
			transform: translateX(0%);
		}
		100% {
			transform: translateX(-50%);
		}
	}
</style>

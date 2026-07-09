<script lang="ts">
	import { fade } from 'svelte/transition';
	import HelpDialog from '$lib/components/helpDialog.svelte';
	import { getActiveRulesText, type Rule } from '$lib/rule';
	import { tooltip } from '$lib/tooltip.svelte';

	let {
		headerClientHeight = $bindable(),
		questionCount,
		gameTitle,
		battleMode,
		otherModeMembers,
		rules,
		editRule
	}: {
		headerClientHeight: number;
		questionCount: number;
		gameTitle: string;
		battleMode: 'single' | 'team';
		otherModeMembers: unknown;
		rules: Rule[];
		editRule: () => void;
	} = $props();

	// svelte-ignore non_reactive_update ...?
	let helpDialog: { open: () => void };

	let { activeRulesText } = $derived(getActiveRulesText(rules));
</script>

<header bind:clientHeight={headerClientHeight}>
	<div>
		Next:
		{#key questionCount}
			<span class="crossfade" in:fade={{ delay: 500 }} out:fade>
				Q{questionCount}
			</span>
		{/key}
	</div>
	<h1>
		<span contenteditable class="editable-title" bind:textContent={gameTitle}></span>
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
		{#if battleMode === 'single'}
			<a
				href="./teams#{encodeURIComponent(JSON.stringify(otherModeMembers))}"
				target="_blank"
				{@attach tooltip('チーム戦に切り替えます')}
			>
				個人戦
			</a>
		{:else}
			<a
				href="../#{encodeURIComponent(JSON.stringify(otherModeMembers))}"
				target="_blank"
				{@attach tooltip('個人戦に切り替えます')}
			>
				チーム戦 <small>β版</small>
			</a>
		{/if}
	</h1>
	<div>
		Rule:
		{activeRulesText}
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
		box-sizing: border-box;
		background: #eee;
		width: 100dvw;
		font-weight: bold;
		font-size: 2rem;

		h1 {
			all: unset;
		}

		.editable-title {
			padding-right: 3px;

			&:before {
				content: 'kissQ: ';
			}
			&:empty:before {
				content: 'kissQ';
			}
		}
	}

	a {
		color: blue;
		font-size: 0.6em;
	}

	a:not(:focus, :hover) {
		color: inherit;
		text-decoration: none;
	}
</style>

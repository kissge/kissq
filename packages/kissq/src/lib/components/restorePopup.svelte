<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import Toastify from 'toastify-js';

	import { getGameContext } from '$lib/gameContext';
	import { rebuildHistoryEntry } from '$lib/historyEntry';
	import { loadRecovery, removeRecovery, type RecoveryData } from '$lib/restore';
	import { Rule } from '$lib/rule';
	import { getWasedashikiContext } from '$lib/wasedashiki.svelte';

	const Game = getGameContext();
	const Wasedashiki = getWasedashikiContext();

	let data = $state<RecoveryData>();

	let show = $state(false);

	let target = $state<'attendants' | 'rules' | 'scores'>('scores');

	/** 何分前に保存されたか */
	let savedAgo = $derived.by(() => {
		if (!data) {
			return 0;
		}

		const savedAt = new Date(data.Game.serializedAt).getTime();
		const now = Date.now();

		return Math.round((savedAt - now) / 60_000);
	});

	$effect(() => {
		// 何か操作をした時点で非表示にする
		if (Game.history.length > 0) {
			cancel();
		}
	});

	onMount(() => {
		data = loadRecovery();

		if (!data) {
			return;
		}

		show =
			data.Game.battleMode === Game.battleMode && savedAgo < 180 && data.Game.attendants.length > 0;
	});

	function restore() {
		Game.loadFromSerialized(data!.Game, target);
		Wasedashiki.buttonMapping = data!.buttonMapping;

		Toastify({ text: '記録から復元しました。' }).showToast();

		removeRecovery();
		show = false;
	}

	function cancel() {
		removeRecovery();
		show = false;
	}
</script>

{#if show && data}
	<div class="restore-popup" transition:fly={{ x: 100, duration: 600 }}>
		<button class="close-btn" onclick={cancel}>×</button>

		<p>最近閉じたタブの記録が発掘されました。<br />復元しますか？</p>

		<dl>
			<dt>プレイヤー</dt>
			<dd>{data.Game.attendants.map((a, ai) => a.name || `プレイヤー${ai + 1}`).join('、')}</dd>

			<dt>ルール</dt>
			<dd>
				{Rule.getActiveRulesText(
					data.Game.rules.flatMap((rule, i) => (rule.isRemoved ? [] : { rule, i })),
					data.Game.battleMode
				)}
			</dd>

			<dt>操作履歴</dt>
			<dd>
				{#if data.Game.history.length > 3}
					…… →
				{/if}
				{data.Game.history
					.slice(-3)
					.map((entry) => rebuildHistoryEntry(entry).toString(data!.Game))
					.join(' → ') || 'なし'}
			</dd>

			<dt>保存日時</dt>
			<dd>{new Intl.RelativeTimeFormat('ja', { style: 'long' }).format(savedAgo, 'minute')}</dd>
		</dl>

		<form>
			<select bind:value={target}>
				<option value="attendants">プレイヤー情報のみ</option>
				<option value="rules">プレイヤー情報 + ルール</option>
				<option value="scores">プレイヤー情報 + ルール + 得点状況</option>
			</select>
			<button onclick={restore}>復元する 🔒</button>
		</form>
	</div>
{/if}

<style>
	.restore-popup {
		position: fixed;
		position-anchor: --global-header;
		top: calc(anchor(bottom) + 0.5em);
		right: calc(anchor(right) + 0.5em);
		width: 23em;
		max-height: calc(80vh - 5em);
		max-width: calc(90% - 1em);
		background-color: white;
		z-index: 10000;
		box-shadow: 0 2px 30px rgba(0, 0, 0, 0.5);
		border-radius: 0.25em;
		background: rgb(255 255 255 / 50%);
		backdrop-filter: blur(0.5em);
		padding: 0.6em 0.8em 0.8em;
		overflow: auto;
	}

	.close-btn {
		all: unset;
		cursor: pointer;
		float: right;

		&:hover {
			color: white;
			box-shadow: none;
		}
	}

	p {
		margin: 0;
	}

	dl {
		display: grid;
		grid-template-columns: max-content 1fr;
		column-gap: 1em;

		dt {
			font-weight: bold;
		}

		dd {
			margin: 0;
		}
	}

	form {
		display: flex;
		gap: 0.5em;

		select {
			flex: 1;
			background: rgba(255, 255, 255, 0.65);
		}
	}
</style>

<script lang="ts">
	import { untrack } from 'svelte';
	import { flip } from 'svelte/animate';
	import { fade } from 'svelte/transition';
	import RuleEditDialog from '$lib/components/ruleEditDialog.svelte';
	import { Rule } from '$lib/rule';
	import {
		HistoryEntry,
		MaruHistoryEntry,
		BatsuHistoryEntry,
		ThroughHistoryEntry,
		RemoveHistoryEntry
	} from '$lib/historyEntry';
	import { GameState } from '$lib/state';

	let attendants = $state(
		loadFromHash() ?? [
			{ name: '', group: 0 },
			{ name: '', group: 0 }
		]
	);
	let rules = $state([new Rule('marubatsu', 7, 3, 1, 1, 0)]);
	let history = $state<HistoryEntry[]>([]);
	let currentState = $derived(
		history.reduce(
			(state, entry) => entry.reducer(state).updateRanking(),
			new GameState(attendants, rules)
		)
	);

	// svelte-ignore non_reactive_update ...?
	let openRuleEditDialog: (rules: Rule[]) => Promise<Rule[] | null>;

	async function editRule() {
		const result = await openRuleEditDialog(rules);

		if (result) {
			rules = result;
		}
	}

	$effect(() => {
		const data = currentState.attendants.flatMap(({ name, life }) =>
			life === 'removed' ? [] : [name]
		);
		untrack(() => {
			const url = new URL(document.URL);
			url.hash = encodeURIComponent(JSON.stringify(data));
			location.replace(url);
		});
	});

	function loadFromHash(): { name: string; group: number }[] | null {
		try {
			const url = new URL(document.URL);
			if (url.hash.length > 1) {
				const names = JSON.parse(decodeURIComponent(url.hash.slice(1)));
				if (Array.isArray(names) && names.length > 0 && names.every((n) => typeof n === 'string')) {
					return names.map((name) => ({ name, group: 0 }));
				}
			}
		} catch {}

		return null;
	}
</script>

<main>
	<div class="header">
		<div>
			Next:
			{#key currentState.questionCount}
				<span class="crossfade" in:fade={{ delay: 500 }} out:fade>
					Q{currentState.questionCount}
				</span>
			{/key}
		</div>
		<div>
			Rule:
			{#if rules.length === 1}
				{rules[0]}
			{:else}
				{rules.map((rule, i) => String.fromCodePoint(65 + i) + ': ' + rule).join(' / ')}
			{/if}
			<button onclick={editRule}>編集</button>
		</div>
	</div>

	<div class="attendants">
		{#each currentState.ranking as i (i)}
			{@const att = currentState.attendants[i]}
			<div
				style:font-size={currentState.ranking.length <= 11 ? '3rem' : '1em'}
				class={['attendant', { lizhi: att.isLizhi }]}
				animate:flip={{ duration: 500 }}
			>
				{#if rules.length > 1}
					<button
						class="group"
						style:background-color={`hsl(${(360 / rules.length) * attendants[i].group}, 70%, 80%)`}
						style:font-size={currentState.ranking.length <= 11 ? '2rem' : '1.5rem'}
						onclick={() => {
							attendants[i].group = (attendants[i].group + 1) % rules.length;
						}}
					>
						{#key attendants[i].group}
							<span class="crossfade" in:fade={{ delay: 500 }} out:fade>
								{String.fromCodePoint(65 + attendants[i].group)}
							</span>
						{/key}
					</button>
				{/if}
				<div
					bind:textContent={attendants[i].name}
					contenteditable
					placeholder="プレイヤー {[...String(i + 1)]
						.map((c) => String.fromCodePoint(65296 + Number.parseInt(c)))
						.join('')}"
					spellcheck="false"
					class="name"
				></div>

				<div class="hidden-buttons">
					<button onclick={() => history.push(new RemoveHistoryEntry(i))}>削除</button>
				</div>

				<div class="score" style:font-size={currentState.ranking.length <= 7 ? '4.5rem' : '2.6rem'}>
					{#if att.rule.mode === 'score'}
						<span>
							{#key att.score}
								<span class="crossfade" in:fade={{ delay: 500 }} out:fade>
									{att.score}
								</span>
							{/key}
						</span>
						<small>
							pt{#if att.score !== 1}s{/if}
						</small>
					{:else if att.rule.mode === 'MbyN'}
						<span class="m-by-n-score">
							<small style:font-size={currentState.ranking.length <= 9 ? '2.5rem' : '1.8rem'}>
								{att.maruCount} × {att.rule.win - att.batsuCount}
							</small>
							=
							{#key att.score}
								<span class="crossfade" in:fade={{ delay: 500 }} out:fade>{att.score}</span>
							{/key}
						</span>
					{:else}
						<span class="maru-count">{att.maruCount} ○</span>
						<span class="batsu-count">{att.batsuCount} ×</span>
					{/if}
				</div>

				{#if att.yasuDisplay > 0}
					<div class="yasu" in:fade>
						{#key att.yasuDisplay}
							<span class="crossfade" in:fade={{ delay: 500 }} out:fade>{att.yasuDisplay}</span>
						{/key}
						休
					</div>
				{:else if att.life === 'alive'}
					<div class="buttons">
						<button
							onclick={() => {
								history.push(new MaruHistoryEntry(i));
							}}
							style:font-size={currentState.ranking.length <= 8 ? '2.5rem' : '1.5rem'}
						>
							O
						</button>
						<button
							onclick={() => {
								history.push(new BatsuHistoryEntry(i));
							}}
							style:font-size={currentState.ranking.length <= 8 ? '2.5rem' : '1.5rem'}
						>
							X
						</button>
					</div>
				{:else if att.life === 'won'}
					<div class="won" in:fade>
						{currentState.ranking.indexOf(i) + 1}位
					</div>
				{:else}
					<div class="lost" in:fade>失格</div>
				{/if}
			</div>
		{/each}
	</div>

	<footer>
		<div class="left">
			<a href="https://github.com/kissge/kissq" target="_blank">ソース</a>
			<a href="https://x.com/_kidochan" target="_blank">🍔作者</a>
		</div>
		<button onclick={() => history.push(new ThroughHistoryEntry())}>スルー</button>
		<button onclick={() => history.pop()} disabled={history.length === 0}>
			{history.at(-1)?.toString(currentState) || 'この世の始まり'}を元に戻す
		</button>
		<button
			onclick={() => {
				attendants.push({ name: '', group: 0 });
			}}
		>
			プレイヤーを追加
		</button>
		<button
			onclick={() => {
				if (
					confirm(
						'全員ゼロ〇ゼロ×にリセットしますか？\nこの操作は元に戻せません。\n（プレイヤーリストは残ります）'
					)
				) {
					attendants = attendants.filter((_, i) => currentState.attendants[i].life !== 'removed');
					history = [];
				}
			}}
			disabled={history.length === 0}
		>
			全員リセット
		</button>
		<button
			onclick={() => {
				if (
					confirm(
						'プレイヤーリストを空にした上で、初期状態にリセットしますか？\nこの操作は元に戻せません。'
					)
				) {
					attendants = [];
					history = [];
				}
			}}
			disabled={attendants.length === 0}
		>
			全削除
		</button>
	</footer>
</main>

<RuleEditDialog bind:open={openRuleEditDialog} />

<style>
	:global(button) {
		font-size: 1.2rem;
		border-radius: 0.3em;
		padding: 0.2em 0.5em;
		user-select: none;

		&:not(:disabled) {
			cursor: pointer;

			&:hover {
				box-shadow: 3px 3px 5px 3px #ccc;
			}
		}
	}

	:global(label) {
		cursor: pointer;

		&:hover {
			opacity: 0.6;
		}
	}

	:global(.crossfade[inert]) {
		/** アニメーションががたがたしないように */
		display: inline-block;
		width: 0;
		height: 0;
	}

	main {
		display: grid;
		grid-template-rows: auto 1fr auto;
		gap: 0 1em;
		height: 100%;
		flex: 1 0 100%;
		font-size: 2rem;

		> * {
			padding: 0.7rem 1.5rem;
		}

		.header,
		footer {
			background: #eee;
		}

		.header {
			display: flex;
			justify-content: space-between;
			font-weight: bold;
			font-size: 2rem;
		}

		.attendants {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
			grid-template-rows: repeat(auto-fill, minmax(1fr, 300px));
			gap: 0.5em;

			.attendant {
				position: relative;
				background-color: #fafafa;
				box-shadow: 0 2px 2px 3px #ccc;
				padding: 0.5em;
				border-radius: 0.5em;
				max-width: 200px;
				display: flex;
				flex-direction: column;
				gap: 0.35em;
				transition: background-color 0.3s ease;

				&:has(.yasu) {
					background-color: gray;
				}
				&:has(.won) {
					background-color: lightgreen;
				}
				&:has(.lost) {
					background-color: lightcoral;
				}
				&.lizhi {
					background-color: rgb(255 255 158);
				}

				.group {
					transition: background-color 0.3s ease;
				}

				.name {
					flex: 1 1 100px;
					writing-mode: vertical-rl;
					width: 100%;
					display: flex;
					align-items: center;
					padding: 0;
					overflow: hidden;
					line-height: 1.1;
					word-break: break-all;
					font-weight: bold;

					&:empty:not(:focus)::before {
						content: attr(placeholder);
						color: #aaa;
						cursor: text;
					}
				}

				.hidden-buttons {
					position: absolute;
					left: -0.5em;
					opacity: 0;
					display: flex;
					flex-wrap: auto;
					justify-content: space-evenly;
					gap: 3px;
				}

				&:hover .hidden-buttons {
					opacity: 1;
				}

				.score {
					display: flex;
					flex-direction: column;
					align-items: center;
					font-weight: bold;
					line-height: 0.9;

					small {
						font-weight: normal;
						font-size: 1.6rem;
					}

					.m-by-n-score {
						text-align: center;

						small {
							display: block;
						}
					}
					.maru-count {
						color: red;
					}
					.batsu-count {
						color: blue;
					}
				}

				.buttons,
				.yasu,
				.won,
				.lost {
					height: 1.25em;
					text-align: center;
				}

				.yasu {
					color: white;
				}

				.buttons {
					display: flex;
					flex-wrap: auto;
					justify-content: space-evenly;
					gap: 3px;

					> * {
						flex: 1 1 auto;
						max-width: 100px;
						display: flex;
						align-items: center;
						justify-content: center;
					}
				}
			}
		}

		footer {
			display: flex;
			justify-content: end;
			gap: 0.5em;

			.left {
				display: flex;
				gap: 1em;
				flex-grow: 1;
				font-size: 0.8em;

				a {
					text-decoration: none;
				}

				a:hover {
					opacity: 0.6;
				}
			}
		}
	}
</style>

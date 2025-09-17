<script lang="ts">
	import { watch } from 'runed';
	import { untrack } from 'svelte';
	import { flip } from 'svelte/animate';
	import { fade, slide } from 'svelte/transition';
	import RuleEditDialog from '$lib/components/ruleEditDialog.svelte';
	import {
		HistoryEntry,
		MaruHistoryEntry,
		BatsuHistoryEntry,
		ThroughHistoryEntry,
		RemoveHistoryEntry
	} from '$lib/historyEntry';
	import { Rule } from '$lib/rule';
	import { GameState, type Attendant } from '$lib/state';
	import { tooltip } from '$lib/tooltip.svelte';

	let attendants = $state<Attendant[]>(
		loadFromHash() ?? [
			{ name: '', group: 0, trophyCount: 0 },
			{ name: '', group: 0, trophyCount: 0 }
		]
	);
	let rules = $state([new Rule('marubatsu', 7, 3, 1, 1, 0)]);
	let history = $state<HistoryEntry[]>([]);
	let currentState = $derived(
		history.reduce(
			(state, entry) => entry.reducer(state.clearLatestEvent()).updateRanking(),
			new GameState(attendants, rules)
		)
	);
	let activeRules = $derived(rules.flatMap((rule, i) => (rule.isRemoved ? [] : { rule, i })));

	let showBanner = $state<typeof currentState.latestEvent>(null);
	watch(
		() => currentState.latestEvent,
		(curr, prev) => {
			if (curr?.type !== prev?.type || curr?.attendantID !== prev?.attendantID) {
				showBanner = curr;
				setTimeout(() => {
					showBanner = null;
				}, 3000);
			}
		}
	);

	let attendantFLIPDelay = $state(0);

	// svelte-ignore non_reactive_update ...?
	let openRuleEditDialog: (rules: Rule[]) => Promise<Rule[] | null>;

	async function editRule() {
		const result = await openRuleEditDialog(rules);

		if (result) {
			const activeRuleCount = result.filter(({ isRemoved }) => !isRemoved).length;
			if (activeRuleCount === 1) {
				rules = result.filter(({ isRemoved }) => !isRemoved);
				attendants.forEach((att) => {
					att.group = 0;
				});
			} else {
				rules = result;
				attendants.forEach((att) => {
					while (rules[att.group].isRemoved) {
						att.group = (att.group - 1 + rules.length) % rules.length;
					}
				});
			}
		}
	}

	$effect(() => {
		let data = currentState.attendants.flatMap(({ name, life }) =>
			life === 'removed' ? [] : [name]
		);
		if (data.every((n) => n === '')) {
			data = [];
		}
		untrack(() => {
			// eslint-disable-next-line svelte/prefer-svelte-reactivity
			const url = new URL(document.URL);
			url.hash = encodeURIComponent(JSON.stringify(data));
			location.replace(url);
		});
	});

	function loadFromHash(): Attendant[] | null {
		try {
			const url = new URL(document.URL);
			if (url.hash.length > 1) {
				const names = JSON.parse(decodeURIComponent(url.hash.slice(1)));
				if (Array.isArray(names) && names.length > 0 && names.every((n) => typeof n === 'string')) {
					return names.map((name) => ({ name, group: 0, trophyCount: 0 }));
				}
			}
		} catch {
			/* ignore */
		}

		return null;
	}
</script>

<svelte:head>
	<title>
		kissQ - {currentState.attendants
			.flatMap(({ name, life }) => (life !== 'removed' ? [name || '👤'] : []))
			.join(', ')}
	</title>
</svelte:head>

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
			{#if activeRules.length === 1}
				{activeRules[0].rule}
			{:else}
				{activeRules.map(({ rule, i }) => String.fromCodePoint(65 + i) + ': ' + rule).join(' / ')}
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
				animate:flip={{ duration: 500, delay: attendantFLIPDelay }}
			>
				{#if activeRules.length > 1}
					<button
						class="group"
						style:background-color={`hsl(${(360 / rules.length) * attendants[i].group}, 70%, 80%)`}
						style:font-size={currentState.ranking.length <= 11 ? '2rem' : '1.5rem'}
						onclick={() => {
							do {
								attendants[i].group = (attendants[i].group + 1) % rules.length;
							} while (rules[attendants[i].group].isRemoved);
						}}
						{@attach tooltip('このプレイヤーの所属グループを変更します。')}
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
					{@attach tooltip('クリックして名前を編集')}
				></div>

				<div class="hidden-buttons">
					<button
						onclick={() => history.push(new RemoveHistoryEntry(i))}
						{@attach tooltip('このプレイヤーをリストから削除します。')}
					>
						削除
					</button>
				</div>

				<div class="trophies" {@attach tooltip('勝ち抜けた累積回数')}>
					{#each Array.from({ length: att.trophyCount }), i (i)}
						<span in:fade>🏆</span>
					{/each}
				</div>

				<div class="score" style:font-size={currentState.ranking.length <= 7 ? '4.5rem' : '2.6rem'}>
					{#if att.rule.mode === 'score' || att.rule.mode === 'survival'}
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
						<span class="maru-count">
							{#key att.maruCount}<span in:fade>{att.maruCount}</span>{/key} ○
						</span>
						<span class="batsu-count">
							{#key att.batsuCount}<span in:fade>{att.batsuCount}</span>{/key} ×
						</span>
					{/if}
				</div>

				{#if att.yasuDisplay > 0}
					<div class="yasu" in:fade>
						{#key att.yasuDisplay}
							{#if att.yasuCount === 'next'}次{/if}
							<span class="crossfade" in:fade={{ delay: 500 }} out:fade>{att.yasuDisplay}</span>
						{/key}
						休
					</div>
				{:else if att.life === 'alive'}
					<div
						class="buttons"
						onmouseenter={() => (attendantFLIPDelay = 600)}
						onmouseleave={() => (attendantFLIPDelay = 0)}
						role="group"
					>
						<button
							onclick={() => {
								history.push(new MaruHistoryEntry(i));
							}}
							style:font-size={currentState.ranking.length <= 8 ? '2.5rem' : '1.5rem'}
							{@attach tooltip(
								`${att.name || 'このプレイヤー'}に1○をつけて、問題カウントを1進めます（休みの人がいれば1休減ります）`
							)}
						>
							O
						</button>
						<button
							onclick={() => {
								history.push(new BatsuHistoryEntry(i));
							}}
							style:font-size={currentState.ranking.length <= 8 ? '2.5rem' : '1.5rem'}
							{@attach tooltip(
								`${att.name || 'このプレイヤー'}に1×をつけます（誰も正解しなければ最後にスルーボタンを押すのを忘れずに！）`
							)}
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
			<a
				href="https://docs.google.com/forms/d/e/1FAIpQLSdpwAsY5k5LKnnbntsMo1USadZczeuq-SZqlFcNMpbj255u4Q/viewform?pli=1&usp=pp_url&entry.2107805527={encodeURIComponent(
					JSON.stringify({
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
		<button
			onclick={() => history.push(new ThroughHistoryEntry())}
			{@attach tooltip(
				'誰も正解しなかった場合に押します。問題カウントが1進み、休みの人がいれば1休減ります。'
			)}
		>
			スルー
		</button>
		<button
			onclick={() => history.pop()}
			disabled={history.length === 0}
			{@attach tooltip('直前の操作を無かったことにします。')}
		>
			{#key history.length}
				<span in:fade>{history.at(-1)?.toString(currentState) || 'この世の始まり'}</span>を元に戻す
			{/key}
		</button>
		<button
			onclick={() => {
				attendants.push({ name: '', group: 0, trophyCount: 0 });
			}}
		>
			プレイヤーを追加
		</button>
		<button
			onclick={() => {
				if (
					confirm(
						'全員ゼロ〇ゼロ×にリセットしますか？\nこの操作は元に戻せません。\n（プレイヤーリスト、累積勝利数🏆は残ります）'
					)
				) {
					currentState.attendants.forEach((att, i) => {
						attendants[i].trophyCount = att.trophyCount;
					});
					attendants = attendants.filter((_, i) => currentState.attendants[i].life !== 'removed');
					history = [];
				}
			}}
			disabled={history.length === 0}
			{@attach tooltip('全員のスコアだけをリセットします。')}
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

{#if showBanner}
	<div class={['banner', showBanner.type]} transition:slide={{ axis: 'x' }}>
		{attendants[showBanner.attendantID].name}
		{#if showBanner.type === 'won'}
			勝ち抜け
		{:else if showBanner.type === 'lizhi'}
			リーチ
		{/if}
	</div>
{/if}

<RuleEditDialog bind:open={openRuleEditDialog} />

<style>
	:global(button) {
		border-radius: 0.3em;
		padding: 0.2em 0.5em;
		font-size: 1.2rem;
		user-select: none;

		&:not(:disabled) {
			cursor: pointer;

			&:hover {
				box-shadow: 3px 3px 5px 3px #ccc;
			}
		}
	}

	:global(label:has([disabled])) {
		color: #aaa;
	}

	:global(label:not(:has([disabled]))) {
		cursor: pointer;
		border-radius: 0.5em;

		&:hover {
			background-color: #eee;
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
		flex: 1 0 100%;
		gap: 0 1em;
		height: 100%;
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
			grid-template-rows: repeat(auto-fill, minmax(1fr, 300px));
			grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
			gap: 0.5em;

			.attendant {
				display: flex;
				position: relative;
				flex-direction: column;
				gap: 0.35em;
				transition: background-color 0.3s ease;
				box-shadow: 0 2px 2px 3px #ccc;
				border-radius: 0.5em;
				background-color: #fafafa;
				padding: 0.5em;
				max-width: 200px;

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
					display: flex;
					flex: 1 1 100px;
					align-items: center;
					padding: 0;
					width: 100%;
					overflow: hidden;
					font-weight: bold;
					line-height: 1.1;
					writing-mode: vertical-rl;
					word-break: break-all;

					&:empty:not(:focus)::before {
						cursor: text;
						content: attr(placeholder);
						color: #aaa;
					}
				}

				.hidden-buttons {
					display: flex;
					position: absolute;
					left: -0.5em;
					flex-wrap: auto;
					justify-content: space-evenly;
					gap: 3px;
					opacity: 0;
				}

				&:hover .hidden-buttons {
					opacity: 1;
				}

				.trophies {
					display: flex;
					position: absolute;
					right: -0.5em;
					flex-direction: column;

					span {
						box-shadow: 0 0 3px #888;
						border-radius: 50%;
						background-color: white;
						padding-bottom: 7px;
						line-height: 1.225;
					}
				}

				.score {
					display: flex;
					flex-direction: column;
					align-items: center;
					margin: 0 -1em;
					font-weight: bold;
					line-height: 0.9;
					text-shadow: 0px 0px 5px #fafafa;

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
					text-shadow:
						0px 0px 5px #000,
						0px 0px 5px #000,
						0px 0px 5px #000;
				}

				.buttons {
					display: flex;
					flex-wrap: auto;
					justify-content: space-evenly;
					gap: 3px;

					> * {
						display: flex;
						flex: 1 1 auto;
						justify-content: center;
						align-items: center;
						max-width: 100px;
					}
				}
			}
		}

		footer {
			display: flex;
			justify-content: end;
			gap: 0.5em;
			user-select: none;

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
		}
	}

	.banner {
		display: flex;
		position: absolute;
		top: 40%;
		right: 0;
		bottom: 40%;
		left: 0;
		justify-content: center;
		align-items: center;
		z-index: 9999;
		box-shadow: 0 0 30px #444;
		overflow: hidden;
		pointer-events: none;
		font-weight: bold;
		font-size: 8rem;
		line-height: 1;
		user-select: none;
		text-align: center;
		text-shadow: 0 0 15px #444;
		white-space: nowrap;

		&.won {
			background-color: rgb(255 100 100);
			color: white;
		}
		&.lizhi {
			background-color: rgb(240 240 175);
			color: rgb(77 43 43);
			text-shadow: none;
		}
	}
</style>

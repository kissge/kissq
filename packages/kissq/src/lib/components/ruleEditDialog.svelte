<script lang="ts">
	import { Rule } from '$lib/rule';
	import { tooltipInDialog as tooltip } from '$lib/tooltip.svelte';

	let { open = $bindable() }: { open: (rules: Rule[]) => Promise<Rule[] | null> } = $props();

	let dialog: HTMLDialogElement;
	let resolve: (rules: Rule[] | null) => void;
	open = (rules_: Rule[]) => {
		rules = rules_.map(({ lose, batsu, yasu, ...rule }) => {
			return {
				...rule,
				isLoseNull: lose === null,
				lose: lose ?? (rule.mode === 'score' ? -5 : 3),
				batsuMode: typeof batsu === 'number' ? 'number' : batsu,
				batsu: typeof batsu === 'number' ? batsu : 0,
				yasuMode: typeof yasu === 'number' ? 'number' : yasu,
				yasu: typeof yasu === 'number' ? yasu : 0
			};
		});
		activeTab = 0;

		dialog.showModal();

		return new Promise<Rule[] | null>((r) => {
			resolve = r;
		});
	};

	interface EditingRule extends Omit<Rule, 'lose' | 'batsu' | 'yasu'> {
		isLoseNull: boolean;
		lose: NonNullable<Rule['lose']>;
		batsuMode: (Rule['batsu'] & string) | 'number';
		batsu: number;
		yasuMode: (Rule['yasu'] & string) | 'number';
		yasu: number;
	}

	let rules = $state<EditingRule[]>([]);
	let activeTab = $state(0);
	let activeRule = $derived(rules[activeTab]);

	let isValid = $derived(
		rules.every(
			({ mode, batsuMode, yasuMode, yasu }) =>
				(mode !== 'score' ? batsuMode !== 'batsu' : true) &&
				(yasuMode ? Number.isInteger(yasu) && yasu >= 0 : true)
		)
	);

	function save() {
		if (!isValid) return;

		dialog.close();
		resolve(
			rules.map(
				(rule) =>
					new Rule(
						rule.mode,
						rule.win,
						rule.isLoseNull ? null : rule.lose,
						rule.maru,
						rule.batsuMode === 'number' ? rule.batsu : rule.batsuMode,
						rule.yasuMode === 'number' ? rule.yasu : rule.yasuMode
					)
			)
		);
	}
</script>

<dialog bind:this={dialog} closedby="any" onclose={() => resolve(null)}>
	{#if rules.length > 0}
		<div class="tabbar">
			<div class="tab button" inert></div>
			{#each rules, i}
				<button
					class={['tab', { active: i === activeTab }]}
					onclick={() => (activeTab = i)}
					{@attach tooltip(
						rules.length === 1
							? '全員に適用されるルールを編集します。'
							: `${String.fromCodePoint(65 + i)}グループのプレイヤーに適用されるルールを編集します。`
					)}
				>
					{rules.length === 1 ? '全員' : String.fromCodePoint(65 + i)}
				</button>
			{/each}
			<button
				class="tab button"
				onclick={() => {
					rules.push({ ...rules.at(-1)! });
					activeTab = rules.length - 1;
				}}
				{@attach tooltip('ルールグループを追加します。')}
			>
				+
			</button>
		</div>
		<div class="table">
			<div style="margin-bottom: 2rem">定番</div>
			<div style="margin-bottom: 2rem">
				<button
					onclick={() => {
						rules[activeTab] = {
							mode: 'marubatsu',
							win: 7,
							isLoseNull: false,
							lose: 3,
							maru: 1,
							batsu: 1,
							batsuMode: 'number',
							yasu: 0,
							yasuMode: 'number'
						};
					}}
				>
					7○3×
				</button>
				<button
					onclick={() => {
						rules[activeTab] = {
							mode: 'marubatsu',
							win: 5,
							isLoseNull: true,
							lose: 3,
							maru: 1,
							batsu: 1,
							batsuMode: 'number',
							yasu: 1,
							yasuMode: 'number'
						};
					}}
				>
					5○1休
				</button>
				<button
					onclick={() => {
						rules[activeTab] = {
							mode: 'score',
							win: 5,
							isLoseNull: false,
							lose: -5,
							maru: 1,
							batsu: -1,
							batsuMode: 'number',
							yasu: 0,
							yasuMode: 'number'
						};
					}}
				>
					+5/-5 NY
				</button>
				<button
					onclick={() => {
						rules[activeTab] = {
							mode: 'MbyN',
							win: 10,
							isLoseNull: false,
							lose: 0,
							maru: 1,
							batsu: 1,
							batsuMode: 'number',
							yasu: 0,
							yasuMode: 'number'
						};
					}}
				>
					10 by 10
				</button>
				<button
					onclick={() => {
						rules[activeTab] = {
							mode: 'score',
							win: 10,
							isLoseNull: false,
							lose: -10,
							maru: 1,
							batsu: -1,
							batsuMode: 'batsu',
							yasu: 0,
							yasuMode: 'number'
						};
					}}
				>
					10 Backstream
				</button>
			</div>

			<div>モード</div>
			<div>
				<label><input type="radio" bind:group={activeRule.mode} value="score" />スコア</label>
				<label><input type="radio" bind:group={activeRule.mode} value="marubatsu" />マルバツ</label>
				<label><input type="radio" bind:group={activeRule.mode} value="MbyN" />M by N</label>
			</div>

			<div>勝利条件</div>
			<div>
				<input type="number" bind:value={activeRule.win} />
				{activeRule.mode === 'MbyN' ? '²' : ''}
				{activeRule.mode !== 'marubatsu' ? 'pts' : '○'} 以上
			</div>

			{#if activeRule.mode !== 'MbyN'}
				<div>失格条件</div>
				<div>
					<label
						{@attach tooltip(
							activeRule.mode === 'marubatsu'
								? '失格バツ数を正の数で入力'
								: '失格スコアを負の数で入力'
						)}
					>
						<input type="radio" bind:group={activeRule.isLoseNull} value={false} />
						<input
							type="number"
							bind:value={activeRule.lose}
							onfocus={() => (activeRule.isLoseNull = false)}
						/>
						{activeRule.mode === 'score' ? 'pts 以下' : '× 以上'}
					</label>
					<label>
						<input type="radio" bind:group={activeRule.isLoseNull} value={true} />失格なし
					</label>
				</div>
			{/if}

			<div>1問正解で</div>
			<div>
				<input type="number" bind:value={activeRule.maru} />
				{activeRule.mode === 'score' ? 'pts' : '○'} 獲得できる
			</div>

			<div>1問誤答で</div>
			<div>
				<label
					{@attach tooltip(
						activeRule.mode === 'marubatsu'
							? '獲得してしまうバツ数を正の数で入力'
							: '失ってしまうスコアを負の数で入力'
					)}
				>
					<input type="radio" bind:group={activeRule.batsuMode} value="number" />
					<input
						type="number"
						bind:value={activeRule.batsu}
						onfocus={() => (activeRule.batsuMode = 'number')}
					/>
					{activeRule.mode === 'score' ? 'pts' : '×'} 獲得してしまう
				</label>
				<br />
				<label>
					<input
						type="radio"
						bind:group={activeRule.batsuMode}
						value="batsu"
						disabled={activeRule.mode !== 'score'}
					/>
					N回目の誤答で -N pts 獲得してしまう
				</label>

				<hr />

				<label>
					<input type="radio" bind:group={activeRule.yasuMode} value="number" />
					<input
						type="number"
						bind:value={activeRule.yasu}
						onfocus={() => (activeRule.yasuMode = 'number')}
						min="0"
					/>
					問休み<small>（0で休みなし）</small>
				</label>
				<br />
				<label>
					<input
						type="radio"
						bind:group={activeRule.yasuMode}
						value="maru"
						disabled={activeRule.mode === 'score'}
					/>
					（現在のマル数）問休み<small>（0マルなら1休）</small>
				</label>
				<br />
				<label>
					<input
						type="radio"
						bind:group={activeRule.yasuMode}
						value="batsu"
						disabled={activeRule.mode === 'score'}
					/>
					N回目の誤答でN問休み
				</label>
				{#if !Number.isInteger(activeRule.yasu) || activeRule.yasu < 0}
					<span class="error">休みは0以上の整数で設定してください</span>
				{/if}
			</div>
		</div>
		<div class="buttons">
			<button
				onclick={() => {
					dialog.close();
					resolve(null);
				}}>キャンセル</button
			>
			<button onclick={save} disabled={!isValid}>保存する</button>
		</div>
	{/if}
</dialog>

<style>
	dialog {
		width: min(90%, 800px);
		max-height: 95dvh;
		user-select: none;
		cursor: default;
		font-size: 1.5rem;
		box-shadow: 8px 8px 10px 0 #444;
		border-radius: 0.5em;

		.tabbar {
			display: flex;
			margin-bottom: 1em;

			.tab {
				flex: 1 1 100px;
				padding: 0.5em;
				background-color: #fff;
				border: 1px solid #aaa;
				border-bottom-color: #444;
				border-top-left-radius: 1em;
				border-top-right-radius: 1em;
				border-bottom-left-radius: 0;
				border-bottom-right-radius: 0;
				text-align: center;
				cursor: pointer;

				&.active {
					border-color: #444;
					border-bottom: none;
					pointer-events: none;
				}

				&:hover {
					background-color: #aaa;
				}
			}

			.tab.button {
				flex: 0 1 30px;
				border: 0;
				border-bottom: 1px solid #444;
				font-size: 2rem;

				&[inert] {
					pointer-events: none;
				}
			}
		}

		.table {
			display: grid;
			grid-template-columns: auto 1fr;
			gap: 1em;
			margin-bottom: 2em;

			> :nth-child(2n + 1) {
				display: flex;
				align-items: center;
				justify-content: end;
				font-weight: bold;
				font-size: 1rem;
				padding-right: 0.6em;
				border-right: 1px solid #ccc;
			}

			input[type='number'],
			button {
				height: 2.5rem;
				padding: 0 0.5rem;
			}

			input[type='number'] {
				font-size: 2rem;
				width: 3em;
				text-align: right;
			}

			.error {
				display: block;
				color: red;
			}

			hr {
				border: none;
				border-top: 1px solid #ccc;
				margin: 1.5em 0;
			}
		}

		.buttons {
			display: flex;
			justify-content: end;
			gap: 0.5em;
		}
	}
</style>

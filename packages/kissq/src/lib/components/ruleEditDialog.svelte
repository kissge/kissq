<script lang="ts">
	import { Rule } from '$lib/rule';
	import { tooltipInDialog as tooltip } from '$lib/tooltip.svelte';

	let dialog: HTMLDialogElement;
	let resolve: (result: Awaited<ReturnType<typeof open>>) => void;
	export function open(rules_: Rule[]): Promise<Rule[] | null> {
		rules = rules_.map(({ lose, batsu, yasuPerMaru, yasu, ...rule }) => {
			return {
				...rule,
				isLoseNull: lose === null,
				lose: lose ?? (rule.mode === 'score' ? -5 : 3),
				batsuMode: typeof batsu === 'number' ? 'number' : batsu,
				batsu: typeof batsu === 'number' ? batsu : 0,
				isYasuPerMaruNull: yasuPerMaru === null,
				yasuPerMaru: yasuPerMaru ?? 5,
				yasuMode: typeof yasu === 'number' ? 'number' : yasu,
				yasu: typeof yasu === 'number' ? yasu : 0
			};
		});
		activeTab = rules.findIndex((r) => !r.isRemoved);

		dialog.showModal();
		dialog.scrollTop = 0;

		return new Promise((r) => {
			resolve = r;
		});
	}

	interface EditingRule extends Omit<Rule, 'lose' | 'batsu' | 'yasuPerMaru' | 'yasu'> {
		isLoseNull: boolean;
		lose: NonNullable<Rule['lose']>;
		batsuMode: (Rule['batsu'] & string) | 'number';
		batsu: number;
		isYasuPerMaruNull: boolean;
		yasuPerMaru: NonNullable<Rule['yasuPerMaru']>;
		yasuMode: (Rule['yasu'] & string) | 'number';
		yasu: number;
	}

	let rules = $state<EditingRule[]>([]);
	let activeTab = $state(0);
	let activeRule = $derived(rules[activeTab]);
	let activeRules = $derived(rules.flatMap((rule, i) => (rule.isRemoved ? [] : { rule, i })));

	let isValid = $derived(
		rules.every(
			({ mode, lose, isLoseNull, batsuMode, isYasuPerMaruNull, yasuPerMaru, yasuMode, yasu }) =>
				(mode === 'survival' ? lose > 0 && !isLoseNull : true) &&
				(mode !== 'score' && mode !== 'survival' ? batsuMode !== 'batsu' : true) &&
				(isYasuPerMaruNull ? true : Number.isInteger(yasuPerMaru) && yasuPerMaru > 0) &&
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
						rule.isYasuPerMaruNull ? null : rule.yasuPerMaru,
						rule.yasuMode === 'number' ? rule.yasu : rule.yasuMode,
						rule.isRemoved
					)
			)
		);
	}
</script>

<dialog bind:this={dialog} closedby="any" onclose={() => resolve(null)}>
	{#if rules.length > 0}
		<div class="tabbar">
			<div class="tab button" inert></div>
			{#each activeRules as { i } (i)}
				<button
					class={['tab', { active: i === activeTab }]}
					disabled={i === activeTab}
					onclick={() => (activeTab = i)}
					{@attach tooltip(
						activeRules.length === 1
							? '全員に適用されるルールを編集します。'
							: `${String.fromCodePoint(65 + i)}グループのプレイヤーに適用されるルールを編集します。`
					)}
				>
					{activeRules.length === 1 ? '全員' : String.fromCodePoint(65 + i)}
				</button>
			{/each}
			<button
				class="tab button"
				onclick={() => {
					rules.push({ ...activeRules.at(-1)!.rule });
					activeTab = activeRules.at(-1)!.i;
				}}
				{@attach tooltip('ルールグループを追加します。')}
			>
				+
			</button>
		</div>

		{#if activeRules.length > 1}
			<div>
				<button
					class="remove"
					onclick={() => {
						activeRule.isRemoved = true;
						let newTab = activeTab;
						do {
							newTab = (newTab - 1 + rules.length) % rules.length;
						} while (rules[newTab].isRemoved);
						activeTab = newTab;
					}}
					{@attach tooltip('削除したグループにいたプレイヤーは自動で別のグループに移動します。')}
				>
					{String.fromCodePoint(65 + activeTab)}グループを削除
				</button>
			</div>
		{/if}

		<div class="table">
			<div style="margin: 2rem 0">定番</div>
			<div style="margin: 2rem 0">
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
							isYasuPerMaruNull: true,
							yasuPerMaru: 0,
							yasu: 0,
							yasuMode: 'number',
							isRemoved: false
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
							isYasuPerMaruNull: true,
							yasuPerMaru: 0,
							yasu: 1,
							yasuMode: 'number',
							isRemoved: false
						};
					}}
				>
					5○1休
				</button>
				<button
					onclick={() => {
						rules[activeTab] = {
							mode: 'marubatsu',
							win: 15,
							isLoseNull: true,
							lose: 3,
							maru: 1,
							batsu: 1,
							batsuMode: 'number',
							isYasuPerMaruNull: false,
							yasuPerMaru: 5,
							yasu: 1,
							yasuMode: 'number',
							isRemoved: false
						};
					}}
				>
					15○1休、5○ごとに5休
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
							isYasuPerMaruNull: true,
							yasuPerMaru: 0,
							yasu: 0,
							yasuMode: 'number',
							isRemoved: false
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
							isYasuPerMaruNull: true,
							yasuPerMaru: 0,
							yasu: 0,
							yasuMode: 'number',
							isRemoved: false
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
							isYasuPerMaruNull: true,
							yasuPerMaru: 0,
							yasu: 0,
							yasuMode: 'number',
							isRemoved: false
						};
					}}
				>
					10 Backstream
				</button>
				<button
					onclick={() => {
						rules[activeTab] = {
							mode: 'survival',
							win: 0,
							isLoseNull: false,
							lose: 30,
							maru: 1,
							batsu: -2,
							batsuMode: 'number',
							isYasuPerMaruNull: true,
							yasuPerMaru: 0,
							yasu: 0,
							yasuMode: 'number',
							isRemoved: false
						};
					}}
				>
					30アタサバ
				</button>
			</div>

			<div>モード</div>
			<div>
				<label>
					<input
						type="radio"
						bind:group={activeRule.mode}
						value="score"
						onchange={() => {
							if (activeRule.lose > 0) {
								activeRule.lose = -5;
							}

							if (activeRule.batsu > 0) {
								activeRule.batsu = -1;
							}

							if (activeRule.yasuMode !== 'number') {
								activeRule.yasuMode = 'number';
							}
						}}
					/>
					スコア
				</label>
				<label>
					<input
						type="radio"
						bind:group={activeRule.mode}
						value="marubatsu"
						onchange={() => {
							if (activeRule.lose <= 0) {
								activeRule.lose = 3;
							}

							if (activeRule.batsu < 0) {
								activeRule.batsu = 1;
							}

							if (activeRule.batsuMode !== 'number') {
								activeRule.batsuMode = 'number';
							}
						}}
					/>
					マルバツ
				</label>
				<label>
					<input
						type="radio"
						bind:group={activeRule.mode}
						value="MbyN"
						onchange={() => {
							if (activeRule.batsu < 0) {
								activeRule.batsu = 1;
							}

							if (activeRule.batsuMode !== 'number') {
								activeRule.batsuMode = 'number';
							}
						}}
					/>
					M by N
				</label>
				<label>
					<input
						type="radio"
						bind:group={activeRule.mode}
						value="survival"
						onchange={() => {
							if (activeRule.isLoseNull) {
								activeRule.isLoseNull = false;
								activeRule.lose = 30;
							}

							if (activeRule.lose < 0) {
								activeRule.lose = 30;
							}

							if (activeRule.batsu > 0) {
								activeRule.batsu = -1;
							}
						}}
					/>
					アタックサバイバル
				</label>
			</div>

			{#if activeRule.mode === 'survival'}
				<div>初期スコア</div>
				<div>
					<input type="number" bind:value={activeRule.lose} /> pts
				</div>
			{:else}
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
			{/if}

			<div>1問正解で</div>
			<div>
				{#if activeRule.mode === 'survival'}
					自分以外全員のスコアから
					<input type="number" bind:value={activeRule.maru} />
					pts 減らす
				{:else}
					<input type="number" bind:value={activeRule.maru} />
					{activeRule.mode === 'score' ? 'pts' : '○'} 獲得できる
				{/if}

				<hr />

				<label>
					<input type="radio" bind:group={activeRule.isYasuPerMaruNull} value={false} />
					<input
						type="number"
						bind:value={activeRule.yasuPerMaru}
						onfocus={() => (activeRule.isYasuPerMaruNull = false)}
					/>
					○ごとに {activeRule.yasuPerMaru} 問休み
				</label>
				<label>
					<input type="radio" bind:group={activeRule.isYasuPerMaruNull} value={true} />
					なし
				</label>
			</div>

			<div>1問誤答で</div>
			<div>
				<label
					{@attach tooltip(
						activeRule.mode === 'score' || activeRule.mode === 'survival'
							? '失ってしまうスコアを負の数で入力'
							: '獲得してしまうバツ数を正の数で入力'
					)}
				>
					<input type="radio" bind:group={activeRule.batsuMode} value="number" />
					<input
						type="number"
						bind:value={activeRule.batsu}
						onfocus={() => (activeRule.batsuMode = 'number')}
					/>
					{activeRule.mode === 'score' || activeRule.mode === 'survival' ? 'pts' : '×'} 獲得してしまう
				</label>
				<br />
				<label>
					<input
						type="radio"
						bind:group={activeRule.batsuMode}
						value="batsu"
						disabled={!(activeRule.mode === 'score' || activeRule.mode === 'survival')}
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
			<button class="primary" onclick={save} disabled={!isValid}>保存する</button>
		</div>
	{/if}
</dialog>

<style>
	.tabbar {
		display: flex;
		margin-bottom: 1em;

		.tab {
			flex: 1 1 100px;
			cursor: pointer;
			box-shadow: none;
			border: 1px solid #aaa;
			border-bottom-color: #444;
			border-top-right-radius: 1em;
			border-top-left-radius: 1em;
			border-bottom-right-radius: 0;
			border-bottom-left-radius: 0;
			background-color: #fff;
			padding: 0.5em;
			text-align: center;

			&.active {
				border-color: #444;
				border-bottom: none;
				pointer-events: none;
			}

			&:hover {
				background-color: #aaa;
			}

			&:disabled {
				color: inherit;
				font-weight: bold;
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

	div:has(> button.remove) {
		display: flex;
		justify-content: end;

		button:not([disabled]) {
			background-color: rgb(255 129 129);
		}
	}

	.table {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 1em 0;
		margin-bottom: 2em;

		> div {
			padding: 1em 0;
		}

		> :nth-child(2n + 1) {
			display: flex;
			justify-content: end;
			align-items: center;
			border-right: 1px solid #ccc;
			padding-right: 0.6em;
			font-weight: bold;
			font-size: 1rem;
		}

		> :nth-child(2n + 2) {
			padding-left: 0.6em;
		}

		> :nth-child(4n + 3),
		> :nth-child(4n + 4) {
			background-color: #f6f6f6;
		}

		input[type='number'],
		button {
			padding: 0 0.5rem;
			height: 2.5rem;
		}

		input[type='number'] {
			width: 3em;
			font-size: 2rem;
			text-align: right;
		}

		.error {
			display: block;
			color: red;
		}

		hr {
			margin: 1.5em 0;
			border: none;
			border-top: 1px solid #ccc;
		}
	}
</style>

<script lang="ts">
	import { Rule } from '$lib/rule';

	let { open = $bindable() }: { open: (rules: Rule[]) => Promise<Rule[] | null> } = $props();

	let dialog: HTMLDialogElement;
	let resolve: (rules: Rule[] | null) => void;
	open = (rules_: Rule[]) => {
		rules = rules_.map(({ lose, yasu, ...rule }) => {
			return {
				...rule,
				isLoseNull: lose === null,
				lose: lose ?? (rule.mode === 'score' ? -5 : 3),
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

	interface EditingRule extends Omit<Rule, 'lose' | 'yasu'> {
		isLoseNull: boolean;
		lose: NonNullable<Rule['lose']>;
		yasuMode: (Rule['yasu'] & string) | 'number';
		yasu: number;
	}

	let rules = $state<EditingRule[]>([]);
	let activeTab = $state(0);
	let activeRule = $derived(rules[activeTab]);

	let isValid = $derived(
		rules.every(({ yasuMode, yasu }) => (yasuMode ? Number.isInteger(yasu) && yasu >= 0 : true))
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
						rule.batsu,
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
				<button class="tab" class:active={i === activeTab} onclick={() => (activeTab = i)}>
					{rules.length === 1 ? '全員' : String.fromCodePoint(65 + i)}
				</button>
			{/each}
			<button
				class="tab button"
				onclick={() => {
					rules.push({ ...rules.at(-1)! });
					activeTab = rules.length - 1;
				}}>+</button
			>
		</div>
		<div class="table">
			<div style="padding-bottom: 2em">定番</div>
			<div>
				<button
					onclick={() => {
						rules[activeTab] = {
							mode: 'marubatsu',
							win: 7,
							isLoseNull: false,
							lose: 3,
							maru: 1,
							batsu: 1,
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
							yasu: 0,
							yasuMode: 'number'
						};
					}}
				>
					+5/-5
				</button>
			</div>

			<div>モード</div>
			<div>
				<label><input type="radio" bind:group={activeRule.mode} value="score" />スコア</label>
				<label><input type="radio" bind:group={activeRule.mode} value="marubatsu" />マルバツ</label>
			</div>

			<div>勝利スコア</div>
			<div>
				<input type="number" bind:value={activeRule.win} />
				{activeRule.mode === 'score' ? 'pts' : '○'}以上
			</div>

			<div>失格スコア</div>
			<div>
				<label>
					<input type="radio" bind:group={activeRule.isLoseNull} value={false} />
					<input
						type="number"
						bind:value={activeRule.lose}
						onfocus={() => (activeRule.isLoseNull = false)}
					/>
					{activeRule.mode === 'score' ? 'pts以下' : '×以上'}
				</label>
				<label><input type="radio" bind:group={activeRule.isLoseNull} value={true} />失格なし</label
				>
			</div>

			<div>1問正解で</div>
			<div>
				<input type="number" bind:value={activeRule.maru} />
				{activeRule.mode === 'score' ? 'pts' : '○'} 獲得できる
			</div>

			<div>1問誤答で</div>
			<div>
				<input type="number" bind:value={activeRule.batsu} />
				{activeRule.mode === 'score' ? 'pts' : '×'} 獲得してしまう &
			</div>

			<div></div>
			<div>
				<label>
					<input type="radio" bind:group={activeRule.yasuMode} value="number" />
					<input
						type="number"
						bind:value={activeRule.yasu}
						onfocus={() => (activeRule.yasuMode = 'number')}
						min="0"
					/> 問休み（0で休みなし）
				</label>
				<br />
				<label>
					<input
						type="radio"
						bind:group={activeRule.yasuMode}
						value="maru"
						disabled={activeRule.mode === 'score'}
					/>
					（現在のマル数）問休み
				</label>
				<br />
				<label>
					<input
						type="radio"
						bind:group={activeRule.yasuMode}
						value="batsu"
						disabled={activeRule.mode === 'score'}
					/>
					（現在のバツ数）問休み
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
		width: min(90%, 600px);
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
				text-align: right;
				font-weight: bold;
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
		}

		.buttons {
			display: flex;
			justify-content: end;
			gap: 0.5em;
		}
	}
</style>

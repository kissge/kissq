<script lang="ts">
	import { fade, fly } from 'svelte/transition';

	import { Rule, type Penalty } from '$lib/rule';
	import { tooltipInDialog as tooltip } from '$lib/tooltip.svelte';
	import { getGroupSymbol } from '$lib/utils';
	import { getWasedashikiContext } from '$lib/wasedashiki.svelte';

	import RulePresetDialog from './rulePresetDialog.svelte';

	const Wasedashiki = (() => {
		try {
			return getWasedashikiContext();
		} catch {
			return undefined;
		}
	})();

	let {
		apply
	}: {
		apply: (rules: Rule[], resetGroups: 'reset' | 'keep') => void;
	} = $props();

	let dialog: HTMLDialogElement;
	let resolve: (result: Awaited<ReturnType<typeof open>>) => void;
	export function open(rules_: Rule[]): Promise<Rule[] | null> {
		rules = rules_.map(({ lose, questionLimit, batsu, yasuPerMaru, roulette, ...rule }) => {
			return {
				...rule,
				isLoseNull: lose === null,
				lose: lose ?? -3,
				isQuestionLimitNull: questionLimit === null,
				questionLimit: questionLimit ?? 30,
				batsuMode: typeof batsu === 'number' ? 'number' : batsu,
				batsu: typeof batsu === 'number' ? batsu : 0,
				yasuPerMaruMode:
					yasuPerMaru === null
						? null
						: 'mode' in yasuPerMaru
							? yasuPerMaru.mode
							: typeof yasuPerMaru.yasu === 'number'
								? 'number'
								: yasuPerMaru.yasu,
				yasuPerMaruMaru: yasuPerMaru && 'maru' in yasuPerMaru ? yasuPerMaru.maru : 5,
				yasuPerMaruYasu:
					yasuPerMaru && 'yasu' in yasuPerMaru && typeof yasuPerMaru.yasu === 'number'
						? yasuPerMaru.yasu
						: 5,
				yasuPerMaruDict:
					yasuPerMaru && 'dict' in yasuPerMaru
						? Object.entries(yasuPerMaru.dict)
								.map(([maru, yasu]) => ({
									maru: Number(maru),
									yasu,
									uid: Math.random()
								}))
								.toSorted((a, b) => a.maru - b.maru)
						: [],
				rouletteName: roulette?.name ?? null
			};
		});
		activeTab = rules.findIndex((r) => !r.isRemoved);

		dialog.showModal();
		dialog.scrollTop = 0;

		return new Promise((r) => {
			resolve = r;
		});
	}

	/** クローンを容易にするため、オブジェクトプロパティを使わない */
	interface EditingRule extends Omit<
		Rule,
		| 'lose'
		| 'questionLimit'
		| 'batsu'
		| 'yasuPerMaru'
		| 'roulette'
		| 'max'
		| 'toDetailsStrings'
		| 'toSharedStrings'
	> {
		isLoseNull: boolean;
		lose: NonNullable<Rule['lose']>;
		isQuestionLimitNull: boolean;
		questionLimit: NonNullable<Rule['questionLimit']>;
		batsuMode: (Rule['batsu'] & string) | 'number';
		batsu: number;
		yasuPerMaruMode: 'maru' | 'number' | 'custom' | null;
		yasuPerMaruMaru: number;
		yasuPerMaruYasu: number;
		yasuPerMaruDict: { maru: number; yasu: number; uid: number }[];
		rouletteName: NonNullable<Rule['roulette']>['name'] | null;
	}

	const roulettePresets: Record<string, Penalty[]> = {
		重い: [
			{ type: 'zero' },
			{ type: 'yasu', count: 1 },
			{ type: 'yasu', count: 1 },
			{ type: 'yasu', count: 2 },
			{ type: 'yasu', count: 2 },
			{ type: 'yasu', count: 3 },
			{ type: 'yasu', count: 6 }
		],
		ふつう: [
			{ type: 'yasu', count: 1 },
			{ type: 'yasu', count: 1 },
			{ type: 'yasu', count: 1 },
			{ type: 'yasu', count: 1 },
			{ type: 'yasu', count: 2 },
			{ type: 'yasu', count: 3 }
		],
		軽い: [
			{ type: 'yasu', count: 1 },
			{ type: 'yasu', count: 1 },
			{ type: 'yasu', count: 1 },
			{ type: 'yasu', count: 1 },
			{ type: 'yasu', count: 1 },
			{ type: 'yasu', count: 2 }
		]
	};

	let rules = $state<EditingRule[]>([]);
	let activeTab = $state(0);
	let activeRule = $derived(rules[activeTab]);
	let activeRules = $derived(rules.flatMap((rule, i) => (rule.isRemoved ? [] : { rule, i })));

	let rulesObject = $derived(
		rules.map((rule) =>
			Rule.from({
				mode: rules[0].mode,
				chance: rules[0].chance,
				win: rules[0].win,
				lose: rule.isLoseNull ? null : rule.lose,
				questionLimit: rule.isQuestionLimitNull ? null : rule.questionLimit,
				attendantLimit: null,
				maru: rule.maru,
				batsu: rule.batsuMode === 'number' ? rule.batsu : rule.batsuMode,
				transit: rule.transit,
				yasuPerMaru:
					rule.yasuPerMaruMode === null
						? null
						: rule.yasuPerMaruMode === 'custom'
							? {
									mode: 'custom',
									dict: Object.fromEntries(
										rule.yasuPerMaruDict
											.map(({ maru, yasu }) => [maru, yasu])
											.toSorted(([a], [b]) => a - b)
									)
								}
							: {
									maru: rule.yasuPerMaruMaru,
									yasu:
										rule.yasuPerMaruMode === 'number' ? rule.yasuPerMaruYasu : rule.yasuPerMaruMode
								},
				yasuMode: rule.yasuMode,
				yasuPerBatsu: rule.yasuPerBatsu,
				roulette:
					rule.rouletteName === null
						? null
						: { name: rule.rouletteName, choices: roulettePresets[rule.rouletteName] },
				bulkAdjustment: null,
				multiplyMinimum: rule.multiplyMinimum,
				attendantLimitOverall: rule.attendantLimitOverall,
				isRemoved: rule.isRemoved
			})
		)
	);

	let chanceLocked = $derived(Wasedashiki?.serialPort != null);

	let isValid = $derived(
		rules.every(
			({
				isQuestionLimitNull,
				questionLimit,
				yasuPerMaruMode,
				yasuPerMaruMaru,
				yasuPerMaruYasu,
				yasuPerMaruDict,
				yasuMode,
				yasuPerBatsu,
				rouletteName
			}) =>
				(isQuestionLimitNull ? true : Number.isInteger(questionLimit) && questionLimit > 0) &&
				(yasuPerMaruMode === null
					? true
					: yasuPerMaruMode === 'custom'
						? yasuPerMaruDict.length > 0 &&
							yasuPerMaruDict.every(
								({ maru, yasu }) =>
									Number.isInteger(maru) && maru > 0 && Number.isInteger(yasu) && yasu > 0
							)
						: Number.isInteger(yasuPerMaruMaru) &&
							yasuPerMaruMaru > 0 &&
							(yasuPerMaruMode === 'number'
								? Number.isInteger(yasuPerMaruYasu) && yasuPerMaruYasu > 0
								: true)) &&
				Number.isInteger(yasuPerBatsu) &&
				(yasuMode === 'constant'
					? yasuPerBatsu >= 0
					: yasuMode === 'roulette'
						? rouletteName
						: yasuPerBatsu > 0)
		)
	);

	function usePreset(preset: EditingRule) {
		// 早稲田式連携中
		if (chanceLocked) {
			preset.chance = rules[0].chance;
		}

		rules[0] = preset;

		// 基本ルールの設定を変更した場合、全てのルールに反映させる
		for (const rule of rules) {
			rule.mode = preset.mode;
			rule.chance = preset.chance;
			rule.win = preset.win;
		}

		copyRule();
	}

	function save() {
		if (!isValid) return;

		dialog.close();
		resolve(rulesObject);
	}

	function copyRule() {
		const currentRule = activeTab === -1 ? rules[0] : activeRule;
		rules.forEach((rule) => {
			rule.mode = currentRule.mode;
			rule.win = currentRule.win;

			if (currentRule.mode === 'aql') {
				rule.isLoseNull = currentRule.isLoseNull;
				rule.batsuMode = currentRule.batsuMode;
			} else if (currentRule.mode === 'product') {
				rule.isLoseNull = true;
			}
		});
	}
</script>

<dialog bind:this={dialog}>
	{#if rules.length > 0}
		<div class="tabbar">
			<div class="tab button" inert></div>
			<button
				class={['tab', { active: -1 === activeTab }]}
				disabled={-1 === activeTab}
				onclick={() => (activeTab = -1)}
				{@attach tooltip('全員に適用される基本的なルールを設定します。')}
			>
				基本
			</button>
			{#each activeRules as { i } (i)}
				<button
					class={['tab', { active: i === activeTab }]}
					disabled={i === activeTab}
					onclick={() => (activeTab = i)}
					{@attach tooltip(
						activeRules.length === 1
							? '全員に適用されるルールを編集します。'
							: `${getGroupSymbol(i)}グループのプレイヤーに適用されるルールを編集します。`
					)}
				>
					{activeRules.length === 1 ? '全員' : getGroupSymbol(i)}
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

		{#if activeRules.length > 1 && activeTab !== -1}
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
					{getGroupSymbol(activeTab)}グループを削除
				</button>
			</div>
		{/if}

		{#if activeTab === -1}
			<div class="table">
				<div style="margin: 1.3333em 0">定番</div>
				<div style="margin: 1.3333em 0" class="presets">
					<button
						onclick={() => {
							usePreset({
								mode: 'aql',
								chance: 'endless',
								win: 200,
								isLoseNull: true,
								lose: -3,
								isQuestionLimitNull: false,
								questionLimit: 40,
								attendantLimit: null,
								maru: 1,
								batsu: 1,
								batsuMode: 'updown',
								transit: false,
								yasuPerMaruMode: null,
								yasuPerMaruMaru: 5,
								yasuPerMaruYasu: 5,
								yasuPerMaruDict: [],
								yasuMode: 'constant',
								yasuPerBatsu: 0,
								rouletteName: null,
								bulkAdjustment: null,
								multiplyMinimum: 0,
								attendantLimitOverall: null,
								isRemoved: false
							});
						}}
					>
						AQL（5枠）
					</button>
					<button
						onclick={() => {
							usePreset({
								mode: 'aql',
								chance: 'endless',
								win: 70,
								isLoseNull: true,
								lose: -3,
								isQuestionLimitNull: false,
								questionLimit: 32,
								attendantLimit: null,
								maru: 1,
								batsu: 1,
								batsuMode: 'updown',
								transit: false,
								yasuPerMaruMode: null,
								yasuPerMaruMaru: 5,
								yasuPerMaruYasu: 5,
								yasuPerMaruDict: [],
								yasuMode: 'constant',
								yasuPerBatsu: 0,
								rouletteName: null,
								bulkAdjustment: null,
								multiplyMinimum: 0,
								attendantLimitOverall: null,
								isRemoved: false
							});
						}}
					>
						AQL（4枠）
					</button>
					<button
						onclick={() => {
							usePreset({
								mode: 'aql',
								chance: 'endless',
								win: 24,
								isLoseNull: true,
								lose: -3,
								isQuestionLimitNull: false,
								questionLimit: 24,
								attendantLimit: null,
								maru: 1,
								batsu: 1,
								batsuMode: 'updown',
								transit: false,
								yasuPerMaruMode: null,
								yasuPerMaruMaru: 5,
								yasuPerMaruYasu: 5,
								yasuPerMaruDict: [],
								yasuMode: 'constant',
								yasuPerBatsu: 0,
								rouletteName: null,
								bulkAdjustment: null,
								multiplyMinimum: 0,
								attendantLimitOverall: null,
								isRemoved: false
							});
						}}
					>
						AQL（3枠）
					</button>
					<button
						onclick={() => {
							usePreset({
								mode: 'product',
								chance: 'endless',
								win: 10,
								isLoseNull: true,
								lose: 3,
								isQuestionLimitNull: true,
								questionLimit: 30,
								attendantLimit: null,
								maru: 1,
								batsu: -1,
								batsuMode: 'number',
								transit: false,
								yasuPerMaruMode: null,
								yasuPerMaruMaru: 5,
								yasuPerMaruYasu: 5,
								yasuPerMaruDict: [],
								yasuMode: 'constant',
								yasuPerBatsu: 0,
								rouletteName: null,
								bulkAdjustment: null,
								multiplyMinimum: 0,
								attendantLimitOverall: null,
								isRemoved: false
							});
						}}
					>
						掛けて10
					</button>
					<button
						onclick={() => {
							usePreset({
								mode: 'sum',
								chance: 'endless',
								win: 10,
								isLoseNull: true,
								lose: -3,
								isQuestionLimitNull: true,
								questionLimit: 30,
								attendantLimit: null,
								maru: 1,
								batsu: -1,
								batsuMode: 'number',
								transit: false,
								yasuPerMaruMode: null,
								yasuPerMaruMaru: 5,
								yasuPerMaruYasu: 5,
								yasuPerMaruDict: [],
								yasuMode: 'constant',
								yasuPerBatsu: 0,
								rouletteName: null,
								bulkAdjustment: null,
								multiplyMinimum: 0,
								attendantLimitOverall: null,
								isRemoved: false
							});
						}}
					>
						足して10
					</button>
				</div>

				<div>押せる人数</div>
				<div>
					<label {@attach tooltip('〇、スルーのほか×を押しても問題カウントが直ちに進みます。')}>
						<input
							type="radio"
							bind:group={rules[0].chance}
							value="single"
							disabled={chanceLocked}
						/>
						シングルチャンス
					</label>
					<label
						{@attach tooltip(
							'〇、スルーを押したときは問題カウントが進みますが、×を押しても問題カウントが進みません。'
						)}
					>
						<input
							type="radio"
							bind:group={rules[0].chance}
							value="endless"
							disabled={chanceLocked}
						/>
						エンドレスチャンス
					</label>
					<div class="hint">※ 早稲田式連携中は、早稲田式早押しボタンの設定の方が優先されます。</div>
				</div>

				<div {@attach tooltip('この問題数終わったら終了となります。')}>限定問題数</div>
				<div>
					<label>
						<input type="radio" bind:group={rules[0].isQuestionLimitNull} value={false} />
						<input
							type="number"
							min="1"
							bind:value={rules[0].questionLimit}
							onfocus={() => (rules[0].isQuestionLimitNull = false)}
						/>
						問
					</label>
					<label>
						<input type="radio" bind:group={rules[0].isQuestionLimitNull} value={true} />
						無制限
					</label>
				</div>

				<div>モード</div>
				<div>
					<label>
						<input type="radio" bind:group={rules[0].mode} value="sum" onchange={copyRule} />
						足し算
					</label>
					<label>
						<input
							type="radio"
							bind:group={rules[0].mode}
							value="product"
							onchange={() => {
								if (!rules[0].isLoseNull) {
									rules[0].isLoseNull = true;
								}

								copyRule();
							}}
						/>
						掛け算
					</label>
					<label>
						<input
							type="radio"
							bind:group={rules[0].mode}
							value="aql"
							onchange={() => {
								if (!rules[0].isLoseNull) {
									rules[0].isLoseNull = true;
								}

								if (rules[0].batsuMode !== 'updown') {
									rules[0].batsuMode = 'updown';
								}

								copyRule();
							}}
						/>
						AQL
					</label>
				</div>

				<div>勝利条件</div>
				<div>
					チーム
					<input type="number" bind:value={rules[0].win} min="1" />
					点以上
				</div>
			</div>
		{:else}
			<div class="table">
				{#if activeRule.mode === 'product'}
					<div>封鎖条件</div>
					<div>
						<label {@attach tooltip('封鎖スコアを負の数で入力')}>
							<input type="radio" bind:group={activeRule.isLoseNull} value={false} />
							個人
							<input
								type="number"
								bind:value={activeRule.lose}
								onfocus={() => (activeRule.isLoseNull = false)}
							/>
							点以上
						</label>
						<label>
							<input type="radio" bind:group={activeRule.isLoseNull} value={true} />
							封鎖なし
						</label>
					</div>
				{:else if activeRule.mode === 'sum'}
					<div>失格条件</div>
					<div>
						<label {@attach tooltip('失格スコアを負の数で入力')}>
							<input type="radio" bind:group={activeRule.isLoseNull} value={false} />
							個人
							<input
								type="number"
								bind:value={activeRule.lose}
								onfocus={() => (activeRule.isLoseNull = false)}
							/>
							点以下
						</label>
						<label>
							<input type="radio" bind:group={activeRule.isLoseNull} value={true} />失格なし
						</label>
					</div>
				{/if}

				<div>1問正解で</div>
				<div>
					個人
					<input type="number" bind:value={activeRule.maru} />
					点獲得できる

					<hr />

					<label>
						<input type="radio" bind:group={activeRule.yasuPerMaruMode} value="number" />
						<input
							type="number"
							bind:value={activeRule.yasuPerMaruMaru}
							onfocus={() => (activeRule.yasuPerMaruMode = 'number')}
							min="1"
						/>
						○ごとに個人
						<input
							type="number"
							bind:value={activeRule.yasuPerMaruYasu}
							onfocus={() => (activeRule.yasuPerMaruMode = 'number')}
							min="1"
						/> 問休み
					</label>
					<br />
					<label>
						<input type="radio" bind:group={activeRule.yasuPerMaruMode} value="maru" />
						<input
							type="number"
							bind:value={activeRule.yasuPerMaruMaru}
							onfocus={() => (activeRule.yasuPerMaruMode = 'maru')}
							min="1"
						/>
						○ごとに個人（現在のマル数）問休み
					</label>

					<label>
						<input type="radio" bind:group={activeRule.yasuPerMaruMode} value="custom" />
						N○でM問休みを細かく設定する
					</label>
					{#if activeRule.yasuPerMaruMode === 'custom'}
						<div class="yasu-per-maru-custom" transition:fade>
							{#each activeRule.yasuPerMaruDict as item, i (item.uid)}
								{@const maruInvalid =
									item.maru <= 0 ||
									activeRule.yasuPerMaruDict.some((_, j) => j !== i && _.maru === item.maru)}
								<div transition:fade>
									<input
										type="number"
										min="1"
										class:invalid={maruInvalid}
										bind:value={item.maru}
									/>○で
									<input type="number" min="1" bind:value={item.yasu} />問休み
									{#if maruInvalid}
										<span
											{@attach tooltip('マル数は1以上の整数で、重複しないように設定してください')}
										>
											⚠️
										</span>
									{/if}
									<button
										class="remove-btn"
										onclick={() => {
											activeRule.yasuPerMaruDict.splice(i, 1);
										}}
									>
										×
									</button>
								</div>
							{/each}
							{#if activeRule.yasuPerMaruDict.length > 0}
								（以下ループ）
							{/if}
							<button
								onclick={() =>
									activeRule.yasuPerMaruDict.push({
										maru: (activeRule.yasuPerMaruDict.at(-1)?.maru || 0) + 1,
										yasu: activeRule.yasuPerMaruDict.at(-1)?.yasu || 1,
										uid: Math.random()
									})}
							>
								追加
							</button>
						</div>
					{:else}
						<br />
					{/if}
					<label>
						<input type="radio" bind:group={activeRule.yasuPerMaruMode} value={null} />
						なし
					</label>
				</div>

				<div>1問誤答で</div>
				<div>
					<label {@attach tooltip('失ってしまうスコアを負の数で入力')}>
						<input type="radio" bind:group={activeRule.batsuMode} value="number" />
						個人
						<input
							type="number"
							bind:value={activeRule.batsu}
							onfocus={() => (activeRule.batsuMode = 'number')}
							disabled={activeRule.mode === 'aql'}
						/>
						点獲得してしまう
					</label>
					<br />
					<label>
						<input
							type="radio"
							bind:group={activeRule.batsuMode}
							value="batsu"
							disabled={activeRule.mode === 'aql'}
						/>
						N回目の誤答で個人 -N 点獲得してしまう
					</label>
					<br />
					<label>
						<input type="radio" bind:group={activeRule.batsuMode} value="updown" />
						個人スコアがゼロにリセットされてしまう
					</label>

					<hr />

					<label>
						<input type="radio" bind:group={activeRule.yasuMode} value="constant" />
						個人
						<input
							type="number"
							bind:value={activeRule.yasuPerBatsu}
							onfocus={() => (activeRule.yasuMode = 'constant')}
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
						個人（現在のマル数）×
						<input
							type="number"
							bind:value={activeRule.yasuPerBatsu}
							onfocus={() => (activeRule.yasuMode = 'maru')}
							min="1"
						/>問休み<small>（0マルなら1休）</small>
					</label>
					<br />
					<label>
						<input
							type="radio"
							bind:group={activeRule.yasuMode}
							value="batsu"
							disabled={activeRule.mode === 'score'}
						/>
						N回目の誤答で個人
						<input
							type="number"
							bind:value={activeRule.yasuPerBatsu}
							onfocus={() => (activeRule.yasuMode = 'batsu')}
							min="1"
						/>N問休み
					</label>
					<!--
				<br />
				<label>
					<input type="radio" bind:group={activeRule.yasuMode} value="roulette" />
					ルーレット
				</label>
				{#if activeRule.yasuMode === 'constant'}
					{#if !Number.isInteger(activeRule.yasuPerBatsu) || activeRule.yasuPerBatsu < 0}
						<span class="error">休みは0以上の整数で設定してください</span>
					{/if}
				{:else if activeRule.yasuMode !== 'roulette'}
					{#if !Number.isInteger(activeRule.yasuPerBatsu) || activeRule.yasuPerBatsu < 1}
						<span class="error">休みの倍数は1以上の整数で設定してください</span>
					{/if}
				{/if}
				-->
				</div>
				<!--
			{#if activeRule.yasuMode === 'roulette'}
				<div transition:fade>ルーレット</div>
				<div transition:fade>
					{#each Object.keys(roulettePresets) as name (name)}
						<label>
							<input type="radio" bind:group={activeRule.rouletteName} value={name} />
							{name}
						</label>
					{/each}
				</div>
			{/if}
			-->

				{#if activeTab === 0 && activeRule.mode === 'product'}
					<div>点数の下限</div>
					<div>
						<label {@attach tooltip('1枠のAさんが3◯、2枠のBさんが0◯のとき、3×0=0点になります。')}>
							<input type="radio" bind:group={activeRule.multiplyMinimum} value={0} />
							各枠0点
						</label>
						<label {@attach tooltip('1枠のAさんが3◯、2枠のBさんが0◯のとき、4×1=4点になります。')}>
							<input type="radio" bind:group={activeRule.multiplyMinimum} value={1} />
							各枠1点
						</label>
					</div>
				{/if}
			</div>
		{/if}

		<div class="buttons">
			<RulePresetDialog
				{apply}
				battleMode="team"
				{rulesObject}
				close={() => dialog.close()}
				{isValid}
			/>
			<div class="spacer"></div>
			<button
				onclick={() => {
					dialog.close();
					resolve(null);
				}}
			>
				キャンセル
			</button>
			<button class="primary" onclick={save} disabled={!isValid}>保存する</button>
		</div>
	{/if}
</dialog>

<style>
	dialog[open] {
		display: grid;
		grid-template-rows: auto 1fr auto;
		user-select: none;

		&:has(:nth-child(4)) {
			grid-template-rows: auto auto 1fr auto;
		}
	}

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
			font-size: 1.3333em;

			&[inert] {
				pointer-events: none;
			}
		}
	}

	div:has(> button.remove) {
		display: flex;
		justify-content: end;
		margin-bottom: 0.5em;

		button:not([disabled]) {
			background-color: rgb(255 129 129);
		}
	}

	.table {
		overflow-y: auto;
	}

	.presets {
		display: flex;
		flex-wrap: wrap;
		gap: 2px;
	}

	.hint {
		color: #f22;
		font-weight: bold;
		font-size: 0.8em;
	}
</style>

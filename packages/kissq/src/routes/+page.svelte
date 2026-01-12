<script lang="ts">
	import { watch } from 'runed';
	import { onMount, untrack } from 'svelte';
	import { flip } from 'svelte/animate';
	import { fade, slide } from 'svelte/transition';
	import se1 from '$lib/assets/se1.mp3';
	import se2 from '$lib/assets/se2.mp3';
	import se3 from '$lib/assets/se3.mp3';
	import EffectEditDialog from '$lib/components/effectEditDialog.svelte';
	import HelpDialog from '$lib/components/helpDialog.svelte';
	import LogDialog from '$lib/components/logDialog.svelte';
	import PenaltyRoulette from '$lib/components/penaltyRoulette.svelte';
	import RuleEditDialog from '$lib/components/ruleEditDialog.svelte';
	import Stars from '$lib/components/stars.svelte';
	import StateEditDialog from '$lib/components/stateEditDialog.svelte';
	import {
		type HistoryEntry,
		MaruHistoryEntry,
		BatsuHistoryEntry,
		ThroughHistoryEntry,
		RemoveHistoryEntry,
		LoseHistoryEntry,
		EditHistoryEntry
	} from '$lib/historyEntry';
	import { Rule, type Penalty } from '$lib/rule';
	import {
		AttendantState,
		GameState,
		type Attendant,
		type AttendantStateValue,
		type GameEvent
	} from '$lib/state';
	import { tooltip } from '$lib/tooltip.svelte';

	let attendants = $state<Attendant[]>(
		loadFromHash() ?? [
			{ name: '', group: 0, trophyCount: 0, totalScore: { num: 0, den: 0 }, manualOrder: 0 },
			{ name: '', group: 0, trophyCount: 0, totalScore: { num: 0, den: 0 }, manualOrder: 1 }
		]
	);
	let rules = $state([new Rule('marubatsu', 7, 3, 1, 1, null, 0, null)]);
	let history = $state<HistoryEntry[]>([]);
	let currentState = $derived(
		history.reduce(
			(state, entry) =>
				entry.reducer(state.clearLatestEvent()).checkIfLastSurvivor().updateRanking(),
			new GameState(attendants, rules).updateRanking()
		)
	);
	let activeRules = $derived(rules.flatMap((rule, i) => (rule.isRemoved ? [] : { rule, i })));
	let activeRulesText = $derived.by(() => {
		if (activeRules.length === 1) {
			return activeRules[0].rule;
		}

		return activeRules
			.slice(1)
			.reduce(
				(acc, { rule, i }) => {
					if (String(rule) === acc.at(-1)!.text) {
						acc.at(-1)!.end = i;
						return acc;
					} else {
						return [...acc, { start: i, end: i, text: String(rule) }];
					}
				},
				[{ start: activeRules[0].i, end: activeRules[0].i, text: String(activeRules[0].rule) }]
			)
			.map(({ start, end, text }) =>
				start === end
					? String.fromCodePoint(65 + start) + ': ' + text
					: String.fromCodePoint(65 + start) + '–' + String.fromCodePoint(65 + end) + ': ' + text
			)
			.join(' / ');
	});

	let innerWidth = $state(0);
	let innerHeight = $state(0);
	let headerClientHeight = $state(0);
	let footerClientHeight = $state(0);
	let fontSize = $state<number>();
	let container: HTMLDivElement;
	let columnCount = $derived.by(() => {
		// 画面に収まる範囲でなるべく多い列数を求める
		const attCount = currentState.ranking.length;
		const isSafari =
			typeof navigator !== 'undefined' &&
			/safari/i.test(navigator.userAgent) &&
			!/chrome|android/i.test(navigator.userAgent);
		if (attCount <= 4) {
			return 4;
		} else if (!container || isSafari) {
			return Math.floor(innerWidth / 250) || 7;
		}

		const totalHeight = innerHeight - headerClientHeight - footerClientHeight + 1;
		document.querySelectorAll('.attendant .name').forEach((el) => {
			(el as HTMLElement).style.display = 'none';
		});

		let bestCols = Infinity;

		for (let rows = attCount; rows >= 1; --rows) {
			const cols = Math.ceil(attCount / rows);
			container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

			if (container.clientWidth > innerWidth || innerWidth / cols < 140) {
				break;
			}

			if (container.clientHeight > totalHeight) {
				continue;
			}

			bestCols = Math.ceil(attCount / rows);
		}

		if (!Number.isFinite(bestCols)) {
			bestCols = Math.floor(innerWidth / 250);
		}

		// これでベストな行数の方が逆に定まったので、あらためてその中で列数を決める
		const bestRows = Math.ceil(attCount / bestCols);
		bestCols = Math.ceil(attCount / bestRows);

		document.querySelectorAll('.attendant .name').forEach((el) => {
			(el as HTMLElement).style.display = '';
		});

		container.style.gridTemplateColumns = `repeat(${bestCols}, 1fr)`;
		return bestCols;
	});
	let nameWidth = $state([0, 0]);
	let nameHeight = $state([0, 0]);
	let nameDirection = $state<'vertical-rl' | ''>('vertical-rl');
	$effect(() => {
		if (nameWidth.length === 0 || nameHeight.length === 0) {
			return;
		}

		if (nameWidth[0] > nameHeight[0]) {
			nameDirection = '';
		} else {
			nameDirection = 'vertical-rl';
		}

		fontSize = Math.floor(
			Math.min(
				(container?.clientWidth / columnCount) * 0.3,
				(container?.clientHeight / Math.ceil(currentState.ranking.length / columnCount)) * 0.09
			)
		);
	});

	let isBannerVisible = $state<GameEvent | null>(null);
	watch(
		() => currentState.latestEvent,
		(curr, prev) => {
			if (curr?.type !== prev?.type || curr?.attendantID !== prev?.attendantID) {
				showBanner(curr);
			}
		}
	);
	let showBannerTimeout = 0;
	function showBanner(event: GameEvent | null, duration: number = 3000) {
		isBannerVisible = event;
		clearTimeout(showBannerTimeout);
		showBannerTimeout = setTimeout(() => (isBannerVisible = null), duration);
	}

	function addAttendant(name: string = '') {
		attendants.push({
			name,
			group: 0,
			trophyCount: 0,
			totalScore: { num: 0, den: 0 },
			manualOrder: attendants.length
		});
	}

	function handlePasteEvent(event: ClipboardEvent, ord: number) {
		const text = (event.clipboardData?.getData('text') || '').trim();
		const lines = text.split(/[\r\n]+/);
		if (lines.length >= 2) {
			event.preventDefault();
			lines.forEach((line, i) => {
				if (ord + i < attendants.length) {
					attendants[orderedAttendants[ord + i]].name = line;
				} else {
					addAttendant(line);
				}
			});
		}
	}

	let attendantFLIPDelay = $state(0);

	let showOtherMenu = $state(false);

	let screenshotModeTimer = $state<number>();
	let screenshotOffset = $state(-1);

	let showMarubatsuOverride = $state(false);
	let showScore = $state(true);

	let orderingMode = $state<'ranking' | 'manual'>('ranking');
	let orderedAttendants = $derived.by<number[]>(() => {
		switch (orderingMode) {
			case 'ranking':
				return currentState.ranking;
			case 'manual':
				return currentState.attendants
					.flatMap(({ life, manualOrder }, i) => (life === 'removed' ? [] : [[manualOrder, i]]))
					.toSorted(([a], [b]) => a - b)
					.map(([, i]) => i);
		}
	});

	let effect2Name = $state<string>();
	let effect3Name = $state<string>();

	let playSounds = $state(true);

	function playSound(src: string) {
		if (playSounds) {
			const audio = new Audio(src);
			audio.volume = 0.25;
			audio.play().catch(() => {
				/* noop */
			});
		}
	}

	function toggleScreenshotMode() {
		if (screenshotModeTimer != null) {
			clearInterval(screenshotModeTimer);
			screenshotModeTimer = undefined;
		} else {
			screenshotOffset = -1;
			screenshotModeTimer = setInterval(() => {
				screenshotOffset = (screenshotOffset + 1) % (orderedAttendants.length + 1);
			}, 1500);
		}
	}

	let ruleEditDialog: { open: (rules: Rule[]) => Promise<Rule[] | null> };
	// svelte-ignore non_reactive_update ...?
	let helpDialog: { open: () => void };
	// svelte-ignore non_reactive_update ...?
	let logDialog: { open: () => void };
	let effectEditDialog: {
		open: (
			effect2Name: string | undefined,
			effect3Name: string | undefined
		) => Promise<[string | undefined, string | undefined] | null>;
	};
	let stateEditDialog: { open: (att: AttendantState) => Promise<AttendantStateValue | null> };
	let penaltyRoulette: { run: (choices: Penalty[]) => Promise<number> };

	function clearHistory() {
		currentState.attendants.forEach((att, i) => {
			attendants[i].trophyCount = att.trophyCount;
			attendants[i].totalScore = {
				num:
					att.totalScore.num +
					(currentState.attendants.length - currentState.ranking.indexOf(i) - 1),
				den: att.totalScore.den + 1
			};
		});
		attendants = attendants.filter((_, i) => currentState.attendants[i].life !== 'removed');
		history = [];
	}

	async function editRule() {
		const result = await ruleEditDialog.open(rules);

		if (result) {
			if (
				history.length > 0 &&
				confirm(
					'全員のスコアのリセットも行いますか？\n\n※ しない場合、トロフィーが消えることなどがあります\n※ まだゲームの途中であれば無視してください'
				)
			) {
				clearHistory();
			}

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

			showMarubatsuOverride = false;
			showScore = true;
		}
	}

	async function editEffects() {
		const result = await effectEditDialog.open(effect2Name, effect3Name);
		if (result) {
			[effect2Name, effect3Name] = result;
		}
	}

	async function editState(attendantID: number, att: AttendantState) {
		const result = await stateEditDialog.open(att);
		if (result) {
			history.push(new EditHistoryEntry(attendantID, result));
		}
	}

	function clickMaru(attendantID: number) {
		history.push(new MaruHistoryEntry(attendantID));
		playSound(se1);
	}

	async function clickBatsu(attendantID: number) {
		playSound(se2);

		const rule = currentState.attendants[attendantID].rule;
		if (rule.yasu === 'roulette') {
			const selection = await penaltyRoulette.run(rule.roulette!.choices);
			history.push(new BatsuHistoryEntry(attendantID, rule.roulette!.choices[selection]));
		} else {
			history.push(new BatsuHistoryEntry(attendantID));
		}
	}

	function clickThrough() {
		history.push(new ThroughHistoryEntry());
		playSound(se3);
	}

	function clickUndo() {
		history.pop();
	}

	let showQuestionWindow = $state(false);
	let currentQuestion = $state({ question: '', answer: '' });
	let subWindow = $state<Window>();

	function openSubWindow() {
		subWindow = window.open('./question', 'questionWindow', 'popup') || undefined;
		setTimeout(
			() =>
				subWindow?.postMessage({
					command: 'syncState',
					currentState: JSON.parse(JSON.stringify(currentState))
				}),
			1000
		);
	}

	function processWindowMessage(event: MessageEvent) {
		switch (event.data.command) {
			case 'toggleQuestionWindow':
				showQuestionWindow = !showQuestionWindow;
				break;

			case 'updateQuestion':
				currentQuestion = { question: event.data.question, answer: event.data.answer };
				break;

			case 'clickMaru':
				clickMaru(event.data.attendantID);
				break;

			case 'clickBatsu':
				clickBatsu(event.data.attendantID);
				break;

			case 'clickThrough':
				clickThrough();
				break;

			case 'clickUndo':
				clickUndo();
				break;
		}
	}

	$effect(() => {
		if (subWindow && !subWindow.closed) {
			subWindow.postMessage({
				command: 'syncState',
				currentState: JSON.parse(JSON.stringify(currentState))
			});
		}
	});

	$effect(() => {
		let data = currentState.attendants.flatMap(({ name, life }) =>
			life === 'removed' ? [] : [name]
		);
		untrack(() => {
			if (data.every((n) => n === '')) {
				window.history.replaceState(null, '', ' ');
			} else {
				// eslint-disable-next-line svelte/prefer-svelte-reactivity
				const url = new URL(document.URL);
				url.hash = encodeURIComponent(JSON.stringify(data));
				location.replace(url);
			}
		});
	});

	onMount(() => {
		window.addEventListener('message', processWindowMessage);

		return () => window.removeEventListener('message', processWindowMessage);
	});

	function loadFromHash(): Attendant[] | null {
		try {
			const url = new URL(document.URL);
			if (url.hash.length > 1) {
				const names = JSON.parse(decodeURIComponent(url.hash.slice(1)));
				if (Array.isArray(names) && names.length > 0 && names.every((n) => typeof n === 'string')) {
					return names.map((name, manualOrder) => ({
						name,
						group: 0,
						trophyCount: 0,
						totalScore: { num: 0, den: 0 },
						manualOrder
					}));
				}
			}
		} catch {
			/* ignore */
		}

		return null;
	}

	function han2zen(str: string) {
		// 全ASCII（4文字以上連続をどこかに含む場合は無視）
		return /[!-~]{4}/gi.test(str)
			? str
			: str.replace(/[!-~]+/gi, (s) =>
					[...s].map((c) => String.fromCodePoint(c.charCodeAt(0) + 0xfee0)).join('')
				);
	}
</script>

<svelte:window bind:innerWidth bind:innerHeight />

<svelte:head>
	<title>
		kissQ - {currentState.attendants
			.flatMap(({ name, life }) => (life !== 'removed' ? [name.slice(0, 3) || '👤'] : []))
			.join('・')}
		- クイズカウンター（得点表示機）のkissQ
	</title>
</svelte:head>

<audio src={se1} preload="auto"></audio>
<audio src={se2} preload="auto"></audio>
<audio src={se3} preload="auto"></audio>

<main style:grid-template-rows={showQuestionWindow ? 'auto auto 1fr auto' : 'auto 1fr auto'}>
	<div class="header" bind:clientHeight={headerClientHeight}>
		<div>
			Next:
			{#key currentState.questionCount}
				<span class="crossfade" in:fade={{ delay: 500 }} out:fade>
					Q{currentState.questionCount}
				</span>
			{/key}
		</div>
		<h1>
			kissQ
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
		</h1>
		<div>
			Rule:
			{activeRulesText}
			<button onclick={editRule} {@attach tooltip('ルールとルールグループを編集します。')}>
				編集
			</button>
		</div>
	</div>

	{#if showQuestionWindow}
		<div transition:fade>
			<div class="question">
				{#key currentQuestion.question}<p in:fade>{currentQuestion.question}</p>{/key}
				<div class="answer">A. {currentQuestion.answer}</div>
			</div>
		</div>
	{/if}

	<div
		class="attendants"
		style:grid-template-columns={`repeat(${columnCount}, 1fr)`}
		style:grid-template-rows={`repeat(${Math.ceil(orderedAttendants.length / columnCount)}, ${activeRules.length > 1 ? 'auto' : ''} 1fr auto auto)`}
		bind:this={container}
	>
		{#each orderedAttendants as i, ord (i)}
			{@const att = currentState.attendants[i]}
			<div
				style:font-size={fontSize && fontSize + 'px'}
				style:grid-row={activeRules.length > 1 ? 'span 4' : 'span 3'}
				class={['attendant', { lizhi: att.isLizhi }]}
				animate:flip={{ duration: 500, delay: attendantFLIPDelay }}
			>
				{#if activeRules.length > 1}
					<button
						class="group"
						style:background-color={`hsl(${(360 / rules.length) * attendants[i].group}, 70%, 40%)`}
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
					onblur={() => {
						const tmp = han2zen(attendants[i].name.replace(/[\r\n]/g, ''));
						if (tmp !== attendants[i].name) {
							attendants[i].name = ' ';
							setTimeout(() => (attendants[i].name = tmp), 1);
						}
					}}
					onpaste={(e) => handlePasteEvent(e, ord)}
					contenteditable
					placeholder="プレイヤー {i + 1 < 10
						? [...String(i + 1)]
								.map((c) => String.fromCodePoint(65296 + Number.parseInt(c)))
								.join('')
						: i + 1}"
					spellcheck="false"
					class={[
						'name',
						{ blurred: screenshotModeTimer != null && i !== orderedAttendants[screenshotOffset] }
					]}
					style:writing-mode={nameDirection}
					style:justify-content={nameDirection ? '' : 'center'}
					{@attach tooltip('ダブルクリックして名前を編集')}
					bind:clientWidth={nameWidth[i]}
					bind:clientHeight={nameHeight[i]}
				></div>

				<div class="score" style:opacity={showScore ? 1 : 0}>
					{#if history.length === 0 && att.rule.mode !== 'survival'}
						{#if att.totalScore.den === 0}
							---
						{:else}
							{Math.floor((att.totalScore.num / att.totalScore.den) * 492.8).toLocaleString()}
						{/if}
					{:else if showMarubatsuOverride || att.rule.mode === 'marubatsu'}
						<span class="maru-count">
							{#key att.maruCount}<span in:fade>{att.maruCount}</span>{/key} 〇
						</span>
						<span class="batsu-count">
							{#key att.batsuCount}<span in:fade>{att.batsuCount}</span>{/key} ×
						</span>
					{:else if att.rule.mode === 'score' || att.rule.mode === 'survival'}
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
					{:else}
						<span class="m-by-n-score">
							<small>
								{att.maruCount} × {att.rule.win - att.batsuCount}
							</small>
							{#key att.score}
								<span class="crossfade" in:fade={{ delay: 500 }} out:fade>{att.score}</span>
							{/key}
						</span>
					{/if}
				</div>

				<div class="hidden-buttons">
					<button
						onclick={() => editState(i, att)}
						disabled={att.yasuCount === 'next'}
						{@attach tooltip('このプレイヤーの得点状況を手で書き換えます。')}
					>
						編集
					</button>
					<button
						onclick={() => history.push(new LoseHistoryEntry(i))}
						disabled={att.life !== 'alive'}
						{@attach tooltip('このプレイヤーを強制的に失格にします。')}
					>
						失格
					</button>
					<button
						{@attach tooltip('並び順を左に移動します。')}
						disabled={orderingMode !== 'manual' || ord === 0}
						onclick={() => {
							[attendants[orderedAttendants[ord - 1]].manualOrder, attendants[i].manualOrder] = [
								attendants[i].manualOrder,
								attendants[orderedAttendants[ord - 1]].manualOrder
							];
						}}
					>
						◀
					</button>
					<button
						{@attach tooltip('並び順を右に移動します。')}
						disabled={orderingMode !== 'manual' || ord === orderedAttendants.length - 1}
						onclick={() => {
							[attendants[orderedAttendants[ord + 1]].manualOrder, attendants[i].manualOrder] = [
								attendants[i].manualOrder,
								attendants[orderedAttendants[ord + 1]].manualOrder
							];
						}}
					>
						▶
					</button>
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

				{#if att.life === 'won'}
					<div class="won" in:fade>
						{currentState.ranking.indexOf(i) + 1}位
					</div>
				{:else if att.life === 'lost'}
					<div class="lost" in:fade>失格</div>
				{:else if att.yasuDisplay > 0}
					<div class="yasu" in:fade>
						{#key att.yasuDisplay}
							{#if att.yasuCount === 'next'}次{/if}
							<span class="crossfade" in:fade={{ delay: 500 }} out:fade>{att.yasuDisplay}</span>
						{/key}
						休
					</div>
				{:else}
					<div
						class="buttons"
						onmouseenter={() => (attendantFLIPDelay = 600)}
						onmouseleave={() => (attendantFLIPDelay = 0)}
						role="group"
					>
						<button
							onclick={() => clickMaru(i)}
							class="maru-btn"
							{@attach tooltip(
								`${att.name || 'このプレイヤー'}に1○をつけて、問題カウントを1進めます（休みの人がいれば1休減ります）`,
								{ placement: 'bottom' }
							)}
						>
							O
						</button>
						{#if effect2Name}
							<button
								onclick={() => {
									history.push(new MaruHistoryEntry(i, 2));
									playSound(se1);
									setTimeout(() => playSound(se1), 150);
									showBanner({ type: 'effect2', attendantID: i });
								}}
								class="maru-btn"
								{@attach tooltip(`${effect2Name}（+2○）`, { placement: 'bottom' })}
							>
								2O
							</button>
						{/if}
						{#if effect3Name}
							<button
								onclick={() => {
									history.push(new MaruHistoryEntry(i, 3));
									playSound(se1);
									setTimeout(() => playSound(se1), 150);
									setTimeout(() => playSound(se1), 300);
									showBanner({ type: 'effect3', attendantID: i });
								}}
								class="maru-btn"
								{@attach tooltip(`${effect3Name}（+3○）`, { placement: 'bottom' })}
							>
								3O
							</button>
						{/if}
						<button
							onclick={() => clickBatsu(i)}
							class="batsu-btn"
							{@attach tooltip(
								`${att.name || 'このプレイヤー'}に1×をつけます（誰も正解しなければ最後にスルーボタンを押すのを忘れずに！）`,
								{ placement: 'bottom' }
							)}
						>
							X
						</button>
					</div>
				{/if}
			</div>
		{/each}
	</div>

	<footer bind:clientHeight={footerClientHeight}>
		<div class="left">
			<a href="https://github.com/kissge/kissq" target="_blank">ソース</a>
			<a
				href="https://x.com/_kidochan"
				target="_blank"
				{@attach tooltip('kissQの最新情報を得たり🍔をおごったりしてください')}
			>
				🍔作者
			</a>
			<a
				href="https://docs.google.com/forms/d/e/1FAIpQLSdpwAsY5k5LKnnbntsMo1USadZczeuq-SZqlFcNMpbj255u4Q/viewform?pli=1&usp=pp_url&entry.2107805527={encodeURIComponent(
					JSON.stringify({
						// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
			onclick={clickThrough}
			class={{
				blink: currentState.attendants.some(
					({ yasuCount, rule: { yasu } }) =>
						yasuCount === 'next' && (typeof yasu !== 'number' || yasu > 0)
				)
			}}
			{@attach tooltip(
				'誰も正解しなかった場合に押します。問題カウントが1進み、休みの人がいれば1休減ります。'
			)}
		>
			スルー
		</button>
		<button
			onclick={clickUndo}
			disabled={history.length === 0}
			{@attach tooltip('直前の操作を無かったことにします。')}
			style="max-width: 20dvw"
		>
			{#key history.length}
				↩
				<span in:fade>{history.at(-1)?.toString(currentState) || 'この世の始まり'}</span>を元に戻す
			{/key}
		</button>
		<button onclick={() => addAttendant()} style="max-width: 20dvw">＋ プレイヤー追加</button>
		<button
			onclick={() => {
				if (
					confirm(
						'全員ゼロ〇ゼロ×にリセットしますか？\nこの操作は元に戻せません。\n（プレイヤーリスト、累積勝利数🏆は残ります）'
					)
				) {
					clearHistory();
				}
			}}
			disabled={history.length === 0}
			{@attach tooltip('全員のスコアだけをリセットします。')}
		>
			全員リセット
		</button>

		<button
			onclick={() => (showOtherMenu = !showOtherMenu)}
			onblur={() => setTimeout(() => (showOtherMenu = false), 1000)}
		>
			その他 ▼
		</button>
	</footer>
</main>

{#if showOtherMenu}
	<div class="other-menu" transition:fade={{ duration: 100 }}>
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
		<button
			onclick={toggleScreenshotMode}
			{@attach tooltip('画面写真を撮りやすいようにプレイヤー名をぼかします')}
		>
			📸モード{#if screenshotModeTimer != null}をOFFに{/if}
		</button>
		<button onclick={logDialog.open}>履歴確認</button>
		<button
			onclick={() => (showMarubatsuOverride = !showMarubatsuOverride)}
			disabled={currentState.defaultRule.mode === 'marubatsu'}
			{@attach tooltip('スコア表示を強制的に○×表示に切り替えます')}
		>
			マルバツ表示{#if showMarubatsuOverride}をOFFに{/if}
		</button>
		<button
			onclick={() => (showScore = !showScore)}
			{@attach tooltip('スコア表示のオンオフを切り替えます')}
		>
			スコアを{#if showScore}隠す{:else}表示する{/if}
		</button>
		<button
			onclick={() => (orderingMode = orderingMode === 'ranking' ? 'manual' : 'ranking')}
			{@attach tooltip('プレイヤーの並び順を切り替えます')}
		>
			並び順：{#if orderingMode === 'ranking'}ランキング{:else}手動{/if}
		</button>
		<button onclick={editEffects} {@attach tooltip('エフェクトボタンの設定を編集します')}>
			エフェクトボタン設定
		</button>
		<button
			onclick={() => (playSounds = !playSounds)}
			{@attach tooltip('効果音のオンオフを切り替えます')}
		>
			{#if playSounds}🔊 ON{:else}🔇 OFF{/if}
		</button>
		<button onclick={openSubWindow}>操作盤表示</button>
	</div>
{/if}

{#if isBannerVisible}
	<div class="banner-bg" transition:fade>
		<Stars />
	</div>
	<div class={['banner', isBannerVisible.type]} transition:slide={{ axis: 'x' }}>
		{attendants[isBannerVisible.attendantID].name ||
			'プレイヤー ' + (isBannerVisible.attendantID + 1)}
		{#if isBannerVisible.type === 'won'}
			勝ち抜け
		{:else if isBannerVisible.type === 'lizhi'}
			リーチ
		{:else if isBannerVisible.type === 'effect2'}
			{effect2Name}
		{:else if isBannerVisible.type === 'effect3'}
			{effect3Name}
		{/if}
	</div>
{/if}

<RuleEditDialog bind:this={ruleEditDialog} />
<HelpDialog bind:this={helpDialog} />
<LogDialog bind:this={logDialog} {history} {currentState} />
<EffectEditDialog bind:this={effectEditDialog} />
<StateEditDialog bind:this={stateEditDialog} />
<PenaltyRoulette bind:this={penaltyRoulette} />

<style>
	main {
		display: grid;
		flex: 1 0 100dvh;
		gap: 0 1em;
		background-image: url('$lib/assets/wallpaper.jpg');
		background-position: center center;
		background-size: cover;
		background-color: rgb(15 18 33);
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
			box-sizing: border-box;
			width: 100dvw;
			font-weight: bold;
			font-size: 2rem;

			h1 {
				all: unset;
			}
		}

		.question {
			position: relative;
			backdrop-filter: blur(10px);
			margin-top: -0.7rem;
			box-shadow: 0 0 15px #eeea;
			border-radius: 0 0 0.5em 0.5em;
			background-color: #0008;
			padding: 0.5em 1em;
			height: 5em;
			color: #fff;
			font-size: 0.8em;
			font-family: serif;

			p {
				margin: 0;
				height: 100%;
				overflow: hidden;
			}

			.answer {
				display: inline-block;
				position: absolute;
				right: 1em;
				bottom: -0.5em;
				backdrop-filter: blur(10px);
				transition: 0.3s translate 1s ease;

				margin-top: 0.5em;
				box-shadow: 0 0 15px #eeea;
				border-radius: 0.5em;
				background-color: #000c;
				padding: 0.35em 1em;

				&:hover {
					translate: 0 60%;
					transition-delay: 0s;
				}
			}
		}

		.attendants {
			display: grid;
			gap: 0.5em;
			height: calc(100dvh - 5.5em);

			.attendant {
				display: grid;
				position: relative;
				grid-template-rows: subgrid;
				gap: 0.35em;
				backdrop-filter: blur(10px);
				transition:
					background-color 0.3s ease,
					backdrop-filter 0.3s ease;
				box-shadow: 0 0 15px #eeea;
				border-radius: 1.5em 0 1em 0;
				background-color: #ffffff40;
				padding: 0.5em;
				color: #fff;
				text-shadow:
					0px 10px 50px #444,
					0px 10px 50px #444;

				button {
					backdrop-filter: blur(10px);
					box-shadow: 3px 3px 6px #00000080;
					border: none;
					border-radius: 0;
					background-color: #00000040;
					color: #fff;

					&:disabled {
						opacity: 1;
						color: #0004;
					}
				}

				&.lizhi {
					box-shadow: 0 2px 2px 6px rgb(230 230 37);
					background-color: rgba(255 255 158 / 0.5);
				}
				&:has(.won) {
					box-shadow: 0 2px 2px 6px rgb(61 184 61);
					background-color: rgba(114 250 114 / 0.5);
				}
				&:has(.yasu) {
					opacity: 0.7;
					backdrop-filter: blur(5px);
					background-color: rgba(128 128 128 / 0.3);
				}
				&:has(.lost) {
					background-color: rgba(240 128 128 / 0.8);
				}

				.group {
					transition: background-color 0.3s ease;
					border-radius: 2em 0.5em 0 0;
				}

				.name {
					display: flex;
					flex: 1 1 100px;
					align-items: center;
					padding: 0;
					padding-top: 5px;
					width: 100%;
					overflow: hidden;
					font-weight: bold;
					line-height: 1.1;
					text-wrap: balance;
					word-break: break-all;

					&:empty:not(:focus)::before {
						cursor: text;
						content: attr(placeholder);
						color: #aaa;
						text-wrap: initial;
					}

					&.blurred {
						filter: blur(15px);
					}
				}

				&:hover,
				&:has(.name:focus-within) {
					backdrop-filter: blur(20px);
					box-shadow:
						0 2px 2px 3px #ccc,
						0 0 30px #eee;
					background-color: #fafafa;
					.name {
						color: #000;
						text-shadow: none;
					}
				}

				.hidden-buttons {
					display: none;
					position: absolute;
					bottom: 50%;
					left: -0.5em;
					flex-direction: column;
					flex-wrap: wrap;
					justify-content: space-evenly;
					gap: 3px;
					translate: 0% 50%;
					font-size: 0.3em;

					button:hover:not([disabled]) {
						background: #444;
					}
				}

				&:hover .hidden-buttons {
					display: flex;
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
					align-content: center;
					margin: 0 -0.25em;
					border-radius: 0.2em;
					background-color: #111;
					padding-bottom: 0.1em;
					font-weight: bold;
					line-height: 0.9;
					text-align: center;
					text-shadow: 0 0 5px #000e;

					> * {
						display: inline-block;
					}

					small {
						margin: 0 -0.25em;
						font-weight: normal;
						font-size: 1.6rem;
					}

					.m-by-n-score {
						letter-spacing: -0.04em;
						text-align: center;

						small {
							display: block;
						}
					}
					.maru-count {
						color: red;
						letter-spacing: -0.1em;
					}
					.batsu-count {
						color: rgb(140 140 255);
						letter-spacing: -0.1em;
					}
				}

				.buttons,
				.yasu,
				.won,
				.lost {
					align-content: center;
					margin: 0 -1em;
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
					flex-wrap: wrap;
					justify-content: space-evenly;
					gap: 10px;
					margin: 0.2em -0.45em;
					font-size: 0.9em;

					> * {
						display: flex;
						flex: 1 1 40px;
						justify-content: center;
						align-items: center;
					}

					.maru-btn:hover:not(:active),
					.maru-btn:focus-visible:not(:active) {
						background-color: red;
						color: white;
					}
					.batsu-btn:hover:not(:active),
					.batsu-btn:focus-visible:not(:active) {
						background-color: blue;
						color: white;
					}
				}
			}

			&:empty::before {
				display: flex;
				grid-column: 1 / -1;
				justify-content: center;
				align-items: center;
				content: '🍔プレイヤーを追加してください🍔';
				color: #aaa;
				font-size: 3rem;
			}
		}

		:has(.question) + .attendants {
			height: calc(100dvh - 5.5em - 5em);
		}

		footer {
			display: flex;
			justify-content: end;
			gap: 0.5em;
			box-sizing: border-box;
			width: 100dvw;
			overflow: hidden;
			user-select: none;
			anchor-name: --footer;

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

			a,
			button {
				max-width: 10dvw;
				overflow: hidden;
				white-space: nowrap;

				&.blink {
					animation: blink-animation 0.5s ease infinite;
					background-color: red;
					color: white;
				}
			}
		}
	}

	@keyframes blink-animation {
		to {
			opacity: 0.3;
		}
	}

	.other-menu {
		position: fixed;
		position-anchor: --footer;
		right: anchor(right);
		bottom: anchor(top);
		box-shadow: -2px -2px 6px #666;
		background: #eee;
		padding: 1rem;
		font-size: 2rem;
		user-select: none;
	}

	.banner-bg {
		position: fixed;
		z-index: 9998;
		inset: 0;
		background-color: rgba(0, 0, 0, 0.3);
	}

	.banner {
		display: flex;
		position: fixed;
		top: calc(50% - 0.7em);
		right: 0;
		bottom: calc(50% - 0.7em);
		left: 0;
		justify-content: center;
		align-items: center;
		z-index: 9999;
		box-shadow: 0 0 20px #222;
		overflow: hidden;
		pointer-events: none;
		font-weight: bold;
		font-size: min(8dvw, 20dvh);
		line-height: 1;
		user-select: none;
		text-align: center;
		text-shadow: 0 0 15px #444;
		white-space: nowrap;

		&.won {
			backdrop-filter: blur(10px);
			background-color: rgba(255 100 100 / 0.3);
			color: white;
		}
		&.lizhi,
		&.effect2,
		&.effect3 {
			backdrop-filter: blur(10px);
			background-color: rgba(240 240 175 / 0.4);
			color: rgb(255 231 231);
		}
	}

	audio {
		display: none;
	}
</style>

<script lang="ts">
	import { isUnlocked } from 'kissunlocklib';
	import { watch } from 'runed';
	import { onMount } from 'svelte';
	import { flip } from 'svelte/animate';
	import { fade, slide } from 'svelte/transition';
	import Toastify from 'toastify-js';

	import { loadFromHash, saveToHash } from '$lib/attendant';
	import AnswerHistoryDialog from '$lib/components/answerHistoryDialog.svelte';
	import AppearanceDialog from '$lib/components/appearanceDialog.svelte';
	import EffectEditDialog from '$lib/components/effectEditDialog.svelte';
	import Footer from '$lib/components/footer.svelte';
	import Header from '$lib/components/header.svelte';
	import LogDialog from '$lib/components/logDialog.svelte';
	import PenaltyRoulette from '$lib/components/penaltyRoulette.svelte';
	import Pushers from '$lib/components/pushers.svelte';
	import QuestionWindow from '$lib/components/questionWindow.svelte';
	import RuleEditDialog from '$lib/components/ruleEditDialog.svelte';
	import Stars from '$lib/components/stars.svelte';
	import StateEditDialog from '$lib/components/stateEditDialog.svelte';
	import TransferAttendantsDialog from '$lib/components/transferAttendantsDialog.svelte';
	import UnlockDialog from '$lib/components/unlockDialog.svelte';
	import WasedashikiDebug from '$lib/components/wasedashikiDebug.svelte';
	import Winner from '$lib/components/winner.svelte';
	import { EditHistoryEntry } from '$lib/historyEntry';
	import { LayoutClass, setLayoutContext } from '$lib/layout.svelte';
	import { LoggerClass, setLoggerContext } from '$lib/logs';
	import { QuestionConsoleClass, setQuestionConsoleContext } from '$lib/questionConsole.svelte';
	import { Rule, type Penalty } from '$lib/rule';
	import { reconnect } from '$lib/serial';
	import { AttendantState, type AttendantStateValue, type GameEvent } from '$lib/state';
	import { tooltip } from '$lib/tooltip.svelte';
	import { AttendantID } from '$lib/types';
	import { setWasedashikiContext, WasedashikiClass } from '$lib/wasedashiki.svelte';
	import { wave } from '$lib/waveEffect';

	import Attendant from './attendant.svelte';
	import { SingleGameClass, setSingleGameContext } from './game.svelte';

	let Game = new SingleGameClass();
	setSingleGameContext(Game);
	let Wasedashiki = new WasedashikiClass();
	setWasedashikiContext(Wasedashiki);
	let QuestionConsole = new QuestionConsoleClass();
	setQuestionConsoleContext(QuestionConsole);
	let Layout = new LayoutClass();
	setLayoutContext(Layout);
	let Logger = new LoggerClass('single');
	setLoggerContext(Logger);
	Game.Logger = Logger;

	let isBannerVisible = $state<GameEvent | null>(null);
	watch(
		() => Game.currentState.latestEvent,
		(curr, prev) => {
			if (
				curr?.type !== prev?.type ||
				(curr &&
					prev &&
					'attendantID' in curr &&
					'attendantID' in prev &&
					curr?.attendantID !== prev?.attendantID)
			) {
				showBanner(curr);
			}
		}
	);
	let showBannerTimeout: number | NodeJS.Timeout = 0;
	function showBanner(event: GameEvent | null, duration: number = 3000) {
		isBannerVisible = event;
		clearTimeout(showBannerTimeout);
		showBannerTimeout = setTimeout(() => (isBannerVisible = null), duration);
	}

	let attendantFLIPDelay = $state(0);

	let screenshotModeTimer = $state<number | NodeJS.Timeout>();
	let screenshotOffset = $state(-1);

	let showMarubatsuOverride = $state(false);
	let showTotalOverride = $state(false);
	let showScore = $state(true);

	let showWinner = $state(false);

	let wallpaper = $state<string | null>(null);
	let trophy = $state<string | null>(null);

	let showWasedashikiDebug = $state(false);

	let isDragging = $state<number | null>(null);
	let dropTarget = $state<number | null>(null);

	function onDragEnd() {
		Game.attendants[Game.orderedAttendants[isDragging!]].manualOrder = dropTarget! - 0.5;
		Game.orderedAttendants.forEach((a, i) => (Game.attendants[a].manualOrder = i));

		isDragging = null;
		dropTarget = null;
	}

	async function toggleScreenshotMode() {
		if (!(await isUnlocked())) {
			return;
		}

		if (screenshotModeTimer != null) {
			clearInterval(screenshotModeTimer);
			screenshotModeTimer = undefined;
		} else {
			screenshotOffset = -1;
			screenshotModeTimer = setInterval(() => {
				screenshotOffset = (screenshotOffset + 1) % (Game.orderedAttendants.length + 1);
			}, 1500);
		}
	}

	let ruleEditDialog: ReturnType<typeof RuleEditDialog>;
	let logDialog: ReturnType<typeof LogDialog>;
	let answerHistoryDialog: ReturnType<typeof AnswerHistoryDialog>;
	let effectEditDialog: ReturnType<typeof EffectEditDialog>;
	let appearanceDialog: ReturnType<typeof AppearanceDialog>;
	let stateEditDialog: ReturnType<typeof StateEditDialog>;
	let penaltyRoulette: ReturnType<typeof PenaltyRoulette>;
	let unlockDialog: ReturnType<typeof UnlockDialog>;
	let transferAttendantsDialog: ReturnType<typeof TransferAttendantsDialog>;

	$effect(() => {
		if (Game.history.length === 0) {
			return;
		}

		Logger.update();
	});

	async function editRule() {
		const result = await ruleEditDialog.open(Game.rules);

		if (result) {
			updateRules(result, 'keep');
		}
	}

	function updateRules(rules: Rule[], resetGroups: 'reset' | 'keep') {
		Game.updateRules(
			rules,
			Wasedashiki,
			Game.history.length > 0 &&
				confirm(
					'全員のスコアのリセットを行う場合はOKを、現状のスコアを維持する場合はキャンセルを押してください。\n\n※ リセットしない場合、トロフィーが消えることなどがあります\n※ まだゲームの途中であればキャンセルしてください'
				),
			resetGroups
		);
		showMarubatsuOverride = false;
		showTotalOverride = false;
		showScore = true;
	}

	async function editAppearance() {
		const result = await appearanceDialog.open(wallpaper, trophy);
		if (result) {
			wallpaper = result[0];
			trophy = result[1];
			const main = document.querySelector('main') as HTMLElement;
			main.style.backgroundImage = wallpaper ? `url(${wallpaper})` : '';
			main.style.setProperty('--trophy-image', trophy ? `url(${trophy})` : '');
			window.localStorage.setItem('wallpaper', wallpaper || '');
			window.localStorage.setItem('trophy', trophy || '');
		}
	}

	async function toggleTotalOverride() {
		if (await isUnlocked()) {
			showTotalOverride = !showTotalOverride;
		}
	}

	async function editState(attendantID: AttendantID, att: AttendantState) {
		const result = await stateEditDialog.open(att);
		if (result) {
			Game.history.push(new EditHistoryEntry(attendantID, result));
		}
	}

	let isShiftKeyDown = $state(false);

	$effect(() => {
		// eslint-disable-next-line svelte/no-unused-svelte-ignore
		// svelte-ignore state_snapshot_uncloneable
		$state.snapshot([
			Game.currentState,
			Game.orderedAttendants,
			Wasedashiki.answerers,
			Wasedashiki.buttonMapping,
			Game.wasedashikiMode
		]);
		QuestionConsole.syncState();
	});

	onMount(() => {
		Game.penaltyRoulette = penaltyRoulette;
		Game.showBanner = showBanner;

		isUnlocked().then((unlocked) => {
			if (unlocked) {
				wallpaper = window.localStorage.getItem('wallpaper');
				trophy = window.localStorage.getItem('trophy');
				const main = document.querySelector('main') as HTMLElement;
				if (wallpaper) {
					main.style.backgroundImage = `url(${wallpaper})`;
				}
				if (trophy) {
					main.style.setProperty('--trophy-image', `url(${trophy})`);
				}
			}
		});

		const data = loadFromHash();
		if (data) {
			const groups = Math.max(...data.attendants.map(({ group }) => group));
			Game.rules = Array.from({ length: groups + 1 }, () => Game.rules[0]);
			Game.attendants = data.attendants;
			Wasedashiki.buttonMapping = data.buttonMapping ?? {};
			Wasedashiki.buttonMappingRestored = Object.keys(Wasedashiki.buttonMapping).length > 0;
		} else {
			Game.attendants = [
				{
					name: '',
					group: 0,
					team: 0,
					seat: 0,
					trophyCount: 0,
					totalScore: { maru: 0, batsu: 0 },
					manualOrder: 0
				},
				{
					name: '',
					group: 0,
					team: 0,
					seat: 0,
					trophyCount: 0,
					totalScore: { maru: 0, batsu: 0 },
					manualOrder: 1
				}
			];
		}

		reconnect()
			.then((port) => {
				if (port) {
					Wasedashiki.serialPort = port;
					Wasedashiki.initiateSerialConnection(port);
					setTimeout(() => {
						if (Wasedashiki.connected) {
							Toastify({ text: '自動で早稲田式に接続しました' }).showToast();
						}
					}, 1500);
				}
			})
			.catch((error) => {
				console.error('接続エラー', error);
			});
		Logger.push();
		const processWindowMessage = (event: MessageEvent) => {
			QuestionConsole.processWindowMessage(event);
		};
		window.addEventListener('message', processWindowMessage);

		const keydown = (e: KeyboardEvent) => {
			if (e.key === 'Shift') isShiftKeyDown = true;
		};

		const keyup = (e: KeyboardEvent) => {
			if (e.key === 'Shift') isShiftKeyDown = false;
		};

		const blur = () => {
			isShiftKeyDown = false;
		};

		const beforeUnload = (event: BeforeUnloadEvent) => {
			event.preventDefault();
			event.returnValue = '';
		};

		window.addEventListener('keydown', keydown);
		window.addEventListener('keyup', keyup);
		window.addEventListener('blur', blur);
		window.addEventListener('beforeunload', beforeUnload);

		return () => {
			window.removeEventListener('message', processWindowMessage);
			window.removeEventListener('keydown', keydown);
			window.removeEventListener('keyup', keyup);
			window.removeEventListener('blur', blur);
			window.removeEventListener('beforeunload', beforeUnload);
		};
	});

	$effect(() => {
		saveToHash(Game.attendants, Wasedashiki.buttonMapping);
	});
</script>

<svelte:window bind:innerWidth={Layout.innerWidth} bind:innerHeight={Layout.innerHeight} />

<svelte:head>
	<title>{Game.windowTitle}</title>
</svelte:head>

<main
	style:grid-template-rows={QuestionConsole.showQuestionWindow
		? 'auto auto 1fr auto'
		: 'auto 1fr auto'}
	class="main"
>
	<Header battleMode="single" {showTotalOverride} {editRule} />

	<QuestionWindow blur={screenshotModeTimer != undefined} />

	<div
		class="attendants"
		style:grid-template-columns={`repeat(${Layout.columnCount}, 1fr)`}
		style:grid-template-rows={`repeat(${Math.ceil(Game.orderedAttendants.length / Layout.columnCount)}, ${Game.activeRules.length > 1 ? 'auto' : ''} 1fr auto auto)`}
		style:height={`calc(100dvh - ${Layout.headerClientHeight}px - ${Layout.footerClientHeight}px - 23px${QuestionConsole.showQuestionWindow ? ' - 6.25em - 0.7rem' : ''})`}
		bind:this={Layout.container}
	>
		{#each Game.orderedAttendants as ai, ord (ai)}
			<div
				style:font-size={(Layout.fontSize ?? 0) + 'px'}
				style:grid-row={Game.activeRules.length > 1 ? 'span 4' : 'span 3'}
				class={[
					'attendant',
					{
						lizhi: Game.currentState.attendants[ai].isLizhi,
						won: Game.currentState.attendants[ai].life === 'won',
						lost: Game.currentState.attendants[ai].life === 'lost',
						yasu:
							Game.currentState.attendants[ai].life === 'alive' &&
							Game.currentState.attendants[ai].yasuDisplay > 0,
						'answerer-1st':
							Wasedashiki.answerers[(Wasedashiki.buttonMapping[AttendantID(ai)] ?? 0) - 1]
								?.currentRank === 1,
						'drop-target': dropTarget === ord
					}
				]}
				animate:flip={{ duration: 500, delay: attendantFLIPDelay }}
				role="listitem"
				ondragstart={() => {
					if (Game.orderingMode === 'manual') {
						isDragging = ord;
					}
				}}
				ondragover={(event) => {
					if (Game.orderingMode === 'manual') {
						event.preventDefault();
						dropTarget = ord;
					}
				}}
				ondragend={() => {
					if (Game.orderingMode === 'manual') {
						onDragEnd();
					}
				}}
				style:opacity={isDragging === ord ? 0.25 : 1}
				draggable={Game.orderingMode === 'manual'}
			>
				<Attendant
					ai={AttendantID(ai)}
					{ord}
					{screenshotModeTimer}
					{screenshotOffset}
					{showScore}
					{showMarubatsuOverride}
					{showTotalOverride}
					{editState}
					bind:attendantFLIPDelay
				/>
			</div>
		{:else}
			<div class="no-team" {@attach wave()}>🍔プレイヤーを追加してください🍔</div>
		{/each}
		{#if Game.orderingMode === 'manual'}
			<div
				class="dummy-drop-target"
				class:drop-target={dropTarget === Game.orderedAttendants.length}
				role="listitem"
				ondragover={(event) => {
					event.preventDefault();
					dropTarget = Game.orderedAttendants.length;
				}}
				ondragend={onDragEnd}
			></div>
		{/if}
	</div>

	<Footer>
		{#if Game.rules[0].bulkAdjustment}
			<button popovertarget="bulk-menu">まとめて加減点</button>
		{/if}
		<button
			onclick={() => Game.clickThrough()}
			class={{
				blink: Game.currentState.attendants.some(
					({ yasuCount, rule: { yasuMode, yasuPerBatsu } }) =>
						yasuCount === 'next' && (yasuMode !== 'constant' || yasuPerBatsu > 0)
				)
			}}
			{@attach tooltip(
				'誰も正解しなかった場合に押します。問題カウントが1進み、休みの人がいれば1休減ります。'
			)}
		>
			スルー
		</button>
		<button
			onclick={() => Game.clickUndo()}
			disabled={Game.history.length === 0}
			{@attach tooltip('直前の操作を無かったことにします。')}
			style="max-width: 20dvw"
		>
			{#key Game.history.length}
				↩
				<span in:fade>{Game.history.at(-1)?.toString(Game.currentState) || 'この世の始まり'}</span
				>を元に戻す
			{/key}
		</button>
		<button
			onclick={() =>
				QuestionConsole.postMessage({
					command: 'attendantAdded',
					attendant: Game.addAttendant({})
				})}
			style="max-width: 20dvw"
		>
			＋ プレイヤー追加
		</button>
		<button
			onclick={() => {
				if (
					confirm(
						'全員ゼロ〇ゼロ×にリセットしますか？\nこの操作は元に戻せません。\n（プレイヤーリスト、累積勝利数🏆は残ります）'
					)
				) {
					Game.clearHistory(Wasedashiki);
				}
			}}
			disabled={Game.history.length === 0}
			{@attach tooltip('全員のスコアだけをリセットします。')}
		>
			全員リセット
		</button>

		<button
			popovertarget="other-menu"
			class="other-menu-button"
			onclick={() => setTimeout(() => (document.getElementById('other-menu')!.scrollTop = 0), 100)}
			{@attach tooltip('その他の操作を表示します。')}
		>
			⋮
		</button>
	</Footer>
</main>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
	popover
	id="other-menu"
	onclick={(e) => {
		const t = e.currentTarget;
		setTimeout(() => t.hidePopover(), 300);
	}}
	role="menu"
	tabindex="-1"
>
	<h3>よく使う</h3>
	<button
		onclick={() => (Game.orderingMode = Game.orderingMode === 'ranking' ? 'manual' : 'ranking')}
		{@attach tooltip('プレイヤーの並び順を切り替えます。', { placement: 'left' })}
	>
		並び順：{#if Game.orderingMode === 'ranking'}
			ランキング<small>（を手動にする）</small>
		{:else}
			手動<small>（をランキングにする）</small>
		{/if}
	</button>
	<button
		onclick={() => {
			Game.orderingMode = 'manual';
			Game.orderedAttendants
				.toSorted((a, b) => Game.attendants[a].group - Game.attendants[b].group)
				.forEach((a, i) => (Game.attendants[a].manualOrder = i));
		}}
		{@attach tooltip('並び順を手動にした上で、プレイヤーをグループ順に並べ替えます。', {
			placement: 'left'
		})}
	>
		プレイヤーをグループ順に整列する
	</button>
	<button
		class:active={Game.playSounds}
		onclick={() => (Game.playSounds = !Game.playSounds)}
		{@attach tooltip(Game.playSounds ? '効果音をOFFにします。' : '効果音をONにします。', {
			placement: 'left'
		})}
	>
		{#if Game.playSounds}
			🔊 操作効果音 ON<small>（をOFFにする）</small>
		{:else}
			🔇 操作効果音 OFF<small>（をONにする）</small>
		{/if}
	</button>
	<button
		onclick={() => QuestionConsole.openSubWindow(isShiftKeyDown)}
		{@attach tooltip('遠隔操作・問題表示などができるサブウィンドウを開きます。', {
			placement: 'left'
		})}
	>
		操作盤を表示する
		{#if isShiftKeyDown}
			<small>（通常ウィンドウ）</small>
		{/if}
	</button>
	<button
		disabled={Wasedashiki.serialPort != null}
		onclick={() => {
			if (isShiftKeyDown) {
				showWasedashikiDebug = !showWasedashikiDebug;
			} else {
				Wasedashiki.initiateSerialConnection();
			}
		}}
		{@attach tooltip('早稲田式早押しボタンとの連携機能を使い、接続を開始します。', {
			placement: 'left'
		})}
	>
		{#if isShiftKeyDown}
			早稲田式連携 <small>（デバッグモード）</small>
		{:else}
			早稲田式連携の接続を開始する
		{/if}
	</button>

	<h3>スコア表示の一時切り替え</h3>
	<button
		class:active={showMarubatsuOverride}
		onclick={() => (showMarubatsuOverride = !showMarubatsuOverride)}
		disabled={Game.currentState.defaultRule.mode === 'marubatsu'}
		{@attach tooltip('スコア表示を強制的に○×表示に切り替えます。', { placement: 'left' })}
	>
		マルバツ表示
		{#if showMarubatsuOverride}
			ON<small>（をOFFにする）</small>
		{:else}
			OFF<small>（をONにする）</small>
		{/if}
	</button>
	<button
		class:active={showTotalOverride}
		onclick={toggleTotalOverride}
		{@attach tooltip(
			'今日の通算成績表示に切り替えます（団体戦の内容も合算されています）（※この機能はアンロックが必要です）。',
			{ placement: 'left' }
		)}
	>
		通算成績表示
		{#if showTotalOverride}
			ON<small>（をOFFにする）</small>
		{:else}
			OFF<small>（をONにする）</small>
		{/if}
		🔒
	</button>
	<button
		class:active={Game.enableRating}
		onclick={() => (Game.enableRating = !Game.enableRating)}
		{@attach tooltip(
			Game.enableRating
				? 'レーティング表示をOFFにします。'
				: 'これまでの戦績から計算したレーティング表示をONにします。',
			{ placement: 'left' }
		)}
	>
		通算レート表示
		{#if Game.enableRating}
			ON<small>（をOFFにする）</small>
		{:else}
			OFF<small>（をONにする）</small>
		{/if}
	</button>
	<button
		class:active={!showScore}
		onclick={() => (showScore = !showScore)}
		{@attach tooltip(showScore ? 'スコアを非表示にします。' : 'スコアを表示します。', {
			placement: 'left'
		})}
	>
		スコアを{#if showScore}隠す{:else}表示する{/if}
	</button>
	<button
		class:active={screenshotModeTimer != null}
		onclick={toggleScreenshotMode}
		{@attach tooltip(
			'画面写真を撮りやすいようにプレイヤー名をぼかします（※この機能はアンロックが必要です）。',
			{ placement: 'left' }
		)}
	>
		スクショモード
		{#if screenshotModeTimer != null}
			ON<small>（をOFFにする）</small>
		{:else}
			OFF<small>（をONにする）</small>
		{/if}
		🔒
	</button>

	<h3>プレイヤー情報の操作</h3>
	<button
		onclick={() => {
			if (
				confirm(
					'プレイヤーリストを空にした上で、初期状態にリセットしますか？\nこの操作は元に戻せません。'
				)
			) {
				Game.attendants = [];
				Game.history = [];
				Wasedashiki.buttonMapping = {};
				Wasedashiki.answerers = [];
				Wasedashiki.lastButtonID = undefined;
			}
		}}
		disabled={Game.attendants.length === 0}
		{@attach tooltip('プレイヤーリストを空にした上で、初期状態にリセットします。', {
			placement: 'left'
		})}
	>
		プレイヤーリストを全削除する
	</button>
	<button
		onclick={() => {
			if (
				Game.history.length > 0 &&
				!confirm(
					'この機能を利用するには全員リセットしないといけません。全員リセットしてよろしいですか？'
				)
			) {
				return;
			}

			Game.clearHistory(Wasedashiki);

			if (confirm('全員の通算勝利数🏆をリセットしますか？')) {
				Game.attendants.forEach((att) => (att.trophyCount = 0));
			}

			if (confirm('全員の通算スコアとレートをリセットしますか？')) {
				Game.attendants.forEach((att) => (att.totalScore = { maru: 0, batsu: 0 }));
			}
		}}
		{@attach tooltip('通算勝利数🏆、通算スコア、レートを選んでクリアします。', {
			placement: 'left'
		})}
	>
		プレイヤーの一部情報をクリアする
	</button>
	<button
		onclick={() => transferAttendantsDialog.open()}
		{@attach tooltip(
			'他サービスと連携した別のタブのkissQなどに、このタブでのプレイヤーリストをコピー・ペーストできます。',
			{ placement: 'left' }
		)}
	>
		プレイヤーリストを他のタブに写す
	</button>

	<h3>とてもべんりな機能</h3>
	<button
		onclick={() => answerHistoryDialog.open()}
		{@attach tooltip('このゲームでの正解・誤答・スルーの履歴を表示します。', { placement: 'left' })}
	>
		現在のゲームの正誤履歴
	</button>
	<button
		onclick={() => logDialog.open()}
		{@attach tooltip('歴代のゲームの戦績を表示します。', { placement: 'left' })}
	>
		歴代のゲームの戦績履歴
	</button>
	<button
		onclick={() => (showWinner = !showWinner)}
		{@attach tooltip('優勝者等を表彰するいい感じの画面を表示します。', { placement: 'left' })}
	>
		表彰画面
	</button>

	<h3>設定</h3>
	<button
		onclick={() => effectEditDialog.open()}
		{@attach tooltip('一問の正解で2◯/3◯できる特殊なボタンの設定を編集します。', {
			placement: 'left'
		})}
	>
		エフェクトボタン設定
	</button>
	<button
		onclick={editAppearance}
		{@attach tooltip('外観の設定を編集します（※この機能はアンロックが必要です）。', {
			placement: 'left'
		})}
	>
		デザイン設定🔒
	</button>
	<button
		onclick={() => unlockDialog.open()}
		{@attach tooltip('追加の機能を解禁します。', { placement: 'left' })}
	>
		追加機能をアンロックする
	</button>
</div>

<div popover id="bulk-menu" role="menu" tabindex="-1">
	<select
		bind:value={Game.bulkAdjustmentScore}
		onchange={() => {
			Game.bulkAdjustmentTarget = Array.from({ length: Game.attendants.length }, () => false);
		}}
	>
		<option value={null}>点数</option>
		{#each Game.rules[0].bulkAdjustment! as pts, ord (ord)}
			<option value={pts}>
				{pts > 0 ? '+' : ''}{pts} pt{#if pts !== 1}s{/if}
			</option>
		{/each}
	</select>
	<button
		onclick={() => {
			Game.bulkAdjustmentScore = null;
			document.getElementById('bulk-menu')?.hidePopover();
		}}
	>
		キャンセル
	</button>
</div>

{#if isBannerVisible}
	<div class="banner-bg" transition:fade>
		<Stars />
	</div>
	<div class={['banner', isBannerVisible.type]} transition:slide={{ axis: 'x' }}>
		{#if 'attendantID' in isBannerVisible}
			{Game.attendants[isBannerVisible.attendantID].name ||
				'プレイヤー ' + (isBannerVisible.attendantID + 1)}
		{/if}
		{#if isBannerVisible.type === 'won'}
			勝ち抜け
		{:else if isBannerVisible.type === 'lizhi'}
			リーチ
		{:else if isBannerVisible.type === 'double-lizhi'}
			ダブルリーチ
		{:else if isBannerVisible.type === 'effect2'}
			{Game.effect2Name}
		{:else if isBannerVisible.type === 'effect3'}
			{Game.effect3Name}
		{:else if isBannerVisible.type === 'transit'}
			通過席
		{:else if isBannerVisible.type === 'finished'}
			問題終了
		{/if}
	</div>
{/if}

{#if showWinner}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div onclick={() => (showWinner = false)} style:cursor="pointer" transition:fade>
		<Winner />
	</div>
{/if}

{#if showWasedashikiDebug}
	<WasedashikiDebug />
{/if}

<Pushers />

<RuleEditDialog bind:this={ruleEditDialog} apply={updateRules} />
<LogDialog bind:this={logDialog} />
<AnswerHistoryDialog bind:this={answerHistoryDialog} />
<EffectEditDialog bind:this={effectEditDialog} />
<AppearanceDialog bind:this={appearanceDialog} />
<StateEditDialog bind:this={stateEditDialog} />
<PenaltyRoulette bind:this={penaltyRoulette} />
<UnlockDialog bind:this={unlockDialog} />
<TransferAttendantsDialog bind:this={transferAttendantsDialog} />

<style>
	:global(html) {
		--trophy-image: url('$lib/assets/trophy.png');
	}
	main {
		.attendants {
			display: grid;
			gap: 0.5em;

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
				user-select: none;
				text-shadow:
					0px 10px 50px #444,
					0px 10px 50px #444;

				&:nth-last-child(2) {
					anchor-name: --last-attendant;
				}

				&.lizhi {
					box-shadow: 0 2px 2px 6px rgb(230 230 37);
					background-color: rgba(255 255 158 / 0.5);
				}
				&.won {
					box-shadow: 0 2px 2px 6px rgb(61 184 61);
					background-color: rgba(114 250 114 / 0.5);
				}
				&.yasu {
					opacity: 0.7;
					backdrop-filter: blur(5px);
					background-color: rgba(128 128 128 / 0.3);
				}
				&.lost {
					background-color: rgba(240 128 128 / 0.8);
				}

				&.answerer-1st {
					animation: answerer-1st-wrapper 0.3s ease infinite alternate;
				}

				&:hover,
				&:global(:has(.name:focus-within)) {
					backdrop-filter: blur(20px);
					box-shadow:
						0 2px 2px 3px #ccc,
						0 0 30px #eee;
					background-color: #fafafa;
					:global .name {
						color: #000;
						text-shadow: none;
					}
				}

				&[draggable='true']::after {
					display: block;
					position: absolute;
					bottom: 0;
					cursor: grab;
					width: 100%;
					content: '::::';
					color: #888;
					font-size: 0.5em;
					text-align: center;
				}
			}

			.dummy-drop-target {
				position: absolute;
				position-anchor: --last-attendant;
				top: anchor(top);
				bottom: anchor(bottom);
				left: anchor(right);
				width: 100dvw;
			}

			.drop-target::before {
				display: inline-block;
				position: absolute;
				top: 0;
				left: -18px;
				border-right: 10px dashed red;
				height: 100%;
				pointer-events: none;
				content: '';
			}

			.no-team {
				position: fixed;
				top: 50%;
				left: 50%;
				transform: translate(-50%, -50%);
				color: #fff;
				text-align: center;
			}
		}
	}

	@keyframes blink-animation {
		to {
			opacity: 0.3;
		}
	}

	@keyframes answerer-1st-wrapper {
		to {
			scale: 1.05;
		}
	}

	#bulk-menu:popover-open {
		position: absolute;
		position-area: top;
		display: flex;
		gap: 0.5em;
		margin-bottom: 0.25em;
		box-shadow: 0 0 5px #0008;
		border: 0;
		font-size: 1.5em;

		select {
			font-size: 1em;
		}
	}
</style>

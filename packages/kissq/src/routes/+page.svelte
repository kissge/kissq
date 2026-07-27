<script lang="ts">
	import { watch } from 'runed';
	import { onMount, untrack } from 'svelte';
	import { flip } from 'svelte/animate';
	import { fade, slide } from 'svelte/transition';
	import Toastify from 'toastify-js';
	import 'toastify-js/src/toastify.css';
	import se1 from '$lib/assets/se1.mp3';
	import se2 from '$lib/assets/se2.mp3';
	import se3 from '$lib/assets/se3.mp3';
	import { loadFromHash } from '$lib/attendant';
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
	import { EditHistoryEntry } from '$lib/historyEntry';
	import { LayoutClass, setLayoutContext } from '$lib/layout.svelte';
	import { LoggerClass, setLoggerContext } from '$lib/logs';
	import { QuestionConsoleClass, setQuestionConsoleContext } from '$lib/questionConsole.svelte';
	import { Rule, type Penalty } from '$lib/rule';
	import { reconnect } from '$lib/serial';
	import { AttendantState, type AttendantStateValue, type GameEvent } from '$lib/state';
	import { tooltip } from '$lib/tooltip.svelte';
	import { setWasedashikiContext, WasedashikiClass } from '$lib/wasedashiki.svelte';
	import Attendant from './attendant.svelte';
	import { GameClass, setGameContext } from './game.svelte';

	let Game = new GameClass();
	setGameContext(Game);
	let Wasedashiki = new WasedashikiClass(Game);
	setWasedashikiContext(Wasedashiki);
	let QuestionConsole = new QuestionConsoleClass(Game);
	setQuestionConsoleContext(QuestionConsole);
	let Layout = new LayoutClass(Game);
	setLayoutContext(Layout);
	let Logger = new LoggerClass('single', Game);
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

	let showOtherMenu = $state(false);

	let screenshotModeTimer = $state<number | NodeJS.Timeout>();
	let screenshotOffset = $state(-1);

	let showMarubatsuOverride = $state(false);
	let showScore = $state(true);

	let effect2Name = $state<string>();
	let effect3Name = $state<string>();

	let wallpaper = $state<string | null>(null);
	let trophy = $state<string | null>(null);

	let isDragging = $state<number | null>(null);
	let dropTarget = $state<number | null>(null);

	function onDragEnd() {
		Game.attendants[Game.orderedAttendants[isDragging!]].manualOrder = dropTarget! - 0.5;
		Game.orderedAttendants.forEach((a, i) => (Game.attendants[a].manualOrder = i));

		isDragging = null;
		dropTarget = null;
	}

	function toggleScreenshotMode() {
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

	let ruleEditDialog: { open: (rules: Rule[]) => Promise<Rule[] | null> };
	// svelte-ignore non_reactive_update ...?
	let logDialog: { open: () => void };
	let effectEditDialog: {
		open: (
			effect2Name: string | undefined,
			effect3Name: string | undefined
		) => Promise<[string | undefined, string | undefined] | null>;
	};
	let appearanceDialog: {
		open: (
			wallpaper: string | null,
			trophy: string | null
		) => Promise<[string | null, string | null] | null>;
	};
	let stateEditDialog: { open: (att: AttendantState) => Promise<AttendantStateValue | null> };
	let penaltyRoulette: { run: (choices: Penalty[]) => Promise<number> };

	$effect(() => {
		if (history.length === 0) {
			return;
		}

		Logger.update();
	});

	async function editRule() {
		const result = await ruleEditDialog.open(Game.rules);

		if (result) {
			if (
				Game.history.length > 0 &&
				confirm(
					'全員のスコアのリセットも行いますか？\n\n※ しない場合、トロフィーが消えることなどがあります\n※ まだゲームの途中であれば無視してください'
				)
			) {
				Game.clearHistory(Wasedashiki);
			}

			const activeRuleCount = result.filter(({ isRemoved }) => !isRemoved).length;
			if (activeRuleCount === 1) {
				Game.rules = result.filter(({ isRemoved }) => !isRemoved);
				Game.attendants.forEach((att) => {
					att.group = 0;
				});
			} else {
				const removedIndices = result.flatMap(({ isRemoved }, i) => (isRemoved ? [i] : []));
				Game.rules = result.filter(({ isRemoved }) => !isRemoved);
				Game.attendants.forEach((att) => {
					att.group = Math.max(0, att.group - removedIndices.filter((i) => i <= att.group).length);
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

	async function editState(attendantID: number, att: AttendantState) {
		const result = await stateEditDialog.open(att);
		if (result) {
			Game.history.push(new EditHistoryEntry(attendantID, result));
		}
	}

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

		wallpaper = window.localStorage.getItem('wallpaper');
		trophy = window.localStorage.getItem('trophy');
		const main = document.querySelector('main') as HTMLElement;
		if (wallpaper) {
			main.style.backgroundImage = `url(${wallpaper})`;
		}
		if (trophy) {
			main.style.setProperty('--trophy-image', `url(${trophy})`);
		}

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
					totalScore: { num: 0, den: 0 },
					manualOrder: 0
				},
				{
					name: '',
					group: 0,
					team: 0,
					seat: 0,
					trophyCount: 0,
					totalScore: { num: 0, den: 0 },
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

		return () => window.removeEventListener('message', processWindowMessage);
	});

	$effect(() => {
		const data = { attendants: Game.attendants, buttonMapping: Wasedashiki.buttonMapping };
		$state.snapshot(data);
		untrack(() => {
			if (data.attendants.every(({ name }) => name === '')) {
				window.history.replaceState(null, '', ' ');
			} else {
				// eslint-disable-next-line svelte/prefer-svelte-reactivity
				const url = new URL(document.URL);
				url.hash = encodeURIComponent(JSON.stringify(data));
				location.replace(url);
			}
		});
	});
</script>

<svelte:window bind:innerWidth={Layout.innerWidth} bind:innerHeight={Layout.innerHeight} />

<svelte:head>
	<title>{Game.windowTitle}</title>
</svelte:head>

<audio src={se1} preload="auto"></audio>
<audio src={se2} preload="auto"></audio>
<audio src={se3} preload="auto"></audio>

<main
	style:grid-template-rows={QuestionConsole.showQuestionWindow
		? 'auto auto 1fr auto'
		: 'auto 1fr auto'}
	class="main"
>
	<Header {Game} battleMode="single" {editRule} />

	<QuestionWindow />

	<div
		class="attendants"
		style:grid-template-columns={`repeat(${Layout.columnCount}, 1fr)`}
		style:grid-template-rows={`repeat(${Math.ceil(Game.orderedAttendants.length / Layout.columnCount)}, ${Game.activeRules.length > 1 ? 'auto' : ''} 1fr auto auto)`}
		style:height={`calc(100dvh - ${Layout.headerClientHeight}px - ${Layout.footerClientHeight}px - 22px${QuestionConsole.showQuestionWindow ? ' - 6.25em - 0.7rem' : ''})`}
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
							Wasedashiki.answerers[(Wasedashiki.buttonMapping[ai] ?? 0) - 1]?.rank === 1,
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
					{ai}
					{ord}
					{screenshotModeTimer}
					{screenshotOffset}
					{showScore}
					{showMarubatsuOverride}
					{editState}
					bind:attendantFLIPDelay
					{effect2Name}
					{effect3Name}
					{showBanner}
				/>
			</div>
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

	<Footer {Game}>
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
		<button onclick={() => Game.addAttendant()} style="max-width: 20dvw">＋ プレイヤー追加</button>
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
			onclick={() => (showOtherMenu = !showOtherMenu)}
			onblur={() => setTimeout(() => (showOtherMenu = false), 1000)}
		>
			その他 ▼
		</button>
	</Footer>
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
					Game.attendants = [];
					Game.history = [];
					Wasedashiki.buttonMapping = {};
					Wasedashiki.answerers = [];
					Wasedashiki.lastButtonID = undefined;
				}
			}}
			disabled={Game.attendants.length === 0}
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
			disabled={Game.currentState.defaultRule.mode === 'marubatsu'}
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
			onclick={() => (Game.orderingMode = Game.orderingMode === 'ranking' ? 'manual' : 'ranking')}
			{@attach tooltip('プレイヤーの並び順を切り替えます')}
		>
			並び順：{#if Game.orderingMode === 'ranking'}ランキング{:else}手動{/if}
		</button>
		<button
			onclick={() => {
				Game.orderingMode = 'manual';
				Game.orderedAttendants
					.toSorted((a, b) => Game.attendants[a].group - Game.attendants[b].group)
					.forEach((a, i) => (Game.attendants[a].manualOrder = i));
			}}
		>
			グループ順に整列
		</button>
		<button onclick={editEffects} {@attach tooltip('エフェクトボタンの設定を編集します')}>
			エフェクトボタン設定
		</button>
		<button
			onclick={() => (Game.playSounds = !Game.playSounds)}
			{@attach tooltip('効果音のオンオフを切り替えます')}
		>
			{#if Game.playSounds}🔊 ON{:else}🔇 OFF{/if}
		</button>
		<button onclick={editAppearance} {@attach tooltip('外観の設定を編集します')}>
			デザイン設定
		</button>
		<button
			onclick={() => (Game.enableRating = !Game.enableRating)}
			{@attach tooltip('レーティング自動計算のオンオフを切り替えます')}
		>
			{#if Game.enableRating}レートON{:else}レートOFF{/if}
		</button>
		<button onclick={QuestionConsole.openSubWindow}>操作盤表示</button>
		<button
			disabled={Wasedashiki.serialPort != null}
			onclick={() => Wasedashiki.initiateSerialConnection()}
		>
			早稲田式連携
		</button>
	</div>
{/if}

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
			{effect2Name}
		{:else if isBannerVisible.type === 'effect3'}
			{effect3Name}
		{:else if isBannerVisible.type === 'transit'}
			通過席
		{/if}
	</div>
{/if}

<Pushers {Game} />

<RuleEditDialog bind:this={ruleEditDialog} />
<LogDialog bind:this={logDialog} />
<EffectEditDialog bind:this={effectEditDialog} />
<AppearanceDialog bind:this={appearanceDialog} />
<StateEditDialog bind:this={stateEditDialog} />
<PenaltyRoulette bind:this={penaltyRoulette} />

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
	}

	@property --bar-height-ratio {
		syntax: '<number>';
		initial-value: -999;
		inherits: true;
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

	.other-menu {
		position: fixed;
		position-anchor: --footer;
		display: flex;
		right: anchor(right);
		bottom: anchor(top);
		flex-wrap: wrap;
		gap: 3px;
		box-shadow: -2px -2px 6px #666;
		background: #eee;
		padding: 0.5em;
		font-size: 2em;
		user-select: none;
	}

	audio {
		display: none;
	}
</style>

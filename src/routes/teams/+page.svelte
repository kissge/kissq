<script lang="ts">
	import { watch } from 'runed';
	import { onMount } from 'svelte';
	import { flip } from 'svelte/animate';
	import { fade, slide } from 'svelte/transition';
	import Toastify from 'toastify-js';
	import 'toastify-js/src/toastify.css';
	import { loadFromHash, saveToHash } from '$lib/attendant';
	import AppearanceDialog from '$lib/components/appearanceDialog.svelte';
	import Footer from '$lib/components/footer.svelte';
	import Header from '$lib/components/header.svelte';
	import LogDialog from '$lib/components/logDialog.svelte';
	import Pushers from '$lib/components/pushers.svelte';
	import QuestionWindow from '$lib/components/questionWindow.svelte';
	import RuleTeamEditDialog from '$lib/components/ruleTeamEditDialog.svelte';
	import Stars from '$lib/components/stars.svelte';
	import UnlockDialog from '$lib/components/unlockDialog.svelte';
	import type { GameClassBaseType } from '$lib/game';
	import { LayoutClass, setLayoutContext } from '$lib/layout.svelte';
	import { LoggerClass, setLoggerContext } from '$lib/logs';
	import { QuestionConsoleClass, setQuestionConsoleContext } from '$lib/questionConsole.svelte';
	import { Rule } from '$lib/rule';
	import { reconnect } from '$lib/serial';
	import type { GameEvent } from '$lib/state';
	import { tooltip } from '$lib/tooltip.svelte';
	import { setWasedashikiContext, WasedashikiClass } from '$lib/wasedashiki.svelte';
	import CombinationDialog from './combinationDialog.svelte';
	import { GameClass, setGameContext } from './game.svelte';
	import Team from './team.svelte';

	let Game = new GameClass();
	setGameContext(Game);
	let Wasedashiki = new WasedashikiClass(Game);
	setWasedashikiContext(Wasedashiki);
	let QuestionConsole = new QuestionConsoleClass(Game);
	setQuestionConsoleContext(QuestionConsole);
	let Layout = new LayoutClass(Game);
	setLayoutContext(Layout);
	let Logger = new LoggerClass('team', Game);
	setLoggerContext(Logger);
	Game.Logger = Logger;

	let wallpaper = $state<string | null>(null);
	let trophy = $state<string | null>(null);

	let logDialog: { open: () => void };
	let ruleTeamEditDialog: { open: (rules: Rule[]) => Promise<Rule[] | null> };
	let appearanceDialog: {
		open: (
			wallpaper: string | null,
			trophy: string | null
		) => Promise<[string | null, string | null] | null>;
	};
	let unlockDialog: { open: () => Promise<void> };
	let combinationDialog: { open: (game: GameClassBaseType) => Promise<void> };

	async function editRule() {
		const result = await ruleTeamEditDialog.open(Game.rules);

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
					'全員のスコアのリセットも行いますか？\n\n※ しない場合、トロフィーが消えることなどがあります\n※ まだゲームの途中であれば無視してください'
				),
			resetGroups
		);
	}

	let isBannerVisible = $state<GameEvent | null>(null);
	watch(
		() => Game.currentState.latestEvent,
		(curr, prev) => {
			if (
				curr?.type !== prev?.type ||
				(curr && prev && 'teamID' in curr && 'teamID' in prev && curr?.teamID !== prev?.teamID)
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

	$effect(() => {
		if (Game.history.length === 0) {
			return;
		}

		Logger.update();
	});

	$effect(() => {
		// eslint-disable-next-line svelte/no-unused-svelte-ignore
		// svelte-ignore state_snapshot_uncloneable
		$state.snapshot([
			Game.currentState,
			Wasedashiki.answerers,
			Wasedashiki.buttonMapping,
			Game.wasedashikiMode
		]);
		QuestionConsole.syncState();
	});

	onMount(() => {
		const data = loadFromHash(true);

		if (data) {
			const groups = Math.max(...data.attendants.map(({ group }) => group));
			Game.rules = Array.from({ length: groups + 1 }, () => Game.rules[0]);
			Game.attendants = data.attendants;
			Wasedashiki.buttonMapping = data.buttonMapping ?? {};
			Wasedashiki.buttonMappingRestored = Object.keys(Wasedashiki.buttonMapping).length > 0;
		} else {
			Game.attendants = Array.from({ length: 2 }, (_, ti) =>
				Array.from({ length: 10 }, (_, ai) => ({
					name: '',
					group: 0,
					team: ti,
					seat: Math.floor(ai / 2),
					trophyCount: 0,
					totalScore: { num: 0, den: 0, maru: 0, batsu: 0 },
					manualOrder: ti * 10 + ai
				})).flat()
			).flat();
		}

		Game.teams = Array.from(new Set(Game.attendants.map(({ team }) => team)), () => '');

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
		saveToHash(Game.attendants, Wasedashiki.buttonMapping);
	});
</script>

<svelte:head>
	<title>{Game.windowTitle}</title>
</svelte:head>

<main class="main">
	<Header {Game} battleMode="team" showTotalOverride={false} {editRule} />

	<QuestionWindow />

	<div
		class="attendants-wrapper"
		class:vertical-centering={Layout.attendantsClientHeight < Layout.attendantsWrapperClientHeight}
		style:height={`calc(100vh - ${Layout.headerClientHeight + Layout.footerClientHeight}px - 22px ${QuestionConsole.showQuestionWindow ? '- 6.25em - 0.7rem' : ''})`}
		bind:clientHeight={Layout.attendantsWrapperClientHeight}
	>
		<div class="attendants" bind:clientHeight={Layout.attendantsClientHeight}>
			{#each Game.attendantsPerTeam as seats, ti (ti)}
				<div
					class="team"
					animate:flip={{ duration: 200 }}
					class:won={Game.currentState.teams[ti].teamLife === 'won'}
				>
					<Team {seats} {ti} />
				</div>
			{:else}
				<div class="no-team">チームがありません🍔</div>
			{/each}
		</div>
	</div>

	<Footer {Game}>
		<button
			onclick={Game.clickThrough}
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
			onclick={Game.clickUndo}
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
			onclick={() => {
				Game.teams.push('');
				Game.attendants.push({
					name: '',
					group: 0,
					team: Game.teams.length - 1,
					seat: 0,
					trophyCount: 0,
					totalScore: { num: 0, den: 0, maru: 0, batsu: 0 },
					manualOrder: Game.attendants.length
				});
			}}>＋ チーム追加</button
		>
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
		<button popovertarget="other-menu"> その他 ▼ </button>
	</Footer>

	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		popover
		id="other-menu"
		onclick={(e) => {
			const t = e.currentTarget;
			setTimeout(() => t.hidePopover(), 1000);
		}}
		role="menu"
		tabindex="-1"
	>
		<button
			onclick={() => {
				if (
					confirm(
						'プレイヤーリストを空にした上で、初期状態にリセットしますか？\nこの操作は元に戻せません。'
					)
				) {
					Game.history = [];
					Game.attendants = [
						{
							name: '',
							group: 0,
							team: 0,
							seat: 0,
							trophyCount: 0,
							totalScore: { num: 0, den: 0, maru: 0, batsu: 0 },
							manualOrder: 0
						}
					];
					Game.teams = [''];
					Wasedashiki.buttonMapping = {};
					Wasedashiki.answerers = [];
					Wasedashiki.lastButtonID = undefined;
				}
			}}
			{@attach tooltip('全員の名前・チーム・枠・スコアをリセットします。')}>全削除</button
		>
		<button onclick={() => logDialog.open()}>履歴確認</button>
		<button
			onclick={() => (Game.playSounds = !Game.playSounds)}
			{@attach tooltip('効果音のオンオフを切り替えます')}
		>
			{#if Game.playSounds}🔊 ON{:else}🔇 OFF{/if}
		</button>
		<button onclick={editAppearance} {@attach tooltip('外観の設定を編集します')}>
			デザイン設定🔒
		</button>
		<button
			onclick={() => combinationDialog.open(Game)}
			{@attach tooltip('チーム分けを編集補助します')}
		>
			チーム分け
		</button>
		<button onclick={() => QuestionConsole.openSubWindow()}>操作盤表示</button>
		<button
			disabled={Wasedashiki.serialPort != null}
			onclick={() => Wasedashiki.initiateSerialConnection()}
		>
			早稲田式連携
		</button>
		<button onclick={() => unlockDialog.open()}>機能アンロック</button>
	</div>
</main>

{#if isBannerVisible}
	<div class="banner-bg" transition:fade>
		<Stars />
	</div>
	<div class={['banner', isBannerVisible.type]} transition:slide={{ axis: 'x' }}>
		{#if 'attendantID' in isBannerVisible}
			{Game.attendants[isBannerVisible.attendantID].name ||
				'プレイヤー ' + (isBannerVisible.attendantID + 1)}
		{:else}
			{Game.teams[isBannerVisible.teamID] || 'チーム ' + (isBannerVisible.teamID + 1)}
		{/if}
		{#if isBannerVisible.type === 'won'}
			勝ち抜け
		{:else if isBannerVisible.type === 'lizhi'}
			リーチ
		{:else if isBannerVisible.type === 'double-lizhi'}
			ダブルリーチ
		{:else if isBannerVisible.type === 'effect2'}
			!!
		{:else if isBannerVisible.type === 'effect3'}
			!!
		{:else if isBannerVisible.type === 'transit'}
			通過席
		{/if}
	</div>
{/if}

<template id="hover-menu">
	<button
		data-onclick="document.querySelector('.buttons[data-attendant-id=\'' + this.parentElement.dataset.attendantId + '\'] .delete-btn').click()"
	>
		削除
	</button>
	<br />
	<select
		data-onchange="s = document.querySelector('.buttons[data-attendant-id=\'' + this.parentElement.dataset.attendantId + '\'] select'); s.selectedIndex = this.selectedIndex; s.dispatchEvent(new Event('change'))"
	>
		%teams%
	</select>
</template>

<Pushers {Game} />

<RuleTeamEditDialog bind:this={ruleTeamEditDialog} apply={updateRules} />
<LogDialog bind:this={logDialog} />
<AppearanceDialog bind:this={appearanceDialog} />
<UnlockDialog bind:this={unlockDialog} />
<CombinationDialog bind:this={combinationDialog} />

<style>
	main.main {
		font-size: max(1.5dvw, 24px);
	}

	.attendants-wrapper.vertical-centering {
		display: flex;
		align-items: center;
		overflow-y: auto;
	}

	.attendants {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(560px, 1fr));
		align-content: start;
		align-items: stretch;
		gap: 1em;
		width: 100%;
		user-select: none;
	}

	.team {
		display: grid;
		grid-template-rows: 2em 1fr;
		grid-template-columns: 2em minmax(0, 1fr) 2em;
		row-gap: 0.25em;
		flex: 1 1 560px;
		backdrop-filter: blur(10px);
		transition:
			background-color 0.3s ease,
			backdrop-filter 0.3s ease,
			scale 0.3s ease;
		box-shadow: 0 0 15px #eeea;
		border-radius: 1.5em 0 1em 0;
		padding: 0.25em;
		padding-bottom: 1em;
		min-width: 0;
		color: #fff;
		text-shadow:
			0px 10px 50px #444,
			0px 10px 50px #444;

		&.won {
			box-shadow: 0 2px 2px 6px rgb(61 184 61);
			background-color: rgba(114 250 114 / 0.5);
		}

		&:hover {
			scale: 1.02;
		}
	}

	.no-team {
		flex: 1 1 100%;
		margin-top: calc(40dvh - 1em);
		color: #fff;
		text-align: center;
		text-shadow:
			0px 10px 50px #444,
			0px 10px 50px #444;
	}

	#other-menu {
		position: absolute;
		position-area: top;
		margin-bottom: 0.25em;
		box-shadow: 0 0 5px #0008;
		border: 0;
	}

	:global(.tippy-box:has(button)) {
		font-size: 1.2em;
		text-align: center;

		button,
		select {
			min-width: 4em;
			height: 2em;
			font-size: 1em;
		}
	}

	[popover] {
		animation: fadeIn 0.2s ease-in;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes answerer-1st {
		to {
			color: yellow;
			text-shadow:
				0px 10px 50px #aa08,
				0px 10px 50px #aa08,
				0px 10px 50px #aa08;
		}
	}

	@keyframes answerer-1st-wrapper {
		to {
			scale: 1.05;
		}
	}
</style>

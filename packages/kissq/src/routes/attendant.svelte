<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import Toastify from 'toastify-js';
	import se1 from '$lib/assets/se1.mp3';
	import { han2zen } from '$lib/attendant';
	import {
		LoseHistoryEntry,
		MaruHistoryEntry,
		RemoveHistoryEntry,
		WinHistoryEntry
	} from '$lib/historyEntry';
	import { getLayoutContext } from '$lib/layout.svelte';
	import { playSound } from '$lib/sound';
	import type { AttendantState, GameEvent } from '$lib/state';
	import { tooltip } from '$lib/tooltip.svelte';
	import { getWasedashikiContext } from '$lib/wasedashiki.svelte';
	import { getGameContext } from './game.svelte';

	let {
		ai,
		ord,
		screenshotModeTimer,
		screenshotOffset,
		showScore,
		showMarubatsuOverride,
		showTotalOverride,
		editState,
		attendantFLIPDelay = $bindable(),
		effect2Name,
		effect3Name,
		showBanner
	}: {
		ai: number;
		ord: number;
		screenshotModeTimer: number | NodeJS.Timeout | undefined;
		screenshotOffset: number;
		showScore: boolean;
		showMarubatsuOverride: boolean;
		showTotalOverride: boolean;
		editState: (attendantID: number, att: AttendantState) => Promise<void>;
		attendantFLIPDelay: number;
		effect2Name: string | undefined;
		effect3Name: string | undefined;
		showBanner: (event: GameEvent | null, duration?: number) => void;
	} = $props();

	let Game = getGameContext();
	let Wasedashiki = getWasedashikiContext();
	let Layout = getLayoutContext();

	let att = $derived(Game.currentState.attendants[ai]);
	let barHeight: number = $derived(Layout.barHeightRatioArray[ai]?.current ?? 0);
</script>

{#if Wasedashiki.buttonMapping[ai] != null}
	{@const j = Wasedashiki.buttonMapping[ai] - 1}
	{#if Wasedashiki.answerers[j]?.rank}
		{#if Wasedashiki.answerers[j].delay > 0}
			<div class="answerer">
				+&thinsp;{(Wasedashiki.answerers[j].delay / 1000).toFixed(3)} s
			</div>
		{/if}
	{/if}
{/if}
<button
	class="button-mapping"
	style={Wasedashiki.buttonMapping[ai] == null
		? undefined
		: 1 <= Wasedashiki.buttonMapping[ai] && Wasedashiki.buttonMapping[ai] <= 6
			? 'background-color: red; color: white'
			: 7 <= Wasedashiki.buttonMapping[ai] && Wasedashiki.buttonMapping[ai] <= 12
				? 'background-color: blue; color: white'
				: 13 <= Wasedashiki.buttonMapping[ai] && Wasedashiki.buttonMapping[ai] <= 18
					? 'background-color: yellow; color: black'
					: 'background-color: green; color: white'}
	style:display={Wasedashiki.lastButtonID == undefined && !Wasedashiki.buttonMappingRestored
		? 'none'
		: ''}
	disabled={Wasedashiki.lastButtonID == undefined}
	{@attach tooltip(
		`このプレイヤーが持っているボタンは${Wasedashiki.buttonMapping[ai] == null ? '???' : Wasedashiki.buttonMapping[ai]}番です。クリックで紐づけ`
	)}
	onclick={() => {
		if (Wasedashiki.lastButtonID !== undefined) {
			Wasedashiki.buttonMapping = {
				...Object.fromEntries(
					Object.entries(Wasedashiki.buttonMapping).filter(
						([, v]) => v !== Wasedashiki.lastButtonID
					)
				),
				[ai]: Wasedashiki.lastButtonID!
			};
			Toastify({
				text: `ボタン${Wasedashiki.lastButtonID}は${att.name || `プレイヤー${ai + 1}`}が持っています`
			}).showToast();
		}
	}}
>
	{Wasedashiki.buttonMapping[ai] ?? '?'}
</button>
{#if Game.activeRules.length > 1}
	<button
		class="group"
		style:background-color={`hsl(${(360 / Game.rules.length) * Game.attendants[ai].group}, 70%, 40%)`}
		onclick={() => {
			do {
				Game.attendants[ai].group = (Game.attendants[ai].group + 1) % Game.rules.length;
			} while (Game.rules[Game.attendants[ai].group].isRemoved);
		}}
		{@attach tooltip('このプレイヤーの所属グループを変更します。')}
	>
		{#key Game.attendants[ai].group}
			<span class="crossfade" in:fade={{ delay: 500 }} out:fade>
				{String.fromCodePoint(65 + Game.attendants[ai].group)}
			</span>
		{/key}
	</button>
{/if}
<div
	bind:textContent={Game.attendants[ai].name}
	onblur={() => {
		const tmp = han2zen(Game.attendants[ai].name.replace(/[\r\n]/g, ''));
		if (tmp !== Game.attendants[ai].name) {
			Game.attendants[ai].name = ' ';
			setTimeout(() => (Game.attendants[ai].name = tmp), 1);
		}
	}}
	onpaste={(e) => Game.handlePasteEvent(e, ord)}
	contenteditable
	placeholder="プレイヤー {ai + 1 < 10 ? String.fromCodePoint(65297 + ai) : ai + 1}"
	spellcheck="false"
	class={[
		'name',
		{
			blurred: screenshotModeTimer != null && ai !== Game.orderedAttendants[screenshotOffset],
			'show-bar': showScore,
			'answerer-1st': Wasedashiki.answerers[(Wasedashiki.buttonMapping[ai] ?? 0) - 1]?.rank === 1,
			'answerer-2nd':
				(Game.wasedashikiMode === 'endless' || Game.wasedashikiMode === 'double') &&
				Wasedashiki.answerers[(Wasedashiki.buttonMapping[ai] ?? 0) - 1]?.rank === 2,
			'answerer-late':
				Game.wasedashikiMode === 'endless' &&
				Wasedashiki.answerers[(Wasedashiki.buttonMapping[ai] ?? 0) - 1]?.rank === 'late'
		}
	]}
	style:writing-mode={Layout.nameDirection}
	style:justify-content={Layout.nameDirection ? '' : 'center'}
	style:text-align={Layout.nameDirection ? '' : 'center'}
	style:--bar-height-ratio={Layout.barMax !== null ? Math.min(barHeight / Layout.barMax, 1) : -999}
	{@attach tooltip('ダブルクリックして名前を編集', { placement: 'bottom' })}
	bind:clientWidth={Layout.nameWidth[ai]}
	bind:clientHeight={Layout.nameHeight[ai]}
></div>

<div class="score" style:opacity={showScore ? 1 : 0}>
	{#if Game.history.length === 0 && att.rule.mode !== 'survival' && att.rule.mode !== 'score' && Game.enableRating}
		<span {@attach tooltip('レート')} class="rate">
			{#if att.totalScore.den === 0}
				---
			{:else}
				{att.rate.toLocaleString()}
			{/if}
		</span>
	{:else if showTotalOverride}
		<small style="display: inline-block">通<br />算</small>
		<span class="maru-count">
			{#key att.totalScore.maru + att.maruCount}
				<span in:fade>
					{att.totalScore.maru + att.maruCount}
				</span>
			{/key} 〇
		</span>
		<span class="batsu-count">
			{#key att.totalScore.batsu + att.batsuCount}
				<span in:fade>
					{att.totalScore.batsu + att.batsuCount}
				</span>
			{/key} ×
		</span>
	{:else if showMarubatsuOverride || att.rule.mode === 'marubatsu'}
		<span class="maru-count">
			{#key att.maruCount}<span in:fade>{att.maruCount}</span>{/key} 〇
		</span>
		<span class="batsu-count">
			{#key att.batsuCount}
				<span in:fade class:lose-lizhi={att.isLoseLizhi}>
					{att.batsuCount}
				</span>
			{/key} ×
		</span>
	{:else if att.rule.mode === 'score' || att.rule.mode === 'survival'}
		<span>
			{#key att.score}
				<span
					class="crossfade"
					class:lose-lizhi={att.isLoseLizhi}
					in:fade={{ delay: 500 }}
					out:fade
				>
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
				<span class="crossfade" class:lose-lizhi={att.isLoseLizhi} in:fade={{ delay: 500 }} out:fade
					>{att.score}</span
				>
			{/key}
		</span>
	{/if}

	{#if Game.consecutive?.attendantID === ai}
		{#key Game.consecutive.count}
			<span
				class="consecutive-count"
				style:background-color={Game.consecutive.count < 3
					? 'rgb(221 94 6)'
					: Game.consecutive.count < 6
						? 'rgb(160, 40, 0)'
						: 'rgb(0, 0, 0)'}
				in:fly={{ y: 100 }}
				{@attach tooltip('連答カウント')}
			>
				{Game.consecutive.count}
			</span>
		{/key}
	{/if}
</div>

<div class="hidden-buttons">
	<button
		onclick={() => editState(ai, att)}
		disabled={att.yasuCount === 'next'}
		{@attach tooltip('このプレイヤーの得点状況を手で書き換えます。')}
	>
		編集
	</button>
	<button
		onclick={() => Game.history.push(new WinHistoryEntry(ai))}
		disabled={att.life !== 'alive'}
		{@attach tooltip('このプレイヤーを強制的に勝ち抜けにします。')}
	>
		勝利
	</button>
	<button
		onclick={() => Game.history.push(new LoseHistoryEntry(ai))}
		disabled={att.life !== 'alive'}
		{@attach tooltip('このプレイヤーを強制的に失格にします。')}
	>
		失格
	</button>
	<button
		onclick={() => Game.history.push(new RemoveHistoryEntry(ai))}
		{@attach tooltip('このプレイヤーをリストから削除します。')}
	>
		削除
	</button>
</div>

<div class="trophies" {@attach tooltip('勝ち抜けた累積回数')}>
	{#each Array.from({ length: att.trophyCount }), i (i)}
		<span in:fade></span>
	{/each}
</div>

{#if att.life === 'won'}
	<div class="won" in:fade>
		{Game.currentState.ranking.indexOf(ai) + 1}位
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
			onclick={() => Game.clickMaru(ai)}
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
					Game.history.push(new MaruHistoryEntry(ai, 2));
					if (Game.playSounds) {
						playSound(se1);
						setTimeout(() => playSound(se1), 150);
					}
					showBanner({ type: 'effect2', attendantID: ai });
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
					Game.history.push(new MaruHistoryEntry(ai, 3));
					if (Game.playSounds) {
						playSound(se1);
						setTimeout(() => playSound(se1), 150);
						setTimeout(() => playSound(se1), 300);
					}
					showBanner({ type: 'effect3', attendantID: ai });
				}}
				class="maru-btn"
				{@attach tooltip(`${effect3Name}（+3○）`, { placement: 'bottom' })}
			>
				3O
			</button>
		{/if}
		<button
			onclick={() => Game.clickBatsu(ai)}
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

<style>
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

		&:focus {
			box-shadow: 3px 3px 6px #00000080;
		}
	}

	.answerer,
	.button-mapping {
		display: flex;
		position: absolute;
		justify-content: center;
		align-items: center;
	}
	.answerer {
		top: -0.75em;
		left: 0;
		border-radius: 1em;
		background: black;
		width: 100%;
		color: #fff;
		font-size: 0.5em;
	}
	.button-mapping {
		top: 0.2em;
		right: 0.25em;
		z-index: 20;
		border-radius: 5em;
		background: grey;
		width: 1.5em;
		height: 1.5em;
		color: white;
		font-size: 0.4em;
	}

	.group {
		z-index: 10;
		transition: background-color 0.3s ease;
		border-radius: 2em 0.5em 0 0;
	}

	.name {
		display: flex;
		position: relative;
		flex: 1 1 100px;
		align-items: center;
		margin: -1em -0.5em;
		padding: 0;
		padding-top: calc(1em + 5px);
		padding-bottom: 1em;
		overflow: hidden;
		font-weight: bold;
		line-height: 1.1;
		text-wrap: balance;
		word-break: break-all;

		&:focus {
			margin: 0 -0.5em;
			padding-top: 5px;
			padding-bottom: 0;
		}

		&:empty:not(:focus)::before {
			cursor: text;
			content: attr(placeholder);
			color: #aaa;
			text-wrap: initial;
		}

		&.answerer-1st {
			animation: answerer-1st 0.3s ease infinite alternate;
		}

		&.answerer-2nd {
			color: yellow;
			text-shadow:
				0px 10px 50px #aa08,
				0px 10px 50px #aa08,
				0px 10px 50px #aa08;
		}

		&.answerer-late {
			text-shadow:
				0px 10px 50px #aa08,
				0px 10px 50px #aa08,
				0px 10px 50px #aa08;
		}

		&.blurred {
			filter: blur(15px);
		}

		&.show-bar:after {
			display: block;
			position: absolute;
			bottom: 0;
			z-index: -1;
			filter: blur(5px);
			border-radius: 1em 0 0 0;
			background: #0a1e3666;
			width: 40%;
			height: calc(70% * var(--bar-height-ratio) + 1em);
			content: '';
		}

		&:focus:after {
			display: none;
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

	.hidden-buttons:is(:global(.attendant:hover) > *) {
		display: flex;
	}

	.trophies {
		display: flex;
		position: absolute;
		right: -0.5em;
		flex-direction: column;

		span {
			transition: margin-top 0.3s ease;
			box-shadow: 0 0 3px #888;
			border-radius: 50%;
			background-image: var(--trophy-image);
			background-position: center;
			background-size: cover;
			background-color: #ffffffaa;
			width: 1.375em;
			height: 1.375em;
		}

		&:has(:nth-child(8)) span:nth-child(n + 2) {
			margin-top: calc(-0.5 * 1.375em);
		}

		&:has(:nth-child(15)) span:nth-child(n + 2) {
			margin-top: calc(-0.75 * 1.375em);
		}
	}

	.score {
		position: relative;
		align-content: center;
		z-index: 100;
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
			font-size: 0.4em;
		}

		.m-by-n-score {
			letter-spacing: -0.04em;
			text-align: center;

			small {
				display: block;
				font-size: 0.55em;
			}
		}

		.rate {
			font-size: 0.7em;
		}
		.maru-count {
			color: rgb(255 65 65);
			letter-spacing: -0.1em;
		}
		.batsu-count {
			color: rgb(140 140 255);
			letter-spacing: -0.1em;
		}

		.consecutive-count {
			display: flex;
			position: absolute;
			top: -1em;
			right: -0.4em;
			justify-content: center;
			align-items: center;
			z-index: 100;
			box-shadow: 0 0 8px #000a;
			border-radius: 50%;
			width: 1.25em;
			height: 1.25em;
			font-weight: normal;
			line-height: 0.5em;
		}

		.lose-lizhi {
			animation: lose-lizhi-animation 1.2s ease infinite;
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

	@keyframes lose-lizhi-animation {
		0%,
		100% {
			opacity: 0.3;
		}
		50% {
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
</style>

<script lang="ts">
	import { fade, fly } from 'svelte/transition';

	import { han2zen } from '$lib/attendant';
	import { LoseHistoryEntry, RemoveHistoryEntry, WinHistoryEntry } from '$lib/historyEntry';
	import { getLayoutContext } from '$lib/layout.svelte';
	import { getQuestionConsoleContext } from '$lib/questionConsole.svelte';
	import { tooltip } from '$lib/tooltip.svelte';
	import { AttendantID } from '$lib/types';
	import { getGroupSymbol } from '$lib/utils';
	import { getWasedashikiContext } from '$lib/wasedashiki.svelte';

	import { getSingleGameContext } from './game.svelte';

	import type { AttendantState } from '$lib/state';

	let {
		ai,
		ord,
		screenshotModeTimer,
		screenshotOffset,
		showScore,
		showMarubatsuOverride,
		showTotalOverride,
		editState,
		attendantFLIPDelay = $bindable()
	}: {
		ai: AttendantID;
		ord: number;
		screenshotModeTimer: number | NodeJS.Timeout | undefined;
		screenshotOffset: number;
		showScore: boolean;
		showMarubatsuOverride: boolean;
		showTotalOverride: boolean;
		editState: (attendantID: AttendantID, att: AttendantState) => Promise<void>;
		attendantFLIPDelay: number;
	} = $props();

	let Game = getSingleGameContext();
	let Wasedashiki = getWasedashikiContext();
	let Layout = getLayoutContext();
	let QuestionConsole = getQuestionConsoleContext();

	let att = $derived(Game.currentState.attendants[ai]);

	let showRate = $derived(
		Game.history.length === 0 &&
			att.rule.mode !== 'survival' &&
			att.rule.mode !== 'score' &&
			Game.enableRating
	);
</script>

{#if Wasedashiki.buttonMapping[ai] != null}
	{@const j = Wasedashiki.buttonMapping[ai] - 1}
	{#if Wasedashiki.answerers[j]?.currentRank}
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
	onclick={() => Wasedashiki.setButtonMapping(AttendantID(ai))}
>
	{Wasedashiki.buttonMapping[ai] ?? '?'}
</button>
{#if Game.activeRules.length > 1}
	<button
		class="group"
		style:background-color={`hsl(${(360 / Game.rules.length) * Game.attendants[ai].group}, 70%, 40%)`}
		onclick={(event) => {
			// Click with Shift key pressed or not
			const diff = event.shiftKey ? Game.rules.length - 1 : 1;

			do {
				Game.attendants[ai].group = (Game.attendants[ai].group + diff) % Game.rules.length;
			} while (Game.rules[Game.attendants[ai].group].isRemoved);
		}}
		oncontextmenu={(event) => {
			event.preventDefault();
			// Click with right mouse button
			do {
				Game.attendants[ai].group =
					(Game.attendants[ai].group + Game.rules.length - 1) % Game.rules.length;
			} while (Game.rules[Game.attendants[ai].group].isRemoved);
		}}
		{@attach tooltip('このプレイヤーの所属グループを変更します。')}
	>
		{#key Game.attendants[ai].group}
			<span class="crossfade" in:fade={{ delay: 500 }} out:fade>
				{getGroupSymbol(Game.attendants[ai].group)}
			</span>
		{/key}
	</button>
{/if}
<div
	bind:textContent={Game.attendants[ai].name}
	onfocus={(event) => {
		if (!Game.attendants[ai].name) {
			const selection = window.getSelection();
			const range = document.createRange();
			selection?.removeAllRanges();
			range.selectNodeContents(event.target as HTMLElement);
			range.collapse(false);
			selection?.addRange(range);
			(event.target as HTMLElement).focus();
		}
	}}
	onblur={() => {
		const tmp = han2zen(Game.attendants[ai].name.replace(/^[\s\r\n]+|[\s\r\n]+$/g, ''));
		if (tmp !== Game.attendants[ai].name || !tmp) {
			Game.attendants[ai].name = ' ';
			setTimeout(() => (Game.attendants[ai].name = tmp), 1);
		}
	}}
	onpaste={(e) =>
		Game.handlePasteEvent(e, ord).forEach((attendant) =>
			QuestionConsole.postMessage({ command: 'attendantAdded', attendant })
		)}
	contenteditable
	placeholder="プレイヤー {ai + 1 < 10 ? String.fromCodePoint(65297 + ai) : ai + 1}"
	spellcheck="false"
	class={[
		'name',
		{
			blurred: screenshotModeTimer != null && ai !== Game.orderedAttendants[screenshotOffset],
			'answerer-1st':
				Wasedashiki.answerers[(Wasedashiki.buttonMapping[ai] ?? 0) - 1]?.currentRank === 1,
			'answerer-2nd':
				(Game.wasedashikiMode === 'endless' || Game.wasedashikiMode === 'double') &&
				Wasedashiki.answerers[(Wasedashiki.buttonMapping[ai] ?? 0) - 1]?.currentRank === 2,
			'answerer-late':
				Game.wasedashikiMode === 'endless' &&
				Wasedashiki.answerers[(Wasedashiki.buttonMapping[ai] ?? 0) - 1]?.currentRank === 'late'
		}
	]}
	style:writing-mode={Layout.nameDirection}
	style:justify-content={Layout.nameDirection ? '' : 'center'}
	style:text-align={Layout.nameDirection ? '' : 'center'}
	{@attach tooltip('クリックして名前を編集', { placement: 'bottom' })}
	bind:clientWidth={Layout.nameWidth[ai]}
	bind:clientHeight={Layout.nameHeight[ai]}
></div>

<div class="score" class:showTotalOverride class:showRate style:opacity={showScore ? 1 : 0}>
	{#if showTotalOverride}
		<span class="maru-count">
			{#key att.totalScore.maru + att.trueMaruCount}
				<span in:fade>
					{att.totalScore.maru + att.trueMaruCount}
				</span>
			{/key}
			<span class="symbol">〇</span>
		</span>
		<span class="batsu-count">
			{#key att.totalScore.batsu + att.trueBatsuCount}
				<span in:fade>
					{att.totalScore.batsu + att.trueBatsuCount}
				</span>
			{/key}
			<span class="symbol">×</span>
		</span><br />
		<span class="total-rate" {@attach tooltip('通算正答率')}>
			{(() => {
				const percentage =
					((att.totalScore.maru + att.trueMaruCount) /
						(att.totalScore.batsu + att.trueBatsuCount + att.totalScore.maru + att.trueMaruCount)) *
					100;
				return isNaN(percentage) ? '---' : percentage.toFixed(1);
			})()}%
		</span>
	{:else if showRate}
		<span {@attach tooltip('レート')} class="rate">
			{Game.ratingList[ai].toFixed(1)}
		</span>
	{:else if showMarubatsuOverride || att.rule.mode === 'marubatsu'}
		<span class="maru-count">
			{#key att.maruCount}<span in:fade>{att.maruCount}</span>{/key}
			<span class="symbol">〇</span>
		</span>
		{#if att.rule.batsu !== 0}
			<span class="batsu-count">
				{#key att.batsuCount}
					<span in:fade class:lose-lizhi={att.isLoseLizhi}>
						{att.batsuCount}
					</span>
				{/key}
				<span class="symbol">×</span>
			</span>
		{/if}
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
				{att.maruCount} ✕ {att.rule.win - att.batsuCount}
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
		{@const prev =
			Game.previousTrophyGetters.includes(ai) && i === Game.attendants[ai].trophyCount - 1}
		<span
			class:previous-trophy-getter={prev}
			in:fade
			{@attach prev && tooltip('直前のゲームで勝ち抜けています')}
		></span>
	{/each}
</div>

{#if showTotalOverride}
	<div class="total" in:fade>
		<small>通算</small>
		{Game.totalScoreRanks[ai]} 位
	</div>
{:else if att.life === 'won'}
	<div class="won" in:fade>
		{Game.currentState.ranks[ai]} 位
	</div>
{:else if att.life === 'lost'}
	<div class="lost" in:fade>
		{Game.currentState.ranks[ai]} 位
	</div>
{:else if Game.currentState.ifFinished}
	<div class="finished" in:fade>
		{Game.currentState.ranks[ai]} 位
	</div>
{:else if att.yasuDisplay > 0}
	<div class="yasu" in:fade>
		{#key att.yasuDisplay}
			{#if att.yasuCount === 'next'}次{/if}
			<span class="crossfade" in:fade={{ delay: 500 }} out:fade>{att.yasuDisplay}</span>
		{/key}
		休
	</div>
{:else if Game.bulkAdjustmentScore !== null}
	<input type="checkbox" bind:checked={Game.bulkAdjustmentTarget[ai]} />
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
		{#if Game.effect2Name}
			<button
				onclick={() => Game.clickEffect2(ai)}
				class="maru-btn"
				{@attach tooltip(`${Game.effect2Name}（+2○）`, { placement: 'bottom' })}
			>
				2O
			</button>
		{/if}
		{#if Game.effect3Name}
			<button
				onclick={() => Game.clickEffect3(ai)}
				class="maru-btn"
				{@attach tooltip(`${Game.effect3Name}（+3○）`, { placement: 'bottom' })}
			>
				3O
			</button>
		{/if}
		<button
			onclick={() => Game.clickBatsu(ai)}
			class="batsu-btn"
			{@attach tooltip(
				Game.currentState.defaultRule.chance === 'single'
					? `${att.name || 'このプレイヤー'}に1×をつけて問題カウントを1進めます（休みの人がいれば1休減ります）`
					: `${att.name || 'このプレイヤー'}に1×をつけます（誰も正解しなければ最後にスルーボタンを押すのを忘れずに！）`,
				{ placement: 'bottom' }
			)}
		>
			X
		</button>
	</div>
{/if}

<style>
	button {
		color: #fff;
		background-color: #00000040;
		border: none;
		border-radius: 0;
		box-shadow: 3px 3px 6px #00000080;
		backdrop-filter: blur(10px);

		&:disabled {
			color: #0004;
			opacity: 1;
		}

		&:focus {
			box-shadow: 3px 3px 6px #00000080;
		}
	}

	.answerer,
	.button-mapping {
		position: absolute;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.answerer {
		top: -0.75em;
		left: 0;
		width: 100%;
		font-size: 0.5em;
		color: #fff;
		background: black;
		border-radius: 1em;
	}
	.button-mapping {
		top: 0.2em;
		right: 0.25em;
		z-index: 20;
		width: 1.5em;
		height: 1.5em;
		font-size: 0.4em;
		color: white;
		background: grey;
		border-radius: 5em;
	}

	.group {
		z-index: 10;
		border-radius: 2em 0.5em 0 0;
		transition: background-color 0.3s ease;
	}

	.name {
		position: relative;
		display: flex;
		flex: 1 1 100px;
		align-items: center;
		padding: 0;
		padding-top: calc(1em + 5px);
		padding-bottom: 1em;
		margin: -1em -0.5em;
		overflow: hidden;
		font-weight: bold;
		line-height: 1.1;
		word-break: break-all;
		text-wrap: balance;

		&:focus {
			padding-top: 5px;
			padding-bottom: 0;
			margin: 0 -0.5em;
		}

		&:empty:not(:focus)::before {
			color: #aaa;
			text-wrap: initial;
			cursor: text;
			content: attr(placeholder);
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

		&:focus:after {
			display: none;
		}
	}

	.hidden-buttons {
		position: absolute;
		bottom: 50%;
		left: -0.5em;
		display: none;
		flex-direction: column;
		flex-wrap: wrap;
		gap: 3px;
		justify-content: space-evenly;
		font-size: 0.3em;
		translate: 0% 50%;

		button:hover:not([disabled]) {
			background: #444;
		}
	}

	.hidden-buttons:is(:global(.attendant:hover) > *) {
		display: flex;
	}

	.trophies {
		position: absolute;
		right: -0.5em;
		display: flex;
		flex-direction: column;

		span {
			width: 1.375em;
			height: 1.375em;
			background-color: #ffffffaa;
			background-image: var(--trophy-image);
			background-position: center;
			background-size: cover;
			border-radius: 50%;
			box-shadow: 0 0 3px #888;
			transition: margin-top 0.3s ease;
			transition:
				box-shadow 0.3s ease,
				background-color 0.3s ease;

			&.previous-trophy-getter {
				background-color: #ff08;
				box-shadow:
					0 0 3px #888,
					0 0 10px #ff0;
			}
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
		z-index: 100;
		align-content: center;
		padding-bottom: 0.1em;
		margin: 0 -0.25em;
		font-weight: bold;
		line-height: 0.9;
		text-align: center;
		text-shadow: 0 0 5px #000e;
		background-color: #111;
		border-radius: 0.2em;

		&.showTotalOverride,
		&.showRate {
			&::before {
				display: inline-block;
				padding-bottom: 0.25em;
				margin-right: 0.4em;
				font-size: 0.5em;
				vertical-align: middle;
				white-space: pre;
				content: '通算';
			}
		}
		&:not(.showTotalOverride).showRate::before {
			content: 'レート';
		}

		> * {
			display: inline-block;
		}

		small {
			margin: 0 -0.25em;
			font-size: 0.4em;
			font-weight: normal;
		}

		.m-by-n-score {
			text-align: center;
			letter-spacing: -0.04em;

			small {
				display: block;
				font-size: 0.55em;
			}
		}

		.maru-count {
			color: rgb(255 65 65);
			letter-spacing: -0.1em;
		}
		.batsu-count {
			color: rgb(140 140 255);
			letter-spacing: -0.1em;
		}
		.total-rate {
			font-size: 0.5em;
			line-height: 1.2;
		}

		.symbol {
			display: inline-block;
			width: 1em;
		}

		.consecutive-count {
			position: absolute;
			top: -1em;
			right: -0.4em;
			z-index: 100;
			display: flex;
			align-items: center;
			justify-content: center;
			width: 1.25em;
			height: 1.25em;
			font-weight: normal;
			line-height: 0.5em;
			border-radius: 50%;
			box-shadow: 0 0 8px #000a;
		}

		.lose-lizhi {
			animation: lose-lizhi-animation 1.2s ease infinite;
		}
	}

	.buttons,
	.total,
	.yasu,
	.won,
	.lost,
	.finished {
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

	.total {
		font-size: 0.75em;

		small {
			padding-right: 0.1em;
			font-size: 0.65em;
		}
	}

	input[type='checkbox'] {
		display: block;
		width: 3em;
		height: 3em;
		margin: 0 auto;
	}

	.buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		justify-content: space-evenly;
		margin: 0.2em -0.45em;
		font-size: 0.9em;

		> * {
			display: flex;
			flex: 1 1 40px;
			align-items: center;
			justify-content: center;
		}

		.maru-btn:hover:not(:active),
		.maru-btn:focus-visible:not(:active) {
			color: white;
			background-color: red;
		}
		.batsu-btn:hover:not(:active),
		.batsu-btn:focus-visible:not(:active) {
			color: white;
			background-color: blue;
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

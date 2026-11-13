<script lang="ts">
	import { fade, fly } from 'svelte/transition';

	import { getGameContext } from '$lib/gameContext';
	import { getLayoutContext } from '$lib/layout.svelte';
	import { tooltip } from '$lib/tooltip.svelte';
	import { AttendantID } from '$lib/types';
	import { getWasedashikiContext } from '$lib/wasedashiki.svelte';

	let Game = getGameContext();
	let Wasedashiki = getWasedashikiContext();
	let Layout = getLayoutContext();

	let innerHeight = $state(0);
	let pushersClientHeight = $state(0);

	let buttonMappingTarget = $state<number | null>(0);

	let sortedAttendants = $derived(
		Array.from(Game.attendants, (attendant, ai) => ({ attendant, ai: AttendantID(ai) })).toSorted(
			(a, b) => (Wasedashiki.buttonMapping[a.ai] ?? 0) - (Wasedashiki.buttonMapping[b.ai] ?? 0)
		)
	);

	let pushersTop = $derived.by(() => {
		if (pushersClientHeight === 0) {
			return Layout.headerClientHeight * 1.5;
		}

		const availableHeight = innerHeight - Layout.headerClientHeight - Layout.footerClientHeight;
		if (availableHeight <= 0) {
			return Layout.headerClientHeight * 1.5;
		}

		return (
			Layout.headerClientHeight * 1.5 + Math.max(0, (availableHeight - pushersClientHeight) / 2)
		);
	});

	$effect(() => {
		if (Wasedashiki.answererRanking.length > 0 && Wasedashiki.answererRanking[0][0] == undefined) {
			const firstUnknown = Game.attendants.findIndex(
				(_, ai) => Wasedashiki.buttonMapping[AttendantID(ai)] == null
			);
			buttonMappingTarget = firstUnknown === -1 ? null : firstUnknown;
		}
	});
</script>

<svelte:window bind:innerHeight />

{#if Wasedashiki.answererRanking.length > 0}
	<div class="pushers-bg" in:fade></div>
	<div class="pushers" style:top="{pushersTop}px">
		<div bind:clientHeight={pushersClientHeight}>
			{#each Wasedashiki.answererRanking as [attendantID, answerer] (attendantID ?? answerer.totalRank)}
				<div class="attendant" in:fly={{ y: 300 }} out:fly={{ y: -300 }}>
					<div class="rank">
						{answerer.totalRank + 1}<small>着 / {Wasedashiki.pushers.length}</small>
					</div>
					<div
						class="name"
						class:answerer-1st={answerer.currentRank === 1 && attendantID != undefined}
						class:answerer-1st-uncertain={answerer.currentRank === 1 && attendantID == undefined}
						class:answerer-2nd={answerer.currentRank === 2 &&
							Game.wasedashikiMode !== 'single' &&
							Game.wasedashikiMode !== 'handicap'}
					>
						<div
							style:scale={attendantID != undefined &&
							(Game.attendants[attendantID]?.name.length ?? 0) > 9
								? '0.8 1'
								: '1 1'}
						>
							{#if attendantID == undefined}
								{#if answerer.currentRank === 1}
									<select bind:value={buttonMappingTarget}>
										{#each sortedAttendants as { attendant, ai } (ai)}
											<option value={ai}>
												{#if Wasedashiki.buttonMapping[AttendantID(ai)] != null}
													☑️
												{/if}
												{attendant.name || `プレイヤー${ai + 1}`}
											</option>
										{/each}
										<option value={null}>（新しく追加）</option>
									</select>
									<button
										onclick={() => {
											if (buttonMappingTarget === null) {
												Game.addAttendant({});
												Wasedashiki.setButtonMapping(AttendantID(Game.attendants.length - 1));
											} else {
												Wasedashiki.setButtonMapping(AttendantID(buttonMappingTarget));
											}
										}}
									>
										に紐づける
									</button>
								{:else}
									？？？
								{/if}
							{:else}
								{@const ai = AttendantID(attendantID)}
								{Game.attendants[ai]?.name || `プレイヤー${ai + 1}`}
								{#if Game.currentState.attendants[ai]?.life === 'won'}
									（勝ち抜け済）
								{:else if Game.currentState.attendants[ai]?.life === 'lost'}
									（失格済）
								{:else if Game.currentState.attendants[ai]?.life === 'removed'}
									（削除済）
								{:else if typeof Game.currentState.attendants[ai]?.yasuCount === 'number' && Game.currentState.attendants[ai].yasuCount > 0}
									（休み中）
								{/if}
							{/if}
						</div>
					</div>
					<div
						class="time"
						style:opacity={answerer.delay === 0 ? 0 : 1}
						style:background={answerer.delay < 10 ? 'red' : 'black'}
					>
						+ {(answerer.delay / 1000).toFixed(3) ?? ''} s
					</div>
				</div>
			{/each}
		</div>
		{#key JSON.stringify(Wasedashiki.answererRanking)}
			<button
				class="escape-btn"
				onclick={() => {
					alert(
						'早稲田式の親機のリセットも行ってください。\n（赤色のボタンと青色のボタンを同時に押す）'
					);
					Wasedashiki.reset();
				}}
				{@attach tooltip('出来れば押す前に画面のスクショを作者に共有してください＞＜')}
			>
				にっちもさっちもいかなくなったときに押すボタン
			</button>
		{/key}
	</div>
{/if}

<style>
	.pushers {
		position: fixed;
		inset: 0;
		z-index: 999;
		overflow: hidden;
		font-size: min(4dvw, 12dvh);
		font-weight: bold;
		line-height: 1;
		text-align: center;
		white-space: nowrap;
		user-select: none;
		transition: top 0.3s ease;

		& > div {
			z-index: 999;
			display: flex;
			flex-direction: column;
			gap: 0.5em;
			align-items: center;
			justify-content: space-evenly;
			width: 100%;
		}

		.attendant {
			display: grid;
			grid-template-columns: 3em 1fr 3em;
			align-items: center;
			width: 80%;
		}

		.rank {
			z-index: 9999;
			font-size: 0.5em;
			line-height: 1.5;
			color: white;
			background: black;
			border: 1px solid white;
			border-radius: 1em;
		}

		.time {
			z-index: 9999;
			font-size: 0.5em;
			line-height: 1.5;
			color: white;
			background: black;
			border: 1px solid white;
			border-radius: 1em;
		}

		.name {
			padding: 0.1em 0;
			margin-right: -1em;
			margin-left: -1em;
			line-height: 1;
			color: white;
			text-shadow: 0 0 15px #fff8;
			background: #222;
		}

		select {
			padding: 0.1em;
			font-size: 1em;
			background: lightyellow;
			border: none;
		}

		.answerer-1st {
			animation: answerer-1st 0.3s ease infinite alternate;
		}

		.answerer-1st,
		.answerer-1st-uncertain {
			color: #222;
			background: yellow;
			box-shadow:
				0px 0px 25px #aa0a,
				0px 0px 25px #aa0a,
				0px 0px 25px #aa0a;
		}

		.answerer-2nd {
			color: yellow;
			text-shadow:
				0px 0px 25px #aa0a,
				0px 0px 25px #aa0a,
				0px 0px 25px #aa0a;
		}
	}

	.pushers-bg {
		position: fixed;
		inset: 0;
		z-index: 998;
		pointer-events: none;
		background-color: rgba(0, 0, 0, 0.3);
	}

	.escape-btn {
		position: absolute;
		right: 2em;
		bottom: 100px;
		z-index: 1000;
		font-size: 1rem;
		color: white;
		background: transparent;
		border: 1px solid white;
		box-shadow: none !important;
		opacity: 0;
		animation: appear 1s 10s ease forwards 1;
	}

	@keyframes answerer-1st {
		to {
			scale: 1.1;
		}
	}

	@keyframes appear {
		to {
			opacity: 1;
		}
	}
</style>

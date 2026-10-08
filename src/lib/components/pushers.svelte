<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import type { GameClassBaseType } from '$lib/game';
	import { getLayoutContext } from '$lib/layout.svelte';
	import { tooltip } from '$lib/tooltip.svelte';
	import type { AttendantID } from '$lib/types';
	import { getWasedashikiContext } from '$lib/wasedashiki.svelte';

	let { Game }: { Game: GameClassBaseType } = $props();

	let Wasedashiki = getWasedashikiContext();
	let Layout = getLayoutContext();

	let innerHeight = $state(0);
	let pushersClientHeight = $state(0);

	let buttonMappingTarget = $state(0);

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
</script>

<svelte:window bind:innerHeight />

{#if Wasedashiki.answererRanking.length > 0}
	<div class="pushers-bg" in:fade></div>
	<div class="pushers" style:top="{pushersTop}px">
		<div bind:clientHeight={pushersClientHeight}>
			{#each Wasedashiki.answererRanking as [attendantID, answerer] (attendantID ?? answerer.totalRank)}
				<div class="attendant" in:fly={{ y: 300 }} out:fly={{ y: -300 }}>
					<div class="rank">
						{answerer.totalRank + 1} <small>着 / {Wasedashiki.pushers.length}</small>
					</div>
					<div
						class="name"
						class:answerer-1st={answerer.currentRank === 1 && !isNaN(attendantID)}
						class:answerer-1st-uncertain={answerer.currentRank === 1 && isNaN(attendantID)}
						class:answerer-2nd={answerer.currentRank === 2 &&
							Game.wasedashikiMode !== 'single' &&
							Game.wasedashikiMode !== 'handicap'}
					>
						<div
							style:scale={(Game.attendants[attendantID]?.name.length ?? 0) > 9 ? '0.8 1' : '1 1'}
						>
							{#if isNaN(attendantID)}
								{#if answerer.currentRank === 1}
									<select bind:value={buttonMappingTarget}>
										{#each Game.attendants as attendant, id (id)}
											<option value={id}>{attendant.name || `プレイヤー${id + 1}`}</option>
										{/each}
									</select>
									<button
										onclick={() => Wasedashiki.setButtonMapping(buttonMappingTarget as AttendantID)}
									>
										に紐づける
									</button>
								{:else}
									？？？
								{/if}
							{:else}
								{Game.attendants[attendantID]?.name || `プレイヤー${attendantID + 1}`}
								{#if Game.currentState.attendants[attendantID]?.life === 'won'}
									（勝ち抜け済）
								{:else if Game.currentState.attendants[attendantID]?.life === 'lost'}
									（失格済）
								{:else if Game.currentState.attendants[attendantID]?.life === 'removed'}
									（削除済）
								{:else if typeof Game.currentState.attendants[attendantID]?.yasuCount === 'number' && Game.currentState.attendants[attendantID].yasuCount > 0}
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
		z-index: 999;
		transition: top 0.3s ease;
		inset: 0;
		overflow: hidden;
		font-weight: bold;
		font-size: min(4dvw, 12dvh);
		line-height: 1;
		user-select: none;
		text-align: center;
		white-space: nowrap;

		& > div {
			display: flex;
			flex-direction: column;
			justify-content: space-evenly;
			align-items: center;
			gap: 0.5em;
			z-index: 999;
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
			border: 1px solid white;
			border-radius: 1em;
			background: black;
			color: white;
			font-size: 0.5em;
			line-height: 1.5;
		}

		.time {
			z-index: 9999;
			border: 1px solid white;
			border-radius: 1em;
			background: black;
			color: white;
			font-size: 0.5em;
			line-height: 1.5;
		}

		.name {
			margin-right: -1em;
			margin-left: -1em;
			background: #222;
			padding: 0.1em 0;
			color: white;
			line-height: 1;
			text-shadow: 0 0 15px #fff8;
		}

		select {
			border: none;
			background: lightyellow;
			padding: 0.1em;
			font-size: 1em;
		}

		.answerer-1st {
			animation: answerer-1st 0.3s ease infinite alternate;
		}

		.answerer-1st,
		.answerer-1st-uncertain {
			box-shadow:
				0px 0px 25px #aa0a,
				0px 0px 25px #aa0a,
				0px 0px 25px #aa0a;
			background: yellow;
			color: #222;
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
		z-index: 998;
		inset: 0;
		background-color: rgba(0, 0, 0, 0.3);
		pointer-events: none;
	}

	.escape-btn {
		position: absolute;
		right: 2em;
		bottom: 100px;
		opacity: 0;
		z-index: 1000;
		animation: appear 1s 10s ease forwards 1;
		box-shadow: none !important;
		border: 1px solid white;
		background: transparent;
		color: white;
		font-size: 1rem;
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

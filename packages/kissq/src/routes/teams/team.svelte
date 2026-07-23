<script lang="ts">
	import { fade } from 'svelte/transition';
	import type { Attendant } from '$lib/attendant';
	import { tooltip } from '$lib/tooltip.svelte';
	import { getGameContext } from './game.svelte';
	import Seat from './seat.svelte';

	let {
		seats,
		ti
	}: {
		seats: ({ att: Attendant; ai: number }[] | undefined)[];
		ti: number;
	} = $props();

	let Game = getGameContext();
</script>

<div class="life">
	{#if Game.currentState.teams[ti].teamLife === 'won'}
		<div class="won">{Game.currentState.ranking.indexOf(ti) + 1}位</div>
	{:else if Game.currentState.teams[ti].teamLife === 'lost'}
		<div class="lost">失格</div>
	{/if}
</div>

<div class="team-name">
	<input placeholder={`チーム${ti + 1}`} bind:value={Game.teams[ti]} />
</div>

<div
	class="team-score"
	style:background={`hsl(${(360 / Game.currentState.teams.length) * ti}, 90%, 40%)`}
	{@attach tooltip('チームの総得点')}
>
	{#key Game.currentState.teams[ti].teamScore}
		<span in:fade>
			{Game.currentState.teams[ti].teamScore}
		</span>
	{/key}
</div>

<div
	class="members"
	class:with-seat={Game.currentState.defaultRule.mode === 'aql' ||
		Game.currentState.defaultRule.mode === 'product'}
>
	{#each seats as atts, si (atts?.map(({ ai }) => ai).join(',') ?? si)}
		{#if atts}
			<Seat {seats} {ti} {atts} {si} />
		{/if}
	{/each}
	<div class="bottom-buttons">
		<button
			disabled={Game.history.length > 0}
			onclick={() => {
				if (
					confirm(
						`${Game.teams[ti] || `チーム${ti + 1}`}を削除しますか？\nこの操作は元に戻せません。`
					)
				) {
					Game.attendants = Game.attendants
						.filter((_, i) => Game.attendants[i].team !== ti)
						.map((att) => {
							if (att.team > ti) {
								return { ...att, team: att.team - 1 };
							}
							return att;
						});
					Game.teams.splice(ti, 1);
				}
			}}
			{@attach tooltip('このチームを削除します。')}
		>
			削除
		</button>
		<div class="spacer"></div>
		<button
			onclick={() => Game.addAttendant(ti)}
			{@attach tooltip('このチームに新しいプレイヤーを追加します。')}
		>
			追加
		</button>
	</div>
</div>

<style>
	input {
		flex: 1 1 100%;
		border: none;
		background: transparent;
		min-width: 0;
		color: #fff;
		font-size: inherit;
		text-align: center;
		text-shadow:
			0px 0px 12px #0007,
			0px 0px 12px #0007;

		&::placeholder {
			color: #fff;
			text-shadow: none;
		}
	}

	.life {
		display: flex;
		justify-content: center;
		align-items: center;
		color: #fff;
		font-weight: bold;
		font-size: 0.8em;
		text-shadow:
			0px 10px 50px #444,
			0px 10px 50px #444;
	}

	.team-name {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 0 0.5em;
		min-width: 0;
		text-align: center;
	}

	.team-score {
		display: flex;
		justify-content: center;
		align-items: center;
		box-shadow: 0 0 10px #0008;
		border-radius: 5em;
		font-weight: bold;
		text-align: center;
		text-shadow: 0 0 8px #000;
	}

	.members {
		display: grid;
		grid-template-columns: 1fr 2em;
		grid-column: 1 / -1;
		align-content: start;
		padding-right: 0.75em;
		padding-left: 0.75em;

		&.with-seat {
			grid-template-columns: 2em 1fr 2em 2.5em;
			padding-right: 0;
		}
	}

	.bottom-buttons {
		display: flex;
		position: absolute;
		right: 0.75em;
		bottom: 0.75em;
		grid-column: 1 / -1;
		align-items: center;
		opacity: 0;
		transition: opacity 0.3s;
		width: calc(100% - 0.75em * 2);

		&:is(:global(.team:hover) *) {
			opacity: 1;
		}

		.spacer {
			flex-grow: 1;
		}
	}
</style>

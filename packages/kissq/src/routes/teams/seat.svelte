<script lang="ts">
	import { fade } from 'svelte/transition';
	import type { Attendant } from '$lib/attendant';
	import { tooltip } from '$lib/tooltip.svelte';
	import { getDnDContext } from './dnd.svelte';
	import { getGameContext } from './game.svelte';
	import Member from './member.svelte';

	let {
		seats,
		ti,
		atts,
		si
	}: {
		seats: ({ att: Attendant; ai: number }[] | undefined)[];
		ti: number;
		atts: { att: Attendant; ai: number }[];
		si: number;
	} = $props();

	let Game = getGameContext();
	let DnD = getDnDContext();

	let rowStart = $derived(
		seats.slice(0, si).reduce((sum, seatAtts) => sum + (seatAtts?.length ?? 0), 1)
	);
	let batsuCount = $derived(
		atts.reduce((sum, { ai }) => sum + Game.currentState.attendants[ai].batsuCount, 0)
	);
	let seatTotal = $derived(
		atts.reduce(
			(sum, { ai }) => sum + Game.currentState.attendants[ai].score,
			Game.currentState.defaultRule.mode === 'aql' ? 1 : 0
		)
	);
</script>

{#if !atts.every(({ ai }) => Game.currentState.attendants[ai].life === 'removed')}
	<div
		class="grid-wrapper"
		class:group-by-seat={Game.currentState.defaultRule.mode === 'aql' ||
			Game.currentState.defaultRule.mode === 'product'}
	>
		<div
			class="seat-id"
			style:grid-row={`${rowStart} / span ${atts.length}`}
			style:display={atts.length > 0 &&
			(Game.currentState.defaultRule.mode === 'aql' ||
				Game.currentState.defaultRule.mode === 'product')
				? ''
				: 'none'}
			class:is-drop-target={DnD.dropTarget?.type === 'seat' &&
				DnD.dropTarget.ti === ti &&
				DnD.dropTarget.si === si}
		>
			{si + 1}<small>枠</small>
		</div>

		<div
			class="seat-total"
			style:grid-row={`${rowStart} / span ${atts.length}`}
			style:display={atts.length > 0 &&
			(Game.currentState.defaultRule.mode === 'aql' ||
				Game.currentState.defaultRule.mode === 'product')
				? ''
				: 'none'}
		>
			<div {@attach tooltip('枠の総得点')}>
				{#key seatTotal}
					<span in:fade>
						{seatTotal}
					</span>
				{/key}
			</div>
			<div
				class="batsu-count"
				style:display={Game.currentState.defaultRule.mode === 'aql' ? '' : 'none'}
			>
				{'✕'.repeat(batsuCount)}
			</div>
		</div>

		{#each atts.filter(({ ai }) => Game.currentState.attendants[ai]?.life !== 'removed') as { ai }, mi (mi)}
			<Member {ti} {si} {ai} {mi} {rowStart} {batsuCount} />
		{/each}
	</div>
{/if}

<style>
	.grid-wrapper {
		display: contents;
		width: 100%;
		min-width: 0;

		&.group-by-seat {
			:global {
				& .member:not(:nth-child(2)):not(:last-child) {
					border-top-right-radius: 0;
					border-bottom-right-radius: 0;
					.score {
						border-top-right-radius: 0;
						border-bottom-right-radius: 0;
					}
				}

				& .member:nth-child(2):not(:last-child) {
					border-bottom-right-radius: 0;
					.score {
						border-bottom-right-radius: 0;
					}
				}

				& .member:last-child:not(:nth-child(2)) {
					border-top-right-radius: 0;
					.score {
						border-top-right-radius: 0;
					}
				}
			}
		}
	}

	.seat-id {
		&.is-drop-target {
			box-shadow: 0 0 10px #f008;
			background-color: yellow;
			color: #000;
		}
	}

	.seat-total {
		display: flex;
		position: relative;
		grid-column: -2 / -1;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		gap: 0;
		padding-right: 0.5em;
		font-weight: bold;
		line-height: 0.8;

		&:before {
			position: absolute;
			top: 0;
			left: -1.75em;
			rotate: 180deg;
			border-left: 5px solid #fff;
			border-radius: 0.75em;
			width: 2em;
			height: 100%;
			content: '';
		}

		.batsu-count {
			color: #f55;
			font-size: 0.8em;
		}
	}
</style>

<script lang="ts">
	import { fade } from 'svelte/transition';
	import type { Attendant } from '$lib/attendant';
	import { tooltip } from '$lib/tooltip.svelte';
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

	let rowStart = $derived(
		seats.slice(0, si).reduce((sum, seatAtts) => sum + (seatAtts?.length ?? 0), 1)
	);
	let maxSeat = $derived(
		seats.reduce(
			(max, atts) => Math.max(max, atts?.reduce((m, { att }) => Math.max(m, att.seat), 0) ?? 0),
			0
		)
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
		{#each atts.filter(({ ai }) => Game.currentState.attendants[ai]?.life !== 'removed') as { att, ai }, mi (mi)}
			<Member {att} {ti} {si} {ai} {mi} {rowStart} {batsuCount} {maxSeat} />
		{/each}
	</div>
{/if}

<style>
	.grid-wrapper {
		display: contents;

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

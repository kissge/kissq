<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import type { WasedashikiMode } from '$lib/serial';

	let {
		answererRanking,
		attendants,
		wasedashikiMode
	}: {
		answererRanking: (readonly [
			number,
			{
				rank: 1 | 2 | 'late';
				delay: number;
			}
		])[];
		attendants: Record<number, { name: string } | undefined>;
		wasedashikiMode: WasedashikiMode | undefined;
	} = $props();
</script>

{#if answererRanking.length > 0 && !answererRanking.some( ([attendantID]) => Number.isNaN(attendantID) )}
	<div class="pushers-bg" in:fade></div>
	<div class="pushers">
		<div>
			{#each answererRanking as [attendantID, answerer] (attendantID)}
				<div class="attendant" in:fly={{ y: 300 }} out:fly={{ y: -300 }}>
					<div class="time" style:opacity={answerer.delay === 0 ? 0 : 1}>
						+ {(answerer.delay / 1000).toFixed(3) ?? ''} s
					</div>
					<div
						class="name"
						class:answerer-1st={answerer.rank === 1}
						class:answerer-2nd={answerer.rank === 2 &&
							wasedashikiMode !== 'single' &&
							wasedashikiMode !== 'handicap'}
					>
						<div style:scale={(attendants[attendantID]?.name.length ?? 0) > 9 ? '0.8 1' : '1 1'}>
							{attendants[attendantID]?.name || `プレイヤー${attendantID}`}
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
{/if}

<style>
	.pushers {
		display: flex;
		position: fixed;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		z-index: 9999;
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
			z-index: 9999;
			width: 100%;
		}

		.attendant {
			display: grid;
			grid-template-columns: 3em 1fr;
			align-items: center;
			width: 80%;
		}

		.time {
			z-index: 99999;
			border: 1px solid white;
			border-radius: 1em;
			background: black;
			color: white;
			font-size: 0.5em;
			line-height: 1.5;
		}

		.name {
			margin-left: -1em;
			background: #222;
			padding: 0.1em 0;
			color: white;
			line-height: 1;
			text-shadow: 0 0 15px #fff8;
		}

		.answerer-1st {
			animation: answerer-1st 0.3s ease infinite alternate;
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
		z-index: 9998;
		inset: 0;
		background-color: rgba(0, 0, 0, 0.3);
		pointer-events: none;
	}

	@keyframes answerer-1st {
		to {
			scale: 1.1;
		}
	}
</style>

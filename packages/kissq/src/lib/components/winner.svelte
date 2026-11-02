<script lang="ts">
	import { onMount } from 'svelte';
	import { isUnlocked } from 'kissunlocklib';
	import { fade } from 'svelte/transition';
	import { getGameContext } from '$lib/gameContext';
	import type { AttendantID } from '$lib/types';

	let Game = getGameContext();

	let wallpaper = $state<string>();
	let trophy = $state<string>();

	let name1stWrapper: HTMLDivElement;

	let ranking: ({ rank: number; attendantIDs: AttendantID[] } | undefined)[] = $derived(
		Object.entries(
			Game.totalScoreRanks.reduce<Record<number, AttendantID[]>>((acc, rank, attendantID) => {
				(acc[rank] ??= []).push(attendantID as AttendantID);
				return acc;
			}, {})
		)
			.map(([rank, attendantIDs]) => ({ rank: Number.parseInt(rank), attendantIDs }))
			.toSorted((a, b) => a.rank - b.rank)
	);

	onMount(() => {
		isUnlocked().then((unlocked) => {
			console.log('unlocked', unlocked);
			if (unlocked) {
				const _wallpaper = window.localStorage.getItem('wallpaper');
				wallpaper = _wallpaper ? `url(${_wallpaper})` : undefined;

				const _trophy = window.localStorage.getItem('trophy');
				trophy = _trophy ? `url(${_trophy})` : undefined;
			}
		});
	});

	$effect(() => {
		// 優勝者名が画面幅に収まるように縮小する（もともと収まるならしない）
		void getAttendantNames(0);
		name1stWrapper.style.transform = '';
		const name1stWrapperWidth = name1stWrapper.getBoundingClientRect().width;
		name1stWrapper.style.transform = `scale(calc((100vw - 2em) / max(100vw - 2em, ${name1stWrapperWidth}px)), 1)`;
	});

	function getAttendantNames(logicalRank: number): string[] | undefined {
		return ranking[logicalRank]?.attendantIDs.map((id) => Game.attendants[id].name);
	}
</script>

<div class="bg" style:background-image={wallpaper} transition:fade>
	<div class="wrapper">
		<div class="title-1st">
			<div class="trophy" style:background-image={trophy}></div>
			優勝
			<div class="trophy" style:background-image={trophy}></div>
		</div>
		<div class="name-1st-wrapper" bind:this={name1stWrapper}>
			{#each getAttendantNames(0)! as name}
				<div>{name}</div>
			{/each}
		</div>

		<div class="name-others-wrapper">
			{#each [1, 2] as logicalRank (logicalRank)}
				{#if ranking[logicalRank]}
					<div>{ranking[logicalRank].rank}位</div>
					<div>{getAttendantNames(logicalRank)?.join(', ')}</div>
				{/if}
			{/each}
		</div>
	</div>
</div>

<style>
	.bg {
		position: fixed;
		inset: 0;
		z-index: 999999;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		background-image: url('$lib/assets/wallpaper.jpg');
		background-position: center center;
		background-size: cover;
		background-color: rgb(15 18 33);
		opacity: 0.9;
		pointer-events: none;
		color: white;
	}

	.wrapper {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		max-width: min(90vw, 900px);
	}

	.title-1st {
		display: flex;
		align-items: center;
		font-size: 3rem;
		font-weight: bold;
		gap: 0.25em;
		margin-bottom: 1rem;
	}

	.name-1st-wrapper {
		display: flex;
		align-items: center;
		font-weight: bold;
		gap: 3em;
		margin-bottom: 1rem;
		white-space: nowrap;
	}

	.trophy {
		width: 2em;
		height: 2em;
		background-size: contain;
		background-repeat: no-repeat;
		background-position: center center;
		background-image: url('$lib/assets/trophy.png');
	}

	.name-others-wrapper {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 1em;
	}
</style>

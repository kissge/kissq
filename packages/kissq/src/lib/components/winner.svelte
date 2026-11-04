<script lang="ts">
	import { onMount } from 'svelte';
	import { isUnlocked } from 'kissunlocklib';
	import { getGameContext } from '$lib/gameContext';
	import { AttendantID } from '$lib/types';
	import { maybeUndefined } from '$lib/utils';

	let Game = getGameContext();

	let wallpaper = $state<string>();
	let trophy = $state<string>();

	let scoreMode = $state<'game' | 'total'>('game');

	let name1stWrapper: HTMLDivElement;
	const confetti = Array.from({ length: 28 }, (_, index) => ({
		x: (index * 37) % 100,
		delay: (index % 9) * 0.18,
		duration: 3.8 + (index % 5) * 0.45,
		rotate: (index * 53) % 360,
		color: ['#ffe082', '#ffca28', '#ff8a65', '#80deea', '#ce93d8'][index % 5]
	}));

	let singleRanking = $derived(
		Game.battleMode === 'single'
			? Object.entries(
					(scoreMode === 'game' ? Game.scoreRanks : Game.totalScoreRanks).reduce<
						Record<number, AttendantID[]>
					>((acc, rank, attendantID) => {
						(acc[rank] ??= []).push(AttendantID(attendantID));
						return acc;
					}, {})
				)
					.map(([rank, attendantIDs]) =>
						maybeUndefined({ rank: Number.parseInt(rank), attendantIDs })
					)
					.toSorted((a, b) => a!.rank - b!.rank)
			: null
	);

	onMount(() => {
		isUnlocked().then((unlocked) => {
			if (unlocked) {
				const _wallpaper = window.localStorage.getItem('wallpaper');
				wallpaper = _wallpaper ? `url(${_wallpaper})` : undefined;

				const _trophy = window.localStorage.getItem('trophy');
				trophy = _trophy ? `url(${_trophy})` : undefined;
			}
		});
	});

	$effect(() => {
		// テキストを縦に拡大する
		void getAttendantNames(0);

		name1stWrapper.style.scale = '';
		name1stWrapper.style.height = '';
		name1stWrapper.style.paddingTop = '';

		const actualHeight = name1stWrapper.offsetHeight;
		const instinctFontSize = parseFloat(getComputedStyle(name1stWrapper).fontSize);

		name1stWrapper.style.scale = `1 ${Math.max(1, instinctFontSize / actualHeight)}`;
		name1stWrapper.style.height = `${instinctFontSize}px`;
		name1stWrapper.style.paddingTop = `${(instinctFontSize - actualHeight) / 2}px`;
	});

	function getAttendantNames(logicalRank: number): string[] | undefined {
		return singleRanking?.[logicalRank]?.attendantIDs.map(
			(id) => Game.attendants[id].name || `プレイヤー${id + 1}`
		);
	}
</script>

<div class="bg" style:background-image={wallpaper}>
	<div class="glow"></div>
	<div class="confetti" aria-hidden="true">
		{#each confetti as piece}
			<span
				style={`--x: ${piece.x}%; --delay: ${piece.delay}s; --duration: ${piece.duration}s; --rotate: ${piece.rotate}deg; --color: ${piece.color}`}
			></span>
		{/each}
	</div>
	<div class="wrapper">
		<div class="eyebrow">
			{new Date().toLocaleDateString('ja-JP', {
				year: 'numeric',
				month: '2-digit',
				day: '2-digit'
			})}
		</div>
		<div class="title-1st">
			<div class="trophy" style:background-image={trophy}></div>
			<span>優勝</span>
			<div class="trophy" style:background-image={trophy}></div>
		</div>
		<div class="winner-card">
			<div class="winner-card-shine"></div>
			<div class="name-1st-wrapper" bind:this={name1stWrapper}>
				{getAttendantNames(0)!.join('　')}
			</div>
		</div>

		<div class="name-others-wrapper">
			{#each [1, 2] as logicalRank (logicalRank)}
				{#if singleRanking?.[logicalRank]}
					<div class:second={logicalRank === 1} class:third={logicalRank === 2} class="rank">
						{singleRanking[logicalRank].rank}位
					</div>
					<div class="other-name">
						{#each getAttendantNames(logicalRank)! as name, index (index)}
							<span>{name}</span>
						{/each}
					</div>
				{/if}
			{/each}
		</div>
		<div class="congratulations">
			{#if (singleRanking?.[0]?.attendantIDs.length ?? 0) >= 3}
				DAIBU HIRATAI
			{:else}
				WARITO MEDETAI
			{/if}
		</div>
	</div>

	<div class="configs">
		<button
			onclick={(event) => {
				event.stopPropagation();
				scoreMode = scoreMode === 'game' ? 'total' : 'game';
			}}
		>
			{scoreMode === 'game' ? 'このゲーム' : '累積'}
		</button>
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
		background-color: rgb(15 18 33 / 90%);
		color: white;
		overflow: hidden;
		isolation: isolate;
	}

	.bg::before {
		position: absolute;
		inset: 0;
		z-index: -1;
		background: linear-gradient(135deg, rgb(8 10 28 / 72%), rgb(50 17 64 / 68%));
		content: '';
	}

	.glow {
		position: absolute;
		z-index: -1;
		width: min(80vw, 700px);
		height: min(80vw, 700px);
		border-radius: 50%;
		background: rgb(255 193 7 / 22%);
		filter: blur(80px);
		animation: pulse 3s ease-in-out infinite;
	}

	.confetti {
		position: absolute;
		inset: 0;
		z-index: -1;
		overflow: hidden;
	}

	.confetti span {
		position: absolute;
		top: -8vh;
		left: var(--x);
		width: 0.65rem;
		height: 1.15rem;
		background: var(--color);
		box-shadow: 0 0 8px rgb(255 255 255 / 35%);
		opacity: 0;
		transform: rotate(var(--rotate));
		animation: fall var(--duration) linear var(--delay) infinite;
	}

	.wrapper {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		max-width: min(90vw, 900px);
		width: min(90vw, 720px);
		text-align: center;
		animation: arrive 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) both;
	}

	.eyebrow {
		color: #ffe082;
		font-size: clamp(0.7rem, 2vw, 1rem);
		font-weight: 800;
		letter-spacing: 0.35em;
		text-shadow: 0 0 15px rgb(255 193 7 / 70%);
		transform: translateY(1em);
	}

	.title-1st {
		display: flex;
		align-items: center;
		font-size: clamp(2.6rem, 8vw, 4.5rem);
		font-weight: 900;
		gap: 0.2em;
		margin-bottom: 1.2rem;
		color: #fff8e1;
		text-shadow:
			0 3px 0 #b87800,
			0 0 24px rgb(255 193 7 / 75%);
	}

	.title-1st span {
		animation: title-shine 2.8s ease-in-out infinite;
	}

	.winner-card {
		position: relative;
		width: 100%;
		box-sizing: border-box;
		padding: clamp(1.5rem, 5vw, 3rem) 1.5rem;
		border: 2px solid rgb(255 224 130 / 85%);
		border-radius: 1.5rem;
		background: linear-gradient(135deg, rgb(255 255 255 / 20%), rgb(255 193 7 / 14%));
		box-shadow:
			0 20px 70px rgb(0 0 0 / 40%),
			inset 0 1px rgb(255 255 255 / 40%),
			0 0 35px rgb(255 193 7 / 25%);
		overflow: hidden;
		text-align: center;
		animation: card-pop 0.9s 0.15s cubic-bezier(0.2, 1.4, 0.4, 1) both;
	}

	.winner-card-shine {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			110deg,
			transparent 25%,
			rgb(255 255 255 / 18%) 48%,
			transparent 65%
		);
		transform: translateX(-100%);
		animation: shine 4s 1.2s ease-in-out infinite;
	}

	.title-1st {
		position: relative;
	}

	.name-1st-wrapper {
		position: relative;
		width: 100%;
		box-sizing: border-box;
		color: #ffffff;
		font-size: clamp(2rem, 7vw, 4rem);
		font-weight: 900;
		white-space: nowrap;
		text-shadow: 0 3px 12px rgb(0 0 0 / 60%);
		text-align: center;
		text-fit: shrink;
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
		align-items: center;
		width: min(100%, 560px);
		margin-top: 1.5rem;
		padding: 0.8rem 1rem;
		border: 1px solid rgb(255 255 255 / 18%);
		border-radius: 1rem;
		background: rgb(0 0 0 / 24%);
		gap: 0.4rem 1rem;
		text-align: left;
		animation: arrive 0.8s 0.4s both;

		&:empty {
			display: none;
		}
	}

	.rank {
		min-width: 3.5rem;
		color: #e0e0e0;
		font-size: 1.1rem;
		font-weight: 800;
	}

	.rank.second {
		color: #c5c5c5;
	}

	.rank.third {
		color: #d99a6c;
	}

	.other-name {
		color: rgb(255 255 255 / 85%);

		span {
			display: inline-block;
			&:not(:last-child)::after {
				content: '・';
				opacity: 0.4;
			}
		}
	}

	.congratulations {
		margin-top: 1.5rem;
		color: rgb(255 224 130 / 85%);
		font-size: clamp(0.75rem, 2vw, 1rem);
		font-weight: 800;
		letter-spacing: 0.25em;
		animation: pulse 2s ease-in-out infinite;
	}

	@keyframes arrive {
		from {
			opacity: 0;
			transform: translateY(18px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.configs {
		position: fixed;
		bottom: 1em;
		right: 1em;
		opacity: 0.2;
		transition: opacity 0.3s ease;

		&:hover {
			opacity: 1;
		}

		button {
			box-shadow: none !important;
			border: 1px solid white;
			background: transparent;
			color: white;
			font-size: 1rem;
		}
	}

	@keyframes card-pop {
		from {
			opacity: 0;
			transform: scale(0.82);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	@keyframes title-shine {
		0%,
		100% {
			filter: brightness(1);
		}
		50% {
			filter: brightness(1.35);
		}
	}

	@keyframes shine {
		0%,
		30% {
			transform: translateX(-100%);
		}
		65%,
		100% {
			transform: translateX(100%);
		}
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 0.8;
			transform: scale(1);
		}
		50% {
			opacity: 1;
			transform: scale(1.04);
		}
	}

	@keyframes fall {
		0% {
			opacity: 0;
			transform: translate3d(0, -8vh, 0) rotate(var(--rotate));
		}
		10%,
		90% {
			opacity: 0.9;
		}
		100% {
			opacity: 0;
			transform: translate3d(8vw, 110vh, 0) rotate(calc(var(--rotate) + 540deg));
		}
	}

	@media (prefers-reduced-motion: reduce) {
		* {
			animation-duration: 0.01ms !important;
			animation-iteration-count: 1 !important;
		}
	}
</style>

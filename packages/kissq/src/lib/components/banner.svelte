<script lang="ts">
	import { watch } from 'runed';
	import { fade, slide } from 'svelte/transition';

	import { getGameContext } from '$lib/gameContext';
	import { NotAvailable } from '$lib/utils';

	import Stars from './stars.svelte';

	import type { GameEvent } from '$lib/state';

	let Game = getGameContext();
	Game.showBanner = showBanner;

	let isBannerVisible = $state<GameEvent | null>(null);
	let bannerShrinker = $state<HTMLDivElement>();

	watch(
		() => Game.currentState.latestEvent,
		(curr, prev) => {
			if (
				curr &&
				(curr.type !== prev?.type ||
					(prev &&
						curr.target === 'single' &&
						prev.target === 'single' &&
						curr.attendantID !== prev.attendantID) ||
					(prev && curr.target === 'team' && prev.target === 'team' && curr.teamID !== prev.teamID))
			) {
				showBanner(curr);
			}
		}
	);

	let hideBannerTimeout: number | NodeJS.Timeout = 0;
	function showBanner(event: GameEvent, duration: number = 3000) {
		isBannerVisible = event;
		clearTimeout(hideBannerTimeout);
		hideBannerTimeout = setTimeout(() => (isBannerVisible = null), duration);

		setTimeout(() => {
			if (bannerShrinker) {
				bannerShrinker.style.transform = `scaleX(${Math.min(1, (window.innerWidth - 100) / bannerShrinker.offsetWidth)})`;
			}
		}, 10);
	}
</script>

{#if isBannerVisible}
	<div class="banner-bg" transition:fade>
		<Stars type={isBannerVisible.type} />
	</div>

	<div class={['banner', isBannerVisible.type]} transition:slide={{ axis: 'x' }}>
		<div class="banner-shrinker" bind:this={bannerShrinker}>
			{#if isBannerVisible.target === 'single'}
				<div class="banner-name-wrapper">
					{#if Game.attendants[isBannerVisible.attendantID].nickname}
						<div class="banner-nickname">
							{Game.attendants[isBannerVisible.attendantID].nickname}
						</div>
					{/if}
					<div class="banner-name">
						{Game.attendants[isBannerVisible.attendantID].name ||
							'プレイヤー ' + (isBannerVisible.attendantID + 1)}
					</div>
				</div>
			{:else if isBannerVisible.target === 'team'}
				{Game.teams[isBannerVisible.teamID] || 'チーム ' + (isBannerVisible.teamID + 1)}
			{/if}

			{#if isBannerVisible.type === 'won'}
				勝ち抜け
			{:else if isBannerVisible.type === 'lizhi'}
				リーチ
			{:else if isBannerVisible.type === 'double-lizhi'}
				ダブルリーチ
			{:else if isBannerVisible.type === 'effect2'}
				{Game.effect2Name}
			{:else if isBannerVisible.type === 'effect3'}
				{Game.effect3Name}
			{:else if isBannerVisible.type === 'star'}
				{Game.starName}
			{:else if isBannerVisible.type === 'transit'}
				通過席
			{:else if isBannerVisible.type === 'finished'}
				問題終了
			{:else}
				{NotAvailable()}
			{/if}
		</div>
	</div>
{/if}

<style>
	.banner-name-wrapper {
		margin-right: 0.25em;
	}

	.banner-name-wrapper:has(.banner-nickname) {
		display: flex;
		flex-direction: column;
		align-items: flex-end;

		.banner-nickname {
			font-size: 0.4em;
			font-weight: lighter;
		}

		.banner-name {
			font-size: 0.8em;
		}
	}

	.banner-bg {
		position: fixed;
		inset: 0;
		z-index: 9998;
		background-color: rgba(0, 0, 0, 0.3);
	}

	.banner {
		position: fixed;
		top: calc(50% - 0.7em);
		right: 0;
		bottom: calc(50% - 0.7em);
		left: 0;
		z-index: 9999;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		font-size: min(8dvw, 20dvh);
		font-weight: bold;
		line-height: 1;
		text-align: center;
		white-space: nowrap;
		text-shadow: 0 0 15px #444;
		pointer-events: none;
		user-select: none;
		box-shadow: 0 0 20px #222;

		&.won,
		&.finished,
		&.star {
			color: white;
			background-color: rgba(255 100 100 / 0.3);
			backdrop-filter: blur(10px);
		}
		&.lizhi,
		&.double-lizhi,
		&.effect2,
		&.effect3,
		&.transit {
			color: rgb(255 231 231);
			background-color: rgba(240 240 175 / 0.4);
			backdrop-filter: blur(10px);
		}

		.banner-shrinker {
			display: flex;
			align-items: center;
			justify-content: center;
			text-align: center;
			white-space: nowrap;
		}
	}
</style>

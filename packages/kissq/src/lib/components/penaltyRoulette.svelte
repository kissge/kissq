<script lang="ts">
	import { fade } from 'svelte/transition';
	import type { Penalty } from '$lib/rule';

	let show = $state(false);

	let choices = $state<Penalty[]>([]);
	let count = $derived(choices.length);

	// svelte-ignore non_reactive_update
	let roulette: HTMLDivElement;

	export async function run(choices_: Penalty[]): Promise<number> {
		choices = [...choices_, ...choices_]; // 偶数個にするため
		const selection = Math.floor(Math.random() * count);
		show = true;

		setTimeout(() => {
			roulette.style.transform = `rotate(${((selection + 0.5) * -360) / count + 360 * 5 + 90}deg)`;
		}, 500);

		return new Promise((resolve) => {
			setTimeout(() => {
				show = false;
				resolve(selection % (count / 2));
			}, 5500);
		});
	}
</script>

{#if show}
	<div class="bg" transition:fade>
		<div
			class="roulette"
			style:background={`conic-gradient(${Array.from({ length: count }, (_, i) => (i % 2 ? 'white' : 'rgb(26 46 73)') + ` ${i * (360 / count)}deg ${(i + 1) * (360 / count)}deg`).join(', ')})`}
			bind:this={roulette}
		>
			{#each choices as penalty, i (i)}
				<div
					class="roulette-label"
					style:transform={`rotate(${i * (360 / count) + 180 / count}deg)
                          translate(0, -22dvmin)
                          rotate(-${i * (360 / count) + 180 / count}deg)
                          translate(-50%, -50%)
                          rotate(${270 + i * (360 / count) + 180 / count}deg)`}
					style:color={i % 2 ? 'black' : 'white'}
				>
					{#if penalty.type === 'zero'}
						ゼロ〇に戻る
					{:else}
						{penalty.count}休
					{/if}
				</div>
			{/each}
		</div>
		<div class="arrow"></div>
	</div>
{/if}

<style>
	.bg {
		position: fixed;
		z-index: 9998;
		inset: 0;
		background-color: rgba(0, 0, 0, 0.3);
		user-select: none;
	}

	.roulette {
		position: fixed;
		top: 50%;
		left: 50%;
		z-index: 9999;
		/* animation: spin 1s linear 3.2; */
		transition: transform 4s cubic-bezier(0.33, 1, 0.68, 1);
		box-sizing: border-box;
		margin-top: -40dvmin;
		margin-left: -40dvmin;
		box-shadow:
			0 0 2dvmin #000 inset,
			0 0 2dvmin #000;
		border: 2dvmin solid #444;
		border-radius: 50%;
		width: 80dvmin;
		height: 80dvmin;
	}

	.roulette-label {
		display: inline-block;
		position: absolute;
		top: 50%;
		left: 50%;
		font-size: 4dvmin;
	}

	.arrow {
		position: fixed;
		top: 50%;
		left: 50%;
		z-index: 10000;
		margin-top: -2.5dvmin;
		margin-left: 35dvmin;
		border-top: 2.5dvmin solid transparent;
		border-right: 7.5dvmin solid rgb(250 92 92);
		border-bottom: 2.5dvmin solid transparent;
		width: 0;
		height: 0;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
</style>

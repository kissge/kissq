<script lang="ts">
	import confetti from 'canvas-confetti';
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { base } from '$app/paths';
	import { getAPIClient, type APIClient } from '$lib/api';
	import { getQuestionConsoleContext } from '$lib/questionConsole.svelte';

	let QuestionConsole = getQuestionConsoleContext();

	const sessionID =
		typeof location !== 'undefined' ? new URLSearchParams(location.search).get('session') : null;
	const companionURL =
		typeof location === 'undefined'
			? null
			: location.origin + base + '/companion?session=' + sessionID;
	const qrCodeURL =
		'https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=' +
		encodeURIComponent(companionURL ?? '');
	let client: APIClient | undefined;
	let totalLikes = $state(-1);
	let currentLikes = $state(0);
	let firstConfetti = 0;

	$effect(() => {
		if (totalLikes > 0 && firstConfetti >= 2) {
			confetti({
				origin: { x: randomInRange(0.2, 0.8), y: (Math.random() - 0.5) / 4 + 0.5 }
			});
		}

		++firstConfetti;
	});

	onMount(() => {
		if (sessionID) {
			client = getAPIClient();
		}

		const timerID = setInterval(async () => {
			if (client && sessionID && QuestionConsole.showQuestionWindow) {
				const questions: { question_id: number; like_count: number }[] = await (
					await client.api.likes[':session_id'].$get({ param: { session_id: sessionID } })
				).json();

				totalLikes = questions.reduce((acc, { like_count }) => acc + like_count, 0);
				currentLikes =
					questions.find((q) => q.question_id === QuestionConsole.currentQuestion.id)?.like_count ??
					0;
			}
		}, 1000);

		return () => {
			clearInterval(timerID);
		};
	});

	function randomInRange(min: number, max: number): number {
		return Math.random() * (max - min) + min;
	}
</script>

{#if QuestionConsole.showQuestionWindow}
	<div transition:fade>
		<div class="question">
			{#key QuestionConsole.currentQuestion.question}
				<p in:fade>
					{#each QuestionConsole.currentQuestion.question.split(/(（.+?）|\(.+?\)|【.+?】|［.+?］)/) as part, i (i)}
						{#if i % 2}
							<small>{part}</small>
						{:else}
							{part}
						{/if}
					{/each}
				</p>
			{/key}
			{#if currentLikes > 0}
				<div class="likes" transition:fly>
					{#each { length: currentLikes }, i (i)}
						<span transition:fly>♥</span>
					{/each}
				</div>
			{/if}
			<div class="answer">
				A.
				{#each QuestionConsole.currentQuestion.answer.split(/(（.+?）|\(.+?\)|【.+?】|［.+?］)/) as part, i (i)}
					{#if i % 2}
						<small>{part}</small>
					{:else}
						{part}
					{/if}
				{/each}
			</div>
		</div>
	</div>
{/if}

{#if typeof location !== 'undefined' && QuestionConsole.showQRCode}
	<div transition:fly={{ y: 200, duration: 300 }} class="qr-code">
		<img src={qrCodeURL} alt="QRコード" />
	</div>
{/if}

<style>
	.question {
		position: relative;
		backdrop-filter: blur(10px);
		margin-top: -0.7rem;
		box-shadow: 0 0 15px #eeea;
		border-radius: 0 0 0.5em 0.5em;
		background-color: #0008;
		padding: 0.5em 1em;
		height: 5em;
		color: #fff;
		font-weight: bold;
		font-family:
    /* macOS 向け */
			'Yu Kyokasho',
			'游教科書体',
			'YuKyokasho',
			/* Windows 10/11 向け */ 'UD Digi Kyokasho NP',
			'UD Digi Kyokasho NP-R',
			'UD デジタル 教科書体 NP',
			'UD デジタル 教科書体 NP-R',
			/* 古いWindowsやOffice搭載環境向け（予備） */ 'HGKyokashotai',
			'HG教科書体',
			/* どの教科書体も無い場合の最終フォールバック */ sans-serif;

		p {
			margin: 0;
			height: 100%;
			overflow: hidden;
		}

		small {
			opacity: 0.6;
			font-weight: lighter;
			font-size: smaller;
		}
	}

	.likes {
		display: inline-block;
		position: absolute;
		bottom: -0.5em;
		left: 1em;
		backdrop-filter: blur(10px);
		transition: 0.3s translate 1s ease;
		margin-top: 0.5em;
		box-shadow: 0 0 15px #eeea;
		border-radius: 0.5em;
		background-color: #000c;
		padding: 0.35em 1em 0.15em;
		color: #f66;
	}

	.answer {
		display: inline-block;
		position: absolute;
		right: 1em;
		bottom: -0.5em;
		backdrop-filter: blur(10px);
		transition: 0.3s translate 1s ease;

		margin-top: 0.5em;
		box-shadow: 0 0 15px #eeea;
		border-radius: 0.5em;
		background-color: #000c;
		padding: 0.35em 1em 0.15em;

		&:is(.question:active *) {
			translate: 0 60%;
			transition-delay: 0s;
		}
	}

	.qr-code {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 1000;
		box-sizing: border-box;
		box-shadow: 0 0 25px #fff;
		border-radius: 0.5em;
		background-color: #fff;
		padding: 2em;
		width: min(50dvw, 50dvh);
		height: min(50dvw, 50dvh);

		img {
			border-radius: 0.5em;
			width: 100%;
			height: 100%;
			object-fit: contain;
		}
	}
</style>

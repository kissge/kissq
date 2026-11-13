<script lang="ts">
	import confetti from 'canvas-confetti';
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';

	import { base } from '$app/paths';
	import { getAPIClient, type APIClient } from '$lib/api';
	import seLike from '$lib/assets/like.ogg';
	import { getQuestionConsoleContext } from '$lib/questionConsole.svelte';
	import { playSound } from '$lib/sound';
	import { splitQuestion } from '$lib/utils';

	let { blur }: { blur: boolean } = $props();

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
	let popupWindow: Window | null = null;

	$effect(() => {
		if (totalLikes > 0 && firstConfetti >= 2) {
			confetti({
				origin: { x: randomInRange(0.2, 0.8), y: (Math.random() - 0.5) / 4 + 0.5 }
			});
			playSound(seLike);
		}

		++firstConfetti;
	});

	$effect(() => {
		void QuestionConsole.currentQuestion;
		popupWindow?.postMessage({
			command: 'updateQuestion',
			question: QuestionConsole.currentQuestion.question,
			answer: QuestionConsole.currentQuestion.answer
		});
	});

	onMount(() => {
		if (sessionID) {
			client = getAPIClient();
		}

		const timerID = setInterval(async () => {
			if (client && sessionID && QuestionConsole.showQuestionWindow) {
				try {
					const response = await client.api.likes[':session_id'].$get({
						param: { session_id: sessionID }
					});
					if (!response.ok) {
						throw new Error(`Failed to fetch likes: ${response.status}`);
					}

					const questions = await response.json();
					totalLikes = questions.reduce((acc, { like_count }) => acc + like_count, 0);
					currentLikes =
						questions.find((q) => q.question_id === QuestionConsole.currentQuestion.id)
							?.like_count ?? 0;
				} catch (error) {
					console.error('Failed to fetch likes', error);
				}
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
	<div transition:fade class:blur>
		<div class="question textbook-font">
			{#key QuestionConsole.currentQuestion.question}
				<p in:fade>
					{#each splitQuestion(QuestionConsole.currentQuestion.question) as { c, dimmed }, i (i)}
						<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
						<span
							class="char"
							class:dimmed
							class:slash={typeof QuestionConsole.currentQuestion.slashOffset === 'number' &&
								i === QuestionConsole.currentQuestion.slashOffset}
						>
							{c}
						</span>
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
				<p>
					{#each QuestionConsole.currentQuestion.answer.split(/(（.+?）|\(.+?\)|【.+?】|［.+?］)/) as part, i (i)}
						{#if i % 2}
							<small>{part}</small>
						{:else}
							{part}
						{/if}
					{/each}
				</p>
			</div>
			<button
				class="popup-btn"
				onclick={() => {
					popupWindow = window.open(
						'./question-popup',
						'popupWindow',
						'popup=yes, toolbar=no, scrollbars=no, menubar=no, status=no, directories=no, width=800, height=200'
					);
				}}
			>
				↗︎
			</button>
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
		height: 5em;
		padding: 0.5em 1em;
		margin-top: -0.7rem;
		background-color: #0008;
		border-radius: 0 0 0.5em 0.5em;
		box-shadow: 0 0 15px #eeea;
		backdrop-filter: blur(10px);

		p {
			height: 100%;
			margin: 0;
			overflow: hidden;
		}

		small {
			font-size: smaller;
			font-weight: lighter;
			opacity: 0.6;
		}

		.char {
			&.dimmed {
				font-size: 0.9em;
				font-weight: lighter;
				opacity: 0.6;
			}
			&.slash::after {
				margin: 0 0.2em;
				color: yellow;
				content: '/';
			}
		}
	}

	.likes {
		position: absolute;
		bottom: -0.5em;
		left: 1em;
		display: inline-block;
		padding: 0.35em 1em 0.15em;
		margin-top: 0.5em;
		color: #f66;
		background-color: #000c;
		border-radius: 0.5em;
		box-shadow: 0 0 15px #eeea;
		backdrop-filter: blur(10px);
		transition: 0.3s translate 1s ease;
	}

	.answer {
		position: absolute;
		right: 1em;
		bottom: -0.5em;
		display: inline-block;
		padding: 0.35em 1em 0.15em;

		margin-top: 0.5em;
		background-color: #000c;
		border-radius: 0.5em;
		box-shadow: 0 0 15px #eeea;
		backdrop-filter: blur(10px);
		transition: 0.3s translate 1s ease;

		&:is(.question:active *) {
			translate: 0 60%;
			transition-delay: 0s;
		}

		p {
			all: unset;
		}
	}

	.blur p {
		filter: blur(0.3em);
	}

	.popup-btn {
		position: absolute;
		top: 0.5em;
		right: 0.5em;
		font-size: 0.8em;
		color: #fff;
		cursor: pointer;
		background: none;
		border: none;
		opacity: 0;
		transition: 0.3s opacity ease;
	}
	.question:hover .popup-btn {
		opacity: 1;
	}

	.qr-code {
		position: fixed;
		top: 50%;
		left: 50%;
		z-index: 1000;
		box-sizing: border-box;
		width: min(50dvw, 50dvh);
		height: min(50dvw, 50dvh);
		padding: 2em;
		background-color: #fff;
		border-radius: 0.5em;
		box-shadow: 0 0 25px #fff;
		transform: translate(-50%, -50%);

		img {
			width: 100%;
			height: 100%;
			object-fit: contain;
			border-radius: 0.5em;
		}
	}
</style>

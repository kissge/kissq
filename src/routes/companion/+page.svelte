<script lang="ts">
	import { onMount } from 'svelte';
	import { getAPIClient, type APIClient } from '$lib/api';

	let client: APIClient | undefined;
	let sessionID: string | undefined;
	let userName = $state<string>();

	let currentSlide = $state<number>(0);

	let nameDialog: HTMLDialogElement;

	let questions = $state<
		{
			id: number;
			question: string;
			answer: string;
			shown: boolean;
			likedBy: string[];
		}[]
	>();

	let showSpinner = $state(false);

	let likes = $derived(Object.fromEntries(questions?.map((q) => [q.id, q.likedBy.length]) || []));

	function fetchQuestions() {
		if (client && sessionID) {
			return client.api.questions[':session_id']
				.$get({
					param: { session_id: sessionID },
					query: { shown: 'true' }
				})
				.then((res) => {
					res.json().then((data) => {
						const doScroll = questions?.at(-1)?.id === currentSlide;
						questions = data;
						if (doScroll) {
							setTimeout(() => {
								document
									.querySelector(`[data-question-id="${questions!.at(-1)?.id}"]`)
									?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
							}, 200);
						}
					});
				});
		}
	}

	onMount(() => {
		client = getAPIClient();
		userName = window.localStorage.getItem('userName') || undefined;
		sessionID = new URLSearchParams(location.search).get('session') || undefined;

		if (!userName) {
			nameDialog.showModal();
		}

		fetchQuestions();
		const timerID = setInterval(fetchQuestions, 3000);
		return () => clearInterval(timerID);
	});
</script>

<svelte:head>
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
</svelte:head>

<main>
	<div
		class="carousel"
		{...{
			onscrollsnapchange: (event: Event & { snapTargetInline?: HTMLElement }) => {
				const target = event?.snapTargetInline?.dataset?.questionId;
				if (target == null) {
					showSpinner = true;
					document
						.querySelector(`[data-question-id="${questions!.at(-1)?.id}"]`)
						?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
					fetchQuestions()?.then(() => {
						showSpinner = false;
					});
				} else {
					currentSlide = Number.parseInt(target);
				}
			}
		}}
	>
		{#each questions ?? [] as question (question.id)}
			<div class="slide" data-question-id={question.id}>
				<p class="question">
					{#each question.question.split(/(（.+?）|\(.+?\)|【.+?】|［.+?］)/) as part, i (i)}
						{#if i % 2}
							<small>{part}</small>
						{:else}
							{part}
						{/if}
					{/each}
				</p>
				<p class="answer">
					A. {#each question.answer.split(/(（.+?）|\(.+?\)|【.+?】|［.+?］)/) as part, i (i)}
						{#if i % 2}
							<small>{part}</small>
						{:else}
							{part}
						{/if}
					{/each}
				</p>
				<div class="spacer"></div>
				<div class="likes">
					いいね！
					<div>
						<button
							onclick={() => {
								client?.api.like.$put({
									json: {
										sessionID: sessionID!,
										questionID: question.id,
										userName: userName!
									}
								});
								likes = { ...likes, [question.id]: (likes[question.id] || 0) + 1 };
							}}
						>
							♡
						</button>
						{'♥ '.repeat(likes[question.id])}
					</div>
				</div>
			</div>
		{:else}
			<div class="slide" style="flex: 0 0 62.5%"></div>
		{/each}
		{#if (questions?.length ?? 0) > 0}
			<div class="slide" style:opacity={showSpinner ? 1 : 0}></div>
		{/if}
	</div>
</main>

<dialog bind:this={nameDialog}>
	<p>いいね機能に使うお名前を入力してください。</p>
	<div>
		<input bind:value={userName} />
		<button
			disabled={!userName}
			onclick={() => {
				window.localStorage.setItem('userName', userName!);
				nameDialog.close();
			}}
		>
			OK
		</button>
	</div>
</dialog>

<style>
	:global {
		html,
		body {
			height: 100svh;
			overflow-y: hidden;
		}
	}

	.carousel {
		display: flex;
		justify-self: center;
		gap: 10px;
		margin-top: 2em;
		width: 100%;
		overflow-x: auto;
		scroll-snap-type: x mandatory;
		scroll-marker-group: after;
		position: relative;
	}

	.carousel::-webkit-scrollbar {
		display: none;
		scrollbar-width: none;
	}

	@media (prefers-reduced-motion: no-preference) {
		.carousel {
			scroll-behavior: smooth;
		}
	}

	.carousel::scroll-button(left) {
		left: 2.5%;
		content: '☚' / 'Prev';
	}

	.carousel::scroll-button(right) {
		right: 2.5%;
		content: '☛' / 'Next';
	}

	.carousel::scroll-button(*) {
		position: absolute;
		top: 50svh;
		transition: 0.25s all ease-in-out;
		cursor: pointer;
		box-shadow: 0 0 10px #000;
		border-radius: 50%;
		background-color: #fff;
		width: 30px;
		height: 30px;
		font-size: 20px;
	}

	.carousel::scroll-button(*):hover {
		background-color: #e1e1e1;
	}

	.carousel::scroll-button(*):disabled {
		opacity: 0.2;
		color: #000;
	}

	.carousel::scroll-marker-group {
		display: flex;
		position: absolute;
		left: 50%;
		gap: 10px;
		transform: translateX(-50%);
		margin-top: 15px;
	}

	.slide {
		display: flex;
		flex: 1 0 70%;
		flex-direction: column;
		justify-content: space-between;
		gap: 1.2rem;
		border-radius: 10px;
		background-color: #333;
		padding: 1.2rem;
		height: calc(100svh - 110px);
		scroll-snap-align: center;
		color: #fff;
		font-size: 6.5svw;

		&:first-child {
			margin-left: 15%;
		}
		&:last-child {
			flex: 0 0 30%;
			background: url('https://cdnjs.cloudflare.com/ajax/libs/galleriffic/2.0.1/css/loader.gif')
				no-repeat center;
		}

		p {
			margin: 0;
		}
	}

	.question {
		text-align: justify;
	}

	.answer {
		font-weight: bold;
		text-align: right;
	}

	small {
		opacity: 0.6;
		font-weight: lighter;
	}

	.spacer {
		flex: 1;
	}

	.likes {
		color: #f66;

		div {
			display: inline-block;
			word-break: break-word;
		}

		button {
			display: inline;
			cursor: pointer;
			box-shadow: none;
			border: none;
			background: none;
			padding: 0;
			color: #f66;
			font-size: 1.05em;
		}
	}

	.slide::scroll-marker {
		transition: 0.1s all ease-in-out;
		border: 1px solid #424242;
		border-radius: 50%;
		width: 5px;
		height: 5px;
		content: '';
	}

	.slide:last-child::scroll-marker {
		display: none;
	}

	.slide::scroll-marker:hover {
		background-color: #e3e3e3;
	}

	.slide::scroll-marker:target-current {
		background-color: #424242;
	}

	input {
		font-size: 1em;
	}

	dialog div {
		display: flex;
		gap: 0.5rem;
	}
</style>

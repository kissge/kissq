<script lang="ts">
	import { onMount } from 'svelte';

	import { getAPIClient, type APIClient } from '$lib/api';
	import { parseComment, type CompanionParsedQuestion } from '$lib/question';
	import { THROUGH } from '$lib/types';
	import { splitQuestion } from '$lib/utils';

	let client: APIClient | undefined;
	let sessionID: string | undefined;
	let userName = $state<string>();

	let currentSlide = $state<number>(0);

	let nameDialog: HTMLDialogElement;

	let questions = $state<CompanionParsedQuestion[]>();

	let showSpinner = $state(false);

	let likes = $derived(Object.fromEntries(questions?.map((q) => [q.id, q.likedBy.length]) || []));

	async function fetchQuestions() {
		if (!client || !sessionID) {
			return;
		}

		const response = await client.api.questions[':session_id'].$get({
			param: { session_id: sessionID },
			query: { shown: 'true', orderBy: 'shownAt' }
		});
		if (!response.ok) {
			throw new Error(`Failed to fetch questions: ${response.status}`);
		}

		const data = await response.json();
		const doScroll = questions?.at(-1)?.id === currentSlide;
		questions = data.map(parseComment);
		if (doScroll) {
			setTimeout(() => {
				document
					.querySelector(`[data-question-id="${questions!.at(-1)?.id}"]`)
					?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
			}, 200);
		}
	}

	onMount(() => {
		client = getAPIClient();
		userName = window.localStorage.getItem('userName') || undefined;
		sessionID = new URLSearchParams(location.search).get('session') || undefined;

		if (!userName) {
			nameDialog.showModal();
		}

		void fetchQuestions().catch((error) => console.error('Failed to fetch questions', error));
		const timerID = setInterval(() => {
			void fetchQuestions().catch((error) => console.error('Failed to fetch questions', error));
		}, 3000);
		return () => clearInterval(timerID);
	});
</script>

<svelte:head>
	<title>kissQ Companion</title>
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
					fetchQuestions()
						.then(() => {
							showSpinner = false;
						})
						.catch((error) => {
							console.error('Failed to fetch questions', error);
							showSpinner = false;
						});
				} else {
					currentSlide = Number.parseInt(target);
				}
			}
		}}
	>
		<div class="slide" data-question-id="-1">
			<p>
				<ruby>kissQ<rt>きすきゅー</rt></ruby>にようこそ&thinsp;🤗
			</p>
			<p>
				この画面では、一問終了ごとに、問題文、解答、解説、正解者、スラッシュ位置
				<small>（ボタンを押したタイミング）</small>
				を確認できます！
			</p>
			<p>
				また、気に入った問題には「いいね！」を押すことができます。「いいね！」を押すとメインスクリーンに特別なエフェクトが表示されるほか、今日の大会の記録集にも反映されます。一問に何回でも押すことができます。ぜひいっぱい押して盛り上げてください！
			</p>
			<p class="right">
				<button onclick={() => nameDialog.showModal()}>名前を変える</button>
			</p>
		</div>

		{#each questions ?? [] as question (question.id)}
			<div class="slide" data-question-id={question.id}>
				<p class="question">
					{#each splitQuestion(question.question) as { c, dimmed }, i (i)}
						<span
							class="char"
							class:dimmed
							class:after-slash={typeof question.slashOffset === 'number' &&
								i > question.slashOffset}
							class:slash={typeof question.slashOffset === 'number' && i === question.slashOffset}
						>
							{c}
						</span>
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
				{#if question.correctAnswerer}
					<p class="answerer">
						{question.correctAnswerer === THROUGH ? 'スルー' : `⭕️ ${question.correctAnswerer}`}
					</p>
				{/if}
				<p>
					{question.comment}
				</p>
				{#if question.media}
					{#if question.media.type === 'img'}
						<img src={question.media.url} class="comment-img" alt="関連画像" />
					{:else if question.media.type === 'youtube'}
						<iframe
							src="https://youtube.com/embed/{question.media.videoID}"
							title="YouTube video player"
							style="width: 100%; aspect-ratio: 16/9; border: none;"
							allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
							allowfullscreen
						>
						</iframe>
					{/if}
				{/if}
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
						{#if likes[question.id] < 20}
							{'♥ '.repeat(likes[question.id])}
						{:else}
							♥ ×{likes[question.id]}
						{/if}
					</div>
				</div>
			</div>
		{:else}
			<div class="slide" style="flex: 0 0 70%">
				<div class="spinner"></div>
				最初のデータが送られてくるのをお待ちください……
			</div>
		{/each}
		{#if (questions?.length ?? 0) > 0}
			<div class="slide" style:opacity={showSpinner ? 1 : 0}>
				<div class="spinner"></div>
			</div>
		{/if}
	</div>
</main>

<dialog bind:this={nameDialog}>
	<p>いいね機能に使うお名前を入力してください。</p>
	<div>
		<input bind:value={userName} />
	</div>
	<div class="right">
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
			width: 100%;
			height: 100%;
			min-height: 0;
			overflow: hidden;
		}

		body {
			background-color: rgb(15 18 33);
			background-image: url('$lib/assets/wallpaper.jpg');
			background-position: center center;
			background-size: cover;
		}
	}

	main {
		position: fixed;
		inset: 0;
		box-sizing: border-box;
		width: 100%;
		height: 100dvh;
		min-height: 0;
		max-height: 100dvh;
		overflow: hidden;
		overscroll-behavior: none;
	}

	.carousel {
		position: relative;
		box-sizing: border-box;
		display: flex;
		gap: 2em;
		justify-self: center;
		width: 100%;
		height: 100dvh;
		min-height: 0;
		padding: 2em 0;
		overflow-x: auto;
		overflow-y: hidden;
		scroll-snap-type: x mandatory;
		scroll-snap-stop: always;
		scroll-marker-group: none;
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
		width: 30px;
		height: 30px;
		font-size: 20px;
		cursor: pointer;
		background-color: #fff;
		border-radius: 50%;
		box-shadow: 0 0 10px #000;
		transition: 0.25s all ease-in-out;
	}

	.carousel::scroll-button(*):hover {
		background-color: #e1e1e1;
	}

	.carousel::scroll-button(*):disabled {
		color: #000;
		opacity: 0.2;
	}

	.slide {
		box-sizing: border-box;
		display: flex;
		flex: 1 0 70%;
		flex-direction: column;
		gap: 1.2rem;
		justify-content: space-between;
		min-height: 0;
		padding: 1em;
		overflow-y: auto;
		font-size: min(4svw, 3svh);
		color: #fff;
		word-break: break-word;
		text-wrap: pretty;
		white-space: pre-wrap;
		scroll-snap-align: center;
		border-radius: 10px;
		box-shadow: 0 0 7px #fff;
		backdrop-filter: blur(5px);

		&:first-child {
			margin-left: 15%;
		}
		&:last-child {
			flex: 0 0 30%;
			box-shadow: none;
			backdrop-filter: none;

			.spinner {
				width: 50px;
				height: 50px;
				margin: auto;
				border: 5px solid #f3f3f3;
				border-top: 5px solid #555;
				border-radius: 50%;
				animation: spin 1s linear infinite;
			}
		}

		p {
			margin: 0;
		}

		button {
			color: white;
			background: transparent;
			border: 1px solid white;
		}

		&[data-question-id='-1'] {
			display: block;
			text-align: justify;
		}
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	.question {
		text-align: justify;
	}

	.char {
		&.dimmed {
			font-size: 0.9em;
			font-weight: lighter;
			opacity: 0.6;
		}
		&.after-slash {
			font-weight: lighter;
			opacity: 0.6;
		}
		&.slash::after {
			margin: 0 0.2em;
			color: yellow;
			content: '/';
		}
	}

	.answer {
		font-weight: bold;
		text-align: right;

		small {
			display: inline-block;
		}
	}

	small {
		font-weight: lighter;
		opacity: 0.6;
	}

	.answerer {
		font-weight: bold;
		text-align: right;
	}

	.comment-img {
		max-width: 100%;
		max-height: 50%;
		object-fit: contain;
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
			padding: 0;
			font-size: 1.05em;
			color: #f66;
			cursor: pointer;
			background: none;
			border: none;
			box-shadow: none;
		}
	}

	.slide::scroll-marker {
		width: 5px;
		height: 5px;
		content: '';
		border: 1px solid #ddd;
		border-radius: 50%;
		transition: 0.1s all ease-in-out;
	}

	.slide:last-child::scroll-marker {
		display: none;
	}

	.slide::scroll-marker:hover {
		background-color: #e3e3e3;
	}

	.slide::scroll-marker:target-current {
		background-color: #ddd;
	}

	input {
		box-sizing: border-box;
		width: 100%;
		font-size: 1em;
	}

	.right {
		text-align: right;
	}
</style>

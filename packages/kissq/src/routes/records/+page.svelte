<script lang="ts">
	import { onMount } from 'svelte';

	import { getAPIClient, type APIClient } from '$lib/api';
	import { parseComment, type RawQuestion } from '$lib/question';
	import { THROUGH } from '$lib/types';
	import { collapseArray, splitQuestion } from '$lib/utils';

	let client = $state<APIClient>();
	let companionSessionID = $state('');

	let rawQuestions = $state<RawQuestion[]>([]);
	let questions = $derived(rawQuestions.map(parseComment));

	let title = $state('記録集');
	let subtitle = $state(new Date().toLocaleDateString('ja-JP'));

	onMount(() => {
		client = getAPIClient();
		companionSessionID = new URLSearchParams(location.search).get('session') ?? '';
		fetchRemoteQuestions();
	});

	async function fetchRemoteQuestions() {
		if (client && companionSessionID) {
			const response = await client.api.questions[':session_id'].$get({
				param: { session_id: companionSessionID },
				query: { shown: 'all', orderBy: 'id' }
			});
			if (!response.ok) {
				throw new Error(`Failed to fetch questions: ${response.status}`);
			}

			rawQuestions = (await response.json()).filter(({ shown }) => shown);
		}
	}
</script>

<svelte:head>
	<title>{title} - {subtitle} - kissQ</title>
</svelte:head>

<header>
	<h1 contenteditable bind:textContent={title}></h1>
	<h2 contenteditable bind:textContent={subtitle}></h2>
	<p class="rule"></p>
</header>

<main>
	<table>
		<tbody>
			{#each questions as q, i (i)}
				<tr>
					<th rowspan={q.comment ? 2 : 1}>{i + 1}</th>
					<td class="question">
						<p>
							{#each splitQuestion(q.question) as { c, dimmed }, i (i)}
								<span
									class="char"
									class:dimmed
									class:slash={typeof q.slashOffset === 'number' && i === q.slashOffset}
								>
									{c}
								</span>
							{/each}
						</p>
					</td>
					<td class="answer">
						<p>{q.answer}</p>
						{#if q.correctAnswerer === THROUGH}
							<p class="through">スルー</p>
						{:else if q.correctAnswerer}
							<p class="correct">⭕️ {q.correctAnswerer}</p>
						{/if}
					</td>
				</tr>
				{#if q.comment}
					<tr>
						<td colspan="2" class="comment">
							<p>{q.comment}</p>

							{#if q.media}
								<p>
									{#if q.media.type === 'img'}
										（添付画像略）
									{:else if q.media.type === 'youtube'}
										<a href="https://youtu.be/{q.media.videoID}">
											youtu.be/{q.media.videoID}
										</a>
									{/if}
								</p>
							{/if}

							{#if q.likedBy && q.likedBy.length > 0}
								<p class="likes">
									❤️&nbsp;
									{#each Object.entries(collapseArray(q.likedBy)) as [user, count], i (user)}
										{#if i > 0}
											、
										{/if}
										{user}
										{#if count > 1}
											× {count}
										{/if}
									{/each}
								</p>
							{/if}
						</td>
					</tr>
				{/if}
			{/each}
		</tbody>
	</table>
</main>

<style>
	* {
		box-sizing: border-box;
	}

	header {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 60vh;
		padding: 3rem 2rem;
		font-family: serif;
		color: #172a3a;
		text-align: center;
	}

	h1,
	h2 {
		margin: 0;
		outline: none;
	}

	h1 {
		font-size: clamp(2.5rem, 8vw, 5rem);
		line-height: 1.2;
		letter-spacing: 0.08em;
	}

	h2 {
		margin-top: 1.2rem;
		font-size: clamp(1rem, 2vw, 1.4rem);
		font-weight: normal;
		color: #667481;
		letter-spacing: 0.12em;
	}

	.rule {
		width: 5rem;
		margin: 2rem 0 0;
		border-top: 2px solid #c18b4a;
	}

	table {
		width: 100%;
		line-height: 1.75;
		color: #263746;
		border-spacing: 0;
		border-collapse: separate;
	}

	tr {
		break-inside: avoid;
		page-break-inside: avoid;
	}

	th,
	td {
		padding: 0.8em 0.7em;
		vertical-align: top;
	}

	th {
		width: 3.5em;
		padding-top: 0.7em;
		font-family: serif;
		font-size: 1.15em;
		color: #9a6b32;
		text-align: right;
	}

	p {
		margin: 0;
	}

	.question p,
	.answer p {
		white-space: pre-wrap;
	}

	.answer {
		width: 11em;
		font-weight: bold;
		color: #315d72;
	}

	.through,
	.correct {
		margin-top: 0.6em;
		font-weight: lighter;
		color: black;
		text-align: right;
	}

	.comment {
		padding: 0;

		p {
			padding: 0.35em 1em;
			margin-left: 5em;
			font-size: 0.8em;
			color: #667481;
			white-space: pre-wrap;
			border-left: 3px solid #c18b4a;
		}

		a {
			font-family: monospace;
			letter-spacing: 0.05em;
			text-underline-offset: 0.3em;
		}

		.likes {
			color: red;
		}
	}

	.char {
		&.dimmed {
			font-size: 0.8em;
			font-style: normal;
			color: #888;
		}

		&.slash::after {
			margin: 0 0.2em;
			font-weight: bold;
			color: #b94a48;
			content: '/';
		}
	}

	:global {
		body {
			height: unset !important;
			text-wrap: pretty;
			print-color-adjust: exact;
			background: #fff;
		}
	}

	@media print {
		@page {
			size: A4 portrait;
			margin: 14mm 13mm 16mm;
		}

		header {
			width: 100%;
			height: 267mm;
			min-height: 0;
			padding: 0 12mm;
			border-bottom: 1px solid #dfe5e8;
		}

		h1 {
			font-size: 34pt;
		}

		h2 {
			font-size: 12pt;
		}

		main {
			page-break-before: always;
		}

		table {
			font-size: 10.5pt;
		}
	}
</style>

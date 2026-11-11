<script lang="ts">
	import { onMount } from 'svelte';

	import { getAPIClient, type APIClient } from '$lib/api';
	import { parseComment, type RawQuestion } from '$lib/question';
	import { THROUGH } from '$lib/types';
	import { splitQuestion } from '$lib/utils';

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

			rawQuestions = await response.json();
		}
	}
</script>

<svelte:head>
	<title>{title} - {subtitle} - kissQ</title>
</svelte:head>

<header>
	<h1 contenteditable bind:textContent={title}></h1>
	<h2 contenteditable bind:textContent={subtitle}></h2>
</header>

<main>
	<table>
		<tbody>
			{#each questions as q, i (i)}
				<tr>
					<th rowspan={q.comment ? 2 : 1}>{q.id}</th>
					<td class="question">
						{#each splitQuestion(q.question) as { c, next, dimmed }, i (i)}
							<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
							<span
								class="char"
								class:dimmed
								class:slash={typeof q.slashOffset === 'number' && i === q.slashOffset}
							>
								{c}
							</span>
						{/each}
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
		justify-content: center;
		align-items: center;
		font-size: 2em;
		font-family: serif;
	}

	tr {
		break-inside: avoid;
		page-break-inside: avoid;

		&:has(.question):not(:first-child) :is(th, td) {
			border-top: 1px dashed #ddd;
		}
	}

	th,
	td {
		padding: 0.5em;
		vertical-align: top;
	}

	th {
		text-align: right;
	}

	p {
		margin: 0;
	}

	.answer {
		width: 10em;
		color: navy;
		font-weight: bold;
	}

	.through,
	.correct {
		margin-top: 0.6em;
		text-align: right;
		color: black;
		font-weight: lighter;
	}

	.comment p {
		margin-left: 5em;
		padding-left: 1em;
		border-left: 5px solid #ddd;
		font-size: 0.8em;
	}

	.char {
		&.dimmed {
			color: #888;
			font-style: normal;
			font-size: 0.8em;
		}

		&.slash::after {
			content: '/';
			color: red;
			font-weight: bold;
			margin: 0 0.2em;
		}
	}

	:global {
		body {
			height: unset !important;
			text-wrap: pretty;
		}

		@media print {
			@page {
				size: A4 portrait;
				margin: 10mm;
			}

			body {
				font-size: 11pt;
			}

			header {
				width: 100%;
				height: 277mm;
			}
		}
	}
</style>

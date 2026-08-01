<script lang="ts">
	import { onMount } from 'svelte';
	import { getAPIClient, type APIClient } from '$lib/api';

	let client: APIClient | undefined;
	let sessionID =
		typeof location !== 'undefined' ? new URL(location.href).searchParams.get('session') : null;

	let questions = $state<
		{
			id: number;
			question: string;
			answer: string;
			shown: boolean;
			likedBy: string[];
		}[]
	>();

	let likes = $derived(Object.fromEntries(questions?.map((q) => [q.id, q.likedBy.length]) || []));

	function fetchQuestions() {
		if (client && sessionID) {
			client.api.questions[':session_id']
				.$get({
					param: { session_id: sessionID },
					query: { shown: 'true' }
				})
				.then((res) => {
					res.json().then((data) => {
						questions = data;
					});
				});
		}
	}

	onMount(() => {
		client = getAPIClient();

		fetchQuestions();
		const timerID = setInterval(fetchQuestions, 10000);
		return () => clearInterval(timerID);
	});
</script>

<main>
	<table>
		<thead>
			<tr>
				<th>Q.</th>
				<th>A.</th>
				<th></th>
			</tr>
		</thead>
		<tbody>
			{#each questions as question (question.id)}
				<tr>
					<td>{question.question}</td>
					<td>{question.answer}</td>
					<td>
						{'❤'.repeat(likes[question.id])}
						<button
							onclick={() => {
								client?.api.like.$put({
									json: {
										sessionID: sessionID!,
										questionID: question.id,
										userName: 'current_user_id'
									}
								});
								likes = { ...likes, [question.id]: (likes[question.id] || 0) + 1 };
							}}
						>
							❤
						</button>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
	<button onclick={fetchQuestions}>Refresh</button>
</main>

<style>
	main {
		padding: 1rem;
	}

	table {
		border-collapse: collapse;
		width: 100%;
	}
	th,
	td {
		border: 1px solid #ccc;
		padding: 8px;
	}
</style>

<script lang="ts">
	import { json2csv } from 'json-2-csv';
	import { onMount } from 'svelte';

	import { getAPIClient, type APIClient } from '$lib/api';
	import { parseComment, type RawQuestion } from '$lib/question';
	import { AttendantID, BrandedArray, THROUGH } from '$lib/types';
	import { collapseArray, countAndSort, getRankingOf, splitQuestion } from '$lib/utils';

	import type { Attendant } from '$lib/attendant';

	let client: APIClient | undefined;
	let companionSessionID: string | null = null;

	let attendants = $state(BrandedArray<Attendant, AttendantID>([]));
	let starName = $state<string>();

	let title = $state('記録集');
	let subtitle = $state(new Date().toLocaleDateString('ja-JP'));
	let showUnused = $state(false);
	let showTotalRanking = $state(true);
	let showStarRanking = $state(true);
	let showLikesRanking = $state(true);

	let rawQuestions = $state<RawQuestion[]>([]);
	let questions = $derived(
		[
			...rawQuestions.filter(({ shown }) => shown),
			...(showUnused ? rawQuestions.filter(({ shown }) => !shown) : [])
		].map(parseComment)
	);
	let usedQuestionCount = $derived(rawQuestions.filter(({ shown }) => shown).length);

	let totalRanks = $derived(
		getRankingOf(attendants, (att) => [att.totalScore.maru, att.totalScore.batsu])
	);
	let totalRanking = $derived(
		attendants
			.map(({ name, totalScore: { maru, batsu } }, ai) => ({
				name: name || `プレイヤー${ai + 1}`,
				maru,
				batsu,
				rank: totalRanks[ai]
			}))
			.sort((a, b) => a.rank - b.rank)
	);
	let starRanks = $derived(getRankingOf(attendants, (att) => [att.starCount]));
	let starRanking = $derived(
		attendants
			.map(({ name, starCount }, ai) => ({
				name: name || `プレイヤー${ai + 1}`,
				starCount,
				rank: starRanks[ai]
			}))
			.sort((a, b) => a.rank - b.rank)
			.filter(({ starCount }) => starCount > 0)
	);

	let likesRanking = $derived(countAndSort(questions.map((q) => q.likedBy ?? []).flat()));

	onMount(() => {
		client = getAPIClient();

		const search = new URLSearchParams(location.search);
		companionSessionID = search.get('session');
		attendants = JSON.parse(search.get('attendants')!);
		starName = search.get('starName') || undefined;

		if (!starName) {
			showStarRanking = false;
		}

		fetchRemoteQuestions();
	});

	async function fetchRemoteQuestions() {
		if (client && companionSessionID) {
			const response = await client.api.questions[':session_id'].$get({
				param: { session_id: companionSessionID },
				query: { shown: 'all', orderBy: 'shownAt' }
			});
			if (!response.ok) {
				throw new Error(`Failed to fetch questions: ${response.status}`);
			}

			rawQuestions = (await response.json()).filter(
				({ comment }) => !comment.includes('[no-records]')
			);
		}
	}

	function saveCSVFile() {
		const content = questions.map((q, i) => [
			i + 1,
			q.question,
			q.answer,
			q.correctAnswerer === THROUGH ? 'スルー' : (q.correctAnswerer ?? ''),
			q.comment ?? ''
		]);
		// start with BOM (for Excel)
		const csvText = '\uFEFF' + json2csv(content, { prependHeader: false });

		const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.setAttribute('href', url);
		link.setAttribute('download', `${title} - ${subtitle}.csv`);
		link.style.visibility = 'hidden';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
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
				{#if i === usedQuestionCount}
					<tr class="unused-separator">
						<td colspan="3">未使用問題</td>
					</tr>
				{/if}

				<tr>
					<th rowspan={q.comment ? 2 : 1}>{i + 1}</th>
					<td class="question">
						<p>
							{#each splitQuestion(q.question, q.slashOffset) as { c, kind, slash }, i (i)}
								<span class="char kind-{kind}" class:slash={slash === 'on'}>
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
							<p>
								{#each q.comment.split(/(https?:\/\/[^\s)）]+)/) as part, i}
									{#if i % 2 === 1}
										<a href={part} target="_blank" rel="noopener noreferrer">
											{part}
										</a>
									{:else}
										{part}
									{/if}
								{/each}
							</p>

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

				{#if i === usedQuestionCount - 1}
					{#if showTotalRanking}
						<tr class="tr-ranking">
							<td colspan="3">
								<div>
									<h2>通算成績</h2>
									<div class="ranking-table">
										{#each totalRanking as { name, maru, batsu, rank }, i (i)}
											<div class="rank">
												{#if totalRanking.at(i - 1)?.rank !== rank}
													{rank}位
												{/if}
											</div>
											<div>{name}</div>
											<div>{maru}〇{batsu}×</div>
										{/each}
									</div>
								</div>
							</td>
						</tr>
					{/if}

					{#if showStarRanking}
						<tr class="tr-ranking">
							<td colspan="3">
								<div>
									<h2>通算{starName}数</h2>
									<div class="ranking-table">
										{#each starRanking as { name, starCount, rank }, i (i)}
											<div class="rank">
												{#if i === 0 || starRanking.at(i - 1)?.rank !== rank}
													{rank}位
												{/if}
											</div>
											<div>{name}</div>
											<div>⭐️ ✕ {starCount}</div>
										{/each}
									</div>
								</div>
							</td>
						</tr>
					{/if}

					{#if showLikesRanking}
						<tr class="tr-ranking">
							<td colspan="3">
								<div>
									<h2>いっぱいいいねしてくれた人</h2>
									<div class="ranking-table">
										{#each likesRanking.filter(({ rank }) => rank <= 3) as { value: name, count, rank }, i (i)}
											<div class="rank">
												{#if totalRanking.at(i - 1)?.rank !== rank}
													{rank}位
												{/if}
											</div>
											<div>{name}</div>
											<div>♥️ ✕ {count}</div>
										{/each}
									</div>
								</div>
							</td>
						</tr>
					{/if}
				{/if}
			{/each}
		</tbody>
	</table>
</main>

<nav>
	<label>
		<input type="checkbox" bind:checked={showUnused} />
		未使用問題
	</label>
	<label>
		<input type="checkbox" bind:checked={showTotalRanking} />
		通算成績
	</label>
	{#if starName}
		<label>
			<input type="checkbox" bind:checked={showStarRanking} />
			通算{starName}数
		</label>
	{/if}
	<label>
		<input type="checkbox" bind:checked={showLikesRanking} />
		いいねランキング
	</label>
	<div class="spacer"></div>
	<button onclick={() => window.print()}>印刷・PDF</button>
	<button onclick={saveCSVFile}>CSV出力</button>
</nav>

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

		h2 {
			margin: 0;
			margin-top: -0.1em;
			font-weight: bold;
			letter-spacing: 0;
		}
	}

	tr {
		break-inside: avoid;
		page-break-inside: avoid;
	}

	tr.unused-separator {
		page-break-before: always;
		font-family: serif;
		font-size: 1.5em;
		font-weight: bold;
	}

	tr.tr-ranking {
		td > div {
			display: flex;
			gap: 1rem;
			align-items: space-between;
			justify-content: center;
			margin-top: 2em;

			& > :first-child {
				flex: 0 0 10.5em;
				padding-right: 2.5em;
				text-align: right;
				border-right: 1px solid #c18b4a;
			}
		}
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

	.ranking-table {
		display: grid;
		grid-template-columns: 3em 12em 5em;
		gap: 0 1em;

		.rank {
			text-align: right;
		}
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
		&.kind-dimmed {
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

	nav {
		position: fixed;
		bottom: 1em;
		left: 50%;
		display: flex;
		gap: 0.5em;
		width: calc(100% - 2em);
		max-width: 1000px;
		padding: 1em;
		line-height: 1.2;
		background: #2222;
		box-shadow: 0 0 1em rgba(0, 0, 0, 0.4);
		backdrop-filter: blur(0.5em);
		transform: translateX(-50%);

		label {
			display: flex;
			gap: 0.2em;
			align-items: baseline;
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

	@media screen {
		main {
			margin-bottom: 6em;
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

		nav {
			display: none;
		}
	}
</style>

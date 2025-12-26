<script lang="ts">
	import { onMount } from 'svelte';
	import type { GameState } from '$lib/state';

	const opener = (typeof window !== 'undefined' ? window.opener : {}) as Window;

	const qZero = { question: 'ここに問題が表示されます', answer: 'ここに答えが表示されます' };
	let questions = $state([qZero]);
	let rawInput = $state('');
	let currentIndex = $state(0);

	let currentState = $state<GameState>();

	let inputDialog: HTMLDialogElement;

	function processWindowMessage(event: MessageEvent) {
		switch (event.data.command) {
			case 'syncState':
				currentState = event.data.currentState;
				break;
		}
	}

	$effect(() => {
		opener.postMessage({
			command: 'updateQuestion',
			...questions[currentIndex]
		});
		document.querySelector('table:not(:hover) tr.current')?.scrollIntoView({ block: 'center' });
	});

	onMount(() => {
		const stored = window.localStorage.getItem('questions');
		if (stored) {
			questions = JSON.parse(stored);
		}

		window.addEventListener('message', processWindowMessage);

		return () => window.removeEventListener('message', processWindowMessage);
	});

	function loadFromTSV() {
		const lines = rawInput
			.trim()
			.split('\n')
			.filter((line) => line.trim() !== '');
		questions = [
			qZero,
			...lines.map((line) => {
				let [q, a] = line.split('\t');
				// q = q?.replace(/^"|"$/g, '');
				// a = a?.replace(/^"|"$/g, '');

				return { question: q, answer: a };
			})
		];

		window.localStorage.setItem('questions', JSON.stringify(questions));
		inputDialog.close();
	}
</script>

<svelte:head>
	<title>操作盤 - kissQ</title>
</svelte:head>

<header>
	<div>
		<button onclick={() => opener.postMessage({ command: 'clickThrough' })}>スルー</button>
		<button disabled={currentIndex === 0} onclick={() => --currentIndex}>← 前の問題へ</button>
		<button disabled={currentIndex === questions.length - 1} onclick={() => ++currentIndex}>
			次の問題へ →
		</button>
		<div class="spacer"></div>
		<button onclick={() => window.opener.postMessage({ command: 'toggleQuestionWindow' })}>
			問題ウィンドウを表示・非表示
		</button>
	</div>
	{#if currentState}
		<div>
			{#each currentState.attendants as att, i (i)}
				{#if att.life !== 'removed'}
					<div class="attendant">
						{att.name}&nbsp;
						{#if att.life === 'won'}
							勝ち
						{:else if att.life === 'lost'}
							失格
						{:else if att.yasuDisplay > 0}
							{#if att.yasuCount === 'next'}次{/if}{att.yasuDisplay}休
						{:else}
							<button onclick={() => opener.postMessage({ command: 'clickMaru', attendantID: i })}>
								O
							</button>
							<button onclick={() => opener.postMessage({ command: 'clickBatsu', attendantID: i })}>
								X
							</button>
						{/if}
					</div>
				{/if}
			{/each}
		</div>
	{/if}
</header>

<main>
	<table>
		<tbody>
			{#each questions as { question, answer }, index (question)}
				<tr class:current={index === currentIndex}>
					<td>
						<button onclick={() => (currentIndex = index)}>
							{index}.
						</button>
					</td>
					<td class:error={!question?.trim()}>
						{question}
					</td>
					<td class:error={!answer?.trim()}>
						{answer}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</main>

<footer>
	<button
		onclick={() => {
			rawInput = '';
			inputDialog.showModal();
		}}>問題を読み込み</button
	>
</footer>

<dialog closedby="any" bind:this={inputDialog}>
	<textarea
		bind:value={rawInput}
		onpaste={() => setTimeout(loadFromTSV, 0)}
		placeholder="ここにTSVデータを貼り付けてください"
	></textarea>
	<button onclick={loadFromTSV}>読み込み</button>
</dialog>

<style>
	header,
	main,
	footer {
		padding: 1em;
	}

	:global(body) {
		height: 100vh;
	}

	header > div {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5em;
		margin-bottom: 1em;

		.spacer {
			flex-grow: 1;
		}

		.attendant {
			border: 1px solid #ccc;
			padding: 0.5em;
			line-height: 2.1;
		}
	}

	main {
		flex-grow: 1;
		overflow: auto;

		table {
			border-collapse: collapse;
			width: 100%;
		}

		tr:nth-child(odd) {
			background-color: #f0f0f0;
		}

		tr.current {
			background-color: #ffff99;
			font-weight: bold;
		}

		td {
			vertical-align: top;
			border: 1px solid #ccc;
			padding: 0.5em;

			&:first-child {
				text-align: right;
			}

			&.error {
				animation: errorFlash 0.5s ease-in-out infinite;
			}
		}
	}

	textarea {
		width: 90%;
	}

	@keyframes errorFlash {
		0%,
		100% {
			background-color: transparent;
		}
		50% {
			background-color: #ffcccc;
		}
	}
</style>

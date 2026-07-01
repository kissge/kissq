<script lang="ts">
	import { csv2json } from 'json-2-csv';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import type { GameState } from '$lib/state';

	const opener = (typeof window !== 'undefined' ? window.opener : {}) as Window;

	const qZero = { question: 'ここに問題が表示されます', answer: 'ここに答えが表示されます' };
	let questions = $state([qZero]);
	let rawInput = $state('');
	let currentIndex = $state(0);

	let fontSize = $state(6);
	let isKeyboardEnabled = $state(true);

	let currentState = $state<GameState>();

	let inputDialog: HTMLDialogElement;

	const Keys = [
		['Q', 'A'],
		['W', 'S'],
		['E', 'D'],
		['R', 'F'],
		['T', 'G'],
		['Y', 'H'],
		['U', 'J'],
		['I', 'K'],
		['O', 'L'],
		['P', ';']
	];

	function processWindowMessage(event: MessageEvent) {
		switch (event.data.command) {
			case 'syncState':
				currentState = event.data.currentState;
				break;
		}
	}

	function processKeyboardInput(event: KeyboardEvent) {
		if (isKeyboardEnabled) {
			(
				document.querySelector(
					`button.labeled[data-label="${event.key.toUpperCase()}"]`
				) as HTMLElement | null
			)?.click();
		}
	}

	$effect(() => {
		opener.postMessage({
			command: 'updateQuestion',
			...questions[currentIndex]
		});
		document.querySelector('table:not(:hover) tr.current')?.scrollIntoView({ block: 'center' });
	});

	$effect(() => {
		(document.querySelector(':root') as HTMLElement).style.setProperty(
			'--root-font-size',
			`${fontSize / 5}vw`
		);
	});

	onMount(() => {
		const stored = window.localStorage.getItem('questions');
		if (stored) {
			questions = JSON.parse(stored);
		}

		window.addEventListener('message', processWindowMessage);
		window.addEventListener('keydown', processKeyboardInput);

		const timer = setInterval(() => opener.postMessage({ command: 'ping' }), 1000);

		return () => {
			window.removeEventListener('message', processWindowMessage);
			window.removeEventListener('keydown', processKeyboardInput);
			clearInterval(timer);
		};
	});

	function loadFromCSV() {
		const tabCount = rawInput.match(/\t/g)?.length ?? 0;
		const commaCount = rawInput.match(/,/g)?.length ?? 0;
		const delimiter = tabCount > commaCount ? '\t' : ',';

		const lines = rawInput
			.trim()
			.split('\n')
			.filter((line) => line.trim() !== '')
			.join('\n');

		questions = [
			qZero,
			...(csv2json(lines, {
				delimiter: { field: delimiter },
				headerFields: ['question', 'answer']
			}) as { question: string; answer: string }[])
		];

		window.localStorage.setItem('questions', JSON.stringify(questions));
		inputDialog.close();
	}
</script>

<svelte:head>
	<title>操作盤 - kissQ</title>
</svelte:head>

<header class:show-keyboard={isKeyboardEnabled}>
	<div>
		<button
			class="labeled"
			data-label="Z"
			onclick={() => opener.postMessage({ command: 'clickUndo' })}
		>
			元に戻す
		</button>
		<button
			class="labeled"
			class:blink={currentState?.attendants.some(
				({ yasuCount, rule: { yasuMode, yasuPerBatsu } }) =>
					yasuCount === 'next' && (yasuMode !== 'constant' || yasuPerBatsu > 0)
			)}
			data-label="X"
			onclick={() => opener.postMessage({ command: 'clickThrough' })}
		>
			スルー
		</button>
		<button
			onclick={() => {
				if (confirm('リセットしてよろしいですか？')) {
					opener.postMessage({ command: 'clickReset' });
				}
			}}
		>
			全員リセット
		</button>
		<button
			onclick={() => {
				let name = prompt('プレイヤーの名前を入力してください');
				if (name) {
					opener.postMessage({ command: 'addAttendant', name });
				}
			}}
		>
			プレイヤー追加
		</button>
		<button
			class="labeled"
			data-label="N"
			disabled={currentIndex === 0}
			onclick={() => --currentIndex}
		>
			← 前の問題へ
		</button>
		<button
			class="labeled"
			data-label="M"
			disabled={currentIndex === questions.length - 1}
			onclick={() => ++currentIndex}
		>
			次の問題へ →
		</button>
		<div class="spacer"></div>
		<label>
			<input type="checkbox" bind:checked={isKeyboardEnabled} />
			キーボード操作
		</label>
		<label>
			フォントサイズ
			<input type="number" bind:value={fontSize} />
		</label>
		<button onclick={() => window.opener.postMessage({ command: 'toggleQuestionWindow' })}>
			問題ウィンドウを表示・非表示
		</button>
	</div>
	{#if currentState}
		<div>
			{#each currentState.attendants as att, i (i)}
				{#if att.life !== 'removed'}
					<div class="attendant">
						{att.name || '--'}
						{#if att.isLizhi}
							<span class="lizhi" transition:fade>リーチ</span>
						{:else if att.isLoseLizhi}
							<span class="lizhi" transition:fade>失格リーチ</span>
						{/if}
						&nbsp;
						{#if att.life === 'won'}
							<span class="won" transition:fade>勝ち</span>
						{:else if att.life === 'lost'}
							<span class="lost" transition:fade>失格</span>
						{:else if att.yasuDisplay > 0}
							{#if att.yasuCount === 'next'}次{/if}{att.yasuDisplay}休
						{:else}
							<button
								class="labeled"
								data-label={Keys[i]?.[0] || ''}
								onclick={() => opener.postMessage({ command: 'clickMaru', attendantID: i })}
							>
								O
							</button>
							<button
								class="labeled"
								data-label={Keys[i]?.[1] || ''}
								onclick={() => opener.postMessage({ command: 'clickBatsu', attendantID: i })}
							>
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
						{#each question.split(/(（.+?）|\(.+?\)|【.+?】|［.+?］)/) as part, i (i)}
							{#if i % 2}
								<em>{part}</em>
							{:else}
								{part}
							{/if}
						{/each}
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
	<p style="font-size: 0.5em;">
		ヒント：スプレッドシート上で質問と回答の列を選択してコピーするとTSV形式になります。
	</p>
	<textarea
		bind:value={rawInput}
		onpaste={() => setTimeout(loadFromCSV, 0)}
		placeholder="ここにCSV/TSVデータを貼り付けてください"
	></textarea>
	<button onclick={loadFromCSV}>読み込み</button>
</dialog>

<style>
	header,
	main,
	footer {
		padding: 1em;
	}
	:global(html) {
		font-size: var(--root-font-size);
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

		button.blink {
			animation: blink-animation 0.5s ease infinite;
			background-color: red;
			color: white;
		}

		.spacer {
			flex-grow: 1;
		}

		label {
			display: flex;
			gap: 0.25em;
		}

		input[type='number'] {
			width: 3em;
			font-size: 1rem;
		}

		.attendant {
			border: 1px solid #ccc;
			padding: 0.5em;
			line-height: 2.1;
		}

		.lizhi,
		.won,
		.lost {
			border-radius: 1em;
			padding: 0 0.5em;
		}

		.lizhi {
			background: #dddd0e;
		}
		.won {
			background: #7cfc00;
		}
		.lost {
			background: #ff4500;
			color: white;
		}
	}

	@keyframes blink-animation {
		to {
			opacity: 0.3;
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

			em {
				color: #888;
				font-style: normal;
			}
		}
	}

	textarea {
		width: 90%;
	}

	button.labeled:is(.show-keyboard *) {
		position: relative;

		&:after {
			display: block;
			position: absolute;
			top: -0.5em;
			right: -0.5em;
			border-radius: 0.25em;
			background: rgb(89 89 228);
			width: 1em;
			content: attr(data-label);
			color: white;
		}
	}

	dialog {
		user-select: none;
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

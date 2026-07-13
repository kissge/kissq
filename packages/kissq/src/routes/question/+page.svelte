<script lang="ts">
	import { csv2json } from 'json-2-csv';
	import { onMount } from 'svelte';
	import { flip } from 'svelte/animate';
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
	let mainScreenOrder = $state<number[]>();
	let order = $state<'added' | 'same' | 'reverse'>('added');

	let orderedAttendants = $derived.by(() => {
		switch (order) {
			case 'added':
				return currentState?.attendants.map((att, i) => ({ att, i }));
			case 'same':
				return mainScreenOrder?.map((i) => ({ att: currentState!.attendants[i], i }));
			case 'reverse':
				return mainScreenOrder?.map((i) => ({ att: currentState!.attendants[i], i })).reverse();
			default:
				order satisfies never;
		}
	});

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
				mainScreenOrder = event.data.orderedAttendants;
				break;
		}
	}

	function processKeyboardInput(event: KeyboardEvent) {
		if (isKeyboardEnabled) {
			const button = document.querySelector(
				`button.labeled[data-label="${event.key.toUpperCase()}"]`
			) as HTMLElement | null;
			if (button) {
				button.click();
				button.classList.add('active');
				setTimeout(() => button.classList.remove('active'), 500);
			}
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

<header class="console" class:show-keyboard={isKeyboardEnabled}>
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
		<div>
			プレイヤーの表示順
			<select bind:value={order}>
				<option value="added">追加順</option>
				<option value="same">画面と同じ</option>
				<option value="reverse">画面の逆順</option>
			</select>
		</div>
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
	{#if currentState && orderedAttendants}
		<div>
			{#each orderedAttendants as { att, i }, j (i)}
				<div class="attendant" animate:flip={{ duration: 500 }}>
					{#if att.life !== 'removed'}
						{att.name || '--'}
						{#if att.isLizhi}
							{#if att.isLoseLizhi}
								<span class="lizhi" transition:fade>ダブルリーチ</span>
							{:else}
								<span class="lizhi" transition:fade>リーチ</span>
							{/if}
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
								data-label={Keys[j]?.[0] || ''}
								onclick={() => opener.postMessage({ command: 'clickMaru', attendantID: i })}
							>
								O
							</button>
							<button
								class="labeled"
								data-label={Keys[j]?.[1] || ''}
								onclick={() => opener.postMessage({ command: 'clickBatsu', attendantID: i })}
							>
								X
							</button>
						{/if}
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</header>

<main class="console">
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

<footer class="console">
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
	dialog {
		user-select: none;

		textarea {
			width: 90%;
		}
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

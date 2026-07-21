<script lang="ts">
	import { onMount } from 'svelte';
	import { flip } from 'svelte/animate';
	import { fade, fly } from 'svelte/transition';
	import type { HistoryEntry } from '$lib/historyEntry';
	import { parseCSV, qZero } from '$lib/question';
	import type { WasedashikiMode } from '$lib/serial';
	import type { GameState } from '$lib/state';

	const opener = (typeof window !== 'undefined' ? window.opener : {}) as Window;

	let questions = $state([qZero]);
	let rawInput = $state('');
	let currentIndex = $state(0);

	let fontSize = $state(6);
	let isKeyboardEnabled = $state(true);

	let currentState = $state<GameState>();
	let history = $state<HistoryEntry[]>([]);
	let mainScreenOrder = $state<number[]>();
	let answerers = $state<({ rank: 1 | 2 | 'late'; delay: number } | null)[]>([]);
	/** attendant ID -> button ID */
	let buttonMapping = $state<Record<number, number>>({});
	let wasedashikiMode = $state<WasedashikiMode>();
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

	let historyDisplay = $derived(
		history
			.map((entry, key) => ({ ...entry, key }))
			.slice(-5)
			.map((entry) => {
				const text: string = (() => {
					const name =
						'attendantID' in entry
							? currentState?.attendants[entry.attendantID]?.name ||
								`プレイヤー${entry.attendantID + 1}`
							: null;
					switch (entry.type) {
						case 'maru':
							return `○ ${name}`;
						case 'batsu':
							return `× ${name}`;
						case 'through':
							return `スルー`;
						case 'remove':
							return `削除 ${name}`;
						case 'win':
							return `勝利 ${name}`;
						case 'lose':
							return `失格 ${name}`;
						case 'edit':
							return `手編集 ${name}`;
					}
				})();

				return { ...entry, text };
			})
	);

	let inputDialog: HTMLDialogElement;

	let battleMode = $state<'single' | 'team'>('single');

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
				battleMode = event.data.mode;
				currentState = event.data.currentState;
				history = event.data.history;
				mainScreenOrder = event.data.orderedAttendants;
				answerers = event.data.answerers;
				buttonMapping = event.data.buttonMapping;
				wasedashikiMode = event.data.wasedashikiMode;

				if (battleMode === 'team') {
					order = 'added';
				}

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
		questions = parseCSV(rawInput);
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
			<select bind:value={order} disabled={battleMode === 'team'}>
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
				<div
					class={[
						'attendant',
						{
							'answerer-1st': answerers[(buttonMapping[i] ?? 0) - 1]?.rank === 1,
							'answerer-2nd':
								(wasedashikiMode === 'endless' || wasedashikiMode === 'double') &&
								answerers[(buttonMapping[i] ?? 0) - 1]?.rank === 2,
							'answerer-late':
								wasedashikiMode === 'endless' &&
								answerers[(buttonMapping[i] ?? 0) - 1]?.rank === 'late'
						}
					]}
					animate:flip={{ duration: 500 }}
				>
					{#if att.life !== 'removed'}
						{att.name || '--'}
						{#if att.isLizhi}
							{#if att.isLoseLizhi}
								<span class="lizhi" transition:fade>ダブルリーチ</span>
							{:else}
								<span class="lizhi" transition:fade>リーチ</span>
							{/if}
						{:else if att.isLoseLizhi}
							<span class="lizhi" transition:fade>
								{#if battleMode === 'team'}封鎖リーチ{:else}失格リーチ{/if}
							</span>
						{/if}
						&nbsp;
						{#if att.life === 'won'}
							<span class="won" transition:fade>勝ち</span>
						{:else if att.life === 'lost'}
							<span class="lost" transition:fade>
								{#if battleMode === 'team'}封鎖{:else}失格{/if}
							</span>
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

	Next: Q{currentState?.questionCount}
	{#each historyDisplay as entry (entry.key)}
		<div
			class={['history-entry', entry.type]}
			in:fly={{ x: 100, duration: 1000 }}
			out:fly={{ x: -100, duration: 1000 }}
			animate:flip
		>
			{entry.text}
		</div>
	{/each}
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

	header {
		input,
		select {
			font-size: 1em;
		}

		input[type='checkbox'] {
			width: 1em;
			height: 1em;
		}
	}

	.answerer-1st {
		animation: answerer-1st-wrapper 0.3s ease infinite alternate;
		border: 3px solid orange !important;
		background-color: yellow;
	}

	.answerer-2nd {
		border: 3px solid orange !important;
		background-color: yellow;
	}

	.answerer-late {
		background-color: rgb(255 255 192);
	}

	.history-entry {
		display: inline-block;
		border-top-right-radius: 1em;
		border-bottom-right-radius: 1em;
		background: #222;
		padding: 0.2em 2em 0.2em 1em;
		color: white;
		font-weight: bold;
		text-shadow: 0 0 5px #000;
		white-space: nowrap;

		&.maru,
		&.win {
			background: #f00;
		}
		&.batsu,
		&.lose {
			background: #00f;
		}
		&.through {
			background: #0f0;
		}
	}

	@keyframes answerer-1st-wrapper {
		to {
			scale: 1.25;
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

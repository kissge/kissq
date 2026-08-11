<script lang="ts">
	import { onMount } from 'svelte';
	import { flip } from 'svelte/animate';
	import { fade, fly } from 'svelte/transition';
	import { getAPIClient, type APIClient } from '$lib/api';
	import type { Attendant } from '$lib/attendant';
	import RuleEditDialog from '$lib/components/ruleEditDialog.svelte';
	import RuleTeamEditDialog from '$lib/components/ruleTeamEditDialog.svelte';
	import type { HistoryEntry } from '$lib/historyEntry';
	import { parseCSV, qZero } from '$lib/question';
	import type { IncomingMessage, OutgoingMessage } from '$lib/questionConsole.svelte';
	import { Rule } from '$lib/rule';
	import type { WasedashikiMode } from '$lib/serial';
	import type { GameState } from '$lib/state';
	import { tooltip } from '$lib/tooltip.svelte';

	const opener = (typeof window !== 'undefined' ? window.opener : {}) as Window;

	let questions = $state([qZero]);
	let rawInput = $state('');
	let currentIndex = $state(0);

	let fontSize = $state(6);
	let isKeyboardEnabled = $state(true);

	let attendants = $state<Attendant[]>([]);
	let currentState = $state<GameState>();
	let history = $state<HistoryEntry[]>([]);
	let rules = $state<Rule[]>([]);
	let mainScreenOrder = $state<number[]>();
	let mainScreenOrderingMode = $state<'ranking' | 'manual'>();
	let answerers = $state<({ rank: 1 | 2 | 'late'; delay: number } | null)[]>([]);
	/** attendant ID -> button ID */
	let buttonMapping = $state<Record<number, number>>({});
	let wasedashikiMode = $state<WasedashikiMode>();
	let order = $state<'added' | 'same' | 'reverse'>('added');

	let enableCompanion = $state(false);
	let companionSessionID = $state('');
	let client = $state<APIClient>();
	let remoteQuestions = $state<
		{ id: number; question: string; answer: string; shown: 0 | 1; likedBy: string[] }[]
	>([]);

	let orderedAttendants = $derived.by(() => {
		switch (order) {
			case 'added':
				return currentState?.attendants.map((att, ai) => ({ att, ai }));
			case 'same':
				return mainScreenOrder?.map((ai) => ({ att: currentState!.attendants[ai], ai }));
			case 'reverse':
				return mainScreenOrder?.map((ai) => ({ att: currentState!.attendants[ai], ai })).reverse();
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

	let activeRules = $derived(rules.flatMap((rule, i) => (rule.isRemoved ? [] : { rule, i })));

	let chance = $derived.by(() => {
		switch (wasedashikiMode || rules[0]?.chance) {
			case 'single':
			case 'handicap':
				return '(1C)';
			case 'double':
				return '(2C)';
			case 'endless':
				return '(∞C)';
			default:
				return '';
		}
	});

	let inputDialog: HTMLDialogElement;
	let ruleEditDialog: { open: (rules: Rule[]) => Promise<Rule[] | null> };
	let ruleTeamEditDialog: { open: (rules: Rule[]) => Promise<Rule[] | null> };

	let attendantElements: HTMLElement[] = $state([]);
	let isDragging = $state<number | null>(null);
	let dropTarget = $state<number | null>(null);
	let isDragAvailable = $derived(
		mainScreenOrderingMode === 'manual' && (order === 'same' || order === 'reverse')
	);

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

	function processWindowMessage(event: MessageEvent<OutgoingMessage>) {
		switch (event.data.command) {
			case 'syncState':
				battleMode = event.data.mode;
				attendants = event.data.attendants;
				currentState = event.data.currentState;
				history = event.data.history;
				rules = event.data.rules;
				mainScreenOrder = event.data.orderedAttendants;
				mainScreenOrderingMode = event.data.orderingMode;
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
			const tag = (event.target as HTMLElement | null)?.tagName.toLowerCase();
			if (
				tag === 'input' ||
				tag === 'textarea' ||
				(event.target as HTMLElement | null)?.isContentEditable
			) {
				return;
			}

			const button = document.querySelector(
				`button.labeled[data-label="${event.key.toUpperCase()}"]`
			) as HTMLElement | null;
			if (button) {
				button.classList.add('active');
				setTimeout(() => button.click(), 0);
				setTimeout(() => button.classList.remove('active'), 500);
			}
		}
	}

	function onDragEnd() {
		if (orderedAttendants && isDragging != null && dropTarget != null) {
			postMessage({
				command: 'reorderAttendants',
				attendantID: order === 'same' ? isDragging : orderedAttendants.length - isDragging - 1,
				newOrder: order === 'same' ? dropTarget - 0.5 : orderedAttendants.length - dropTarget - 0.5
			});
			isDragging = null;
			dropTarget = null;
		}
	}

	function apply(rules: Rule[], resetGroups: 'reset' | 'keep'): void {
		postMessage({
			command: 'updateRules',
			rules: rules.map((r) => ({ ...r })),
			doClear:
				history.length > 0 &&
				confirm(
					'全員のスコアのリセットも行いますか？\n\n※ しない場合、トロフィーが消えることなどがあります\n※ まだゲームの途中であれば無視してください'
				),
			resetGroups
		});
	}

	function showQuestion(index: number) {
		currentIndex = index;
		postMessage({
			command: 'updateQuestion',
			...questions[currentIndex]
		});

		if (client && companionSessionID && index > 0) {
			(async () => {
				await client.api.question.show.$post({
					json: {
						sessionID: companionSessionID,
						questionID: index
					}
				});
				remoteQuestions.find((q) => q.id === index)!.shown = 1;
				remoteQuestions = await (
					await client.api.questions[':session_id'].$get({
						param: { session_id: companionSessionID },
						query: { shown: 'all' }
					})
				).json();
			})();
		}

		document.querySelector('table:not(:hover) tr.current')?.scrollIntoView({ block: 'center' });
	}

	function postMessage(message: IncomingMessage) {
		opener.postMessage(message);
	}

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

		enableCompanion = !!window.localStorage.getItem('enableCompanion');
		if (enableCompanion) {
			client = getAPIClient();
			companionSessionID = new URLSearchParams(location.search).get('session') ?? '';
			if (companionSessionID) {
				(async () => {
					remoteQuestions = await (
						await client.api.questions[':session_id'].$get({
							param: { session_id: companionSessionID },
							query: { shown: 'all' }
						})
					).json();
				})();
			}
		}

		window.addEventListener('message', processWindowMessage);
		window.addEventListener('keydown', processKeyboardInput);

		const timer = setInterval(() => postMessage({ command: 'ping' }), 1000);

		return () => {
			window.removeEventListener('message', processWindowMessage);
			window.removeEventListener('keydown', processKeyboardInput);
			clearInterval(timer);
		};
	});

	async function loadFromCSV() {
		questions = parseCSV(rawInput);
		window.localStorage.setItem('questions', JSON.stringify(questions));

		if (enableCompanion && companionSessionID && client) {
			console.log(
				await (
					await client.api.questions.$put({
						json: {
							sessionID: companionSessionID,
							questions: questions.map((q, id) => ({ ...q, id })).slice(1)
						}
					})
				).json()
			);

			remoteQuestions = await (
				await client.api.questions[':session_id'].$get({
					param: { session_id: companionSessionID },
					query: { shown: 'all' }
				})
			).json();
		}

		inputDialog.close();
	}
</script>

<svelte:head>
	<title>操作盤 - kissQ</title>
</svelte:head>

<header class="console" class:show-keyboard={isKeyboardEnabled}>
	<div>
		<button class="labeled" data-label="Z" onclick={() => postMessage({ command: 'clickUndo' })}>
			元に戻す
		</button>
		<button
			class="labeled"
			class:blink={currentState?.attendants.some(
				({ yasuCount, rule: { yasuMode, yasuPerBatsu } }) =>
					yasuCount === 'next' && (yasuMode !== 'constant' || yasuPerBatsu > 0)
			)}
			data-label="X"
			onclick={() => postMessage({ command: 'clickThrough' })}
		>
			スルー
		</button>
		<button
			class="labeled"
			data-label="C"
			onclick={() => {
				if (confirm('リセットしてよろしいですか？')) {
					postMessage({ command: 'clickReset' });
				}
			}}
		>
			全員リセット
		</button>
		<button
			class="labeled"
			data-label="V"
			onclick={() => {
				let name = prompt('プレイヤーの名前を入力してください');
				if (name) {
					postMessage({ command: 'addAttendant', name });
				}
			}}
		>
			プレイヤー追加
		</button>
		<button
			class="labeled"
			data-label="B"
			onclick={() => {
				(battleMode === 'single' ? ruleEditDialog : ruleTeamEditDialog)
					.open(rules)
					.then((newRules) => {
						if (newRules) {
							postMessage({
								command: 'updateRules',
								rules: newRules,
								doClear:
									history.length > 0 &&
									confirm(
										'全員のスコアのリセットも行いますか？\n\n※ しない場合、トロフィーが消えることなどがあります\n※ まだゲームの途中であれば無視してください'
									),
								resetGroups: 'keep'
							});
						}
					});
			}}
			{@attach tooltip(
				rules.length > 0
					? Rule.getActiveRulesText(
							rules.map((rule, i) => ({ rule, i })),
							battleMode
						) + chance
					: 'Loading...'
			)}
		>
			ルール編集
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
	</div>
	{#if currentState && orderedAttendants}
		<div>
			{#each orderedAttendants as { att, ai }, ord (ai)}
				<div
					class={[
						'attendant',
						{
							'answerer-1st': answerers[(buttonMapping[ai] ?? 0) - 1]?.rank === 1,
							'answerer-2nd':
								(wasedashikiMode === 'endless' || wasedashikiMode === 'double') &&
								answerers[(buttonMapping[ai] ?? 0) - 1]?.rank === 2,
							'answerer-late':
								wasedashikiMode === 'endless' &&
								answerers[(buttonMapping[ai] ?? 0) - 1]?.rank === 'late',
							'drop-target': dropTarget === ord
						}
					]}
					animate:flip={{ duration: 500 }}
					bind:this={attendantElements[ai]}
					role="listitem"
					ondragstart={() => {
						if (isDragAvailable) {
							isDragging = ord;
						}
					}}
					ondragover={(event) => {
						if (isDragAvailable) {
							event.preventDefault();
							dropTarget = ord;
						}
					}}
					ondragend={() => {
						if (isDragAvailable) {
							onDragEnd();
						}
					}}
					style:opacity={isDragging === ord ? 0.25 : 1}
					draggable={isDragAvailable}
				>
					{#if isDragAvailable}
						<span class="drag-handle">⠿</span>
					{/if}

					{#if activeRules.length > 1}
						<select
							bind:value={attendants[ai].group}
							onchange={(event) => {
								const newGroup = Number.parseInt((event.target as HTMLSelectElement).value);
								postMessage({
									command: 'updateAttendantGroup',
									attendantID: ai,
									group: newGroup
								});
							}}
						>
							{#each activeRules as { i } (i)}
								<option value={i}>{String.fromCodePoint(65 + i)}</option>
							{/each}
						</select>
					{/if}

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
								data-label={Keys[ord]?.[0] || ''}
								onclick={() => postMessage({ command: 'clickMaru', attendantID: ai })}
							>
								O
							</button>
							<button
								class="labeled"
								data-label={Keys[ord]?.[1] || ''}
								onclick={() => postMessage({ command: 'clickBatsu', attendantID: ai })}
							>
								X
							</button>
						{/if}
					{/if}
				</div>
			{/each}
			{#if isDragAvailable}
				<div
					class="dummy-drop-target"
					class:drop-target={dropTarget === orderedAttendants.length}
					role="listitem"
					ondragover={(event) => {
						event.preventDefault();
						dropTarget = orderedAttendants.length;
					}}
					ondragend={onDragEnd}
				></div>
			{/if}
		</div>
	{/if}

	Next: Q{currentState?.questionCount}
	{#if rules[0]?.questionLimit != null}
		/ {rules[0].questionLimit}
	{/if}
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
	{#if rules[0]?.questionLimit != null && (currentState?.questionCount ?? 0) > rules[0].questionLimit}
		<div class="history-entry finished" in:fly={{ x: 100, duration: 1000 }}>問題終了</div>
	{/if}
</header>

<main class="console">
	<table>
		<tbody>
			{#each questions as { question, answer }, index (question + index)}
				<tr class:current={index === currentIndex}>
					<td>
						{#if remoteQuestions.find((q) => q.id === index)?.shown}
							<span style="color: green">✔</span>
						{/if}
						<button onclick={() => showQuestion(index)}>
							{index}.
						</button>
					</td>
					<td class:error={!question?.trim?.()}>
						{#each question.split(/(（.+?）|\(.+?\)|【.+?】|［.+?］)/) as part, i (i)}
							{#if i % 2}
								<em>{part}</em>
							{:else}
								{part}
							{/if}
						{/each}
						{#if (remoteQuestions.find((q) => q.id === index)?.likedBy.length ?? 0) > 0}
							<br />
							Liked by
							<span style="color: red; font-weight: bold;">
								{remoteQuestions.find((q) => q.id === index)!.likedBy.join(', ')}
							</span>
						{/if}
					</td>
					<td class:error={!answer?.trim?.()}>
						{answer}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</main>

<footer class="console" class:show-keyboard={isKeyboardEnabled}>
	<button
		onclick={() => {
			rawInput = '';
			inputDialog.showModal();
		}}>問題を読み込み</button
	>
	<button
		class="labeled"
		data-label="N"
		disabled={currentIndex === 0}
		onclick={() => showQuestion(currentIndex - 1)}
	>
		← 前の問題へ
	</button>
	<button
		class="labeled"
		data-label="M"
		disabled={currentIndex === questions.length - 1}
		onclick={() => showQuestion(currentIndex + 1)}
	>
		次の問題へ →
	</button>
	<button onclick={() => postMessage({ command: 'toggleQuestionWindow' })}>
		問題ウィンドウを表示・非表示
	</button>
	{#if enableCompanion}
		<button disabled={!companionSessionID} onclick={() => postMessage({ command: 'toggleQRCode' })}>
			QRコードを表示・非表示
		</button>
	{/if}
</footer>

<dialog closedby="any" bind:this={inputDialog}>
	<p style="font-size: 0.5em;">
		ヒント：スプレッドシート上で質問と回答の列を選択してコピーするとTSV形式になります。ただし、改行が含まれるとぶっ壊れます。
	</p>

	<textarea
		bind:value={rawInput}
		onpaste={() => setTimeout(loadFromCSV, 0)}
		placeholder="ここにCSV/TSVデータを貼り付けてください"
	></textarea>
	<button onclick={loadFromCSV}>読み込み</button>
</dialog>

<RuleEditDialog bind:this={ruleEditDialog} {apply} />
<RuleTeamEditDialog bind:this={ruleTeamEditDialog} {apply} />

<style>
	header.console,
	main.console,
	footer.console {
		padding: 1em;
	}

	header.console > div {
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

	main.console {
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

	.show-keyboard button.labeled {
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

	.attendant {
		position: relative;

		&:nth-last-child(2) {
			anchor-name: --last-attendant;
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

	.dummy-drop-target {
		position: absolute;
		position-anchor: --last-attendant;
		top: anchor(top);
		bottom: anchor(bottom);
		left: anchor(right);
		width: 100dvw;
	}

	.drop-target::before {
		display: inline-block;
		position: absolute;
		top: -25%;
		left: -18px;
		border-right: 10px dashed red;
		height: 150%;
		pointer-events: none;
		content: '';
	}

	.drag-handle {
		cursor: grab;
		color: #888;
	}

	header.console .history-entry {
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
		&.through,
		&.finished {
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

	@keyframes blink-animation {
		to {
			opacity: 0.3;
		}
	}
</style>

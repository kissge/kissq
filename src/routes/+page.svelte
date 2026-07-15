<script lang="ts">
	import { watch } from 'runed';
	import { onMount, untrack } from 'svelte';
	import { flip } from 'svelte/animate';
	import { Spring } from 'svelte/motion';
	import { fade, fly, slide } from 'svelte/transition';
	import Toastify from 'toastify-js';
	import 'toastify-js/src/toastify.css';
	import se1 from '$lib/assets/se1.mp3';
	import se2 from '$lib/assets/se2.mp3';
	import se3 from '$lib/assets/se3.mp3';
	import { type Attendant, han2zen, loadFromHash } from '$lib/attendant';
	import AppearanceDialog from '$lib/components/appearanceDialog.svelte';
	import EffectEditDialog from '$lib/components/effectEditDialog.svelte';
	import Footer from '$lib/components/footer.svelte';
	import Header from '$lib/components/header.svelte';
	import LogDialog from '$lib/components/logDialog.svelte';
	import PenaltyRoulette from '$lib/components/penaltyRoulette.svelte';
	import Pushers from '$lib/components/pushers.svelte';
	import QuestionWindow from '$lib/components/questionWindow.svelte';
	import RuleEditDialog from '$lib/components/ruleEditDialog.svelte';
	import Stars from '$lib/components/stars.svelte';
	import StateEditDialog from '$lib/components/stateEditDialog.svelte';
	import {
		type HistoryEntry,
		MaruHistoryEntry,
		BatsuHistoryEntry,
		ThroughHistoryEntry,
		RemoveHistoryEntry,
		WinHistoryEntry,
		LoseHistoryEntry,
		EditHistoryEntry
	} from '$lib/historyEntry';
	import { pushLog, updateLog } from '$lib/logs';
	import { qZero } from '$lib/question';
	import { Rule, type Penalty, getActiveRulesText } from '$lib/rule';
	import {
		connectToSerialPort,
		readLoopSerialPort,
		reconnect,
		type WasedashikiMode
	} from '$lib/serial';
	import { playSound } from '$lib/sound';
	import { AttendantState, GameState, type AttendantStateValue, type GameEvent } from '$lib/state';
	import { tooltip } from '$lib/tooltip.svelte';

	let attendants = $state<Attendant[]>([
		{
			name: '',
			group: 0,
			team: 0,
			seat: 0,
			trophyCount: 0,
			totalScore: { num: 0, den: 0 },
			manualOrder: 0
		},
		{
			name: '',
			group: 0,
			team: 0,
			seat: 0,
			trophyCount: 0,
			totalScore: { num: 0, den: 0 },
			manualOrder: 1
		}
	]);
	let rules = $state([new Rule('marubatsu', 7, 3, 1, 1, false, null, 'constant', 0, null)]);
	let history = $state<HistoryEntry[]>([]);
	let currentState = $derived(
		history.reduce(
			(state, entry) =>
				entry.reducer(state.clearLatestEvent()).checkIfLastSurvivor().updateRanking(),
			new GameState(attendants, rules).updateRanking()
		)
	);
	let { activeRules, activeRulesText } = $derived(getActiveRulesText(rules, 'single'));
	let gameTitle = $state('');

	let innerWidth = $state(0);
	let innerHeight = $state(0);
	let headerClientHeight = $state(0);
	let footerClientHeight = $state(0);
	let fontSize = $state<number>();
	let container: HTMLDivElement;
	let columnCount = $derived.by(() => {
		// 画面に収まる範囲でなるべく多い列数を求める
		const attCount = currentState.ranking.length;
		const isSafari =
			typeof navigator !== 'undefined' &&
			/safari/i.test(navigator.userAgent) &&
			!/chrome|android/i.test(navigator.userAgent);
		if (attCount <= 4) {
			return 4;
		} else if (!container || isSafari) {
			return Math.floor(innerWidth / 250) || 7;
		}

		const totalHeight = innerHeight - headerClientHeight - footerClientHeight + 1;
		document.querySelectorAll('.attendant .name').forEach((el) => {
			(el as HTMLElement).style.display = 'none';
		});

		let bestCols = Infinity;

		for (let rows = attCount; rows >= 1; --rows) {
			const cols = Math.ceil(attCount / rows);
			container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

			if (container.clientWidth > innerWidth || innerWidth / cols < 140) {
				break;
			}

			if (container.clientHeight > totalHeight) {
				continue;
			}

			bestCols = Math.ceil(attCount / rows);
		}

		if (!Number.isFinite(bestCols)) {
			bestCols = Math.floor(innerWidth / 250);
		}

		// これでベストな行数の方が逆に定まったので、あらためてその中で列数を決める
		const bestRows = Math.ceil(attCount / bestCols);
		bestCols = Math.ceil(attCount / bestRows);

		document.querySelectorAll('.attendant .name').forEach((el) => {
			(el as HTMLElement).style.display = '';
		});

		container.style.gridTemplateColumns = `repeat(${bestCols}, 1fr)`;
		return bestCols;
	});
	let nameWidth = $state([0, 0]);
	let nameHeight = $state([0, 0]);
	let nameDirection = $state<'vertical-rl' | ''>('vertical-rl');
	$effect(() => {
		if (nameWidth.length === 0 || nameHeight.length === 0) {
			return;
		}

		if (nameWidth[0] > nameHeight[0] * 1.2) {
			nameDirection = '';
			fontSize = Math.floor(
				Math.min(
					(container?.clientWidth / columnCount) * 0.15,
					(container?.clientHeight / Math.ceil(currentState.ranking.length / columnCount)) * 0.15
				)
			);
		} else {
			nameDirection = 'vertical-rl';
			fontSize = Math.floor(
				Math.min(
					(container?.clientWidth / columnCount) * 0.3,
					(container?.clientHeight / Math.ceil(currentState.ranking.length / columnCount)) * 0.09
				)
			);
		}
	});

	let barMax = $derived.by(() => {
		if (attendants.length === 0) {
			return null;
		}

		if (
			currentState.attendants.some(({ rule }) => rule.mode !== currentState.attendants[0].rule.mode)
		) {
			return null;
		}

		return Math.max(...currentState.attendants.map((a) => a.rule.max));
	});
	let barHeightRatioArray = $state<Spring<number>[]>([]);
	$effect(() => {
		if (attendants.length < barHeightRatioArray.length) {
			barHeightRatioArray = barHeightRatioArray.slice(0, attendants.length);
		} else if (attendants.length > barHeightRatioArray.length) {
			for (let i = barHeightRatioArray.length; i < attendants.length; ++i) {
				barHeightRatioArray.push(new Spring(0, { stiffness: 0.2, damping: 0.2 }));
			}
		}

		for (let i = 0; i < barHeightRatioArray.length; ++i) {
			const ratio = (() => {
				switch (currentState.attendants[i].rule.mode) {
					case 'marubatsu':
						return currentState.attendants[i].maruCount;
					case 'score':
					case 'MbyN':
					case 'survival':
						return currentState.attendants[i].score;
					case 'aql':
					case 'product':
					case 'sum':
						throw new Error();
				}
			})();
			barHeightRatioArray[i].set(ratio);
		}
	});

	let consecutive = $derived.by<{ attendantID: number; count: number } | null>(() => {
		const i = history.findLastIndex((entry) => entry.type === 'maru');

		if (i === -1) {
			return null;
		}

		const attendantID = (history[i] as { attendantID: number }).attendantID;
		const j = history.findLastIndex(
			(entry) =>
				(entry.type === 'batsu' && entry.attendantID === attendantID) ||
				(entry.type === 'maru' && entry.attendantID !== attendantID)
		);

		if (i <= j) {
			return null;
		}

		return {
			attendantID,
			count: history
				.slice(j + 1, i + 1)
				.filter((entry) => entry.type === 'maru' && entry.attendantID === attendantID).length
		};
	});

	let isBannerVisible = $state<GameEvent | null>(null);
	watch(
		() => currentState.latestEvent,
		(curr, prev) => {
			if (
				curr?.type !== prev?.type ||
				(curr &&
					prev &&
					'attendantID' in curr &&
					'attendantID' in prev &&
					curr?.attendantID !== prev?.attendantID)
			) {
				showBanner(curr);
			}
		}
	);
	let showBannerTimeout = 0;
	function showBanner(event: GameEvent | null, duration: number = 3000) {
		isBannerVisible = event;
		clearTimeout(showBannerTimeout);
		showBannerTimeout = setTimeout(() => (isBannerVisible = null), duration);
	}

	function addAttendant(name: string = '') {
		attendants.push({
			name: han2zen(name),
			group: 0,
			team: 0,
			seat: 0,
			trophyCount: 0,
			totalScore: { num: 0, den: 0 },
			manualOrder: attendants.length
		});
	}

	function handlePasteEvent(event: ClipboardEvent, ord: number) {
		const text = (event.clipboardData?.getData('text') || '').trim();
		const lines = text.split(/[\r\n]+/);
		if (lines.length >= 2) {
			event.preventDefault();
			lines.forEach((line, i) => {
				if (ord + i < attendants.length) {
					attendants[orderedAttendants[ord + i]].name = line;
					attendants[orderedAttendants[ord + i]].trophyCount = 0;
				} else {
					addAttendant(line);
				}
			});
		} else if (text.length > 0) {
			event.preventDefault();
			document.execCommand('insertText', false, han2zen(text));
		}
	}

	let attendantFLIPDelay = $state(0);

	let showOtherMenu = $state(false);

	let screenshotModeTimer = $state<number>();
	let screenshotOffset = $state(-1);

	let showMarubatsuOverride = $state(false);
	let showScore = $state(true);

	let orderingMode = $state<'ranking' | 'manual'>('ranking');
	let orderedAttendants = $derived.by<number[]>(() => {
		switch (orderingMode) {
			case 'ranking':
				return currentState.ranking;
			case 'manual':
				return currentState.attendants
					.flatMap(({ life, manualOrder }, i) => (life === 'removed' ? [] : [[manualOrder, i]]))
					.toSorted(([a], [b]) => a - b)
					.map(([, i]) => i);
		}
	});

	let effect2Name = $state<string>();
	let effect3Name = $state<string>();

	let wallpaper = $state<string | null>(null);
	let trophy = $state<string | null>(null);

	let playSounds = $state(true);

	let enableRating = $state(false);

	function toggleScreenshotMode() {
		if (screenshotModeTimer != null) {
			clearInterval(screenshotModeTimer);
			screenshotModeTimer = undefined;
		} else {
			screenshotOffset = -1;
			screenshotModeTimer = setInterval(() => {
				screenshotOffset = (screenshotOffset + 1) % (orderedAttendants.length + 1);
			}, 1500);
		}
	}

	let ruleEditDialog: { open: (rules: Rule[]) => Promise<Rule[] | null> };
	// svelte-ignore non_reactive_update ...?
	let logDialog: { open: () => void };
	let effectEditDialog: {
		open: (
			effect2Name: string | undefined,
			effect3Name: string | undefined
		) => Promise<[string | undefined, string | undefined] | null>;
	};
	let appearanceDialog: {
		open: (
			wallpaper: string | null,
			trophy: string | null
		) => Promise<[string | null, string | null] | null>;
	};
	let stateEditDialog: { open: (att: AttendantState) => Promise<AttendantStateValue | null> };
	let penaltyRoulette: { run: (choices: Penalty[]) => Promise<number> };

	$effect(() => {
		if (history.length === 0) {
			return;
		}

		updateLog('single', gameTitle, currentState, attendants, activeRulesText);
	});

	function clearHistory() {
		currentState.attendants.forEach((att, i) => {
			attendants[i].trophyCount = att.trophyCount;
			if (enableRating) {
				attendants[i].totalScore = {
					num:
						att.totalScore.num +
						(currentState.attendants.length - currentState.ranking.indexOf(i) - 1),
					den: att.totalScore.den + 1
				};
			}
		});

		pushLog('single', gameTitle, activeRulesText, currentState, attendants);

		attendants = attendants.filter((_, i) => currentState.attendants[i].life !== 'removed');
		history = [];
	}

	async function editRule() {
		const result = await ruleEditDialog.open(rules);

		if (result) {
			if (
				history.length > 0 &&
				confirm(
					'全員のスコアのリセットも行いますか？\n\n※ しない場合、トロフィーが消えることなどがあります\n※ まだゲームの途中であれば無視してください'
				)
			) {
				clearHistory();
			}

			const activeRuleCount = result.filter(({ isRemoved }) => !isRemoved).length;
			if (activeRuleCount === 1) {
				rules = result.filter(({ isRemoved }) => !isRemoved);
				attendants.forEach((att) => {
					att.group = 0;
				});
			} else {
				rules = result;
				attendants.forEach((att) => {
					while (rules[att.group].isRemoved) {
						att.group = (att.group - 1 + rules.length) % rules.length;
					}
				});
				const lastActiveRuleIndex = rules.findLastIndex(({ isRemoved }) => !isRemoved);
				rules = rules.slice(0, lastActiveRuleIndex + 1);
			}

			showMarubatsuOverride = false;
			showScore = true;
		}
	}

	async function editEffects() {
		const result = await effectEditDialog.open(effect2Name, effect3Name);
		if (result) {
			[effect2Name, effect3Name] = result;
		}
	}

	async function editAppearance() {
		const result = await appearanceDialog.open(wallpaper, trophy);
		if (result) {
			wallpaper = result[0];
			trophy = result[1];
			const main = document.querySelector('main') as HTMLElement;
			main.style.backgroundImage = wallpaper ? `url(${wallpaper})` : '';
			main.style.setProperty('--trophy-image', trophy ? `url(${trophy})` : '');
			window.localStorage.setItem('wallpaper', wallpaper || '');
			window.localStorage.setItem('trophy', trophy || '');
		}
	}

	async function editState(attendantID: number, att: AttendantState) {
		const result = await stateEditDialog.open(att);
		if (result) {
			history.push(new EditHistoryEntry(attendantID, result));
		}
	}

	function clickMaru(attendantID: number, playSounds_: boolean = true) {
		history.push(new MaruHistoryEntry(attendantID));
		if (playSounds && playSounds_) {
			playSound(se1);
		}
	}

	async function clickBatsu(attendantID: number, playSounds_: boolean = true) {
		if (playSounds && playSounds_) {
			playSound(se2);
		}

		const single = wasedashikiMode === 'single' || wasedashikiMode === 'handicap';

		const rule = currentState.attendants[attendantID].rule;
		if (rule.yasuMode === 'roulette') {
			const selection = await penaltyRoulette.run(rule.roulette!.choices);
			history.push(new BatsuHistoryEntry(attendantID, single, rule.roulette!.choices[selection]));
		} else {
			history.push(new BatsuHistoryEntry(attendantID, single));
		}
	}

	function clickThrough() {
		history.push(new ThroughHistoryEntry());
		if (playSounds) playSound(se3);
	}

	function clickUndo() {
		history.pop();
	}

	const urlParams = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
	let showQuestionWindow = $state(urlParams.has('qw'));
	let currentQuestion = $state(qZero);
	let subWindow = $state<Window>();

	function openSubWindow() {
		subWindow = window.open('./question', 'questionWindow', 'popup') || undefined;
	}

	function processWindowMessage(event: MessageEvent) {
		if (!subWindow) {
			try {
				subWindow = event.source as Window;
			} catch {
				/* ignore */
			}
		}

		switch (event.data.command) {
			case 'toggleQuestionWindow':
				showQuestionWindow = !showQuestionWindow;
				break;

			case 'updateQuestion':
				currentQuestion = { question: event.data.question, answer: event.data.answer };
				break;

			case 'clickMaru':
				clickMaru(event.data.attendantID);
				break;

			case 'clickBatsu':
				clickBatsu(event.data.attendantID);
				break;

			case 'clickThrough':
				clickThrough();
				break;

			case 'clickUndo':
				clickUndo();
				break;

			case 'clickReset':
				clearHistory();
				break;

			case 'addAttendant':
				addAttendant(event.data.name);
				break;

			case 'ping':
				syncState();
				break;
		}
	}

	function syncState() {
		if (subWindow && !subWindow.closed) {
			subWindow.postMessage(
				JSON.parse(
					JSON.stringify({
						command: 'syncState',
						mode: 'single',
						currentState,
						orderedAttendants,
						answerers,
						buttonMapping,
						wasedashikiMode
					})
				)
			);
		}
	}

	$effect(() => {
		// eslint-disable-next-line svelte/no-unused-svelte-ignore
		// svelte-ignore state_snapshot_uncloneable
		$state.snapshot([currentState, orderedAttendants, answerers, buttonMapping, wasedashikiMode]);
		syncState();
	});

	$effect(() => {
		if (attendants.length === 2 && attendants.every(({ name }) => name === '')) {
			return;
		}

		const data = {
			attendants: attendants.filter((_, ai) => currentState.attendants[ai].life !== 'removed'),
			buttonMapping
		};
		untrack(() => {
			if (data.attendants.every(({ name }) => name === '')) {
				window.history.replaceState(null, '', ' ');
			} else {
				// eslint-disable-next-line svelte/prefer-svelte-reactivity
				const url = new URL(document.URL);
				url.hash = encodeURIComponent(JSON.stringify(data));
				location.replace(url);
			}
		});
	});

	onMount(() => {
		wallpaper = window.localStorage.getItem('wallpaper');
		trophy = window.localStorage.getItem('trophy');
		const main = document.querySelector('main') as HTMLElement;
		if (wallpaper) {
			main.style.backgroundImage = `url(${wallpaper})`;
		}
		if (trophy) {
			main.style.setProperty('--trophy-image', `url(${trophy})`);
		}

		const data = loadFromHash();
		if (data) {
			attendants = data.attendants;
			buttonMapping = data.buttonMapping ?? {};
			buttonMappingRestored = Object.keys(buttonMapping).length > 0;
		}

		reconnect()
			.then((port) => {
				if (port) {
					serialPort = port;
					initiateSerialConnection(port);
					setTimeout(() => {
						if (connected) {
							Toastify({ text: '自動で早稲田式に接続しました' }).showToast();
						}
					}, 1500);
				}
			})
			.catch((error) => {
				console.error('接続エラー', error);
			});
		pushLog('single', gameTitle, activeRulesText, currentState, attendants);
		window.addEventListener('message', processWindowMessage);

		return () => window.removeEventListener('message', processWindowMessage);
	});

	let serialPort = $state<SerialPort>();
	let answerers = $state<({ rank: 1 | 2 | 'late'; delay: number } | null)[]>([]);
	let lastButtonID = $state<number>();
	/** attendant ID -> button ID */
	let buttonMapping = $state<Record<number, number>>({});
	/** button ID -> attendant ID */
	let buttonReverseMapping = $derived.by<Record<number, number>>(() => {
		const reverse: Record<number, number> = {};
		for (const [attendantID, buttonID] of Object.entries(buttonMapping)) {
			reverse[buttonID] = Number(attendantID);
		}
		return reverse;
	});
	let buttonMappingRestored = $state(false);
	let wasedashikiMode = $state<WasedashikiMode>();
	let connected = $state(false);
	let answererRanking = $derived(
		Object.entries(answerers)
			.filter(([, v]) => v != null)
			.toSorted((a, b) => a[1]!.delay - b[1]!.delay)
			.map(([k, v]) => [buttonReverseMapping[Number(k) + 1], v!] as const)
	);

	async function initiateSerialConnection(serialPort_?: SerialPort) {
		if (!serialPort_) {
			try {
				serialPort = await connectToSerialPort();
			} catch (error) {
				if (String(error).includes('Failed to open serial port')) {
					Toastify({
						text: '接続に失敗しました。2つ以上のタブで同時に接続しようとしていませんか？',
						style: { background: '#B00000' }
					}).showToast();
				} else {
					Toastify({ text: '接続に失敗しました', style: { background: '#B00000' } }).showToast();
				}
				console.error('接続エラー', error);
				serialPort = undefined;
				wasedashikiMode = undefined;
				connected = false;
				return;
			}
		}

		while (serialPort) {
			console.log('Reading from serial port...');
			setTimeout(() => {
				if (!connected) {
					serialPort = undefined;
				}
			}, 2500);
			await readLoopSerialPort(
				serialPort,
				() => ({
					answerers,
					pushers,
					buttonMapping,
					attendants: currentState.attendants,
					clickMaru,
					clickBatsu
				}),
				(updates) => {
					if ('connected' in updates) connected = updates.connected!;
					if ('wasedashikiMode' in updates) wasedashikiMode = updates.wasedashikiMode!;
					if ('answerers' in updates) answerers = updates.answerers!;
					if ('pushers' in updates) pushers = updates.pushers!;
					if ('lastButtonID' in updates) lastButtonID = updates.lastButtonID!;
					if ('serialPort' in updates) serialPort = updates.serialPort!;
				}
			);
			await new Promise((resolve) => setTimeout(resolve, 5000));
		}
	}

	let pushers: number[] = $state([]);
</script>

<svelte:window bind:innerWidth bind:innerHeight />

<svelte:head>
	<title>
		kissQ -
		{gameTitle ? gameTitle + ' - ' : ''}
		{currentState.attendants
			.flatMap(({ name, life }) => (life !== 'removed' ? [name.slice(0, 3) || '👤'] : []))
			.join('・')}
		- クイズカウンター（得点表示機）のkissQ
	</title>
</svelte:head>

<audio src={se1} preload="auto"></audio>
<audio src={se2} preload="auto"></audio>
<audio src={se3} preload="auto"></audio>

<main
	style:grid-template-rows={showQuestionWindow ? 'auto auto 1fr auto' : 'auto 1fr auto'}
	class="main"
>
	<Header
		bind:headerClientHeight
		questionCount={currentState.questionCount}
		hideQuestionCount={false}
		bind:gameTitle
		battleMode="single"
		onBattleModeChange={clearHistory}
		{attendants}
		{buttonMapping}
		{wasedashikiMode}
		{rules}
		{editRule}
	/>

	<QuestionWindow {showQuestionWindow} {currentQuestion} />

	<div
		class="attendants"
		style:grid-template-columns={`repeat(${columnCount}, 1fr)`}
		style:grid-template-rows={`repeat(${Math.ceil(orderedAttendants.length / columnCount)}, ${activeRules.length > 1 ? 'auto' : ''} 1fr auto auto)`}
		style:height={`calc(100dvh - ${headerClientHeight}px - ${footerClientHeight}px - 25px${showQuestionWindow ? ' - 6.25em - 0.7rem' : ''})`}
		bind:this={container}
	>
		{#each orderedAttendants as i, ord (i)}
			{@const att = currentState.attendants[i]}
			{@const barHeight: number = barHeightRatioArray[i]?.current ?? 0}
			<div
				style:font-size={(fontSize ?? 0) + 'px'}
				style:grid-row={activeRules.length > 1 ? 'span 4' : 'span 3'}
				class={['attendant', { lizhi: att.isLizhi }]}
				animate:flip={{ duration: 500, delay: attendantFLIPDelay }}
			>
				{#if buttonMapping[i] != null}
					{@const j = buttonMapping[i] - 1}
					{#if answerers[j]?.rank}
						{#if answerers[j].delay > 0}
							<div class="answerer">
								+&thinsp;{(answerers[j].delay / 1000).toFixed(3)} s
							</div>
						{/if}
					{/if}
				{/if}
				<button
					class="button-mapping"
					style={buttonMapping[i] == null
						? undefined
						: 1 <= buttonMapping[i] && buttonMapping[i] <= 6
							? 'background-color: red; color: white'
							: 7 <= buttonMapping[i] && buttonMapping[i] <= 12
								? 'background-color: blue; color: white'
								: 13 <= buttonMapping[i] && buttonMapping[i] <= 18
									? 'background-color: yellow; color: black'
									: 'background-color: green; color: white'}
					style:display={lastButtonID == undefined && !buttonMappingRestored ? 'none' : ''}
					disabled={lastButtonID == undefined && !buttonMappingRestored}
					{@attach tooltip(
						`このプレイヤーが持っているボタンは${buttonMapping[i] == null ? '???' : buttonMapping[i]}番です。クリックで紐づけ`
					)}
					onclick={() => {
						if (lastButtonID !== undefined) {
							buttonMapping = {
								...Object.fromEntries(
									Object.entries(buttonMapping).filter(([, v]) => v !== lastButtonID)
								),
								[i]: lastButtonID!
							};
							Toastify({
								text: `ボタン${lastButtonID}は${att.name || `プレイヤー${i + 1}`}が持っています`
							}).showToast();
						}
					}}
				>
					{buttonMapping[i] ?? '?'}
				</button>
				{#if activeRules.length > 1}
					<button
						class="group"
						style:background-color={`hsl(${(360 / rules.length) * attendants[i].group}, 70%, 40%)`}
						onclick={() => {
							do {
								attendants[i].group = (attendants[i].group + 1) % rules.length;
							} while (rules[attendants[i].group].isRemoved);
						}}
						{@attach tooltip('このプレイヤーの所属グループを変更します。')}
					>
						{#key attendants[i].group}
							<span class="crossfade" in:fade={{ delay: 500 }} out:fade>
								{String.fromCodePoint(65 + attendants[i].group)}
							</span>
						{/key}
					</button>
				{/if}
				<div
					bind:textContent={attendants[i].name}
					onblur={() => {
						const tmp = han2zen(attendants[i].name.replace(/[\r\n]/g, ''));
						if (tmp !== attendants[i].name) {
							attendants[i].name = ' ';
							setTimeout(() => (attendants[i].name = tmp), 1);
						}
					}}
					onpaste={(e) => handlePasteEvent(e, ord)}
					contenteditable
					placeholder="プレイヤー {i + 1 < 10 ? String.fromCodePoint(65297 + i) : i + 1}"
					spellcheck="false"
					class={[
						'name',
						{
							blurred: screenshotModeTimer != null && i !== orderedAttendants[screenshotOffset],
							'show-bar': showScore,
							'answerer-1st': answerers[(buttonMapping[i] ?? 0) - 1]?.rank === 1,
							'answerer-2nd':
								(wasedashikiMode === 'endless' || wasedashikiMode === 'double') &&
								answerers[(buttonMapping[i] ?? 0) - 1]?.rank === 2,
							'answerer-late':
								wasedashikiMode === 'endless' &&
								answerers[(buttonMapping[i] ?? 0) - 1]?.rank === 'late'
						}
					]}
					style:writing-mode={nameDirection}
					style:justify-content={nameDirection ? '' : 'center'}
					style:text-align={nameDirection ? '' : 'center'}
					style:--bar-height-ratio={barMax !== null ? Math.min(barHeight / barMax, 1) : -999}
					{@attach tooltip('ダブルクリックして名前を編集', { placement: 'bottom' })}
					bind:clientWidth={nameWidth[i]}
					bind:clientHeight={nameHeight[i]}
				></div>

				<div class="score" style:opacity={showScore ? 1 : 0}>
					{#if history.length === 0 && att.rule.mode !== 'survival' && att.rule.mode !== 'score' && enableRating}
						<span {@attach tooltip('レート')} class="rate">
							{#if att.totalScore.den === 0}
								---
							{:else}
								{Math.floor((att.totalScore.num / att.totalScore.den) * 492.8).toLocaleString()}
							{/if}
						</span>
					{:else if showMarubatsuOverride || att.rule.mode === 'marubatsu'}
						<span class="maru-count">
							{#key att.maruCount}<span in:fade>{att.maruCount}</span>{/key} 〇
						</span>
						<span class="batsu-count">
							{#key att.batsuCount}
								<span in:fade class:lose-lizhi={att.isLoseLizhi}>
									{att.batsuCount}
								</span>
							{/key} ×
						</span>
					{:else if att.rule.mode === 'score' || att.rule.mode === 'survival'}
						<span>
							{#key att.score}
								<span
									class="crossfade"
									class:lose-lizhi={att.isLoseLizhi}
									in:fade={{ delay: 500 }}
									out:fade
								>
									{att.score}
								</span>
							{/key}
						</span>
						<small>
							pt{#if att.score !== 1}s{/if}
						</small>
					{:else}
						<span class="m-by-n-score">
							<small>
								{att.maruCount} × {att.rule.win - att.batsuCount}
							</small>
							{#key att.score}
								<span
									class="crossfade"
									class:lose-lizhi={att.isLoseLizhi}
									in:fade={{ delay: 500 }}
									out:fade>{att.score}</span
								>
							{/key}
						</span>
					{/if}

					{#if consecutive?.attendantID === i}
						{#key consecutive.count}
							<span
								class="consecutive-count"
								style:background-color={consecutive.count < 3
									? 'rgb(221 94 6)'
									: consecutive.count < 6
										? 'rgb(160, 40, 0)'
										: 'rgb(0, 0, 0)'}
								in:fly={{ y: 100 }}
								{@attach tooltip('連答カウント')}
							>
								{consecutive.count}
							</span>
						{/key}
					{/if}
				</div>

				<div class="hidden-buttons">
					<button
						onclick={() => editState(i, att)}
						disabled={att.yasuCount === 'next'}
						{@attach tooltip('このプレイヤーの得点状況を手で書き換えます。')}
					>
						編集
					</button>
					<button
						onclick={() => history.push(new WinHistoryEntry(i))}
						disabled={att.life !== 'alive'}
						{@attach tooltip('このプレイヤーを強制的に勝ち抜けにします。')}
					>
						勝利
					</button>
					<button
						onclick={() => history.push(new LoseHistoryEntry(i))}
						disabled={att.life !== 'alive'}
						{@attach tooltip('このプレイヤーを強制的に失格にします。')}
					>
						失格
					</button>
					<button
						{@attach tooltip(`並び順を${ord === 0 ? '一番右' : '左'}に移動します。`)}
						disabled={orderingMode !== 'manual'}
						onclick={() => {
							if (ord === 0) {
								attendants[i].manualOrder = orderedAttendants.length;
							} else {
								[attendants[orderedAttendants[ord - 1]].manualOrder, attendants[i].manualOrder] = [
									attendants[i].manualOrder,
									attendants[orderedAttendants[ord - 1]].manualOrder
								];
							}
							orderedAttendants.forEach((a, i) => (attendants[a].manualOrder = i));
						}}
					>
						◀
					</button>
					<button
						{@attach tooltip(
							`並び順を${ord === orderedAttendants.length - 1 ? '一番左' : '右'}に移動します。`
						)}
						disabled={orderingMode !== 'manual'}
						onclick={() => {
							if (ord === orderedAttendants.length - 1) {
								attendants[i].manualOrder = -1;
							} else {
								[attendants[orderedAttendants[ord + 1]].manualOrder, attendants[i].manualOrder] = [
									attendants[i].manualOrder,
									attendants[orderedAttendants[ord + 1]].manualOrder
								];
							}
							orderedAttendants.forEach((a, i) => (attendants[a].manualOrder = i));
						}}
					>
						▶
					</button>
					<button
						onclick={() => history.push(new RemoveHistoryEntry(i))}
						{@attach tooltip('このプレイヤーをリストから削除します。')}
					>
						削除
					</button>
				</div>

				<div class="trophies" {@attach tooltip('勝ち抜けた累積回数')}>
					{#each Array.from({ length: att.trophyCount }), i (i)}
						<span in:fade></span>
					{/each}
				</div>

				{#if att.life === 'won'}
					<div class="won" in:fade>
						{currentState.ranking.indexOf(i) + 1}位
					</div>
				{:else if att.life === 'lost'}
					<div class="lost" in:fade>失格</div>
				{:else if att.yasuDisplay > 0}
					<div class="yasu" in:fade>
						{#key att.yasuDisplay}
							{#if att.yasuCount === 'next'}次{/if}
							<span class="crossfade" in:fade={{ delay: 500 }} out:fade>{att.yasuDisplay}</span>
						{/key}
						休
					</div>
				{:else}
					<div
						class="buttons"
						onmouseenter={() => (attendantFLIPDelay = 600)}
						onmouseleave={() => (attendantFLIPDelay = 0)}
						role="group"
					>
						<button
							onclick={() => clickMaru(i)}
							class="maru-btn"
							{@attach tooltip(
								`${att.name || 'このプレイヤー'}に1○をつけて、問題カウントを1進めます（休みの人がいれば1休減ります）`,
								{ placement: 'bottom' }
							)}
						>
							O
						</button>
						{#if effect2Name}
							<button
								onclick={() => {
									history.push(new MaruHistoryEntry(i, 2));
									if (playSounds) {
										playSound(se1);
										setTimeout(() => playSound(se1), 150);
									}
									showBanner({ type: 'effect2', attendantID: i });
								}}
								class="maru-btn"
								{@attach tooltip(`${effect2Name}（+2○）`, { placement: 'bottom' })}
							>
								2O
							</button>
						{/if}
						{#if effect3Name}
							<button
								onclick={() => {
									history.push(new MaruHistoryEntry(i, 3));
									if (playSounds) {
										playSound(se1);
										setTimeout(() => playSound(se1), 150);
										setTimeout(() => playSound(se1), 300);
									}
									showBanner({ type: 'effect3', attendantID: i });
								}}
								class="maru-btn"
								{@attach tooltip(`${effect3Name}（+3○）`, { placement: 'bottom' })}
							>
								3O
							</button>
						{/if}
						<button
							onclick={() => clickBatsu(i)}
							class="batsu-btn"
							{@attach tooltip(
								`${att.name || 'このプレイヤー'}に1×をつけます（誰も正解しなければ最後にスルーボタンを押すのを忘れずに！）`,
								{ placement: 'bottom' }
							)}
						>
							X
						</button>
					</div>
				{/if}
			</div>
		{/each}
	</div>

	<Footer bind:footerClientHeight {attendants} {rules} {history}>
		<button
			onclick={clickThrough}
			class={{
				blink: currentState.attendants.some(
					({ yasuCount, rule: { yasuMode, yasuPerBatsu } }) =>
						yasuCount === 'next' && (yasuMode !== 'constant' || yasuPerBatsu > 0)
				)
			}}
			{@attach tooltip(
				'誰も正解しなかった場合に押します。問題カウントが1進み、休みの人がいれば1休減ります。'
			)}
		>
			スルー
		</button>
		<button
			onclick={clickUndo}
			disabled={history.length === 0}
			{@attach tooltip('直前の操作を無かったことにします。')}
			style="max-width: 20dvw"
		>
			{#key history.length}
				↩
				<span in:fade>{history.at(-1)?.toString(currentState) || 'この世の始まり'}</span>を元に戻す
			{/key}
		</button>
		<button onclick={() => addAttendant()} style="max-width: 20dvw">＋ プレイヤー追加</button>
		<button
			onclick={() => {
				if (
					confirm(
						'全員ゼロ〇ゼロ×にリセットしますか？\nこの操作は元に戻せません。\n（プレイヤーリスト、累積勝利数🏆は残ります）'
					)
				) {
					clearHistory();
				}
			}}
			disabled={history.length === 0}
			{@attach tooltip('全員のスコアだけをリセットします。')}
		>
			全員リセット
		</button>

		<button
			onclick={() => (showOtherMenu = !showOtherMenu)}
			onblur={() => setTimeout(() => (showOtherMenu = false), 1000)}
		>
			その他 ▼
		</button>
	</Footer>
</main>

{#if showOtherMenu}
	<div class="other-menu" transition:fade={{ duration: 100 }}>
		<button
			onclick={() => {
				if (
					confirm(
						'プレイヤーリストを空にした上で、初期状態にリセットしますか？\nこの操作は元に戻せません。'
					)
				) {
					attendants = [];
					history = [];
					buttonMapping = {};
					answerers = [];
					lastButtonID = undefined;
				}
			}}
			disabled={attendants.length === 0}
		>
			全削除
		</button>
		<button
			onclick={toggleScreenshotMode}
			{@attach tooltip('画面写真を撮りやすいようにプレイヤー名をぼかします')}
		>
			📸モード{#if screenshotModeTimer != null}をOFFに{/if}
		</button>
		<button onclick={logDialog.open}>履歴確認</button>
		<button
			onclick={() => (showMarubatsuOverride = !showMarubatsuOverride)}
			disabled={currentState.defaultRule.mode === 'marubatsu'}
			{@attach tooltip('スコア表示を強制的に○×表示に切り替えます')}
		>
			マルバツ表示{#if showMarubatsuOverride}をOFFに{/if}
		</button>
		<button
			onclick={() => (showScore = !showScore)}
			{@attach tooltip('スコア表示のオンオフを切り替えます')}
		>
			スコアを{#if showScore}隠す{:else}表示する{/if}
		</button>
		<button
			onclick={() => (orderingMode = orderingMode === 'ranking' ? 'manual' : 'ranking')}
			{@attach tooltip('プレイヤーの並び順を切り替えます')}
		>
			並び順：{#if orderingMode === 'ranking'}ランキング{:else}手動{/if}
		</button>
		<button
			onclick={() => {
				orderingMode = 'manual';
				orderedAttendants
					.toSorted((a, b) => attendants[a].group - attendants[b].group)
					.forEach((a, i) => (attendants[a].manualOrder = i));
			}}
		>
			グループ順に整列
		</button>
		<button onclick={editEffects} {@attach tooltip('エフェクトボタンの設定を編集します')}>
			エフェクトボタン設定
		</button>
		<button
			onclick={() => (playSounds = !playSounds)}
			{@attach tooltip('効果音のオンオフを切り替えます')}
		>
			{#if playSounds}🔊 ON{:else}🔇 OFF{/if}
		</button>
		<button onclick={editAppearance} {@attach tooltip('外観の設定を編集します')}>
			デザイン設定
		</button>
		<button
			onclick={() => (enableRating = !enableRating)}
			{@attach tooltip('レーティング自動計算のオンオフを切り替えます')}
		>
			{#if enableRating}レートON{:else}レートOFF{/if}
		</button>
		<button onclick={openSubWindow}>操作盤表示</button>
		<button disabled={serialPort != null} onclick={() => initiateSerialConnection()}>
			早稲田式連携
		</button>
	</div>
{/if}

{#if isBannerVisible}
	<div class="banner-bg" transition:fade>
		<Stars />
	</div>
	<div class={['banner', isBannerVisible.type]} transition:slide={{ axis: 'x' }}>
		{#if 'attendantID' in isBannerVisible}
			{attendants[isBannerVisible.attendantID].name ||
				'プレイヤー ' + (isBannerVisible.attendantID + 1)}
		{/if}
		{#if isBannerVisible.type === 'won'}
			勝ち抜け
		{:else if isBannerVisible.type === 'lizhi'}
			リーチ
		{:else if isBannerVisible.type === 'effect2'}
			{effect2Name}
		{:else if isBannerVisible.type === 'effect3'}
			{effect3Name}
		{:else if isBannerVisible.type === 'transit'}
			通過席
		{/if}
	</div>
{/if}

<Pushers {answererRanking} {attendants} {wasedashikiMode} />

<RuleEditDialog bind:this={ruleEditDialog} />
<LogDialog bind:this={logDialog} />
<EffectEditDialog bind:this={effectEditDialog} />
<AppearanceDialog bind:this={appearanceDialog} />
<StateEditDialog bind:this={stateEditDialog} />
<PenaltyRoulette bind:this={penaltyRoulette} />

<style>
	:global(html) {
		--trophy-image: url('$lib/assets/trophy.png');
	}
	main {
		.attendants {
			display: grid;
			gap: 0.5em;

			.attendant {
				display: grid;
				position: relative;
				grid-template-rows: subgrid;
				gap: 0.35em;
				backdrop-filter: blur(10px);
				transition:
					background-color 0.3s ease,
					backdrop-filter 0.3s ease;
				box-shadow: 0 0 15px #eeea;
				border-radius: 1.5em 0 1em 0;
				background-color: #ffffff40;
				padding: 0.5em;
				color: #fff;
				text-shadow:
					0px 10px 50px #444,
					0px 10px 50px #444;

				button {
					backdrop-filter: blur(10px);
					box-shadow: 3px 3px 6px #00000080;
					border: none;
					border-radius: 0;
					background-color: #00000040;
					color: #fff;

					&:disabled {
						opacity: 1;
						color: #0004;
					}
				}

				&.lizhi {
					box-shadow: 0 2px 2px 6px rgb(230 230 37);
					background-color: rgba(255 255 158 / 0.5);
				}
				&:has(.won) {
					box-shadow: 0 2px 2px 6px rgb(61 184 61);
					background-color: rgba(114 250 114 / 0.5);
				}
				&:has(.yasu) {
					opacity: 0.7;
					backdrop-filter: blur(5px);
					background-color: rgba(128 128 128 / 0.3);
				}
				&:has(.lost) {
					background-color: rgba(240 128 128 / 0.8);
				}

				.answerer,
				.button-mapping {
					display: flex;
					position: absolute;
					justify-content: center;
					align-items: center;
				}
				.answerer {
					top: -0.75em;
					left: 0;
					border-radius: 1em;
					background: black;
					width: 100%;
					color: #fff;
					font-size: 0.5em;
				}
				.button-mapping {
					top: 0.2em;
					right: 0.25em;
					z-index: 20;
					border-radius: 5em;
					background: grey;
					width: 1.5em;
					height: 1.5em;
					color: white;
					font-size: 0.4em;
				}

				.group {
					z-index: 10;
					transition: background-color 0.3s ease;
					border-radius: 2em 0.5em 0 0;
				}

				.name {
					display: flex;
					position: relative;
					flex: 1 1 100px;
					align-items: center;
					margin: -1em -0.5em;
					padding: 0;
					padding-top: calc(1em + 5px);
					padding-bottom: 1em;
					overflow: hidden;
					font-weight: bold;
					line-height: 1.1;
					text-wrap: balance;
					word-break: break-all;

					&:focus {
						margin: 0 -0.5em;
						padding-top: 5px;
						padding-bottom: 0;
					}

					&:empty:not(:focus)::before {
						cursor: text;
						content: attr(placeholder);
						color: #aaa;
						text-wrap: initial;
					}

					&.answerer-1st {
						animation: answerer-1st 0.3s ease infinite alternate;
					}

					&.answerer-2nd {
						color: yellow;
						text-shadow:
							0px 10px 50px #aa08,
							0px 10px 50px #aa08,
							0px 10px 50px #aa08;
					}

					&.answerer-late {
						text-shadow:
							0px 10px 50px #aa08,
							0px 10px 50px #aa08,
							0px 10px 50px #aa08;
					}

					&.blurred {
						filter: blur(15px);
					}

					&.show-bar:after {
						display: block;
						position: absolute;
						bottom: 0;
						z-index: -1;
						filter: blur(5px);
						border-radius: 1em 0 0 0;
						background: #0a1e3666;
						width: 40%;
						height: calc(70% * var(--bar-height-ratio) + 1em);
						content: '';
					}

					&:focus:after {
						display: none;
					}
				}

				&:has(.answerer-1st) {
					animation: answerer-1st-wrapper 0.3s ease infinite alternate;
				}

				&:hover,
				&:has(.name:focus-within) {
					backdrop-filter: blur(20px);
					box-shadow:
						0 2px 2px 3px #ccc,
						0 0 30px #eee;
					background-color: #fafafa;
					.name {
						color: #000;
						text-shadow: none;
					}
				}

				.hidden-buttons {
					display: none;
					position: absolute;
					bottom: 50%;
					left: -0.5em;
					flex-direction: column;
					flex-wrap: wrap;
					justify-content: space-evenly;
					gap: 3px;
					translate: 0% 50%;
					font-size: 0.3em;

					button:hover:not([disabled]) {
						background: #444;
					}
				}

				&:hover .hidden-buttons {
					display: flex;
				}

				.trophies {
					display: flex;
					position: absolute;
					right: -0.5em;
					flex-direction: column;

					span {
						transition: margin-top 0.3s ease;
						box-shadow: 0 0 3px #888;
						border-radius: 50%;
						background-image: var(--trophy-image);
						background-position: center;
						background-size: cover;
						background-color: #ffffffaa;
						width: 1.375em;
						height: 1.375em;
					}

					&:has(:nth-child(8)) span:nth-child(n + 2) {
						margin-top: calc(-0.5 * 1.375em);
					}

					&:has(:nth-child(15)) span:nth-child(n + 2) {
						margin-top: calc(-0.75 * 1.375em);
					}
				}

				.score {
					position: relative;
					align-content: center;
					margin: 0 -0.25em;
					border-radius: 0.2em;
					background-color: #111;
					padding-bottom: 0.1em;
					font-weight: bold;
					line-height: 0.9;
					text-align: center;
					text-shadow: 0 0 5px #000e;

					> * {
						display: inline-block;
					}

					small {
						margin: 0 -0.25em;
						font-weight: normal;
						font-size: 0.4em;
					}

					.m-by-n-score {
						letter-spacing: -0.04em;
						text-align: center;

						small {
							display: block;
							font-size: 0.55em;
						}
					}

					.rate {
						font-size: 0.7em;
					}
					.maru-count {
						color: red;
						letter-spacing: -0.1em;
					}
					.batsu-count {
						color: rgb(140 140 255);
						letter-spacing: -0.1em;
					}

					.consecutive-count {
						display: flex;
						position: absolute;
						top: -1em;
						right: -0.4em;
						justify-content: center;
						align-items: center;
						box-shadow: 0 0 8px #000a;
						border-radius: 50%;
						width: 1.25em;
						height: 1.25em;
						font-weight: normal;
						line-height: 0.5em;
					}

					.lose-lizhi {
						animation: lose-lizhi-animation 1.2s ease infinite;
					}
				}

				.buttons,
				.yasu,
				.won,
				.lost {
					align-content: center;
					margin: 0 -1em;
					text-align: center;
				}

				.yasu {
					color: white;
					text-shadow:
						0px 0px 5px #000,
						0px 0px 5px #000,
						0px 0px 5px #000;
				}

				.buttons {
					display: flex;
					flex-wrap: wrap;
					justify-content: space-evenly;
					gap: 10px;
					margin: 0.2em -0.45em;
					font-size: 0.9em;

					> * {
						display: flex;
						flex: 1 1 40px;
						justify-content: center;
						align-items: center;
					}

					.maru-btn:hover:not(:active),
					.maru-btn:focus-visible:not(:active) {
						background-color: red;
						color: white;
					}
					.batsu-btn:hover:not(:active),
					.batsu-btn:focus-visible:not(:active) {
						background-color: blue;
						color: white;
					}
				}
			}

			&:empty::before {
				display: flex;
				grid-column: 1 / -1;
				justify-content: center;
				align-items: center;
				content: '🍔プレイヤーを追加してください🍔';
				color: #aaa;
				font-size: 3rem;
			}
		}
	}

	@property --bar-height-ratio {
		syntax: '<number>';
		initial-value: -999;
		inherits: true;
	}

	@keyframes blink-animation {
		to {
			opacity: 0.3;
		}
	}

	@keyframes lose-lizhi-animation {
		0%,
		100% {
			opacity: 0.3;
		}
		50% {
			opacity: 1;
		}
	}

	@keyframes answerer-1st {
		to {
			color: yellow;
			text-shadow:
				0px 10px 50px #aa08,
				0px 10px 50px #aa08,
				0px 10px 50px #aa08;
		}
	}

	@keyframes answerer-1st-wrapper {
		to {
			scale: 1.05;
		}
	}

	.other-menu {
		position: fixed;
		position-anchor: --footer;
		display: flex;
		right: anchor(right);
		bottom: anchor(top);
		flex-wrap: wrap;
		gap: 3px;
		box-shadow: -2px -2px 6px #666;
		background: #eee;
		padding: 0.5em;
		font-size: 2em;
		user-select: none;
	}

	audio {
		display: none;
	}
</style>

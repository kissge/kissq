<script lang="ts">
	import { watch } from 'runed';
	import { onMount, untrack } from 'svelte';
	import { flip } from 'svelte/animate';
	import { fade, slide } from 'svelte/transition';
	import Toastify from 'toastify-js';
	import 'toastify-js/src/toastify.css';
	import { loadFromHash } from '$lib/attendant';
	import Footer from '$lib/components/footer.svelte';
	import Header from '$lib/components/header.svelte';
	import LogDialog from '$lib/components/logDialog.svelte';
	import Pushers from '$lib/components/pushers.svelte';
	import QuestionWindow from '$lib/components/questionWindow.svelte';
	import RuleTeamEditDialog from '$lib/components/ruleTeamEditDialog.svelte';
	import Stars from '$lib/components/stars.svelte';
	import { RemoveHistoryEntry } from '$lib/historyEntry';
	import { pushLog, updateLog } from '$lib/logs';
	import { qZero } from '$lib/question';
	import { Rule } from '$lib/rule';
	import { connectToSerialPort, readLoopSerialPort, reconnect } from '$lib/serial';
	import { AttendantState, type GameEvent } from '$lib/state';
	import { tooltip, tooltipInteractive } from '$lib/tooltip.svelte';
	import { GameClass } from './game.svelte';
	import { WasedashikiClass } from './wasedashiki.svelte';

	let Game = new GameClass();
	let Wasedashiki = new WasedashikiClass();

	let headerClientHeight = $state(0);
	let footerClientHeight = $state(0);
	let gameTitle = $state('');

	// svelte-ignore non_reactive_update ...?
	let logDialog: { open: () => void };
	let ruleTeamEditDialog: { open: (rules: Rule[]) => Promise<Rule[] | null> };

	async function editRule() {
		const result = await ruleTeamEditDialog.open(Game.rules);

		if (result) {
			if (
				Game.history.length > 0 &&
				confirm(
					'全員のスコアのリセットも行いますか？\n\n※ しない場合、トロフィーが消えることなどがあります\n※ まだゲームの途中であれば無視してください'
				)
			) {
				clearHistory();
			}

			const activeRuleCount = result.filter(({ isRemoved }) => !isRemoved).length;
			if (activeRuleCount === 1) {
				Game.rules = result.filter(({ isRemoved }) => !isRemoved);
				Game.attendants.forEach((att) => {
					att.group = 0;
				});
			} else {
				const removedIndices = result.flatMap(({ isRemoved }, i) => (isRemoved ? [i] : []));
				Game.rules = result.filter(({ isRemoved }) => !isRemoved);
				Game.attendants.forEach((att) => {
					att.group = Math.max(0, att.group - removedIndices.filter((i) => i <= att.group).length);
				});
			}

			// showMarubatsuOverride = false;
			// showScore = true;
		}
	}

	let isBannerVisible = $state<GameEvent | null>(null);
	watch(
		() => Game.currentState.latestEvent,
		(curr, prev) => {
			if (
				curr?.type !== prev?.type ||
				(curr && prev && 'teamID' in curr && 'teamID' in prev && curr?.teamID !== prev?.teamID)
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

	function clearHistory() {
		pushLog(
			'team',
			gameTitle,
			Game.activeRulesText,
			Game.currentState,
			Game.attendants,
			Game.teams
		);

		const newAttendants = [...Game.attendants];
		const removedIndex = [];
		for (let i = 0, j = 0; i < newAttendants.length; i++) {
			if (Game.currentState.attendants[i]?.life === 'removed') {
				removedIndex.push(i);
				delete Wasedashiki.buttonMapping[i];
				j--;
			} else {
				if (j < 0) {
					Wasedashiki.buttonMapping[i + j] = Wasedashiki.buttonMapping[i];
					delete Wasedashiki.buttonMapping[i];
				}
			}
		}
		removedIndex.toReversed().forEach((i) => {
			newAttendants.splice(i, 1);
		});
		Game.attendants = newAttendants;

		Game.history = [];
	}

	$effect(() => {
		if (Game.history.length === 0) {
			return;
		}

		updateLog(
			'team',
			gameTitle,
			Game.currentState,
			Game.attendants,
			Game.activeRulesText,
			Game.teams
		);
	});

	async function initiateSerialConnection(serialPort_?: SerialPort) {
		if (!serialPort_) {
			try {
				Wasedashiki.serialPort = await connectToSerialPort();
			} catch (error) {
				Toastify({ text: '接続に失敗しました', style: { background: '#B00000' } }).showToast();
				console.error('接続エラー', error);
				Wasedashiki.serialPort = undefined;
				Game.wasedashikiMode = undefined;
				Wasedashiki.connected = false;
				return;
			}
		}

		while (Wasedashiki.serialPort) {
			console.log('Reading from serial port...');
			setTimeout(() => {
				if (!Wasedashiki.connected) {
					Wasedashiki.serialPort = undefined;
				}
			}, 2500);
			await readLoopSerialPort(
				Wasedashiki.serialPort,
				() => ({
					answerers: Wasedashiki.answerers,
					pushers: Wasedashiki.pushers,
					buttonMapping: Wasedashiki.buttonMapping,
					attendants: Game.currentState.attendants,
					clickMaru: Game.clickMaru.bind(Game),
					clickBatsu: Game.clickBatsu.bind(Game)
				}),
				(updates) => {
					if ('connected' in updates) Wasedashiki.connected = updates.connected!;
					if ('wasedashikiMode' in updates) Game.wasedashikiMode = updates.wasedashikiMode!;
					if ('answerers' in updates) Wasedashiki.answerers = updates.answerers!;
					if ('pushers' in updates) Wasedashiki.pushers = updates.pushers!;
					if ('lastButtonID' in updates) Wasedashiki.lastButtonID = updates.lastButtonID!;
					if ('serialPort' in updates) Wasedashiki.serialPort = updates.serialPort!;
				}
			);
			await new Promise((resolve) => setTimeout(resolve, 5000));
		}
	}

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
				Game.clickMaru(event.data.attendantID);
				break;

			case 'clickBatsu':
				Game.clickBatsu(event.data.attendantID);
				break;

			case 'clickThrough':
				Game.clickThrough();
				break;

			case 'clickUndo':
				Game.clickUndo();
				break;

			case 'clickReset':
				clearHistory();
				break;

			case 'addAttendant':
				if (Game.attendantsPerTeam.length > 0) {
					Game.addAttendant(Game.attendantsPerTeam.length - 1, event.data.name);
				}
				break;

			case 'ping':
				syncState();
				break;
		}
	}

	function syncState() {
		if (subWindow && !subWindow.closed) {
			const state = Object.fromEntries(
				Object.entries(Game.currentState).flatMap(([k, v]) =>
					k === 'teams'
						? []
						: k === 'attendants'
							? [
									[
										k,
										v.map((v: AttendantState) =>
											Object.fromEntries(Object.entries(v).filter(([k]) => k !== 'team'))
										)
									]
								]
							: [[k, v]]
				)
			);

			subWindow.postMessage(
				JSON.parse(
					JSON.stringify({
						command: 'syncState',
						mode: 'team',
						currentState: state,
						history: Game.history,
						answerers: Wasedashiki.answerers,
						buttonMapping: Wasedashiki.buttonMapping,
						wasedashikiMode: Game.wasedashikiMode
					})
				)
			);
		}
	}

	$effect(() => {
		// eslint-disable-next-line svelte/no-unused-svelte-ignore
		// svelte-ignore state_snapshot_uncloneable
		$state.snapshot([
			Game.currentState,
			Wasedashiki.answerers,
			Wasedashiki.buttonMapping,
			Game.wasedashikiMode
		]);
		syncState();
	});

	const urlParams = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
	let showQuestionWindow = $state(urlParams.has('qw'));
	let currentQuestion = $state(qZero);

	onMount(() => {
		const data = loadFromHash(true);

		if (data) {
			const groups = Math.max(...data.attendants.map(({ group }) => group));
			Game.rules = Array.from({ length: groups + 1 }, () => Game.rules[0]);
			Game.attendants = data.attendants;
			Wasedashiki.buttonMapping = data.buttonMapping ?? {};
			Wasedashiki.buttonMappingRestored = Object.keys(Wasedashiki.buttonMapping).length > 0;
		} else {
			Game.attendants = Array.from({ length: 2 }, (_, ti) =>
				Array.from({ length: 10 }, (_, ai) => ({
					name: '',
					group: 0,
					team: ti,
					seat: Math.floor(ai / 2),
					trophyCount: 0,
					totalScore: { num: 0, den: 0 },
					manualOrder: ti * 10 + ai
				})).flat()
			).flat();
		}

		Game.teams = Array.from(new Set(Game.attendants.map(({ team }) => team)), () => '');

		reconnect()
			.then((port) => {
				if (port) {
					Wasedashiki.serialPort = port;
					initiateSerialConnection(port);
					setTimeout(() => {
						if (Wasedashiki.connected) {
							Toastify({ text: '自動で早稲田式に接続しました' }).showToast();
						}
					}, 1500);
				}
			})
			.catch((error) => {
				console.error('接続エラー', error);
			});

		pushLog(
			'team',
			gameTitle,
			Game.activeRulesText,
			Game.currentState,
			Game.attendants,
			Game.teams
		);
		window.addEventListener('message', processWindowMessage);

		return () => window.removeEventListener('message', processWindowMessage);
	});

	$effect(() => {
		const data = { attendants: Game.attendants, buttonMapping: Wasedashiki.buttonMapping };
		$state.snapshot(data);
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
</script>

<svelte:head>
	<title>
		kissQ -
		{gameTitle ? gameTitle + ' - ' : ''}
		{Game.currentState.attendants
			.flatMap(({ name, life }) => (life !== 'removed' ? [name.slice(0, 3) || '👤'] : []))
			.join('・')}
		- クイズカウンター（得点表示機）のkissQ
	</title>
</svelte:head>

<main class="main">
	<Header
		bind:headerClientHeight
		questionCount={Game.currentState.questionCount}
		hideQuestionCount={Game.currentState.defaultRule.mode === 'aql'}
		bind:gameTitle
		battleMode="team"
		onBattleModeChange={clearHistory}
		attendants={Game.attendants}
		buttonMapping={Wasedashiki.buttonMapping}
		wasedashikiMode={Game.wasedashikiMode}
		rules={Game.rules}
		{editRule}
	/>

	<QuestionWindow {showQuestionWindow} {currentQuestion} />

	<div
		class="attendants"
		style:height={`calc(100vh - ${headerClientHeight + footerClientHeight}px - 30px ${showQuestionWindow ? '- 6.25em - 0.7rem' : ''})`}
	>
		{#each Game.attendantsPerTeam as seats, ti (ti)}
			<div class="team" animate:flip={{ duration: 200 }}>
				<div class="life">
					{#if Game.currentState.teams[ti].teamLife === 'won'}
						<div class="won">{Game.currentState.ranking.indexOf(ti) + 1}位</div>
					{:else if Game.currentState.teams[ti].teamLife === 'lost'}
						<div class="lost">失格</div>
					{/if}
				</div>
				<div class="team-name">
					<input placeholder={`チーム${ti + 1}`} bind:value={Game.teams[ti]} />
				</div>
				<div
					class="score"
					style:background={`hsl(${(360 / Game.currentState.teams.length) * ti}, 90%, 40%)`}
					{@attach tooltip('チームの総得点')}
				>
					{#key Game.currentState.teams[ti].teamScore}
						<span in:fade>
							{Game.currentState.teams[ti].teamScore}
						</span>
					{/key}
				</div>
				<div
					class="members"
					class:with-seat={Game.currentState.defaultRule.mode === 'aql' ||
						Game.currentState.defaultRule.mode === 'product'}
				>
					{#each seats as atts, si (atts?.map(({ j }) => j).join(',') ?? si)}
						{@const rowStart = seats
							.slice(0, si)
							.reduce((sum, seatAtts) => sum + (seatAtts?.length ?? 0), 1)}
						{@const maxSeat = seats.reduce(
							(max, atts) =>
								Math.max(max, atts?.reduce((m, { att }) => Math.max(m, att.seat), 0) ?? 0),
							0
						)}
						{@const batsuCount =
							atts?.reduce(
								(sum, { i }) => sum + (Game.currentState.attendants[i]?.batsuCount ?? 0),
								0
							) ?? 0}
						{@const seatTotal =
							atts?.reduce(
								(sum, { i }) => sum + (Game.currentState.attendants[i]?.score ?? 0),
								Game.currentState.defaultRule.mode === 'aql' ? 1 : 0
							) ?? 0}
						{#if !atts?.every(({ i }) => Game.currentState.attendants[i].life === 'removed')}
							<div
								class="grid-wrapper"
								class:group-by-seat={Game.currentState.defaultRule.mode === 'aql' ||
									Game.currentState.defaultRule.mode === 'product'}
							>
								<div
									class="seat-total"
									style:grid-row={`${rowStart} / span ${atts?.length}`}
									style:display={(atts?.length ?? 0) > 0 &&
									(Game.currentState.defaultRule.mode === 'aql' ||
										Game.currentState.defaultRule.mode === 'product')
										? ''
										: 'none'}
								>
									<div {@attach tooltip('枠の総得点')}>
										{#key seatTotal}
											<span in:fade>
												{seatTotal}
											</span>
										{/key}
									</div>
									<div
										class="batsu-count"
										style:display={Game.currentState.defaultRule.mode === 'aql' ? '' : 'none'}
									>
										{'✕'.repeat(batsuCount)}
									</div>
								</div>
								{#each atts?.filter(({ i }) => Game.currentState.attendants[i]?.life !== 'removed') as { att, i }, ai (ai)}
									{@const sAtt: AttendantState | undefined = Game.currentState.attendants[i]}
									{#if sAtt}
										<div
											class="member"
											style:grid-row-start={rowStart + ai}
											class:lizhi={sAtt.isLizhi}
											class:yasu={sAtt.yasuDisplay > 0}
											class:lost={sAtt.life === 'lost' ||
												(Game.currentState.defaultRule.mode === 'aql' && batsuCount >= 2)}
											class:first-member={si === 0 && ai === 0}
											{@attach Game.currentState.teams[ti].teamLife === 'alive' &&
												(Game.currentState.defaultRule.mode === 'aql' ? batsuCount < 2 : true) &&
												sAtt?.life === 'alive' &&
												sAtt.yasuDisplay === 0 &&
												tooltipInteractive(
													typeof document !== 'undefined'
														? `<div data-attendant-id="${i}">` +
																document
																	.getElementById('hover-menu')!
																	.innerHTML.replaceAll('data-on', 'on')
																	.replace(
																		'%teams%',
																		Game.teams
																			.map(
																				(team, j) =>
																					`<option ${ti === j ? 'selected' : ''}>${team.slice(0, 5) || `チーム${j + 1}`}</option>`
																			)
																			.join('')
																	) +
																'</div>'
														: ''
												)}
										>
											<div
												class="seat"
												style:display={Game.currentState.defaultRule.mode === 'aql' ||
												Game.currentState.defaultRule.mode === 'product'
													? ''
													: 'none'}
												{@attach tooltip('枠を変更します。')}
											>
												<select bind:value={Game.attendants[i].seat}>
													{#each Array.from({ length: maxSeat + 2 }, (_, si) => si) as si (si)}
														<option value={si}>{si + 1}</option>
													{/each}
												</select>
											</div>
											<div>
												{#if Game.activeRules.length > 1}
													<button
														class="group"
														style:background-color={`hsl(${(360 / Game.rules.length) * Game.attendants[i].group}, 70%, 40%)`}
														onclick={() => {
															do {
																Game.attendants[i].group =
																	(Game.attendants[i].group + 1) % Game.rules.length;
															} while (Game.rules[Game.attendants[i].group].isRemoved);
														}}
														{@attach tooltip('このプレイヤーの所属ルールグループを変更します。')}
													>
														{#key Game.attendants[i].group}
															<span class="crossfade" in:fade={{ delay: 500 }} out:fade>
																{String.fromCodePoint(65 + Game.attendants[i].group)}
															</span>
														{/key}
													</button>
												{/if}
												<button
													class="button-mapping"
													style={Wasedashiki.buttonMapping[i] == null
														? undefined
														: 1 <= Wasedashiki.buttonMapping[i] && Wasedashiki.buttonMapping[i] <= 6
															? 'background-color: red; color: white'
															: 7 <= Wasedashiki.buttonMapping[i] &&
																  Wasedashiki.buttonMapping[i] <= 12
																? 'background-color: blue; color: white'
																: 13 <= Wasedashiki.buttonMapping[i] &&
																	  Wasedashiki.buttonMapping[i] <= 18
																	? 'background-color: yellow; color: black'
																	: 'background-color: green; color: white'}
													style:display={Wasedashiki.lastButtonID == undefined &&
													!Wasedashiki.buttonMappingRestored
														? 'none'
														: ''}
													disabled={Wasedashiki.lastButtonID == undefined &&
														!Wasedashiki.buttonMappingRestored}
													{@attach tooltip(
														`このプレイヤーが持っているボタンは${Wasedashiki.buttonMapping[i] == null ? '???' : Wasedashiki.buttonMapping[i]}番です。クリックで紐づけ`
													)}
													onclick={() => {
														if (Wasedashiki.lastButtonID !== undefined) {
															Wasedashiki.buttonMapping = {
																...Object.fromEntries(
																	Object.entries(Wasedashiki.buttonMapping).filter(
																		([, v]) => v !== Wasedashiki.lastButtonID
																	)
																),
																[i]: Wasedashiki.lastButtonID!
															};
															Toastify({
																text: `ボタン${Wasedashiki.lastButtonID}は${att.name || `プレイヤー${i + 1}`}が持っています`
															}).showToast();
														}
													}}
												>
													{Wasedashiki.buttonMapping[i] ?? '?'}
												</button>
												<input
													class={[
														'name',
														{
															'answerer-1st':
																Wasedashiki.answerers[(Wasedashiki.buttonMapping[i] ?? 0) - 1]
																	?.rank === 1,
															'answerer-2nd':
																(Game.wasedashikiMode === 'endless' ||
																	Game.wasedashikiMode === 'double') &&
																Wasedashiki.answerers[(Wasedashiki.buttonMapping[i] ?? 0) - 1]
																	?.rank === 2,
															'answerer-late':
																Game.wasedashikiMode === 'endless' &&
																Wasedashiki.answerers[(Wasedashiki.buttonMapping[i] ?? 0) - 1]
																	?.rank === 'late'
														}
													]}
													bind:value={att.name}
													placeholder={`プレイヤー${i + 1}`}
													onpaste={(e) => Game.handlePasteEvent(e, i, ti)}
												/>
												<small class="yasu">
													{#if sAtt?.yasuDisplay > 0}
														{#if sAtt.yasuCount === 'next'}次{/if}
														{sAtt.yasuDisplay}
														休
													{/if}
												</small>
											</div>
											<div class="score">
												{#key sAtt.score}
													<span in:fade>
														{sAtt.score}
													</span>
												{/key}
											</div>
											{#if Game.currentState.teams[ti].teamLife === 'alive' && (Game.currentState.defaultRule.mode === 'aql' ? batsuCount < 2 : true) && sAtt?.life === 'alive' && sAtt.yasuDisplay === 0}
												<div class="buttons" data-attendant-id={i}>
													<button
														class="delete-btn"
														disabled={Game.currentState.teams[ti].attendantIDsPerSeat
															.flat()
															.filter(
																(a) =>
																	a != null && Game.currentState.attendants[a].life !== 'removed'
															).length <= 1}
														onclick={() => Game.history.push(new RemoveHistoryEntry(i))}
														{@attach tooltip('このプレイヤーをリストから削除します。')}
														tabindex={-1}
													>
														削除
													</button>
													<select
														disabled={Game.history.length > 0 ||
															Game.currentState.teams[ti].attendantIDsPerSeat
																.flat()
																.filter(
																	(a) =>
																		a != null && Game.currentState.attendants[a].life !== 'removed'
																).length <= 1}
														bind:value={Game.attendants[i].team}
														onchange={() => {
															const t = Game.attendants[i].team;
															Game.attendants[i].team = Infinity;
															Game.attendants[i].seat =
																Game.currentState.teams[t].attendantIDsPerSeat.length;
															Game.attendants[i].team = t;
														}}
														{@attach tooltip('このプレイヤーのチームを変更します。')}
														tabindex={-1}
													>
														{#each Game.teams as team, j (j)}
															<option value={j}>{team?.slice(0, 5) || `チーム${j + 1}`}</option>
														{/each}
													</select>
													<button class="maru-btn" onclick={() => Game.clickMaru(i)} tabindex={-1}>
														O
													</button>
													<button
														class="batsu-btn"
														onclick={() => Game.clickBatsu(i)}
														tabindex={-1}
													>
														X
													</button>
												</div>
											{/if}
										</div>
									{/if}
								{/each}
							</div>
						{/if}
					{/each}
					<div class="bottom-buttons">
						<button
							disabled={Game.history.length > 0}
							onclick={() => {
								if (
									confirm(
										`${Game.teams[ti] || `チーム${ti + 1}`}を削除しますか？\nこの操作は元に戻せません。`
									)
								) {
									Game.attendants = Game.attendants
										.filter((_, i) => Game.attendants[i].team !== ti)
										.map((att) => {
											if (att.team > ti) {
												return { ...att, team: att.team - 1 };
											}
											return att;
										});
									Game.teams.splice(ti, 1);
								}
							}}
							{@attach tooltip('このチームを削除します。')}
						>
							削除
						</button>
						<div class="spacer"></div>
						<button
							onclick={() => Game.addAttendant(ti)}
							{@attach tooltip('このチームに新しいプレイヤーを追加します。')}
						>
							追加
						</button>
					</div>
				</div>
			</div>
		{:else}
			<div class="no-team">チームがありません🍔</div>
		{/each}
	</div>

	<Footer
		bind:footerClientHeight
		attendants={Game.attendants}
		rules={Game.rules}
		history={Game.history}
	>
		<button
			onclick={Game.clickThrough}
			class={{
				blink: Game.currentState.attendants.some(
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
			onclick={Game.clickUndo}
			disabled={Game.history.length === 0}
			{@attach tooltip('直前の操作を無かったことにします。')}
			style="max-width: 20dvw"
		>
			{#key Game.history.length}
				↩
				<span in:fade>{Game.history.at(-1)?.toString(Game.currentState) || 'この世の始まり'}</span
				>を元に戻す
			{/key}
		</button>
		<button
			onclick={() => {
				Game.teams.push('');
				Game.attendants.push({
					name: '',
					group: 0,
					team: Game.teams.length - 1,
					seat: 0,
					trophyCount: 0,
					totalScore: { num: 0, den: 0 },
					manualOrder: Game.attendants.length
				});
			}}>＋ チーム追加</button
		>
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
			disabled={Game.history.length === 0}
			{@attach tooltip('全員のスコアだけをリセットします。')}
		>
			全員リセット
		</button>
		<button popovertarget="other-menu"> その他 ▼ </button>
	</Footer>

	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		popover
		id="other-menu"
		onclick={(e) => {
			const t = e.currentTarget;
			setTimeout(() => t.hidePopover(), 1000);
		}}
		role="menu"
		tabindex="-1"
	>
		<button
			onclick={() => {
				if (
					confirm(
						'プレイヤーリストを空にした上で、初期状態にリセットしますか？\nこの操作は元に戻せません。'
					)
				) {
					Game.history = [];
					Game.attendants = [
						{
							name: '',
							group: 0,
							team: 0,
							seat: 0,
							trophyCount: 0,
							totalScore: { num: 0, den: 0 },
							manualOrder: 0
						}
					];
					Game.teams = [''];
					Wasedashiki.buttonMapping = {};
					Wasedashiki.answerers = [];
					Wasedashiki.lastButtonID = undefined;
				}
			}}
			{@attach tooltip('全員の名前・チーム・枠・スコアをリセットします。')}>全削除</button
		>
		<button onclick={logDialog.open}>履歴確認</button>
		<button
			onclick={() => (Game.playSounds = !Game.playSounds)}
			{@attach tooltip('効果音のオンオフを切り替えます')}
		>
			{#if Game.playSounds}🔊 ON{:else}🔇 OFF{/if}
		</button>
		<button onclick={openSubWindow}>操作盤表示</button>
		<button disabled={Wasedashiki.serialPort != null} onclick={() => initiateSerialConnection()}>
			早稲田式連携
		</button>
	</div>
</main>

{#if isBannerVisible}
	<div class="banner-bg" transition:fade>
		<Stars />
	</div>
	<div class={['banner', isBannerVisible.type]} transition:slide={{ axis: 'x' }}>
		{#if 'attendantID' in isBannerVisible}
			{Game.attendants[isBannerVisible.attendantID].name ||
				'プレイヤー ' + (isBannerVisible.attendantID + 1)}
		{:else}
			{Game.teams[isBannerVisible.teamID] || 'チーム ' + (isBannerVisible.teamID + 1)}
		{/if}
		{#if isBannerVisible.type === 'won'}
			勝ち抜け
		{:else if isBannerVisible.type === 'lizhi'}
			リーチ
		{:else if isBannerVisible.type === 'double-lizhi'}
			ダブルリーチ
		{:else if isBannerVisible.type === 'effect2'}
			!!
		{:else if isBannerVisible.type === 'effect3'}
			!!
		{:else if isBannerVisible.type === 'transit'}
			通過席
		{/if}
	</div>
{/if}

<template id="hover-menu">
	<button
		data-onclick="document.querySelector('.buttons[data-attendant-id=\'' + this.parentElement.dataset.attendantId + '\'] .delete-btn').click()"
	>
		削除
	</button>
	<br />
	<select
		data-onchange="s = document.querySelector('.buttons[data-attendant-id=\'' + this.parentElement.dataset.attendantId + '\'] select'); s.selectedIndex = this.selectedIndex; s.dispatchEvent(new Event('change'))"
	>
		%teams%
	</select>
	<br />

	<button
		data-onclick="document.querySelector('.buttons[data-attendant-id=\'' + this.parentElement.dataset.attendantId + '\'] .maru-btn').click()"
	>
		O
	</button>
	<button
		data-onclick="document.querySelector('.buttons[data-attendant-id=\'' + this.parentElement.dataset.attendantId + '\'] .batsu-btn').click()"
	>
		X
	</button>
</template>

<Pushers
	answererRanking={Wasedashiki.answererRanking}
	attendants={Game.attendants}
	wasedashikiMode={Game.wasedashikiMode}
	{headerClientHeight}
	{footerClientHeight}
/>

<RuleTeamEditDialog bind:this={ruleTeamEditDialog} />
<LogDialog bind:this={logDialog} />

<style>
	main.main {
		font-size: max(1.5dvw, 24px);
	}

	.attendants {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 1em;
		user-select: none;

		input {
			border: none;
			background: transparent;
			width: 8em;
			color: #fff;
			font-size: inherit;
			text-align: center;
			text-shadow:
				0px 0px 12px #0007,
				0px 0px 12px #0007;

			&::placeholder {
				text-shadow: none;
			}
		}
	}

	.team {
		display: grid;
		grid-template-rows: 2em 1fr;
		grid-template-columns: 2em minmax(0, 1fr) 2em;
		row-gap: 0.25em;
		flex: 1 1 560px;
		backdrop-filter: blur(10px);
		transition:
			background-color 0.3s ease,
			backdrop-filter 0.3s ease;
		box-shadow: 0 0 15px #eeea;
		border-radius: 1.5em 0 1em 0;
		background-color: #ffffff40;
		padding: 0.25em;
		min-width: 0;
		color: #fff;
		text-shadow:
			0px 10px 50px #444,
			0px 10px 50px #444;

		input {
			flex: 1 1 3em;
			width: 100%;
			min-width: 0;

			&::placeholder {
				color: #fff;
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

		.life {
			display: flex;
			justify-content: center;
			align-items: center;
			color: #fff;
			font-weight: bold;
			font-size: 0.8em;
			text-shadow:
				0px 10px 50px #444,
				0px 10px 50px #444;
		}

		.team-name {
			display: flex;
			justify-content: center;
			align-items: center;
			padding: 0 0.5em;
			min-width: 0;
			text-align: center;
		}

		& > .score {
			display: flex;
			justify-content: center;
			align-items: center;
			box-shadow: 0 0 10px #0008;
			border-radius: 5em;
			font-weight: bold;
			text-align: center;
			text-shadow: 0 0 8px #000;
		}

		.members {
			display: grid;
			grid-template-columns: 1fr 2em;
			grid-column: 1 / -1;
			align-content: start;
			padding-right: 0.75em;
			padding-left: 0.75em;

			&.with-seat {
				grid-template-columns: 2em 1fr 2em 2.5em;
				padding-right: 0;

				.member {
					grid-column: 1 / -2;
				}
			}

			.grid-wrapper {
				display: contents;

				&.group-by-seat {
					& .member:not(:nth-child(2)):not(:last-child) {
						border-top-right-radius: 0;
						border-bottom-right-radius: 0;
						.score {
							border-top-right-radius: 0;
							border-bottom-right-radius: 0;
						}
					}

					& .member:nth-child(2):not(:last-child) {
						border-bottom-right-radius: 0;
						.score {
							border-bottom-right-radius: 0;
						}
					}

					& .member:last-child:not(:nth-child(2)) {
						border-top-right-radius: 0;
						.score {
							border-top-right-radius: 0;
						}
					}
				}
			}

			.seat-total {
				display: flex;
				position: relative;
				grid-column: -2 / -1;
				flex-direction: column;
				justify-content: center;
				align-items: center;
				gap: 0;
				padding-right: 0.5em;
				font-weight: bold;
				line-height: 0.8;

				&:before {
					position: absolute;
					top: 0;
					left: -1.75em;
					rotate: 180deg;
					border-left: 5px solid #fff;
					border-radius: 0.75em;
					width: 2em;
					height: 100%;
					content: '';
				}

				.batsu-count {
					color: #f55;
					font-size: 0.8em;
				}
			}
		}

		.member {
			display: grid;
			grid-template-columns: subgrid;
			grid-column: 1 / -1;
			backdrop-filter: blur(10px);
			transition: opacity 1s ease;
			box-shadow: 0 0 15px #eeea;
			border-radius: 0 0.75em 0.75em 0;
			background-color: #ffffff40;
			height: 1.25em;
			color: #fff;
			text-shadow:
				0px 10px 50px #444,
				0px 10px 50px #444;

			&.first-member {
				border-top-left-radius: 0.5em;

				& .seat {
					border-top-left-radius: 0.5em;
				}
			}

			&:hover {
				background: white;
				input {
					color: black;
					text-shadow: none;
				}
			}

			& > div {
				display: flex;
				justify-content: center;
				align-items: center;
			}

			&.yasu {
				opacity: 0.7;
				backdrop-filter: blur(5px);
				background-color: rgba(128 128 128 / 0.3);
			}

			&.lost {
				opacity: 0.2;
			}

			&.lizhi {
				box-shadow: 0 2px 2px 3px rgb(230 230 37);
				background-color: rgba(255 255 158 / 0.5);
			}

			&:has(.answerer-1st) {
				animation: answerer-1st-wrapper 0.3s ease infinite alternate;
			}

			.button-mapping {
				display: flex;
				justify-content: center;
				align-items: center;
				z-index: 20;
				border-radius: 5em;
				background: grey;
				width: 1.5em;
				height: 1.5em;
				color: white;
				font-size: 0.7em;
			}

			.group {
				z-index: 10;
				transition: background-color 0.3s ease;
				color: white;
			}

			.name {
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

				&::placeholder {
					color: #888;
				}
			}

			.yasu {
				position: absolute;
				right: 3em;
			}

			.score {
				display: flex;
				border-radius: 0 1em 1em 0;
				background: #0007;
				font-weight: bold;
				font-size: 0.8em;
			}

			.seat {
				background: #0004;
				color: #fff;

				select {
					cursor: pointer;
					border: none;
					background: transparent;
					width: 100%;
					color: #fff;
					font-size: inherit;
					text-align: center;

					option {
						background: #000;
					}
				}
			}

			.buttons {
				display: flex;
				position: absolute;
				right: 0em;
				align-items: center;
				gap: 2px;
				opacity: 0;
				height: 100%;
				pointer-events: none;

				button,
				select {
					height: 2em;
					font-size: 0.5em;
				}
			}
		}

		.bottom-buttons {
			display: flex;
			position: absolute;
			right: 0.75em;
			bottom: 0.75em;
			grid-column: 1 / -1;
			align-items: center;
			opacity: 0;
			transition: opacity 0.3s;
			width: calc(100% - 0.75em * 2);

			&:is(.team:hover *) {
				opacity: 1;
			}

			.spacer {
				flex-grow: 1;
			}
		}
	}

	.no-team {
		flex: 1 1 100%;
		margin-top: calc(40dvh - 1em);
		color: #fff;
		text-align: center;
		text-shadow:
			0px 10px 50px #444,
			0px 10px 50px #444;
	}

	#other-menu {
		position: absolute;
		position-area: top;
		margin-bottom: 0.25em;
		box-shadow: 0 0 5px #0008;
		border: 0;
	}

	:global(.tippy-box:has(button)) {
		font-size: 1.2em;
		text-align: center;

		button,
		select,
		option {
			min-width: 4em;
			height: 2em;
			font-size: 1em;
		}
	}

	[popover] {
		animation: fadeIn 0.2s ease-in;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
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
</style>

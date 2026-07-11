<script lang="ts">
	import { watch } from 'runed';
	import { onMount, untrack } from 'svelte';
	import { fade, slide } from 'svelte/transition';
	import Toastify from 'toastify-js';
	import 'toastify-js/src/toastify.css';
	import se1 from '$lib/assets/se1.mp3';
	import se2 from '$lib/assets/se2.mp3';
	import se3 from '$lib/assets/se3.mp3';
	import { loadFromHash, type Attendant } from '$lib/attendant';
	import Footer from '$lib/components/footer.svelte';
	import Header from '$lib/components/header.svelte';
	import RuleTeamEditDialog from '$lib/components/ruleTeamEditDialog.svelte';
	import Stars from '$lib/components/stars.svelte';
	import {
		BatsuHistoryEntry,
		MaruHistoryEntry,
		RemoveHistoryEntry,
		ThroughHistoryEntry,
		type HistoryEntry
	} from '$lib/historyEntry';
	import { getActiveRulesText, Rule } from '$lib/rule';
	import {
		connectToSerialPort,
		readLoopSerialPort,
		reconnect,
		type WasedashikiMode
	} from '$lib/serial';
	import { playSound } from '$lib/sound';
	import { AttendantState, GameState, type GameEvent } from '$lib/state';
	import { tooltip } from '$lib/tooltip.svelte';

	let headerClientHeight = $state(0);
	let footerClientHeight = $state(0);
	let gameTitle = $state('');

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
			manualOrder: 0
		},
		{
			name: '',
			group: 0,
			team: 0,
			seat: 1,
			trophyCount: 0,
			totalScore: { num: 0, den: 0 },
			manualOrder: 0
		},
		{
			name: '',
			group: 0,
			team: 0,
			seat: 1,
			trophyCount: 0,
			totalScore: { num: 0, den: 0 },
			manualOrder: 0
		},
		{
			name: '',
			group: 0,
			team: 0,
			seat: 2,
			trophyCount: 0,
			totalScore: { num: 0, den: 0 },
			manualOrder: 0
		},
		{
			name: '',
			group: 0,
			team: 0,
			seat: 2,
			trophyCount: 0,
			totalScore: { num: 0, den: 0 },
			manualOrder: 0
		},
		{
			name: '',
			group: 0,
			team: 0,
			seat: 3,
			trophyCount: 0,
			totalScore: { num: 0, den: 0 },
			manualOrder: 0
		},
		{
			name: '',
			group: 0,
			team: 0,
			seat: 3,
			trophyCount: 0,
			totalScore: { num: 0, den: 0 },
			manualOrder: 0
		},
		{
			name: '',
			group: 0,
			team: 0,
			seat: 4,
			trophyCount: 0,
			totalScore: { num: 0, den: 0 },
			manualOrder: 0
		},
		{
			name: '',
			group: 0,
			team: 0,
			seat: 4,
			trophyCount: 0,
			totalScore: { num: 0, den: 0 },
			manualOrder: 0
		},
		{
			name: '',
			group: 0,
			team: 1,
			seat: 0,
			trophyCount: 0,
			totalScore: { num: 0, den: 0 },
			manualOrder: 0
		},
		{
			name: '',
			group: 0,
			team: 1,
			seat: 0,
			trophyCount: 0,
			totalScore: { num: 0, den: 0 },
			manualOrder: 0
		},
		{
			name: '',
			group: 0,
			team: 1,
			seat: 1,
			trophyCount: 0,
			totalScore: { num: 0, den: 0 },
			manualOrder: 0
		},
		{
			name: '',
			group: 0,
			team: 1,
			seat: 1,
			trophyCount: 0,
			totalScore: { num: 0, den: 0 },
			manualOrder: 0
		},
		{
			name: '',
			group: 0,
			team: 1,
			seat: 2,
			trophyCount: 0,
			totalScore: { num: 0, den: 0 },
			manualOrder: 0
		},
		{
			name: '',
			group: 0,
			team: 1,
			seat: 2,
			trophyCount: 0,
			totalScore: { num: 0, den: 0 },
			manualOrder: 0
		},
		{
			name: '',
			group: 0,
			team: 1,
			seat: 3,
			trophyCount: 0,
			totalScore: { num: 0, den: 0 },
			manualOrder: 0
		},
		{
			name: '',
			group: 0,
			team: 1,
			seat: 3,
			trophyCount: 0,
			totalScore: { num: 0, den: 0 },
			manualOrder: 0
		},
		{
			name: '',
			group: 0,
			team: 1,
			seat: 4,
			trophyCount: 0,
			totalScore: { num: 0, den: 0 },
			manualOrder: 0
		},
		{
			name: '',
			group: 0,
			team: 1,
			seat: 4,
			trophyCount: 0,
			totalScore: { num: 0, den: 0 },
			manualOrder: 0
		}
	]);
	let teams = $state(['', '']);

	let rules = $state([new Rule('aql', 200, null, 1, 'updown', false, null, 'constant', 0, null)]);
	let { activeRules } = $derived(getActiveRulesText(rules, 'team'));

	let history = $state<HistoryEntry[]>([]);
	let currentState = $derived(
		history.reduce(
			(state, entry) => entry.reducerTeam(state.clearLatestEvent()).updateRanking(),
			new GameState(attendants, rules, teams).updateRanking()
		)
	);
	let attendantsPerTeam = $derived.by(() => {
		const atts = attendants.reduce<
			({ att: Attendant; state: AttendantState; i: number; j: number }[] | undefined)[][]
		>(
			(acc, att, i) => {
				const stateAtt = currentState.attendants[i];
				if (!stateAtt) return acc;

				acc[att.team] ??= [];
				acc[att.team][att.seat] ??= [];
				acc[att.team][att.seat]!.push({ att, state: stateAtt, i, j: 0 });
				return acc;
			},
			teams.map(() => [])
		);

		let j = 0;
		atts.forEach((team) => team.forEach((seat) => seat!.forEach((att) => (att.j = j++))));

		return atts;
	});
	let activeRuleMode = $derived(currentState.defaultRule.mode);

	let ruleTeamEditDialog: { open: (rules: Rule[]) => Promise<Rule[] | null> };

	async function editRule() {
		const result = await ruleTeamEditDialog.open(rules);

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
			}

			if (result[0].mode !== 'aql') {
				attendantsPerTeam.forEach((team) => {
					let seatCount = 0;
					team.forEach((seat) => {
						seat?.forEach((att) => {
							att.att.seat = seatCount++;
						});
					});
				});
			}

			// showMarubatsuOverride = false;
			// showScore = true;
		}
	}

	let isBannerVisible = $state<GameEvent | null>(null);
	watch(
		() => currentState.latestEvent,
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

	let playSounds = $state(true);

	function clickMaru(attendantID: number, playSounds_: boolean = true) {
		history.push(new MaruHistoryEntry(attendantID));
		if (playSounds && playSounds_) {
			playSound(se1);
		}
	}

	async function clickBatsu(attendantID: number, playSounds_: boolean = true) {
		const single = wasedashikiMode === 'single' || wasedashikiMode === 'handicap';

		history.push(new BatsuHistoryEntry(attendantID, single));
		if (playSounds && playSounds_) {
			playSound(se2);
		}
	}

	function clickThrough() {
		history.push(new ThroughHistoryEntry());
		if (playSounds) playSound(se3);
	}

	function clickUndo() {
		history.pop();
	}

	function clearHistory() {
		attendants = attendants.filter((_, i) => currentState.attendants[i]?.life !== 'removed');
		history = [];
	}

	let serialPort = $state<SerialPort>();
	let answerers = $state<({ rank: 1 | 2 | 'late'; delay: number } | null)[]>([]);
	let lastButtonID = $state<number>();
	/** attendant ID -> button ID */
	let buttonMapping = $state<Record<number, number>>({});
	let wasedashikiMode = $state<WasedashikiMode>();
	let connected = $state(false);

	async function initiateSerialConnection(serialPort_?: SerialPort) {
		if (!serialPort_) {
			try {
				serialPort = await connectToSerialPort();
			} catch (error) {
				Toastify({ text: '接続に失敗しました', style: { background: '#B00000' } }).showToast();
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

	let pushers: number[] = [];

	onMount(() => {
		const data = loadFromHash(true);

		if (data) {
			attendants = data;

			teams = Array.from(new Set(data.map(({ team }) => team)), () => '');
			data.forEach(({ buttonID }, i) => {
				if (buttonID != null) {
					buttonMapping[i] = buttonID;
				}
			});
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
	});

	$effect(() => {
		let data = currentState.teams.map((team) =>
			team.attendantIDsPerSeat.flatMap((seat) => seat?.map((id) => attendants[id].name))
		);
		untrack(() => {
			if (data.every((ns) => ns.every((n) => n === ''))) {
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

<main class="main">
	<Header
		bind:headerClientHeight
		questionCount={currentState.questionCount}
		{gameTitle}
		battleMode="team"
		otherModeMembers={Object.keys(buttonMapping).length > 0
			? attendants.map(({ name }, i) => [name, buttonMapping[i]])
			: attendants.map(({ name }) => name)}
		{wasedashikiMode}
		{rules}
		{editRule}
	/>

	<div
		class="attendants"
		style:height={`calc(100vh - ${headerClientHeight + footerClientHeight}px - 30px)`}
	>
		{#each attendantsPerTeam as seats, ti (ti)}
			<div class="team" class:lizhi={/** TODO */ false}>
				<div class="life">
					{#if currentState.teams[ti].teamLife === 'won'}
						<div class="won">{currentState.ranking.indexOf(ti) + 1}位</div>
					{:else if currentState.teams[ti].teamLife === 'lost'}
						<div class="lost">失格</div>
					{/if}
				</div>
				<div class="team-name">
					<input placeholder={`チーム${ti + 1}`} bind:value={teams[ti]} />
					<div class="buttons">
						<button
							disabled={history.length > 0}
							onclick={() => {
								if (
									confirm(
										`${teams[ti] || `チーム${ti + 1}`}を削除しますか？\nこの操作は元に戻せません。`
									)
								) {
									attendants = attendants
										.filter((_, i) => attendants[i].team !== ti)
										.map((att) => {
											if (att.team > ti) {
												return { ...att, team: att.team - 1 };
											}
											return att;
										});
									teams.splice(ti, 1);
								}
							}}
							{@attach tooltip('このチームを削除します。')}
						>
							削除
						</button>
					</div>
				</div>
				<div class="score">{currentState.teams[ti].teamScore}</div>
				<div class="members" class:with-seat={activeRuleMode === 'aql'}>
					{#each seats as atts, si (atts?.map(({ j }) => j) ?? si)}
						{@const rowStart = seats
							.slice(0, si)
							.reduce((sum, seatAtts) => sum + (seatAtts?.length ?? 0), 1)}
						{@const maxSeat = seats.reduce(
							(max, atts) =>
								Math.max(max, atts?.reduce((m, { att }) => Math.max(m, att.seat), 0) ?? 0),
							0
						)}
						{@const batsuCount = atts?.reduce((sum, { state }) => sum + state.batsuCount, 0) ?? 0}
						<div class="grid-wrapper">
							<div
								class="seat-total"
								style:grid-row={`${rowStart} / span ${atts?.length}`}
								style:display={(atts?.length ?? 0) > 0 && activeRuleMode === 'aql' ? '' : 'none'}
							>
								<div>{atts?.reduce((sum, { state }) => sum + state.score, 1)}</div>
								<div class="batsu-count">
									{'✕'.repeat(batsuCount)}
								</div>
							</div>
							{#each atts?.filter(({ state }) => state.life !== 'removed') as { att, state, i }, ai (ai)}
								{@const sAtt = state}
								<div
									class="member"
									style:grid-row-start={rowStart + ai}
									class:lizhi={sAtt.isLizhi}
									class:yasu={sAtt.yasuDisplay > 0}
									class:lost={sAtt.life === 'lost' || (activeRuleMode === 'aql' && batsuCount >= 2)}
								>
									<div
										class="seat"
										style:display={activeRuleMode === 'aql' ? '' : 'none'}
										{@attach tooltip('枠を変更します。')}
									>
										<select bind:value={attendants[i].seat}>
											{#each Array.from({ length: maxSeat + 2 }, (_, si) => si) as si (si)}
												<option value={si}>{si + 1}</option>
											{/each}
										</select>
									</div>
									<div>
										{#if activeRules.length > 1}
											<button
												class="group"
												style:background-color={`hsl(${(360 / rules.length) * attendants[i].group}, 70%, 40%)`}
												onclick={() => {
													do {
														attendants[i].group = (attendants[i].group + 1) % rules.length;
													} while (rules[attendants[i].group].isRemoved);
												}}
												{@attach tooltip('このプレイヤーの所属ルールグループを変更します。')}
											>
												{#key attendants[i].group}
													<span class="crossfade" in:fade={{ delay: 500 }} out:fade>
														{String.fromCodePoint(65 + attendants[i].group)}
													</span>
												{/key}
											</button>
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
											style:display={Object.keys(buttonMapping).length === 0 ? 'none' : ''}
											disabled={Object.keys(buttonMapping).length === 0 ||
												lastButtonID == undefined}
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
										<input
											class={[
												'name',
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
											bind:value={att.name}
											placeholder={`プレイヤー${i + 1}`}
										/>
										<small class="yasu">
											{#if sAtt.yasuDisplay > 0}
												{#if sAtt.yasuCount === 'next'}次{/if}
												{sAtt.yasuDisplay}
												休
											{/if}
										</small>
									</div>
									<div class="score">
										{sAtt.score}
									</div>
									{#if currentState.teams[ti].teamLife === 'alive' && (activeRuleMode === 'aql' ? batsuCount < 2 : true) && sAtt.life === 'alive' && sAtt.yasuDisplay === 0}
										<div class="buttons">
											<select
												disabled={currentState.teams[ti].attendantIDsPerSeat
													.flat()
													.filter((a) => a != null && currentState.attendants[a].life !== 'removed')
													.length <= 1}
												bind:value={attendants[i].team}
												onchange={() => {
													const t = attendants[i].team;
													attendants[i].team = Infinity;
													attendants[i].seat = currentState.teams[t].attendantIDsPerSeat.length;
													attendants[i].team = t;
												}}
												{@attach tooltip('このプレイヤーのチームを変更します。')}
											>
												{#each teams as team, j (j)}
													<option value={j}>{team?.slice(0, 5) || `チーム${j + 1}`}</option>
												{/each}
											</select>
											<button
												disabled={currentState.teams[ti].attendantIDsPerSeat
													.flat()
													.filter((a) => a != null && currentState.attendants[a].life !== 'removed')
													.length <= 1}
												onclick={() => history.push(new RemoveHistoryEntry(i))}
												{@attach tooltip('このプレイヤーをリストから削除します。')}
											>
												削除
											</button>
											<button onclick={() => clickMaru(i)}>O</button>
											<button onclick={() => clickBatsu(i)}>X</button>
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{/each}
					<div class="add-button-wrapper">
						<button
							onclick={() =>
								attendants.push({
									name: '',
									group: 0,
									team: ti,
									seat: activeRuleMode === 'aql' ? seats.length - 1 : seats.length,
									trophyCount: 0,
									totalScore: { num: 0, den: 0 },
									manualOrder: attendants.length
								})}
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
		<button
			onclick={() => {
				teams.push('');
				attendants.push({
					name: '',
					group: 0,
					team: teams.length - 1,
					seat: 0,
					trophyCount: 0,
					totalScore: { num: 0, den: 0 },
					manualOrder: attendants.length
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
			disabled={history.length === 0}
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
					history = [];
					attendants = [
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
					teams = [''];
					buttonMapping = {};
					answerers = [];
					lastButtonID = undefined;
				}
			}}
			{@attach tooltip('全員の名前・チーム・枠・スコアをリセットします。')}>全削除</button
		>
		<button
			onclick={() => (playSounds = !playSounds)}
			{@attach tooltip('効果音のオンオフを切り替えます')}
		>
			{#if playSounds}🔊 ON{:else}🔇 OFF{/if}
		</button>
		<button disabled={serialPort != null} onclick={() => initiateSerialConnection()}>
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
			{attendants[isBannerVisible.attendantID].name ||
				'プレイヤー ' + (isBannerVisible.attendantID + 1)}
		{:else}
			{teams[isBannerVisible.teamID] || 'チーム ' + (isBannerVisible.teamID + 1)}
		{/if}
		{#if isBannerVisible.type === 'won'}
			勝ち抜け
		{:else if isBannerVisible.type === 'lizhi'}
			リーチ
		{:else if isBannerVisible.type === 'effect2'}
			!!
		{:else if isBannerVisible.type === 'effect3'}
			!!
		{:else if isBannerVisible.type === 'transit'}
			通過席
		{/if}
	</div>
{/if}

<RuleTeamEditDialog bind:this={ruleTeamEditDialog} />

<style>
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
		}
	}

	.team {
		display: grid;
		grid-template-rows: 2em 1fr;
		grid-template-columns: 2em minmax(0, 1fr) 2em;
		row-gap: 0.25em;
		flex: 1 1 360px;
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

			.buttons {
				display: none;
			}

			&:hover .buttons {
				display: flex;
				position: absolute;
				right: 0.5em;
				align-items: center;
				gap: 2px;
			}
		}

		.score {
			display: flex;
			justify-content: center;
			align-items: center;
			border-radius: 0.5em;
			background: #000;
			font-weight: bold;
			text-align: center;
		}

		.members {
			display: grid;
			grid-template-columns: 1fr 2em;
			grid-column: 1 / -1;
			align-content: start;
			gap: 0.125em;

			&.with-seat {
				grid-template-columns: 2em 1fr 2em 2.5em;

				.member {
					grid-column: 1 / -2;
				}
			}

			.grid-wrapper {
				display: contents;
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
			border-radius: 2em;
			background-color: #ffffff40;
			height: 1.25em;
			color: #fff;
			text-shadow:
				0px 10px 50px #444,
				0px 10px 50px #444;

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
				width: 2.5em;
				height: 2.5em;
				color: white;
				font-size: 0.4em;
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
				flex-direction: column;
				border-radius: 0 1em 1em 0;
				font-size: 0.8em;
			}

			.seat {
				border-radius: 1em 0 0 1em;
				background: #0008;
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

				&:is(:hover > *) {
					opacity: 1;
				}

				button,
				select {
					height: 2em;
					font-size: 0.5em;
				}
			}
		}

		.add-button-wrapper {
			display: flex;
			position: absolute;
			right: 0;
			bottom: 0;
			grid-column: 1 / -1;
			justify-content: center;
			align-items: center;
			opacity: 0;

			&:is(:hover > *) {
				opacity: 1;
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

<script lang="ts">
	import { watch } from 'runed';
	import { untrack } from 'svelte';
	import { fade, slide } from 'svelte/transition';
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
	import { Rule } from '$lib/rule';
	import { playSound } from '$lib/sound';
	import { GameState, type GameEvent } from '$lib/state';
	import { tooltip } from '$lib/tooltip.svelte';

	let headerClientHeight = $state(0);
	let footerClientHeight = $state(0);
	let gameTitle = $state('');

	let attendants = $state<Attendant[]>(
		loadFromHash(true) ?? [
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
		]
	);
	let teams = $state([null, null]);

	let rules = $state([new Rule('aql', 200, 3, 1, 'updown', false, null, 'constant', 0, null)]);

	let history = $state<HistoryEntry[]>([]);
	let currentState = $derived(
		history.reduce(
			(state, entry) => entry.reducerTeam(state.clearLatestEvent()).updateRanking(),
			new GameState(attendants, rules, teams).updateRanking()
		)
	);
	let attendantsPerTeam = $derived.by(() => {
		const atts = attendants.reduce<{ att: Attendant; i: number; j: number }[][][]>(
			(acc, att, i) => {
				acc[att.team] ??= [];
				acc[att.team][att.seat] ??= [];
				acc[att.team][att.seat].push({ att, i, j: 0 });
				return acc;
			},
			teams.map(() => [])
		);

		let j = 0;
		atts.forEach((team) => team.forEach((seat) => seat.forEach((att) => (att.j = j++))));

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

			// const activeRuleCount = result.filter(({ isRemoved }) => !isRemoved).length;
			// if (activeRuleCount === 1) {
			// 	rules = result.filter(({ isRemoved }) => !isRemoved);
			// 	attendants.forEach((att) => {
			// 		att.group = 0;
			// 	});
			// } else {
			rules = result;
			// 	attendants.forEach((att) => {
			// 		while (rules[att.group].isRemoved) {
			// 			att.group = (att.group - 1 + rules.length) % rules.length;
			// 		}
			// 	});
			// }

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

	function clickMaru(attendantID: number) {
		history.push(new MaruHistoryEntry(attendantID));
		if (playSounds) playSound(se1);
	}

	async function clickBatsu(attendantID: number) {
		history.push(new BatsuHistoryEntry(attendantID));
		if (playSounds) playSound(se2);
	}

	function clickThrough() {
		history.push(new ThroughHistoryEntry());
		if (playSounds) playSound(se3);
	}

	function clickUndo() {
		history.pop();
	}

	function clearHistory() {
		attendants = attendants.filter((_, i) => currentState.attendants[i].life !== 'removed');
		history = [];
	}

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

<main>
	<Header
		bind:headerClientHeight
		questionCount={currentState.questionCount}
		{gameTitle}
		battleMode="team"
		otherModeMembers={attendants.map(({ name }) => name)}
		{rules}
		{editRule}
	/>

	<div
		class="attendants"
		style:height={`calc(100vh - ${headerClientHeight + footerClientHeight}px - 30px)`}
		style:grid-template-columns={`repeat(${Math.min(3, teams.length)}, auto)`}
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
				</div>
				<div class="score">{currentState.teams[ti].teamScore}</div>
				<div class="members" class:with-seat={activeRuleMode === 'aql'}>
					{#each seats as atts, si (JSON.stringify(atts ?? si))}
						{@const rowStart = seats
							.slice(0, si)
							.reduce((sum, seatAtts) => sum + seatAtts.length, 1)}
						{@const maxSeat = seats.reduce(
							(max, atts) =>
								Math.max(
									max,
									atts?.reduce((m, { att }) => Math.max(m, att.seat), 0)
								),
							0
						)}
						{@const batsuCount = atts?.reduce(
							(sum, { i }) => sum + currentState.attendants[i].batsuCount,
							0
						)}
						<div class="grid-wrapper">
							<div
								class="seat-total"
								style:grid-row={`${rowStart} / span ${atts?.length}`}
								style:display={atts?.length > 0 && activeRuleMode === 'aql' ? '' : 'none'}
							>
								<div>{atts?.reduce((sum, { i }) => sum + currentState.attendants[i].score, 1)}</div>
								<div class="batsu-count">
									{'✕'.repeat(batsuCount)}
								</div>
							</div>
							{#each atts?.filter(({ i }) => currentState.attendants[i].life !== 'removed') as { att, i }, ai (ai)}
								<div
									class="member"
									style:grid-row-start={rowStart + ai}
									class:lost={currentState.attendants[i].life === 'lost' ||
										(activeRuleMode === 'aql' && batsuCount >= 2)}
								>
									<div
										class="seat"
										style:display={activeRuleMode === 'aql' ? '' : 'none'}
										{@attach tooltip('枠を変更します')}
									>
										<select bind:value={attendants[i].seat}>
											{#each Array.from({ length: maxSeat + 2 }, (_, si) => si) as si (si)}
												<option value={si}>{si + 1}</option>
											{/each}
										</select>
									</div>
									<div>
										<input bind:value={att.name} placeholder={`プレイヤー${i + 1}`} />
									</div>
									<div class="score">
										{currentState.attendants[i].score}
									</div>
									{#if currentState.teams[ti].teamLife === 'alive' && (activeRuleMode === 'aql' ? batsuCount < 2 : true)}
										<div class="buttons">
											<select
												disabled={currentState.teams[ti].attendantIDsPerSeat
													.flat()
													.filter((a) => a != null && currentState.attendants[a].life !== 'removed')
													.length <= 1}
												bind:value={attendants[i].team}
											>
												{#each teams as team, j (j)}
													<option value={j}>{team || `チーム${j + 1}`}</option>
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
						>
							追加
						</button>
					</div>
				</div>
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
		<button disabled={activeRuleMode === 'aql'} onclick={() => teams.push(null)}
			>＋ チーム追加</button
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
	</Footer>
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
		display: grid;
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
		&:has(.yasu) {
			opacity: 0.7;
			backdrop-filter: blur(5px);
			background-color: rgba(128 128 128 / 0.3);
		}
		&:has(& > .lost) {
			background-color: rgba(240 128 128 / 0.8);
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
			grid-template-columns: 1fr 3em;
			grid-column: 1 / -1;
			align-content: start;
			gap: 0.125em;

			&.with-seat {
				grid-template-columns: 2em 1fr 3em 2.5em;

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

			&.lost {
				opacity: 0.2;
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
</style>

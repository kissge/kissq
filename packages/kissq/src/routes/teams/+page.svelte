<script lang="ts">
	import { fade } from 'svelte/transition';
	import se1 from '$lib/assets/se1.mp3';
	import se2 from '$lib/assets/se2.mp3';
	import se3 from '$lib/assets/se3.mp3';
	import { loadFromHash, type Attendant } from '$lib/attendant';
	import Footer from '$lib/components/footer.svelte';
	import Header from '$lib/components/header.svelte';
	import {
		BatsuHistoryEntry,
		MaruHistoryEntry,
		ThroughHistoryEntry,
		type HistoryEntry
	} from '$lib/historyEntry';
	import { Rule } from '$lib/rule';
	import { playSound } from '$lib/sound';
	import { GameState } from '$lib/state';
	import { tooltip } from '$lib/tooltip.svelte';

	let headerClientHeight = $state(0);
	let footerClientHeight = $state(0);
	let gameTitle = $state('');

	let attendants = $state<Attendant[]>(
		loadFromHash() ?? [
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
				team: 1,
				seat: 0,
				trophyCount: 0,
				totalScore: { num: 0, den: 0 },
				manualOrder: 1
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

	function editRule() {
		console.log('editRule');
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
		history = [];
	}
</script>

<main>
	<Header
		bind:headerClientHeight
		questionCount={currentState.questionCount}
		{gameTitle}
		battleMode="team"
		{rules}
		{editRule}
	/>

	<div
		class="attendants"
		style:height={`calc(100vh - ${headerClientHeight + footerClientHeight}px - 30px)`}
		style:grid-template-columns={`repeat(${teams.length}, auto)`}
	>
		{#each attendantsPerTeam as seats, ti (ti)}
			<div class="team">
				<div class="team-name">
					<input placeholder={`チーム${ti + 1}`} bind:value={teams[ti]} />
				</div>
				<div class="score">{currentState.teams[ti].teamScore}</div>
				<div class="members" class:with-seat={activeRuleMode === 'aql'}>
					{#each seats as atts, si (si)}
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
						<div
							class="seat-total"
							style:grid-row={`${rowStart} / span ${atts?.length}`}
							style:opacity={atts?.length > 0 ? 1 : 0}
						>
							<div>{atts?.reduce((sum, { i }) => sum + currentState.attendants[i].score, 1)}</div>
							<div class="batsu-count">
								{'✕'.repeat(batsuCount)}
							</div>
						</div>
						{#each atts as { att, i }, ai (ai)}
							<div class="member" style:grid-row-start={rowStart + ai}>
								<div class="seat">
									<select bind:value={attendants[i].seat}>
										{#each Array.from({ length: maxSeat + 2 }, (_, si) => si) as si (si)}
											<option value={si}>{si + 1}</option>
										{/each}
									</select>
								</div>
								<div>
									<input bind:value={att.name} placeholder={`プレイヤー${i + 1}`} />
									{#if batsuCount < 2}
										<button onclick={() => clickMaru(i)}>O</button>
										<button onclick={() => clickBatsu(i)}>X</button>
									{/if}
								</div>
								<div class="score">
									{currentState.attendants[i].score}
								</div>
							</div>
						{/each}
						<!-- <li>
								<button
									onclick={() =>
										attendants.push({
											name: '',
											group: 0,
											team: ti,
											seat: activeRuleMode === 'aql' ? si : seats.length,
											trophyCount: 0,
											totalScore: { num: 0, den: 0 },
											manualOrder: attendants.length
										})}
								>
									追加
								</button>
							</li> -->
					{/each}
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
		grid-template-rows: 4em 1fr;
		grid-template-columns: minmax(0, 1fr) 4em;
		row-gap: 0.5em;
		backdrop-filter: blur(10px);
		transition:
			background-color 0.3s ease,
			backdrop-filter 0.3s ease;
		box-shadow: 0 0 15px #eeea;
		border-radius: 1.5em 0 1em 0;
		background-color: #ffffff40;
		padding: 0.5em;
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

		.team-name {
			display: flex;
			justify-content: center;
			align-items: center;
			padding: 0 0.5em;
			min-width: 0;
			font-size: 2em;
			text-align: center;
		}

		.score {
			display: flex;
			justify-content: center;
			align-items: center;
			border-radius: 0.5em;
			background: #000;
			font-weight: bold;
			font-size: 2em;
			text-align: center;
		}

		.members {
			display: grid;
			grid-template-columns: 1fr 3em;
			grid-column: 1 / -1;
			align-content: start;
			gap: 0.5em;

			&.with-seat {
				grid-template-columns: 2em 1fr 3em 2.5em;

				.member {
					grid-column: 1 / -2;
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

				&:before {
					position: absolute;
					top: 0;
					left: -2em;
					rotate: 180deg;
					border-left: 10px solid #fff;
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
			border-radius: 1em;
			background: #fff4;
			height: 3em;

			& > div {
				display: flex;
				justify-content: center;
				align-items: center;
			}

			.score {
				display: flex;
				flex-direction: column;
				border-radius: 0 0.5em 0.5em 0;
				font-size: 1.2em;
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
		}
	}
</style>

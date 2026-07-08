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
				team: 1,
				seat: 0,
				trophyCount: 0,
				totalScore: { num: 0, den: 0 },
				manualOrder: 1
			}
		]
	);
	let teams = $state([null, null]);

	let rules = $state([new Rule('product', 36, 3, 1, 'updown', false, null, 'constant', 0, null)]);

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
	let activeRuleMode = $derived(currentState.attendants[0].rule.mode);

	let gridRows = $derived.by(() => {
		let max = 0;
		for (let ti = 0; ti < attendantsPerTeam.length; ++ti) {
			for (let si = 0; si < attendantsPerTeam[ti].length; ++si) {
				max = Math.max(max, attendantsPerTeam[ti][si].length);
			}
		}

		return `100px ${activeRuleMode === 'aql' ? '50px' : ''} repeat(${max}, minmax(calc((100dvh - 400px) / ${max}), auto)) 2em`;
	});

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
		style:height={`calc(100vh - ${headerClientHeight + footerClientHeight}px - 200px)`}
		style:grid-template-columns={`repeat(${teams.length}, auto)`}
	>
		<!--
		style:grid-template-rows={gridRows}
		style:grid-template-columns={activeRuleMode === 'aql'
			? 'repeat(10, auto)'
			: `repeat(${attendants.length}, minmax(10px, 1fr))`}
>-->
		{#each attendantsPerTeam as seats, ti (ti)}
			<div style="grid-rows: 1 / -1; grid-columns: span 1;">
				<h2>{teams[ti] || `チーム${ti + 1}`}</h2>
				<div class="score">{currentState.teams[ti].teamScore}</div>
				<ul>
					{#each seats as atts, si (si)}
						<li>枠{si + 1}</li>
						<ul>
							{#each atts as { att, i }, ai (ai)}
								<li>
									{att.name || `プレイヤー${i + 1}`}:
									{currentState.attendants[i].score}
									<button onclick={() => clickMaru(i)}>O</button>
									<button onclick={() => clickBatsu(i)}>X</button>
								</li>
							{/each}
							<li>
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
							</li>
						</ul>
					{/each}
				</ul>
			</div>
		{/each}
		<!--
		<div class="team">
			<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars --
			{#each attendantsPerTeam as seats, ti (ti)}
				<div style:grid-column={activeRuleMode === 'aql' ? 'span 5' : `span ${seats.length}`}>
					<input
						placeholder={['Red', 'Blue', 'Green', 'Yellow', 'Purple'][ti] ?? `Team ${ti + 1}`}
						bind:value={teams[ti]}
					/>
					<div class="score">{currentState.teams[ti].teamScore}</div>
					<button
						onclick={() => {
							teams.push(null);
						}}>追加</button
					>
				</div>
			{/each}
		</div>
		<div class="seat">
			<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars --
			{#each attendantsPerTeam as seats, ti (ti)}
				<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars --
				{#each activeRuleMode === 'aql' ? Array.from({ length: 5 }, (_, i) => attendantsPerTeam[ti][i] || []) : seats as seat, si (si)}
					{#if activeRuleMode === 'aql'}
						<div class="seat-total">
							{seat.reduce((sum, { i }) => sum + currentState.attendants[i].score, 1)}
							{'✕'.repeat(
								seat.reduce((sum, { i }) => sum + currentState.attendants[i].batsuCount, 0)
							)}
						</div>
					{/if}
					{#each seat as { att, i, j }, ai (i)}
						<div
							class="attendant"
							style:grid-column={activeRuleMode === 'aql' ? ti * 5 + si + 1 : j + 1}
							style:grid-row={activeRuleMode === 'aql' ? ai + 2 : ai + 1}
						>
							<input placeholder={`プレイヤー${i + 1}`} bind:value={att.name} />
							<div>
								{currentState.attendants[i].score}
							</div>
							{#if !seat.some(({ i }) => currentState.attendants[i].life === 'lost')}
								<div>
									<button onclick={() => clickMaru(i)}>O</button>
									<button onclick={() => clickBatsu(i)}>X</button>
								</div>
							{/if}
						</div>
					{/each}
					<div style:grid-column="span 1" style:grid-row="-1 / span 1">
						{#if activeRuleMode === 'aql' || si === seats.length - 1}
							<button
								onclick={() => {
									attendants.push({
										name: '',
										group: 0,
										team: ti,
										seat: activeRuleMode === 'aql' ? si : attendantsPerTeam[ti].length,
										trophyCount: 0,
										totalScore: { num: 0, den: 0 },
										manualOrder: attendants.length
									});
								}}
							>
								追加
							</button>
						{/if}
					</div>
				{/each}
			{/each}
		</div>
		-->
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
		gap: 5px;
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
		display: contents;
		text-align: center;

		input {
			flex: 1 1 3em;

			&::placeholder {
				color: #fff;
			}
		}

		> div {
			display: flex;
			justify-content: center;
			align-items: center;
			background: #eee3;
			padding: 0;

			&:first-child {
				flex-direction: row;
				border-radius: 2em 0 0 0;

				.score {
					color: rgb(255 64 64);
				}
			}

			&:last-child {
				flex-direction: row-reverse;
				border-radius: 0 2em 0 0;

				.score {
					left: 0;
					color: rgb(154 154 255);
				}
			}
		}

		.score {
			display: flex;
			justify-content: center;
			align-items: center;
			width: 2em;
			font-weight: bold;
			font-size: 2em;
			text-shadow:
				0 0 5px #0005,
				0 0 10px #0005;
		}
	}

	.seat {
		display: grid;
		grid-template-rows: subgrid;
		grid-template-columns: subgrid;
		grid-row: 2 / -1;
		grid-column: 1 / -1;

		> div {
			display: flex;
			flex-direction: column;
			justify-content: center;
			align-items: center;
		}

		.seat-total {
			background: #eee3;
		}

		.attendant {
			display: flex;
			flex-direction: column;
			justify-content: center;
			align-items: center;
			border-radius: 0.5em;
			background: #eee3;
		}

		input {
			flex: 1 1 3em;
			margin-top: 0.25em;
			margin-left: -0.2em;
			width: min(3em, 50%);
			height: 2em;
			writing-mode: vertical-rl;
			text-align: left;
		}
	}
</style>

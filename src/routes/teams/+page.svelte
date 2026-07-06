<script lang="ts">
	import se1 from '$lib/assets/se1.mp3';
	import se2 from '$lib/assets/se2.mp3';
	import { loadFromHash, type TeamAttendant } from '$lib/attendant';
	import Footer from '$lib/components/footer.svelte';
	import Header from '$lib/components/header.svelte';
	import { BatsuHistoryEntry, MaruHistoryEntry, type HistoryEntry } from '$lib/historyEntry';
	import { getActiveRulesText, Rule } from '$lib/rule';
	import { playSound } from '$lib/sound';
	import { GameState } from '$lib/state';

	let headerClientHeight = $state(0);
	let footerClientHeight = $state(0);
	let gameTitle = $state('');

	let attendants = $state<TeamAttendant[]>(
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
				manualOrder: 1
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
				seat: 4,
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
				seat: 0,
				trophyCount: 0,
				totalScore: { num: 0, den: 0 },
				manualOrder: 1
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
		]
	);
	let teams = $state([null, null]);

	let rules = $state([new Rule('aql', 200, 3, 1, 'updown', false, null, 'constant', 0, null)]);

	let history = $state<HistoryEntry[]>([]);
	let currentMemberState = $derived(
		history.reduce(
			(state, entry) =>
				entry.reducer(state.clearLatestEvent()).checkIfLastSurvivor().updateRanking(),
			new GameState(attendants, rules).updateRanking()
		)
	);
	let currentTeamState = $derived(
		currentMemberState.attendants.reduce(
			(acc, a, ai) => {
				acc[attendants[ai].team].score *= a.score;
				return acc;
			},
			teams.map((name) => ({ name, score: 1 }))
		)
	);

	function editRule() {
		console.log('editRule');
	}

	let playSounds = $state(true);

	function clickMaru(attendantID: number) {
		history.push(new MaruHistoryEntry(attendantID));
		if (playSounds) playSound(se1);
	}

	async function clickBatsu(attendantID: number) {
		if (playSounds) playSound(se2);

		history.push(new BatsuHistoryEntry(attendantID));
	}
</script>

<main>
	<Header
		bind:headerClientHeight
		questionCount={currentMemberState.questionCount}
		{gameTitle}
		battleMode="team"
		{rules}
		{editRule}
	/>

	<div class="attendants" style:grid-template-rows="150px repeat(4, 1fr) auto">
		<div class="team">
			<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
			{#each teams as _, ti (ti)}
				<div>
					<div>
						{currentTeamState[ti].score}
					</div>
					<input placeholder={`チーム${ti + 1}`} bind:value={teams[ti]} />
				</div>
			{/each}
		</div>
		<div class="seat">
			<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
			{#each Array.from({ length: 2 }) as _, team (team)}
				<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
				{#each Array.from({ length: 5 }) as _, seat (seat)}
					{#each attendants.flatMap( (att, i) => (att.team === team && att.seat === seat ? [{ att, i }] : []) ) as { att, i }, ai (i)}
						<div class="attendant" style:grid-column={team * 5 + seat + 1} style:grid-row={ai + 1}>
							<input placeholder={`プレイヤー${i + 1}`} bind:value={att.name} />
							<div>
								{currentMemberState.attendants[i].score} pts
							</div>
							<div>
								<button onclick={() => clickMaru(i)}>O</button>
								<button onclick={() => clickBatsu(i)}>X</button>
							</div>
						</div>
					{/each}
					<div style:grid-column={team * 5 + seat + 1} style:grid-row="-1 / span 1">
						<button>追加</button>
					</div>
				{/each}
			{/each}
		</div>
	</div>

	<Footer bind:footerClientHeight {attendants} {rules} {history}>
		<div></div>
	</Footer>
</main>

<style>
	.attendants {
		display: grid;
		grid-template-rows: auto repeat(auto-fill, 20%) auto;
		grid-template-columns: repeat(10, auto);
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

		input::placeholder {
			color: #fff;
		}

		> div {
			grid-column: span 5;
			background: #eee3;
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
			gap: 0.5em;
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
			margin-top: 1em;
			margin-left: -0.2em;
			width: min(3em, 50%);
			height: 3em;
			writing-mode: vertical-rl;
			text-align: left;
		}
	}
</style>

<script lang="ts">
	import { onMount } from 'svelte';
	import {
		getLoggerContext,
		type LogEntry,
		type LogFilters,
		type LogStateTeamEntry
	} from '$lib/logs';
	import ChanceIndicator from './chanceIndicator.svelte';
	import LogFilterDialog from './logFilterDialog.svelte';

	let Logger = getLoggerContext();

	let dialog: HTMLDialogElement;
	export function open() {
		logs = Logger.load();
		dialog.showModal();
	}

	let logs = $state<LogEntry[]>([]);
	let filters = $state<LogFilters>({
		row: 'all',
		column: ['team', 'seat', 'name', 'score', 'seatScore', 'status']
	});

	onMount(() => {
		const savedFilters = window.localStorage.getItem('logFilters');
		if (savedFilters) {
			filters = JSON.parse(savedFilters);
		}
	});

	$effect(() => {
		window.localStorage.setItem('logFilters', JSON.stringify(filters));
	});
</script>

<dialog bind:this={dialog} closedby="any">
	<div class="table-wrapper">
		<table>
			<tbody>
				{#each logs.toReversed().filter(({ questionCount }) => questionCount > 0) as log, i (i)}
					{@const showGroup = log.state.some((att) => att.group !== log.state[0].group)}
					{@const teams =
						log.mode === 'team'
							? (log.state as LogStateTeamEntry[])
									.reduce<number[]>((acc, att) => {
										acc[att.team] = (acc[att.team] ?? 0) + 1;
										return acc;
									}, [])
									.map((count, i) => ({ count, i }))
									.toSorted(
										(a, b) =>
											(log.state as LogStateTeamEntry[]).findIndex((att) => att.team === a.i) -
											(log.state as LogStateTeamEntry[]).findIndex((att) => att.team === b.i)
									)
									.flatMap(({ count }) => [count, ...Array.from({ length: count - 1 }, () => null)])
							: null}
					<tr>
						<th colspan="7" class="title">
							{log.gameTitle || '無題のゲーム'}
						</th>
					</tr>
					<tr>
						<td colspan="3">
							{log.startAt}
						</td>
						<td colspan="2">
							{#if log.mode === 'team'}
								団体戦
							{:else}
								個人戦
							{/if}
						</td>
						<td colspan="2">
							{log.questionCount}<span class="no-select">問目まで</span>
							{#if log.questionLimit != null}
								/ {log.questionLimit}<span class="no-select">問</span>
							{/if}
						</td>
					</tr>
					<tr>
						<td colspan="7">
							{log.rules}
							<ChanceIndicator chance={log.chance} />
						</td>
					</tr>
					{#each log.state as att, j (j)}
						<tr>
							{#if 'team' in att && log.teams}
								{#if teams?.[j] != null}
									<td colspan={att.seat == null ? 2 : 1} rowspan={teams[j]}>
										<span
											class:hidden={!filters.column.includes('team') ||
												(filters.row === 'won' && att.teamLife !== 'won')}
										>
											{log.teams[att.team] || `チーム${att.team + 1}`}
										</span>
									</td>
								{/if}
								{#if att.seat != null}
									<td>
										<span
											class:hidden={!filters.column.includes('seat') ||
												(filters.row === 'won' && att.teamLife !== 'won')}
										>
											{att.seat + 1}<span class="no-select">枠</span>
										</span>
									</td>
								{/if}
							{/if}
							<td colspan={'team' in att ? 1 : 3}>
								<span
									class:hidden={!filters.column.includes('name') ||
										(filters.row === 'won' &&
											(('team' in att && att.teamLife !== 'won') ||
												(!('team' in att) && att.life !== 'won')))}
								>
									{att.name || `プレイヤー${att.i + 1}`}
									{#if showGroup}
										({String.fromCodePoint(65 + att.group)})
									{/if}
								</span>
							</td>
							{#if att.mode === 'marubatsu'}
								<td>
									<span
										class:hidden={!filters.column.includes('score') ||
											(filters.row === 'won' && !('team' in att) && att.life !== 'won')}
									>
										{att.maruCount}
										<span class="no-select">〇</span>
									</span>
								</td>
								<td>
									<span
										class:hidden={!filters.column.includes('score') ||
											(filters.row === 'won' && !('team' in att) && att.life !== 'won')}
									>
										{att.batsuCount}
										<span class="no-select">×</span>
									</span>
								</td>
							{:else}
								<td colspan="2">
									<span
										class:hidden={!filters.column.includes('score') ||
											(filters.row === 'won' &&
												(('team' in att && att.teamLife !== 'won') ||
													(!('team' in att) && att.life !== 'won')))}
									>
										{att.score}
										<span class="no-select">
											pt{#if att.score !== 1}s{/if}
										</span>
									</span>
								</td>
							{/if}
							{#if 'team' in att}
								{#if teams?.[j] != null}
									<td rowspan={teams[j]}>
										<span
											class:hidden={!filters.column.includes('seatScore') ||
												(filters.row === 'won' && 'team' in att && att.teamLife !== 'won')}
										>
											{att.teamScore}
											<span class="no-select">
												pt{#if att.teamScore !== 1}s{/if}
											</span>
										</span>
									</td>
									<td rowspan={teams[j]}>
										<span
											class:hidden={!filters.column.includes('status') ||
												(filters.row === 'won' && 'team' in att && att.teamLife !== 'won')}
										>
											{#if att.teamLife === 'won'}
												勝利
											{/if}
										</span>
									</td>
								{/if}
							{:else}
								<td colspan="2">
									<span
										class:hidden={!filters.column.includes('status') ||
											(filters.row === 'won' && !('team' in att) && att.life !== 'won')}
									>
										{#if att.life === 'won'}
											勝利
										{:else if att.life === 'lost'}
											失格
										{/if}
									</span>
								</td>
							{/if}
						</tr>
					{/each}
					<tr><td colspan="7" style:height="2em"></td></tr>
				{:else}
					<tr><td>まだ履歴がありません🍔</td></tr>
				{/each}
			</tbody>
		</table>
	</div>

	<div class="buttons">
		<LogFilterDialog bind:filters />
		<div class="spacer"></div>
		<button onclick={() => dialog.close()}>閉じる</button>
	</div>
</dialog>

<style>
	dialog[open] {
		display: grid;
		grid-template-rows: 1fr auto;
		gap: 0.5em;
	}

	.table-wrapper {
		overflow-y: auto;
	}

	table {
		cursor: text;
		margin-bottom: 2em;
		border-spacing: 10px;
		width: 100%;

		tr:last-child > * {
			border-bottom: 1px solid #eee;
		}

		th {
			width: 70%;
		}

		td {
			border-right: 1px solid #ccc;
			border-bottom: 1px solid #ccc;
			padding: 0 0.5em;
			max-width: 8em;
			text-align: right;
			word-break: break-word;

			.no-select {
				user-select: none;
			}
		}

		.title {
			background-color: #333;
			color: #fff;
		}
	}

	.hidden {
		opacity: 0.2;
		user-select: none;
	}
</style>

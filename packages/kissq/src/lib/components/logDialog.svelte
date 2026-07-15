<script lang="ts">
	import { loadLog, type LogEntry, type LogStateTeamEntry } from '$lib/logs';

	let dialog: HTMLDialogElement;
	export function open() {
		logs = loadLog();
		dialog.showModal();
	}

	let logs = $state<LogEntry[]>([]);
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
							{log.questionCount}<span>問目まで</span>
						</td>
					</tr>
					<tr>
						<td colspan="7">
							{log.rules}
						</td>
					</tr>
					{#each log.state as att, j (j)}
						<tr>
							{#if 'team' in att && log.teams}
								{#if teams?.[j] != null}
									<td colspan={att.seat == null ? 2 : 1} rowspan={teams[j]}>
										{log.teams[att.team] || `チーム${att.team + 1}`}
									</td>
								{/if}
								{#if att.seat != null}
									<td>
										{att.seat + 1}<span>枠</span>
									</td>
								{/if}
							{/if}
							<td colspan={'team' in att ? 1 : 3}>
								{att.name || `プレイヤー${att.i + 1}`}
								{#if showGroup}
									({String.fromCodePoint(65 + att.group)})
								{/if}
							</td>
							{#if att.mode === 'marubatsu'}
								<td>
									{att.maruCount}
									<span>〇</span>
								</td>
								<td>
									{att.batsuCount}
									<span>×</span>
								</td>
							{:else}
								<td colspan="2">
									{att.score}
									<span>
										pt{#if att.score !== 1}s{/if}
									</span>
								</td>
							{/if}
							{#if 'team' in att}
								{#if teams?.[j] != null}
									<td rowspan={teams[j]}>
										{att.teamScore}
										<span>
											pt{#if att.teamScore !== 1}s{/if}
										</span>
									</td>
									<td rowspan={teams[j]}>
										{#if att.teamLife === 'won'}
											勝利
										{/if}
									</td>
								{/if}
							{:else}
								<td colspan="2">
									{#if att.life === 'won'}
										勝利
									{:else if att.life === 'lost'}
										失格
									{/if}
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

			span {
				user-select: none;
			}
		}

		.title {
			background-color: #333;
			color: #fff;
		}
	}
</style>

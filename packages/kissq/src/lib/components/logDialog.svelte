<script lang="ts">
	import { loadLog, type LogEntry } from '$lib/logs';

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
					<tr>
						<th colspan="4" class="title">
							{log.gameTitle || '無題のゲーム'}
						</th>
					</tr>
					<tr>
						<td>
							{log.startAt}
						</td>
						<td colspan="3">
							{log.questionCount}<span>問目まで</span>
						</td>
					</tr>
					<tr>
						<td colspan="4">
							{log.rules}
						</td>
					</tr>
					{#each log.state as att, j (j)}
						<tr>
							<td>
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
							<td>
								{#if att.life === 'won'}
									勝利
								{:else if att.life === 'lost'}
									失格
								{/if}
							</td>
						</tr>
					{/each}
					<tr><td colspan="4" style:height="2em"></td></tr>
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
		width: 100%;

		tr:nth-child(2n + 1) {
			background-color: #eee;
		}

		tr:last-child > * {
			border-bottom: 1px solid #eee;
		}

		th {
			width: 70%;
		}

		td {
			padding: 0 0.5em;
			max-width: 15em;
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

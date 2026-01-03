<script lang="ts">
	import * as State from '$lib/components/state.svelte';

	let dialog: HTMLDialogElement;
	export function open() {
		dialog.showModal();
	}

	let logs = $derived.by(() => {
		let q = 1;
		return State.state.history.map((entry, i) => ({
			q:
				i === 0
					? q
					: State.state.history[i - 1].type === 'maru' ||
						  State.state.history[i - 1].type === 'through'
						? ++q
						: null,
			entry
		}));
	});
</script>

<dialog bind:this={dialog} closedby="any">
	<table>
		<tbody>
			{#each logs as { q, entry }, i (i)}
				<tr>
					<th>
						{#if q}
							{q}
						{/if}
					</th>
					<td>{entry.toString(State.current())}</td>
				</tr>
			{:else}
				<tr><td>まだ履歴がありません🍔</td></tr>
			{/each}
		</tbody>
	</table>

	<div class="buttons">
		<button onclick={() => dialog.close()}>閉じる</button>
	</div>
</dialog>

<style>
	dialog {
		user-select: initial;
	}

	table {
		margin-bottom: 2em;
		width: 100%;
		user-select: all;

		tr:nth-child(2n + 1) {
			background-color: #eee;
		}

		tr:last-child > * {
			border-bottom: 1px solid #eee;
		}

		th {
			width: 5em;

			&:not(:empty)::before {
				content: 'Q';
			}
		}
	}
</style>

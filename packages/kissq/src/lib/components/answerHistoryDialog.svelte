<script lang="ts">
	import { getGameContext } from '$lib/gameContext';

	let Game = getGameContext();

	let dialog: HTMLDialogElement;
	export function open() {
		dialog.showModal();
	}

	let logs = $derived.by(() => {
		let q = 1;
		return Game.history.map((entry, i) => ({
			q:
				i === 0
					? q
					: Game.history[i - 1].type === 'maru' || Game.history[i - 1].type === 'through'
						? ++q
						: null,
			entry
		}));
	});
</script>

<dialog bind:this={dialog} closedby="any">
	<h1>{Game.gameTitle || '無題のゲーム'}</h1>
	<table>
		<tbody>
			{#each logs as { q, entry }, i (i)}
				<tr>
					<th>
						{#if q}
							{q}
						{/if}
					</th>
					<td>{entry.toString(Game.currentState)}</td>
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

	h1 {
		margin-top: 0;
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

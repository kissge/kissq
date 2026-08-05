<script lang="ts">
	import type { LogFilters } from '$lib/logs';

	let { filters = $bindable() }: { filters: LogFilters } = $props();

	let showFilterDialog = $state(false);
</script>

<button class="show-btn" onclick={() => (showFilterDialog = !showFilterDialog)}>
	表示する行・列を絞り込む
</button>

<div
	class="dialog"
	style:opacity={showFilterDialog ? 1 : 0}
	style:display={showFilterDialog ? '' : 'none'}
>
	<div>行</div>
	<div>列</div>

	<div>
		<label>
			<input type="radio" bind:group={filters.row} value="all" />
			全員
		</label>
		<label>
			<input type="radio" bind:group={filters.row} value="won" />
			勝ち抜けのみ
		</label>
	</div>
	<div>
		<label><input type="checkbox" bind:group={filters.column} value="team" /> チーム</label>
		<label><input type="checkbox" bind:group={filters.column} value="seat" /> 枠</label>
		<label><input type="checkbox" bind:group={filters.column} value="name" /> 名前</label>
		<label><input type="checkbox" bind:group={filters.column} value="score" /> 個人スコア</label>
		<label><input type="checkbox" bind:group={filters.column} value="seatScore" /> 枠スコア</label>
		<label><input type="checkbox" bind:group={filters.column} value="status" /> 勝敗</label>
	</div>
</div>

<style>
	.show-btn {
		anchor-name: --show-btn;
	}

	.dialog {
		position: absolute;
		position-anchor: --show-btn;
		display: grid;
		bottom: anchor(top);
		left: anchor(left);
		grid-template-rows: 2em 1fr;
		grid-template-columns: 1fr 1fr;
		margin-bottom: 0.25em;
		box-shadow: 0 0 1em #0005;
		border: 2px solid #000;
		border-radius: 0.25em;
		background-color: white;
		padding: 1em;
		width: 480px;
		max-height: min(80dvh, 800px);
		overflow-y: auto;

		> div {
			display: flex;
			flex: 1 1 50%;
			flex-direction: column;
		}
	}
</style>

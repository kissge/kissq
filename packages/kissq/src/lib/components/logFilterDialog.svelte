<script lang="ts">
	import type { LogFilters } from '$lib/logs';

	let { filters = $bindable() }: { filters: LogFilters } = $props();

	let showFilterDialog = $state(false);
</script>

<button class="show-btn" onclick={() => (showFilterDialog = !showFilterDialog)}>
	表示設定（行・列の絞り込み、並び順）
</button>

<div
	class="dialog"
	style:opacity={showFilterDialog ? 1 : 0}
	style:display={showFilterDialog ? '' : 'none'}
>
	<div style:grid-column="span 2">表示順</div>
	<div style:grid-column="span 2" style:margin-bottom="1em">
		<label>
			<input type="radio" bind:group={filters.sort} value="newest" />
			新しい順
		</label>
		<label>
			<input type="radio" bind:group={filters.sort} value="oldest" />
			古い順
		</label>
	</div>

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
		bottom: anchor(top);
		left: anchor(left);
		display: grid;
		grid-template-rows: 2em 1fr;
		grid-template-columns: 1fr 1fr;
		width: 480px;
		max-height: min(80dvh, 800px);
		padding: 1em;
		margin-bottom: 0.25em;
		position-anchor: --show-btn;
		overflow-y: auto;
		background-color: white;
		border: 2px solid #000;
		border-radius: 0.25em;
		box-shadow: 0 0 1em #0005;

		> div {
			display: flex;
			flex: 1 1 50%;
			flex-direction: column;
		}
	}
</style>

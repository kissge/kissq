<script lang="ts">
	import type { AttendantState, AttendantStateValue } from '$lib/state';

	let dialog: HTMLDialogElement;
	let resolve: (result: Awaited<ReturnType<typeof open>>) => void;
	export function open({ ...state }: AttendantState): Promise<AttendantStateValue | null> {
		att = state;

		dialog.showModal();
		dialog.scrollTop = 0;

		return new Promise((r) => {
			resolve = r;
		});
	}

	function save() {
		dialog.close();
		resolve(att ?? null);
	}

	let att = $state<AttendantStateValue>();
</script>

<dialog bind:this={dialog} closedby="any">
	{#if att}
		<h2>{att.name || 'このプレイヤー'}の得点状況</h2>

		<div class="table">
			<div>スコア</div>
			<div>
				<input type="number" bind:value={att.score} /> pt(s)
			</div>

			<div>マル数</div>
			<div>
				<input type="number" bind:value={att.maruCount} /> ○
			</div>

			<div>バツ数</div>
			<div>
				<input type="number" bind:value={att.batsuCount} /> ×
			</div>

			<div>残り休み数</div>
			<div>
				<input type="number" bind:value={att.yasuCount} min="0" /> 休
			</div>

			<div>ステータス</div>
			<div>
				<label>
					<input type="radio" bind:group={att.life} value="alive" />
					競技中
				</label>
				<label>
					<input type="radio" bind:group={att.life} value="won" />
					勝ち抜け
				</label>
				<label>
					<input type="radio" bind:group={att.life} value="lost" />
					失格
				</label>
			</div>

			<div>累計勝利数</div>
			<div>
				<input type="number" bind:value={att.trophyCount} min="0" /> 🏆
			</div>
		</div>

		<div class="buttons">
			<button
				onclick={() => {
					dialog.close();
					resolve(null);
				}}
			>
				キャンセル
			</button>
			<button class="primary" onclick={save}>保存する</button>
		</div>
	{/if}
</dialog>

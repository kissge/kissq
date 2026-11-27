<script lang="ts">
	import { isUnlocked } from 'kissunlocklib';

	import { getGameContext } from '$lib/gameContext';

	let Game = getGameContext();

	let dialog: HTMLDialogElement;
	export function open(): void {
		starName = Game.starName;
		isStarNameUndefined = !starName;

		dialog.showModal();
		dialog.scrollTop = 0;
	}

	async function save() {
		if (!(await isUnlocked())) {
			alert('この機能を利用するにはアンロックが必要です。');
			return;
		}

		Game.starName = isStarNameUndefined ? undefined : starName || undefined;
		dialog.close();
	}

	let starName = $state<string>();
	let isStarNameUndefined = $state(false);
</script>

<dialog bind:this={dialog}>
	<p>
		スターボタンを使うと、プレイヤーに通常のトロフィーとは別に「★」を付与することができます。スターボタンを設定するには、アニメーションに表示するためのエフェクトの名称を決めてください（例：「スター獲得」という名称にすると「プレイヤー1
		スター獲得」と表示されます）。
	</p>

	<div class="table">
		<div>スター</div>
		<div>
			<label>
				<input type="radio" bind:group={isStarNameUndefined} value={true} />
				なし
			</label>
			<label>
				<input type="radio" bind:group={isStarNameUndefined} value={false} />
				<input
					bind:value={starName}
					placeholder="例：スター獲得"
					onfocus={() => (isStarNameUndefined = false)}
				/>
			</label>
		</div>
	</div>

	<div class="buttons">
		<button onclick={() => dialog.close()}>キャンセル</button>
		<button class="primary" onclick={save}>保存する 🔒️</button>
	</div>
</dialog>

<style>
	dialog {
		user-select: none;
	}
</style>

<script lang="ts">
	import type { GameClassBaseType } from '$lib/game';

	let { Game }: { Game: GameClassBaseType } = $props();

	let dialog: HTMLDialogElement;
	export function open(): void {
		effect2Name = Game.effect2Name;
		effect3Name = Game.effect3Name;
		isEffect2NameUndefined = !effect2Name;
		isEffect3NameUndefined = !effect3Name;

		dialog.showModal();
		dialog.scrollTop = 0;
	}

	function save() {
		Game.effect2Name = isEffect2NameUndefined ? undefined : effect2Name || undefined;
		Game.effect3Name = isEffect3NameUndefined ? undefined : effect3Name || undefined;
		dialog.close();
	}

	let effect2Name = $state<string>();
	let effect3Name = $state<string>();

	let isEffect2NameUndefined = $state(false);
	let isEffect3NameUndefined = $state(false);
</script>

<dialog bind:this={dialog}>
	<p>
		エフェクトボタンを使うと、通常の○数の2倍・3倍のマルを付与した上でカットインアニメーションを表示させることが出来るようになります。エフェクトボタンを設定するには、アニメーションに表示するためのエフェクトの名称を決めてください（例：「クリティカル」という名称にすると「プレイヤー1
		クリティカル」と表示されます）。
	</p>

	<div class="table">
		<div>+2○ エフェクト</div>
		<div>
			<label>
				<input type="radio" bind:group={isEffect2NameUndefined} value={true} />
				なし
			</label>
			<label>
				<input type="radio" bind:group={isEffect2NameUndefined} value={false} />
				<input
					bind:value={effect2Name}
					placeholder="例：クリティカル"
					onfocus={() => (isEffect2NameUndefined = false)}
				/>
			</label>
		</div>

		<div>+3○ エフェクト</div>
		<div>
			<label>
				<input type="radio" bind:group={isEffect3NameUndefined} value={true} />
				なし
			</label>
			<label>
				<input type="radio" bind:group={isEffect3NameUndefined} value={false} />
				<input
					bind:value={effect3Name}
					placeholder="例：スーパークリティカル"
					onfocus={() => (isEffect3NameUndefined = false)}
				/>
			</label>
		</div>
	</div>

	<div class="buttons">
		<button onclick={() => dialog.close()}>キャンセル</button>
		<button class="primary" onclick={save}>保存する</button>
	</div>
</dialog>

<style>
	dialog {
		user-select: none;
	}
</style>

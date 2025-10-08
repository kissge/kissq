<script lang="ts">
	let dialog: HTMLDialogElement;
	let resolve: (result: Awaited<ReturnType<typeof open>>) => void;
	export function open(
		_effect2Name: string | undefined,
		_effect3Name: string | undefined
	): Promise<[string | undefined, string | undefined] | null> {
		effect2Name = _effect2Name;
		effect3Name = _effect3Name;
		isEffect2NameUndefined = !effect2Name;
		isEffect3NameUndefined = !effect3Name;

		dialog.showModal();
		dialog.scrollTop = 0;

		return new Promise((r) => {
			resolve = r;
		});
	}

	function save() {
		dialog.close();
		resolve([
			isEffect2NameUndefined ? undefined : effect2Name || undefined,
			isEffect3NameUndefined ? undefined : effect3Name || undefined
		]);
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
		<button
			onclick={() => {
				dialog.close();
				resolve(null);
			}}>キャンセル</button
		>
		<button class="primary" onclick={save}>保存する</button>
	</div>
</dialog>

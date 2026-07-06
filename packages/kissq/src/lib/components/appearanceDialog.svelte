<script lang="ts">
	let dialog: HTMLDialogElement;
	let resolve: (result: Awaited<ReturnType<typeof open>>) => void;
	export function open(
		_wallpaper: string | null,
		_trophy: string | null
	): Promise<[string | null, string | null] | null> {
		wallpaper = _wallpaper;
		trophy = _trophy;

		dialog.showModal();
		dialog.scrollTop = 0;

		return new Promise((r) => {
			resolve = r;
		});
	}

	function save() {
		dialog.close();
		resolve([wallpaper, trophy]);
	}

	let wallpaper = $state<string | null>(null);
	let trophy = $state<string | null>(null);

	let backgroundImageInput: HTMLInputElement;
	let backgroundImageFiles: FileList | null = $state(null);
	let trophyInput: HTMLInputElement;
	let trophyFiles: FileList | null = $state(null);

	$effect(() => {
		if (backgroundImageFiles && backgroundImageFiles.length > 0) {
			const reader = new FileReader();
			reader.onload = () => {
				wallpaper = reader.result as string;
			};
			reader.readAsDataURL(backgroundImageFiles[0]);
		}

		if (trophyFiles && trophyFiles.length > 0) {
			const reader = new FileReader();
			reader.onload = () => {
				trophy = reader.result as string;
			};
			reader.readAsDataURL(trophyFiles[0]);
		}
	});
</script>

<dialog bind:this={dialog}>
	<div class="table">
		<div>壁紙</div>
		<div>
			{#if wallpaper}
				<img src={wallpaper} alt="壁紙" />
			{/if}
			<button onclick={() => backgroundImageInput.click()}>画像ファイルを選択する</button>
			<button
				disabled={!wallpaper}
				onclick={() => {
					wallpaper = null;
					backgroundImageFiles = null;
				}}>削除</button
			>
			<input
				accept="image/*"
				type="file"
				bind:this={backgroundImageInput}
				bind:files={backgroundImageFiles}
			/>
		</div>

		<div>トロフィー</div>
		<div>
			{#if trophy}
				<img src={trophy} alt="トロフィー" />
			{/if}
			<button onclick={() => trophyInput.click()}>画像ファイルを選択する</button>
			<button
				disabled={!trophy}
				onclick={() => {
					trophy = null;
					trophyFiles = null;
				}}>削除</button
			>
			<input accept="image/*" type="file" bind:this={trophyInput} bind:files={trophyFiles} />
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

<style>
	dialog {
		user-select: none;
	}

	img {
		vertical-align: middle;
		height: 1em;
	}

	input[type='file'] {
		display: none;
	}
</style>

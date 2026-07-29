<script lang="ts">
	import { isUnlocked, setPassword } from '$lib/unlock';

	let dialog: HTMLDialogElement;
	let resolve: (result: Awaited<ReturnType<typeof open>>) => void;

	let password = $state('');
	let unlocked = $state(false);

	export async function open(): Promise<void> {
		dialog.showModal();
		dialog.scrollTop = 0;
		password = '';
		unlocked = await isUnlocked();

		return new Promise((r) => {
			resolve = r;
		});
	}

	function close() {
		dialog.close();
		resolve();
	}
</script>

<dialog bind:this={dialog} closedby="any">
	<p>パスワードを入力するといくつかの追加機能がアンロックされます。</p>
	<details>
		<summary>利用できる機能（今日現在）</summary>
		<ul>
			<li>デザイン設定</li>
		</ul>
	</details>
	<p>
		パスワードを入手するには、<a
			href="https://www.amazon.co.jp/hz/wishlist/ls/3O1HPXPHBAXM0/"
			target="_blank"
		>
			こちら
		</a>から何らかのアイテムを作者に送り付けたのち、<a
			href="https://x.com/_kidochan"
			target="_blank"
		>
			作者
		</a>にXのDMで問い合わせてください。
	</p>

	<div class="password-wrapper">
		<input type="password" placeholder="パスワード" bind:value={password} disabled={unlocked} />
		<button
			onclick={async () => {
				await setPassword(password);
				if (await isUnlocked()) {
					alert('アンロックされました。');
					close();
				} else {
					alert('パスワードが違います。');
				}
			}}
			disabled={unlocked}
		>
			アンロック
		</button>
		{#if unlocked}
			アンロック済みです。
		{/if}
	</div>

	<div class="buttons">
		<button onclick={close}>閉じる</button>
	</div>
</dialog>

<style>
	dialog {
		user-select: none;
	}

	details {
		margin-left: 1em;
		border: 1px solid #ccc;
		border-radius: 4px;
		padding: 0.25em 1em;

		summary {
			cursor: pointer;
		}
	}

	.password-wrapper {
		display: flex;
		gap: 0.5em;

		input {
			flex: 1 1 auto;
			font-size: 1em;
		}
	}

	.buttons {
		margin-top: 1em;
	}
</style>

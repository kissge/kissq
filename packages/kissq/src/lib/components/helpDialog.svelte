<script lang="ts">
	import { browser } from '$app/environment';

	let dialog: HTMLDialogElement;

	export function open() {
		dialog.showModal();
		dialog.scrollTop = 0;
	}

	let tag = $state('div');
	if (browser) {
		if (!/google/i.test(navigator.userAgent)) {
			setTimeout(() => (tag = 'dialog'), 0);
		}
	}
</script>

<svelte:element this={tag} bind:this={dialog} closedby="any">
	<h1>❓<ruby><rb>kissQ</rb><rt>きすきゅー</rt></ruby>の使い方</h1>

	<h2>ルール</h2>
	<ul>
		<li>画面右上の編集ボタンをクリックしてルールを編集します。</li>
		<li>
			<em>ルールグループを複数作ることができます。</em
			>たとえばAグループの人は7○3×ルール、Bグループの人は5○5×ルールのように個人ごとにハンデを設定するのに利用できます。
		</li>
		<li>
			ゲームの途中でルールを変更すると、ゲーム開始時点にさかのぼって最初からそのルールだったことになります。何かおかしくなったら全員リセットを行ってください。
		</li>
	</ul>

	<h2>ゲームの進行</h2>
	<ol>
		<li>問題を出題します。</li>
		<li>
			誰も回答者が出なければ、画面下のスルーボタンをクリックしてください。画面左上の問題数カウントが1進みます。
		</li>
		<li>
			回答者が出たものの全員が誤答した場合、誤答の人全員の×ボタンを順番にクリックして誤答を記録します。そして<em
				>最後にスルーボタン</em
			>をクリックしてください。その時点で初めて画面左上の問題数カウントが1進みます。
			<ul>
				<li>
					<em>スルーボタンを忘れると、問題数カウントが進まず、休みのカウントが減りません。</em>
				</li>
			</ul>
		</li>
		<li>
			回答者が出て誰かが最終的に正解した場合、<em>まず誤答の人</em
			>の×ボタンを順番にクリックして誤答を記録します。そして<em>最後に正解の人</em
			>の○ボタンをクリックして正解を記録してください。その時点で初めて画面左上の問題数カウントが1進みます。
			<ul>
				<li>
					<em>順番を間違えると、問題数カウントが多めに進み、休みのカウントが多めに減ります。</em>
				</li>
			</ul>
		</li>
		<li>
			ゲームが終了したら、次のゲームを始めるために全員リセットボタンをクリックしてください。全員のスコアが初期状態に戻ります。
		</li>
		<li>
			何か操作を誤ったときは、画面下の元に戻すボタンをクリックしてください。直前の操作を取り消すことができます。
		</li>
	</ol>

	<hr />
	<p>© 2025 <a href="https://x.com/_kidochan" target="_blank">@_kidochan</a></p>

	<div class="buttons">
		<button onclick={() => dialog.close()}>閉じる</button>
	</div>
</svelte:element>

<style>
	rt {
		font-size: 0.3em;
	}

	li {
		line-height: 1.8;
	}

	em {
		color: red;
		font-style: normal;
		font-weight: bold;
		text-decoration: underline wavy red;
	}

	a {
		text-decoration: none;
	}
</style>

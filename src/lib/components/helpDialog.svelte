<script lang="ts">
	import { browser } from '$app/environment';

	let dialog: HTMLDivElement;

	export function open() {
		const subWindow = window.open('', 'subWindow', 'width=600,height=800,scrollbars=yes,popup=yes');
		if (subWindow) {
			subWindow.document.body.innerHTML =
				dialog.innerHTML +
				`<style>
	body {
		font-family: sans-serif;
	}

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
		</sty${''}le>`;
		}
		dialog.scrollTop = 0;
	}

	let hide = $state(false);
	if (browser) {
		if (!/google/i.test(navigator.userAgent)) {
			setTimeout(() => (hide = true), 0);
		}
	}
</script>

<div bind:this={dialog} style:display={hide ? 'none' : 'block'}>
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
			何か操作を誤ったときは、
			<ul>
				<li>画面下の元に戻すボタンをクリックしてください。直前の操作を取り消すことができます。</li>
				<li>
					または、プレイヤーにマウスカーソルを合わせると表示される編集ボタンをクリックすることで、得点状況を直接手で編集することもできます。
				</li>
			</ul>
		</li>
	</ol>

	<h2>早稲田式連携</h2>
	<ul>
		<li>早稲田式早押しボタンと連携し、自動的にマルやバツを記録することができます。</li>
	</ul>
	<h3>接続するには</h3>
	<ul>
		<li>
			<em>注意：2つ以上のタブで同時に接続することはできません。</em>
		</li>
	</ul>
	<ol>
		<li>
			USBケーブル（USB-A to USB-Aに限る）を使って早稲田式早押しボタンの親機をPCに接続します。
			<ul>
				<li>USB経由で給電されるため、電源ケーブルは不要です。</li>
			</ul>
		</li>
		<li>
			「その他」の「早稲田式連携」ボタンをクリックします（以前に接続したことがある場合、自動的に接続されるためこの工程以降は不要です）。
		</li>
		<li>
			表示されるデバイス選択画面で「Arduino Due Prog. Port (COMxxx)」を選択して接続します。
			<ul>
				<li>
					このとき、エンドレスチャンスで起動するには青色のボタンを、ダブルチャンスで起動するには赤色のボタンを、ハンデありで起動するには両方のボタンを<em
						>押しっぱなしにした状態で</em
					>接続するボタンをクリックしてください。
				</li>
			</ul>
		</li>
	</ol>

	<h3>ボタンの<ruby><rb>紐</rb><rt>ひも</rt></ruby>づけ</h3>
	<ul>
		<li>
			早稲田式早押しボタンを起動した直後は、kissQにおけるプレイヤーとボタンの対応が不明な状態です。
		</li>
		<li>
			そのため、ボタンを押して、どのプレイヤーがどのボタンを持っているのか、紐づけ作業が必要です。
		</li>
	</ul>
	<ol>
		<li>
			紐づけを行うには、まず1台の早稲田式早押しボタンの子機を押します。画面に、紐づけが必要である旨が表示されます。
		</li>
		<li>紐づけするプレイヤーの名前の右上にある？ボタンをクリックします。</li>
	</ol>

	<h3>モード<small>（e.g. エンドレスチャンス）</small>を切り替えるには</h3>
	<ol>
		<li>
			早稲田式早押しボタンの親機に繋がっているUSBケーブル（と電源ケーブル）を抜き、電源を切ります。
		</li>
		<li>USBケーブルを差しなおします。</li>
		<li>「その他」の「早稲田式連携」ボタンをクリックします。</li>
		<li>
			表示されるデバイス選択画面で「Arduino Due Prog. Port (COMxxx)」を選択して接続します。
			<ul>
				<li>
					このとき、エンドレスチャンスで起動するには青色のボタンを、ダブルチャンスで起動するには赤色のボタンを、ハンデありで起動するには両方のボタンを<em
						>押しっぱなしにした状態で</em
					>接続するボタンをクリックしてください。
				</li>
			</ul>
		</li>
	</ol>

	<hr />
	<p>
		© 2025–{new Date().getFullYear()}
		<a href="https://x.com/_kidochan" target="_blank">@_kidochan</a>
	</p>
</div>

<script lang="ts">
	import { parseCSV, type BaseQuestion } from '$lib/question';
	import { fade } from 'svelte/transition';

	let { onImport }: { onImport: (questions: BaseQuestion[]) => void } = $props();

	let inputDialog: HTMLDialogElement;

	let stage = $state<'input' | 'config'>('input');

	let rawInput = $state('');

	let hasHeader = $state(false);
	let delimiter = $state<'comma' | 'tab' | 'auto'>('auto');
	let googleSheetsMode = $state(false);
	let rowMapping = $state({ question: 0, answer: 1, comment: 2 as number | null });

	let parsed = $derived(rawInput ? parseCSV(rawInput, { googleSheetsMode, delimiter }) : []);
	let rowLabels = $derived.by(() => {
		if (!rawInput) {
			return [];
		} else if (hasHeader) {
			return Object.entries(parsed[0])
				.toSorted(([a], [b]) => Number(a) - Number(b))
				.filter(([, value]) => value)
				.map(([key, value]) => ({ key: Number(key), name: String(value).slice(0, 20) }));
		} else {
			const maxIndex = parsed.reduce(
				(max, row) =>
					Math.max(
						max,
						...Object.entries(row)
							.filter(([, value]) => value)
							.map(([key]) => Number(key))
					),
				0
			);
			return Array.from({ length: maxIndex + 1 }, (_, i) => ({
				key: i,
				name: `${i + 1}列目`
			}));
		}
	});
	const table = $derived<BaseQuestion[]>(
		rawInput
			? parsed.slice(hasHeader ? 1 : 0).map((row, id) => ({
					id: id + 1,
					question: row[rowMapping.question],
					answer: row[rowMapping.answer],
					comment: rowMapping.comment === null ? '' : row[rowMapping.comment],
					slashOffset: undefined
				}))
			: []
	);

	export function open(): void {
		stage = 'input';
		rawInput = '';
		rowMapping = { question: 0, answer: 1, comment: 2 };
		inputDialog.showModal();
	}
</script>

<dialog closedby="any" bind:this={inputDialog}>
	<header>
		<h1>
			{#if stage === 'input'}
				<div in:fade>問題を読み込む</div>
			{:else}
				<div in:fade>
					<button class="back-btn" onclick={() => (stage = 'input')}>←</button>
					読み込み設定
				</div>
			{/if}
		</h1>
		<div class="spacer"></div>
		<button class="close-btn">×</button>
	</header>

	{#if stage === 'input'}
		<div class="input-area">
			<fieldset>
				<legend>ファイルから読み込む</legend>
				<input
					type="file"
					accept=".csv,.tsv,.txt"
					onchange={(e) => {
						const file = (e.target as HTMLInputElement).files?.[0];
						if (!file) return;

						const reader = new FileReader();
						reader.onload = () => {
							rawInput = reader.result as string;
						};
						reader.readAsText(file);
					}}
				/>
			</fieldset>

			<div>or</div>

			<fieldset>
				<legend>コピペして読み込む</legend>

				<p>この下にCSVまたはTSV形式のデータを貼り付けてください。</p>

				<!-- svelte-ignore a11y_autofocus -->
				<textarea bind:value={rawInput} autofocus rows="5" placeholder="ここだよ"></textarea>

				<p style:font-size="0.8em">
					ヒント：スプレッドシート上で質問と回答の列を選択してコピーするとTSV形式になります。
				</p>
			</fieldset>
		</div>

		<div class="buttons">
			<button disabled={!rawInput} onclick={() => (stage = 'config')}>
				データを読み込んで、取り込み方の設定へ進む
			</button>
		</div>
	{:else if stage === 'config'}
		<div class="table">
			<div>1行目</div>
			<div>
				<label>
					<input type="radio" bind:group={hasHeader} value={true} />
					ヘッダーとして扱う
				</label>
				<label>
					<input type="radio" bind:group={hasHeader} value={false} />
					問題データの1件目として扱う
				</label>
			</div>

			<div>データ形式</div>
			<div>
				<label>
					<input
						type="radio"
						bind:group={delimiter}
						value="comma"
						onclick={() => (googleSheetsMode = false)}
					/>
					CSV
				</label>
				<label>
					<input type="radio" bind:group={delimiter} value="tab" />
					TSV
				</label>
				<label>
					<input
						type="radio"
						bind:group={delimiter}
						value="auto"
						onclick={() => (googleSheetsMode = false)}
					/>
					自動判定
				</label>
				<br />
				<br />
				<label>
					<input
						type="checkbox"
						bind:checked={googleSheetsMode}
						onclick={() => (delimiter = 'tab')}
					/>
					Google Sheetsからコピペした、ぶっ壊れているかもしれないデータをなるべくいい感じにする
				</label>
			</div>

			<div>列の対応</div>
			<div class="table-wrapper">
				{#each [{ name: 'question', label: '質問' }, { name: 'answer', label: '回答' }, { name: 'comment', label: 'コメント' }] as { name, label } (name)}
					<div>
						{label}
					</div>
					<div>
						<select bind:value={rowMapping[name as keyof typeof rowMapping]}>
							<option value={null}>なし</option>
							{#each rowLabels as { key, name } (key)}
								<option value={key}>{name}</option>
							{/each}
						</select>
					</div>
				{/each}
			</div>
		</div>

		<div class="preview">
			<p>プレビュー</p>

			<table>
				<thead>
					<tr>
						<th>質問</th>
						<th>回答</th>
						<th>コメント</th>
					</tr>
				</thead>
				<tbody>
					{#each table as row, i (i)}
						<tr>
							<td><div>{row.question}</div></td>
							<td><div>{row.answer}</div></td>
							<td><div>{row.comment}</div></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<div class="buttons">
			<button
				disabled={!rawInput}
				onclick={() => {
					inputDialog.close();
					onImport(table);
				}}
			>
				取り込む
			</button>
		</div>
	{/if}
</dialog>

<style>
	dialog[open] {
		display: flex;
		flex-direction: column;
		gap: 1em;
		font-size: 1em;
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	h1 {
		margin: 0;
		font-size: 1.2em;
		font-weight: normal;

		div {
			display: flex;
			align-items: bottom;
			gap: 0.25em;
			line-height: 1;
		}
	}

	legend {
		padding: 0 0.5em;
	}

	p {
		margin: 0.5em 0;
	}

	input[type='file'] {
		font-size: 1em;
	}

	textarea {
		width: 100%;
		box-sizing: border-box;
	}

	label:has(input[type='checkbox']) {
		display: flex;
		align-items: baseline;
		gap: 0.4em;
	}

	.back-btn,
	.close-btn {
		width: 2em;
		height: 2em;
		display: inline-flex;
		justify-content: center;
		align-items: center;
		border: 2px solid #ccc;
		border-radius: 3em;
		font-size: 0.6em;
		font-weight: bold;
	}

	.input-area {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		gap: 1em;

		& > * {
			align-content: center;
			font-size: 0.8em;
		}
	}

	.table {
		margin-bottom: 0;
	}

	.table-wrapper {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.5em;
	}

	select {
		max-width: 20em;
		font-size: 1em;
	}

	.preview {
		overflow-y: scroll;
		min-height: 10em;
		max-height: 20em;
		padding: 1em;
		font-size: 0.6em;

		table {
			width: 100%;
			border-collapse: collapse;

			th,
			td {
				border: 1px solid #ccc;
				padding: 0.25em 0.5em;
				text-align: left;
				max-width: 10em;

				div {
					display: -webkit-box;
					-webkit-box-orient: vertical;
					line-clamp: 2;
					-webkit-line-clamp: 2;
					white-space: wrap;
					overflow: hidden;
					text-overflow: ellipsis;
				}
			}
		}
	}
</style>

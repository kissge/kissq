<script lang="ts">
	import { fade } from 'svelte/transition';
	import type { Attendant } from '$lib/attendant';
	import type { GameClassBaseType } from '$lib/game';
	import type { AttendantID, ButtonID } from '$lib/types';
	import { getWasedashikiContext } from '$lib/wasedashiki.svelte';

	let { Game }: { Game: GameClassBaseType } = $props();
	let Wasedashiki = getWasedashikiContext();

	let dialog: HTMLDialogElement;

	let copied = $state(false);

	let importTargets = $state(['group', 'team', 'trophy', 'totalScore', 'manualOrder', 'button']);

	let importingRawData = $state('');
	let importingParsed = $derived.by(() => {
		try {
			return JSON.parse(importingRawData) as {
				attendants: Attendant[];
				buttonMapping: Record<AttendantID, ButtonID>;
			};
		} catch {
			return undefined;
		}
	});

	export function open(): void {
		dialog.showModal();
		dialog.scrollTop = 0;
	}

	function close() {
		dialog.close();
	}
</script>

<dialog bind:this={dialog} closedby="any">
	<p>
		現在のプレイヤーリストの情報を他のタブにコピーすることや、コピーした情報をペーストして取り込むことができます。
	</p>

	<div class="table">
		<div>コピー</div>
		<div>
			現在のプレイヤーリスト（{Game.attendants
				.map((a, ai) => a.name || `プレイヤー${ai + 1}`)
				.join('、')}）（名前以外の情報を含む）を
			<button
				onclick={() => {
					navigator.clipboard.writeText(
						JSON.stringify({
							attendants: Game.attendants,
							buttonMapping: Wasedashiki.buttonMapping
						})
					);
					copied = true;
					setTimeout(() => {
						copied = false;
					}, 2000);
				}}
			>
				コピーする
			</button>
			{#if copied}
				<p class="success" transition:fade>コピーしました。</p>
			{/if}
		</div>

		<div>ペースト</div>
		<div>
			<ol>
				<li>
					コピーしてきた情報を
					<textarea placeholder="ここ" bind:value={importingRawData}></textarea>
					にペーストする
					{#if !importingParsed && importingRawData}
						<p class="error">
							データの形式が正しくありません。再度コピーをやり直して、正確にペーストしてください。
						</p>
					{/if}
				</li>
				<li>
					以下から取り込む情報を選択し
					<button
						onclick={() => {
							const groups = Math.max(...importingParsed!.attendants.map(({ group }) => group));
							if (importTargets.includes('group') && groups > Game.rules.length) {
								Game.rules.push(
									...Array.from({ length: groups - Game.rules.length }, () => Game.rules[0])
								);
							}

							Game.history = [];
							Game.attendants = importingParsed!.attendants.map((p, ai) => ({
								name: p.name,
								group: importTargets.includes('group') ? p.group : 0,
								team: importTargets.includes('team') ? p.team : 0,
								seat: importTargets.includes('team') ? p.seat : 0,
								trophyCount: importTargets.includes('trophy') ? p.trophyCount : 0,
								totalScore: importTargets.includes('totalScore')
									? p.totalScore
									: { maru: 0, batsu: 0 },
								manualOrder: importTargets.includes('manualOrder') ? p.manualOrder : ai,
								buttonID: importTargets.includes('button') ? p.buttonID : undefined
							}));
							Wasedashiki.buttonMapping = importTargets.includes('button')
								? importingParsed!.buttonMapping
								: {};
							Wasedashiki.buttonMappingRestored = importTargets.includes('button');

							importingRawData = '';
							close();
						}}
						disabled={!importingParsed}
					>
						取り込む
					</button>
					<label>
						<input type="checkbox" checked disabled /> 名前（必須）
						{#if importingParsed}
							<span class="sample">
								: {importingParsed.attendants[0]?.name || 'プレイヤー1'}、…
							</span>
						{/if}
					</label>
					<label>
						<input type="checkbox" bind:group={importTargets} value="group" /> ルールグループ
						{#if importingParsed}
							<span class="sample">
								: {String.fromCharCode(importingParsed.attendants[0]?.group + 65)}、…
							</span>
						{/if}
					</label>
					<label>
						<input type="checkbox" bind:group={importTargets} value="team" /> チーム（団体戦用）
						{#if importingParsed}
							<span class="sample">: チーム{importingParsed.attendants[0]?.team + 1}、…</span>
						{/if}
					</label>
					<label>
						<input type="checkbox" bind:group={importTargets} value="trophy" /> トロフィー数
						{#if importingParsed}
							<span class="sample">: 🏆{importingParsed.attendants[0]?.trophyCount}、…</span>
						{/if}
					</label>
					<label>
						<input type="checkbox" bind:group={importTargets} value="totalScore" /> 通算成績
						{#if importingParsed}
							<span class="sample">
								: {importingParsed.attendants[0]?.totalScore.maru}◯
								{importingParsed.attendants[0]?.totalScore.batsu}✕、…
							</span>
						{/if}
					</label>
					<label>
						<input type="checkbox" bind:group={importTargets} value="manualOrder" /> 並び順
						{#if importingParsed}
							<span class="sample">: {importingParsed.attendants[0]?.manualOrder + 1}番、…</span>
						{/if}
					</label>
					<label>
						<input type="checkbox" bind:group={importTargets} value="button" />
						早稲田式早押しボタンとの紐づけ
						{#if importingParsed}
							<span class="sample">: {importingParsed.attendants[0]?.buttonID ?? '未設定'}、…</span>
						{/if}
					</label>
				</li>
			</ol>
		</div>
	</div>

	<div class="buttons">
		<button onclick={close}>閉じる</button>
	</div>
</dialog>

<style>
	dialog {
		user-select: none;
	}

	.success {
		margin: 0;
		color: green;
	}

	.error,
	.sample {
		margin: 0;
		color: red;
	}

	label {
		display: block;
	}

	.buttons {
		margin-top: 1em;
	}
</style>

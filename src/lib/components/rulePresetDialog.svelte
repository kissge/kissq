<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { Rule } from '$lib/rule';
	import { tooltipInDialog as tooltip } from '$lib/tooltip.svelte';
	import { isUnlocked } from '$lib/unlock';

	let {
		apply,
		battleMode,
		rulesObject,
		close,
		isValid
	}: {
		apply: (rules: Rule[], resetGroups: 'reset' | 'keep') => void;
		battleMode: 'single' | 'team';
		rulesObject: Rule[];
		close: () => void;
		isValid: boolean;
	} = $props();

	interface Preset {
		name: string;
		rules: Rule[];
		battleMode: 'single' | 'team';
	}

	let show = $state(false);

	let presets = $state<Preset[]>([]);

	onMount(() => {
		presets = JSON.parse(localStorage.getItem('rulePresets') || '[]').map(
			({ name, rules, battleMode }: Preset) => ({
				name,
				rules: rules.map((rule) => Rule.from(rule)),
				battleMode
			})
		);
	});
</script>

<button
	{@attach tooltip('この機能を利用するにはアンロックが必要です。')}
	onclick={async () => {
		if (await isUnlocked()) {
			show = !show;
		}
	}}
>
	プリセット🔒
</button>

<button
	class="backdrop"
	style:opacity={show ? 1 : 0}
	style:display={show ? 'block' : 'none'}
	onclick={() => (show = false)}
	aria-label="backdrop"
></button>

<div class="dialog" style:opacity={show ? 1 : 0} style:display={show ? 'block' : 'none'}>
	<div class="presets">
		<ul>
			{#each presets
				.map((preset, pi) => ({ preset, pi }))
				.filter(({ preset }) => preset.battleMode === battleMode)
				.toSorted( (a, b) => a.preset.name.localeCompare(b.preset.name) ) as { preset: { name, rules }, pi } (pi)}
				<li transition:fade>
					<div>
						<strong>{name}</strong>
						（{Rule.getActiveRulesText(
							rules.map((rule, i) => ({ rule, i })),
							battleMode
						)}）
						<div class="spacer"></div>
						<button
							onclick={() => {
								apply(
									rules,
									rules.length === 1 ||
										confirm(
											'全プレイヤーをAグループにリセットする場合はOKを、今のグループを可能な限り維持する場合はキャンセルを押してください。'
										)
										? 'reset'
										: 'keep'
								);
								show = false;
								close();
							}}
						>
							適用
						</button>
						<button
							onclick={() => {
								presets = presets.filter((_, i) => i !== pi);
								localStorage.setItem('rulePresets', JSON.stringify(presets));
							}}
						>
							削除
						</button>
					</div>
				</li>
			{:else}
				プリセットがありません。
			{/each}
		</ul>
	</div>

	<div class="buttons">
		<button
			onclick={() => {
				const name = prompt('プリセット名を入力してください。');
				if (!name) {
					return;
				}
				setTimeout(() => {
					presets = [...presets, { name, rules: rulesObject, battleMode }];
					localStorage.setItem('rulePresets', JSON.stringify(presets));
				}, 100);
			}}
			disabled={!isValid}
		>
			今編集中のルールをプリセットに追加
		</button>
		<div class="spacer"></div>
		<button onclick={() => (show = false)}>閉じる</button>
	</div>
</div>

<style>
	.backdrop {
		position: absolute;
		cursor: default;
		inset: 0;
		background: #0008;

		&:active,
		&:focus {
			box-shadow: none;
			border: none;
		}
	}

	.dialog {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		margin-bottom: 0.25em;
		box-shadow:
			0 0 1em #0005,
			0 0 1em #0002;
		border: 3px solid #000;
		border-radius: 0.5em;
		background-color: white;
		padding: 1em;
		padding-top: 0;
		width: min(90%, 900px);
		max-height: min(80dvh, 800px);
		overflow-y: auto;
	}

	li {
		& > div {
			display: flex;
			gap: 0.25em;
		}

		&:hover {
			background-color: #eee;
		}

		strong {
			word-break: break-all;
		}

		button {
			opacity: 0.5;
			transition: opacity 0.1s ease-in-out;
			height: 2em;
			word-break: keep-all;
		}
		&:hover button {
			opacity: 1;
		}
	}

	.buttons {
		display: flex;
		justify-content: end;
		gap: 0.5em;
		margin-top: 1em;
	}

	.spacer {
		flex: 1 0 0;
	}
</style>

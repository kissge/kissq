<script lang="ts">
	import type { GameClassBaseType } from '$lib/game';
	import { Rule } from '$lib/rule';

	let { Game }: { Game: GameClassBaseType } = $props();

	let dialog: HTMLDialogElement;
	export function open(): void {
		dialog.showModal();
		dialog.scrollTop = 0;
	}

	let activeRulesText = $derived(
		Rule.getActiveRulesText(
			Game.rules.flatMap((rule, i) => (rule.isRemoved ? [] : { rule, i })),
			Game.battleMode,
			'long'
		)
	);
</script>

<dialog bind:this={dialog} closedby="any">
	<div class="rules">
		<h1>基本ルール</h1>
		<ul>
			{#each activeRulesText.shared as line, i (i)}
				<li>{line}</li>
			{/each}
		</ul>

		{#each activeRulesText.groups as { teams, text, shortText } (teams)}
			<div class="rule">
				<h1>
					{#if activeRulesText.groups.length > 1}
						{teams}:
					{/if}
					{shortText}
				</h1>
				<ul>
					{#each text as line, i (i)}
						<li>{line}</li>
					{/each}
				</ul>
			</div>
		{/each}
	</div>

	<div class="buttons">
		<div class="spacer"></div>
		<button onclick={() => dialog.close()}>閉じる</button>
	</div>
</dialog>

<style>
	dialog[open] {
		display: grid;
		grid-template-rows: auto 1fr auto;
		width: 90%;
	}

	.rules {
		padding: 0.5em;
		overflow-y: auto;
	}

	.buttons {
		margin-bottom: 0.5em;
	}

	h1 {
		margin: 0;
		border-bottom: 3px solid #333;
	}

	ul {
		margin-top: 0.5em;
		margin-bottom: 2em;
		margin-left: 1em;
		font-size: 1.5em;
	}
</style>

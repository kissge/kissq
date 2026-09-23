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
	{#each activeRulesText as { teams, text, shortText } (teams)}
		<div class="rule">
			<h1>{teams}: {shortText}</h1>
			<ul>
				{#each text as line, i (i)}
					<li>{line}</li>
				{/each}
			</ul>
		</div>
	{/each}
</dialog>

<style>
	h1 {
		margin: 0;
		border-bottom: 3px solid #333;
	}
</style>

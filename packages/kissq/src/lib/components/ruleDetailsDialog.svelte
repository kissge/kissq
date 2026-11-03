<script lang="ts">
	import { getGameContext } from '$lib/gameContext';
	import { Rule } from '$lib/rule';

	let Game = getGameContext();

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
		<div class="rule">
			<div>
				<h1>基本ルール</h1>
				<ul>
					{#each activeRulesText.shared as line, i (i)}
						<li>
							{#each line.split(/([-+]?\d+[点問人])/) as chunk, i (i)}
								{#if i % 2 === 1}
									<em>{chunk}</em>
								{:else}
									{chunk}
								{/if}
							{/each}
						</li>
					{/each}
				</ul>
			</div>
		</div>

		{#each activeRulesText.groups as { teams, text, shortText } (teams)}
			<div class="rule">
				<h1>
					{#if activeRulesText.groups.length > 1}
						<div>{teams}:</div>
					{/if}
					<div>
						{#each shortText.split(/(?<=、)/) as chunk, i (i)}
							<span>{chunk}</span>
						{/each}
					</div>
				</h1>
				<ul>
					{#each text as line, i (i)}
						<li>
							{#each line.split(/([-+]?\d+[点問])/) as chunk, i (i)}
								{#if i % 2 === 1}
									<em>{chunk}</em>
								{:else}
									{chunk}
								{/if}
							{/each}
						</li>
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
		width: 95%;
		max-width: calc(
			var(--rule-base-width) * 2 + var(--rule-gap) + 0.5em * 2 + 1.5rem * 2 + 20em /* why 20em? */
		);
		padding-top: 1.25em;
		text-wrap: pretty;
		background: rgb(255 255 255 / 40%);
		backdrop-filter: blur(0.5em);

		--rule-base-width: 24em;
		--rule-gap: 2em;
	}

	.rules {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--rule-gap);
		width: 100%;
		padding: 2em;
		overflow-y: auto;
		box-sizing: border-box;

		&:has(.rule:last-child:nth-child(2n + 2))::after {
			box-sizing: border-box;
			min-height: 0;
			flex: 1 1 var(--rule-base-width);
			padding: 0 2em;
			content: '';
		}
	}

	.rule {
		flex: 1 1 var(--rule-base-width);
		border-radius: 1em;
		box-shadow: 0 0 1em rgb(0 0 0 / 20%);
		padding: 1.5em 2em;
		background: rgb(255 255 255 / 30%);
		backdrop-filter: blur(0.5em);
		box-sizing: border-box;

		&:first-child {
			flex: 1 1 calc(var(--rule-base-width) * 2 + var(--rule-gap));

			div {
				font-size: 1.2em;
			}
		}

		span {
			display: inline-block;
		}
	}

	em {
		font-style: normal;
		font-weight: bold;
		color: #c10808;
		text-shadow: 0 0 0.05em rgb(0 0 0 / 30%);
	}

	.buttons {
		padding-top: 1em;
		margin-bottom: 0.5em;
	}

	h1 {
		display: flex;
		gap: 0.25em;
		margin: 0;
		border-bottom: 3px solid #333;
	}

	ul {
		margin-top: 0.5em;
		margin-bottom: 0;
		margin-left: 0;
		font-size: 1.5em;
	}

	li {
		white-space: pre-wrap;
	}
</style>

<script lang="ts">
	import { fade } from 'svelte/transition';

	let {
		showQuestionWindow,
		currentQuestion
	}: {
		showQuestionWindow: boolean;
		currentQuestion: {
			question: string;
			answer: string;
		};
	} = $props();
</script>

{#if showQuestionWindow}
	<div transition:fade>
		<div class="question">
			{#key currentQuestion.question}
				<p in:fade>
					{#each currentQuestion.question.split(/(（.+?）|\(.+?\)|【.+?】|［.+?］)/) as part, i (i)}
						{#if i % 2}
							<small>{part}</small>
						{:else}
							{part}
						{/if}
					{/each}
				</p>
			{/key}
			<div class="answer">
				A.
				{#each currentQuestion.answer.split(/(（.+?）|\(.+?\)|【.+?】|［.+?］)/) as part, i (i)}
					{#if i % 2}
						<small>{part}</small>
					{:else}
						{part}
					{/if}
				{/each}
			</div>
		</div>
	</div>
{/if}

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

<style>
	.question {
		position: relative;
		backdrop-filter: blur(10px);
		margin-top: -0.7rem;
		box-shadow: 0 0 15px #eeea;
		border-radius: 0 0 0.5em 0.5em;
		background-color: #0008;
		padding: 0.5em 1em;
		height: 5em;
		color: #fff;
		font-family: serif;

		p {
			margin: 0;
			height: 100%;
			overflow: hidden;
		}

		small {
			opacity: 0.6;
			font-size: smaller;
		}
	}

	.answer {
		display: inline-block;
		position: absolute;
		right: 1em;
		bottom: -0.5em;
		backdrop-filter: blur(10px);
		transition: 0.3s translate 1s ease;

		margin-top: 0.5em;
		box-shadow: 0 0 15px #eeea;
		border-radius: 0.5em;
		background-color: #000c;
		padding: 0.35em 1em;

		&:not(:hover):is(.question:hover *) {
			translate: 0 60%;
			transition-delay: 0s;
		}
	}
</style>

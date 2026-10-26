<script lang="ts">
	import { onMount } from 'svelte';
	import { qZero } from '$lib/question';

	let question = $state(qZero.question);
	let answer = $state(qZero.answer);

	let fontSize = $state(5);

	onMount(() => {
		window.addEventListener('message', (event) => {
			if (event.data.command === 'updateQuestion') {
				question = event.data.question;
				answer = event.data.answer;
			}
		});
	});

	$effect(() => {
		(document.querySelector(':root') as HTMLElement).style.setProperty(
			'--root-font-size',
			`${fontSize / 5}em`
		);
	});
</script>

<svelte:head>
	<title>kissQ - 問題表示</title>
</svelte:head>

<main class="main textbook-font">
	<p class="question">{question}</p>
	<p class="answer">
		{answer}
		<span class="actions">
			<button onclick={() => (fontSize = Math.max(1, fontSize - 1))}>－</button>
			<button onclick={() => (fontSize = Math.min(30, fontSize + 1))}>＋</button>
		</span>
	</p>
</main>

<style>
	main.main {
		grid-template-rows: 1fr auto;
		box-sizing: border-box;
		padding: 0.5em;

		&:hover .actions button {
			opacity: 1;
		}
	}

	p {
		margin: 0;
		padding: 0;
	}

	.answer {
		position: relative;
		text-align: right;

		&::before {
			content: 'A. ';
		}

		.actions {
			display: block;
			position: absolute;
			bottom: 0;
			left: 0;

			button {
				opacity: 0.1;
				transition: 0.3s opacity ease;
				cursor: pointer;
				border: none;
				border-radius: 5em;
				background: none;
				padding: 0;
				width: 1.5em;
				height: 1.5em;
				color: #fff;
				font-size: 0.8em;
				text-align: center;
			}
		}
	}
</style>

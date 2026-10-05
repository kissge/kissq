<script lang="ts">
	import { onMount } from 'svelte';
	import { getWasedashikiContext } from '$lib/wasedashiki.svelte';

	const Wasedashiki = getWasedashikiContext();

	let text = $state('');
	let queue: string[] = $state([]);
	let logs: string[] = $state([]);
	let selectedLog = $state('');

	function sendText() {
		queue.push(text);
		logs = [...logs, text];
		window.localStorage.setItem('wasedashikiDebugLogs', JSON.stringify(logs));
		text = '';
	}

	onMount(() => {
		logs = JSON.parse(window.localStorage.getItem('wasedashikiDebugLogs') ?? '[]');

		Wasedashiki.readLoopSerialPort({} as SerialPort, async function* () {
			while (true) {
				await new Promise((resolve) => setTimeout(resolve, 1000));
				if (queue.length > 0) {
					yield* queue.shift()!.split('\n');
				}
			}
		});
	});
</script>

<div class="wasedashiki-debug">
	<div>
		<textarea
			bind:value={text}
			onkeyup={(e) => {
				if (e.key === 'Enter' && e.ctrlKey) {
					sendText();
				}
			}}
		></textarea>
		<button onclick={sendText}>送信</button>
	</div>
	<select
		bind:value={selectedLog}
		onchange={() => {
			if (selectedLog) {
				queue.push(selectedLog);
				selectedLog = '';
			}
		}}
	>
		<option value="">過去の送信ログ</option>
		{#each logs.toReversed() as log (log)}
			<option value={log}>{log.replace(/\n/g, ' / ')}</option>
		{/each}
	</select>
</div>

<style>
	.wasedashiki-debug {
		display: flex;
		position: fixed;
		bottom: 0.125em;
		left: 0;
		flex-direction: column;
		z-index: 9999;
		background: rgba(0, 0, 0, 0.5);
		padding: 0.5em;

		& > div {
			display: flex;
		}
	}

	textarea {
		width: 20em;
		height: 5em;
	}
</style>

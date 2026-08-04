<script lang="ts">
	import { fly } from 'svelte/transition';
	import type { GameClassBaseType } from '$lib/game';
	import { getWasedashikiContext } from '$lib/wasedashiki.svelte';

	let Game = $state<GameClassBaseType>();
	let Wasedashiki = getWasedashikiContext();

	let mode = $state<'snake' | 'random' | 'new'>('snake');
	let seatMode = $state<'all-same' | 'all-different'>('all-same');
	let teamSize = $state<number>(2);
	let teams = $state<{ name: string; rate?: number; attendantID?: number }[][]>([]);
	let memberList = $state<string>('');

	let dialog: HTMLDialogElement;
	let resolve: (result: Awaited<ReturnType<typeof open>>) => void;

	let teamCount = $derived(Math.floor((Game?.attendants.length ?? 0) / teamSize));

	export async function open(game: GameClassBaseType): Promise<void> {
		Game = game;

		memberList = '';
		mode = 'snake';
		seatMode = 'all-same';
		teamSize = 2;
		teams = [];

		dialog.showModal();
		dialog.scrollTop = 0;
		update();

		return new Promise((r) => {
			resolve = r;
		});
	}

	function apply() {
		if (!Game || !teams) {
			return;
		}

		if (mode === 'snake' || mode === 'random') {
			teams.forEach((team, ti) => {
				team.forEach(({ attendantID }, ord) => {
					Game!.attendants[attendantID!].team = ti;
					Game!.attendants[attendantID!].seat = seatMode === 'all-same' ? 0 : ord;
				});
			});
		} else {
			Game.history = [];
			Game.attendants = teams
				.map((team, ti) => team.map((member, si) => ({ ...member, ti, si })))
				.flat()
				.map(({ name, ti, si }, ai) => ({
					name,
					group: 0,
					team: ti,
					seat: seatMode === 'all-same' ? 0 : si,
					trophyCount: 0,
					totalScore: { num: 0, den: 0, maru: 0, batsu: 0 },
					manualOrder: ai
				}));
			Game.teams = teams.map(() => '');
			Wasedashiki.buttonMapping = {};
			Wasedashiki.answerers = [];
			Wasedashiki.lastButtonID = undefined;
		}

		if (Game.teams.length > teamCount) {
			Game.teams.splice(teamCount);
		} else if (Game.teams.length < teamCount) {
			Game.teams.push(...Array.from({ length: teamCount - Game.teams.length }, () => ''));
		}

		close();
	}

	function close() {
		dialog.close();
		resolve();
	}

	function update(): void {
		if (!Game) {
			return;
		}

		if (mode === 'random') {
			const shuffled = Game.currentState.attendants
				.map((att, attendantID) => ({ name: att.name, rate: att.rate, attendantID }))
				.toSorted(() => Math.random() - 0.5);
			teams = [];
			for (let i = 0; i < teamCount; ++i) {
				teams[i] = shuffled.splice(0, teamSize);
			}
			for (let ti = 0; shuffled.length > 0; ++ti) {
				teams[ti % teamCount].push(shuffled.shift()!);
			}
		} else if (mode === 'snake') {
			const sorted = Game.currentState.attendants
				.map((att, attendantID) => ({ name: att.name, rate: att.rate, attendantID }))
				.sort((a, b) => b.rate - a.rate);

			const snake = function* () {
				while (true) {
					yield* Array.from({ length: teamCount }, (_, i) => i);
					yield* Array.from({ length: teamCount }, (_, i) => teamCount - i - 1);
				}
			};

			teams = Array.from({ length: teamCount }, () => []);
			for (const i of snake()) {
				if (sorted.length === 0) {
					break;
				}
				teams[i].push(sorted.shift()!);
			}
		} else {
			const names = memberList
				.split(/[\r\n]+/)
				.map((name) => name.trim())
				.filter((name) => name.length > 0);

			teams = [];
			for (let i = 0; i < teamCount; ++i) {
				teams[i] = names.splice(0, teamSize).map((name) => ({ name }));
			}
			for (let ti = 0; names.length > 0; ++ti) {
				teams[ti % teamCount].push({ name: names.shift()! });
			}
		}
	}
</script>

<dialog bind:this={dialog} closedby="any">
	{#if Game}
		<div class="table">
			<div>組み分け方</div>
			<div>
				<label>
					<input type="radio" bind:group={mode} value="snake" onchange={update} />
					レート順（蛇腹）
				</label>
				<label>
					<input type="radio" bind:group={mode} value="random" onchange={update} />
					ランダム
				</label>
				<label>
					<input type="radio" bind:group={mode} value="new" onchange={update} />
					メンバーリストを使って新規作成
				</label>
			</div>

			{#if mode === 'new'}
				<div transition:fly={{ y: 50 }}>メンバーリスト</div>
				<div transition:fly={{ y: 50 }}>
					<textarea
						rows="5"
						bind:value={memberList}
						placeholder="名前を順番に1行に1人ずつ入力してください"
						oninput={update}
					></textarea>
				</div>
			{/if}

			<div>チーム人数</div>
			<div>
				<input
					type="number"
					bind:value={teamSize}
					min="1"
					max={Game.attendants.length}
					onchange={update}
				/>
				人（{teamCount}チーム）
			</div>

			<div>枠</div>
			<div>
				<label>
					<input type="radio" bind:group={seatMode} value="all-same" />
					全員1枠
				</label>
				<label>
					<input type="radio" bind:group={seatMode} value="all-different" />
					全員異なる枠
				</label>
			</div>

			<div>プレビュー</div>
			<div>
				<table>
					<tbody>
						{#each teams as team, i (i)}
							{#if team.length > 0}
								<tr>
									<th>
										チーム {i + 1}
										{#if team[0].rate != undefined}
											<small>
												(Avg.&nbsp;{Math.floor(
													team.reduce(
														(sum, { attendantID }) =>
															sum + Game!.currentState.attendants[attendantID!].rate,
														0
													) / team.length
												).toLocaleString()})
											</small>
										{/if}
									</th>
									<td>
										{#each team as { name, rate, attendantID }, ord (ord)}
											{ord === 0 ? '' : '、'}{name || `プレイヤー${attendantID! + 1}`}
											{#if rate != undefined}
												<small>
													({rate.toLocaleString()})
												</small>
											{/if}
										{/each}
									</td>
								</tr>
							{/if}
						{/each}
					</tbody>
				</table>
				{#if mode === 'random'}
					<button onclick={update}>再シャッフル</button>
				{/if}
			</div>
		</div>

		<div class="buttons">
			<button onclick={close}>キャンセル</button>
			<button class="primary" onclick={apply}>反映させる</button>
		</div>
	{/if}
</dialog>

<style>
	dialog {
		width: 80vw;
	}

	textarea {
		width: 90%;
	}

	table {
		border-collapse: collapse;
	}

	tr:not(:last-child) {
		border-bottom: 1px solid #ccc;
	}

	th {
		border-right: 1px solid #ccc;
		padding: 0.5em;
	}

	td {
		padding: 0.5em;
		word-break: break-all;
	}

	small {
		font-weight: normal;
	}
</style>

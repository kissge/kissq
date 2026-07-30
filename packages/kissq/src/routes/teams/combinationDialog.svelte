<script lang="ts">
	import type { GameClassBaseType } from '$lib/game';

	let Game = $state<GameClassBaseType>();

	let mode = $state<'snake' | 'random'>('snake');
	let seatMode = $state<'all-same' | 'all-different'>('all-same');
	let teamSize = $state<number>(2);
	let teams = $state<number[][]>();

	let dialog: HTMLDialogElement;
	let resolve: (result: Awaited<ReturnType<typeof open>>) => void;

	let teamCount = $derived(Math.floor((Game?.attendants.length ?? 0) / teamSize));

	export async function open(game: GameClassBaseType): Promise<void> {
		Game = game;
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

		teams.forEach((team, ti) => {
			team.forEach((ai, ord) => {
				Game!.attendants[ai].team = ti;
				Game!.attendants[ai].seat = seatMode === 'all-same' ? 0 : ord;
			});
		});

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
			const shuffled = Game.attendants.map((_, i) => i).sort(() => Math.random() - 0.5);
			teams = [];
			for (let i = 0; i < teamCount; ++i) {
				teams[i] = shuffled.splice(0, teamSize);
			}
			for (let ti = 0; shuffled.length > 0; ++ti) {
				teams[ti % teamCount].push(shuffled.shift()!);
			}
		} else {
			const sorted = Game.attendants
				.map((_, i) => i)
				.sort((ai, bi) => {
					const a = Game!.attendants[ai];
					const b = Game!.attendants[bi];
					return b.totalScore.num * a.totalScore.den - a.totalScore.num * b.totalScore.den;
				});

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
			</div>

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
							<tr>
								<th>
									チーム {i + 1}
									<small>
										(Avg.&nbsp;{Math.floor(
											team.reduce((sum, ai) => sum + Game!.currentState.attendants[ai].rate, 0) /
												team.length
										).toLocaleString()})
									</small>
								</th>
								<td>
									{#each team as ai, ord (ai)}
										{ord === 0 ? '' : '、'}{Game.attendants[ai].name || `プレイヤー${ai + 1}`}
										<small>
											({Game.currentState.attendants[ai].rate.toLocaleString()})
										</small>
									{/each}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
				{#if mode === 'random'}
					<button onclick={update}>再シャッフル</button>
				{/if}
			</div>
		</div>

		<div class="buttons">
			<button onclick={close}>閉じる</button>
			<button class="primary" onclick={apply}>反映させる</button>
		</div>
	{/if}
</dialog>

<style>
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

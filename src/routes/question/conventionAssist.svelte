<script lang="ts">
	import { fly } from 'svelte/transition';
	import type { Attendant } from '$lib/attendant';
	import type { GameState } from '$lib/state';
	import { tooltip } from '$lib/tooltip.svelte';
	import type { AttendantID } from '$lib/types';

	let {
		show = $bindable(),
		attendants,
		currentState,
		teams,
		reset,
		setAttendantList,
		setGameTitle,
		updateAttendant
	}: {
		show: boolean;
		attendants: Attendant[];
		currentState: GameState | undefined;
		teams: string[] | undefined;
		reset: () => void;
		setAttendantList: (attendants: Attendant[]) => void;
		setGameTitle: (title: string) => void;
		updateAttendant: (attendantID: number, diff: { group?: number; name?: string }) => void;
	} = $props();

	let fullAttendants = $state<Attendant[]>([]);

	let games = $state([
		{
			status: 'not-started' as 'not-started' | 'in-progress' | 'finished',
			title: '',
			attendantIDs: [] as AttendantID[],
			attendants: [] as Attendant[],
			state: undefined as GameState | undefined,
			teams: undefined as string[] | undefined
		}
	]);

	let gameInProgress = $derived(games.find((g) => g.status === 'in-progress'));

	let stats = $derived(
		fullAttendants.map((_, ai) =>
			games.reduce(
				(acc, game) => {
					acc.competed += game.attendantIDs.includes(ai as AttendantID) ? 1 : 0;

					if (game.status !== 'not-started' && game.attendantIDs.includes(ai as AttendantID)) {
						const cai = game.attendantIDs.indexOf(ai as AttendantID);
						const att =
							game.status === 'in-progress'
								? currentState!.attendants[cai]
								: game.state!.attendants[cai];
						const battleMode =
							att.rule.mode === 'aql' || att.rule.mode === 'product' || att.rule.mode === 'sum'
								? 'team'
								: 'single';

						if (battleMode === 'team') {
							acc.won += att.team!.teamLife === 'won' ? 1 : 0;
							acc.lost += att.team!.teamLife === 'lost' ? 1 : 0;
						} else {
							acc.won += att.life === 'won' ? 1 : 0;
							acc.lost += att.life === 'lost' ? 1 : 0;
						}
					}
					return acc;
				},
				{ competed: 0, won: 0, lost: 0 }
			)
		)
	);

	function addAttendant(name: string = '') {
		fullAttendants.push({
			name,
			group: 0,
			team: 0,
			seat: 0,
			trophyCount: 0,
			totalScore: { maru: 0, batsu: 0 },
			manualOrder: fullAttendants.length
		});
	}

	async function finishGame() {
		const _currentState = currentState;

		// リセット
		reset();
		// 一応非同期処理なのでちょっと待つ
		await new Promise((resolve) => setTimeout(resolve, 100));

		// 前のゲームの終了処理
		for (const g of games) {
			if (g.status === 'in-progress') {
				g.state = _currentState;
				g.teams = $state.snapshot(teams);
				g.attendants = $state.snapshot(attendants);
				g.status = 'finished';
				attendants.forEach((att, cai) => {
					const ai = g.attendantIDs[cai];
					fullAttendants[ai] = att;
				});
				break;
			}
		}
	}
</script>

{#if show}
	<dialog open closedby="any" transition:fly={{ y: 100 }} onclose={() => (show = false)}>
		{#if fullAttendants.length === 0}
			<div class="welcome" in:fly={{ y: 100 }}>
				<div>
					<p>
						大会アシストを使うと、「参加者リスト（例えば大会の全参加者）」を作った上で、1ゲーム目（例えば1回戦）はそのうち一部が参加、2ゲーム目（例えば2回戦）はまた別の一部が参加、……のようなことが簡単にできます。
					</p>
					<p>
						早稲田式早押しボタンとの紐づけや累計正答・誤答数も消えずに次のゲームに引き継がれます。
					</p>
					<p>まずは参加者リストを用意しましょう。</p>
					<button
						onclick={() => {
							fullAttendants = attendants;
						}}
					>
						現在のメイン画面のプレイヤーリスト（{attendants.length}人）をコピーして開始する
					</button>
					<button
						onclick={() => {
							fullAttendants = [
								{
									name: '',
									group: 0,
									team: 0,
									seat: 0,
									trophyCount: 0,
									totalScore: { maru: 0, batsu: 0 },
									manualOrder: 0
								}
							];
						}}
					>
						空の参加者リストで開始する
					</button>
				</div>
			</div>
		{:else}
			<div
				class="assist-table"
				in:fly={{ y: 100 }}
				style:grid-template-rows={`auto repeat(${fullAttendants.length + 1}, 1fr)`}
			>
				<!-- Header (left) -->
				<div class="header-left header-top"></div>
				{#each fullAttendants as attendant, ai (ai)}
					<div
						class="header-left"
						{@attach tooltip('ここでも、複数行をペーストすると一括入力ができます')}
					>
						<input
							bind:value={attendant.name}
							type="text"
							placeholder="プレイヤー{ai + 1}"
							onchange={() => {
								if (gameInProgress) {
									const cai = gameInProgress.attendantIDs.indexOf(ai as AttendantID);
									if (cai !== -1) {
										updateAttendant(cai, { name: attendant.name });
									}
								}
							}}
							onpaste={(event) => {
								const text = (event.clipboardData?.getData('text') || '').trim();
								const lines = text.split(/[\r\n]+/);
								if (lines.length >= 2) {
									event.preventDefault();
									lines.forEach((line, i) => {
										if (ai + i < fullAttendants.length) {
											fullAttendants[ai + i] = {
												name: line,
												group: 0,
												team: 0,
												seat: 0,
												trophyCount: 0,
												totalScore: { maru: 0, batsu: 0 },
												manualOrder: fullAttendants[ai + i].manualOrder
											};
										} else {
											addAttendant(line);
										}
									});
								}
							}}
						/>
					</div>
				{/each}
				<div class="header-left footer">
					<button onclick={() => addAttendant()}>プレイヤーを追加</button>
				</div>

				<!-- Body (right)-->
				{#each games as game, gi (gi)}
					{@const state = game.status === 'in-progress' ? currentState! : game.state}
					{@const battleMode =
						state &&
						(state.defaultRule.mode === 'aql' ||
						state.defaultRule.mode === 'product' ||
						state.defaultRule.mode === 'sum'
							? ('team' as const)
							: ('single' as const))}
					{@const atts = game.status === 'finished' ? game.attendants : attendants}
					{@const _teams = game.status === 'finished' ? game.teams : teams}

					<!-- Header (top) -->
					<div class="header-top">
						<!--全選択-->
						{#if game.status === 'not-started'}
							<input
								type="checkbox"
								checked={game.attendantIDs.length === fullAttendants.length}
								indeterminate={game.attendantIDs.length > 0 &&
									game.attendantIDs.length < fullAttendants.length}
								onchange={() => {
									if (game.attendantIDs.length === fullAttendants.length) {
										game.attendantIDs = [];
									} else {
										game.attendantIDs = fullAttendants.map((_, i) => i as AttendantID);
									}
								}}
								{@attach tooltip('全選択・全選択解除')}
							/>
						{/if}
						<input
							bind:value={game.title}
							type="text"
							placeholder="ゲーム{gi + 1}"
							onchange={() => {
								if (game.status === 'in-progress') {
									setGameTitle(game.title);
								}
							}}
						/>
					</div>

					<!-- Body -->
					{#each fullAttendants, ai (ai)}
						<div>
							{#if game.status === 'not-started'}
								<label>
									<input type="checkbox" bind:group={game.attendantIDs} value={ai} /> 参加
								</label>
							{:else if game.attendantIDs.includes(ai as AttendantID) && state}
								{@const cai = game.attendantIDs.indexOf(ai as AttendantID)}
								{@const att = state.attendants[cai]}
								{@const ti = (game.status === 'in-progress' ? attendants : game.attendants)[cai]
									.team}

								{#if battleMode === 'single'}
									{#if att.life === 'won'}
										<span class="life won">{state.ranks[cai]}位</span>
									{:else if att.life === 'lost'}
										<span class="life lost">{state.ranks[cai]}位</span>
									{:else if game.status === 'finished'}
										<span class="life">{state.ranks[cai]}位</span>
									{/if}

									{#if att.rule.mode === 'marubatsu'}
										{att.maruCount}◯{att.batsuCount}✕
									{:else}
										{att.score} pt{#if att.score !== 1}s{/if}
									{/if}
								{:else}
									{#if att.team?.teamLife === 'won'}
										<span class="life won">{state.teamRanks[ti]}位</span>
									{:else if att.team?.teamLife === 'lost'}
										<span class="life lost">{state.teamRanks[ti]}位</span>
									{:else if game.status === 'finished'}
										<span class="life">{state.teamRanks[ti]}位</span>
									{/if}

									<span
										class="team-name"
										style:background={`hsl(${(360 / (_teams?.length ?? 0)) * atts[cai].team}, 90%, 40%)`}
									>
										{_teams ? _teams[ti] || `チーム${ti + 1}` : '???'}
									</span>

									{att.team?.teamScore} pt{#if att.team?.teamScore !== 1}s{/if}
								{/if}
							{/if}
						</div>
					{/each}

					<!-- Footer (bottom) -->
					<div class="footer">
						{#if game.status === 'not-started'}
							<button
								disabled={game.attendantIDs.length === 0}
								onclick={async () => {
									await finishGame();

									// 新しい設定を送信
									setAttendantList(
										game.attendantIDs.map((ai) => {
											const attendant = fullAttendants[ai];

											if (!attendant.name) {
												attendant.name = `プレイヤー${ai + 1}`;
											}

											return attendant;
										})
									);
									setGameTitle(game.title);

									// 一応非同期処理なのでちょっと待つ
									await new Promise((resolve) => setTimeout(resolve, 100));
									game.status = 'in-progress';

									setTimeout(() => {
										show = false;
									}, 1000);
								}}
							>
								{game.attendantIDs.length}名でゲームを開始
							</button>
						{:else if game.status === 'in-progress'}
							進行中&nbsp;
							<button onclick={finishGame}>終了</button>
						{:else if game.status === 'finished'}
							終了
						{/if}
					</div>
				{/each}

				<!-- Footer (right) -->
				<div class="header-top">
					<button
						onclick={() => {
							games.push({
								status: 'not-started',
								title: '',
								state: undefined,
								attendantIDs: [],
								attendants: [],
								teams: undefined
							});
						}}
					>
						ゲームを追加
					</button>
				</div>
				{#each fullAttendants, ai (ai)}
					<div>
						{stats[ai].competed}<i>戦</i>{stats[ai].won}<i>勝</i>{stats[ai].lost}<i>失格</i>
					</div>
				{/each}
				<div class="footer"></div>
			</div>
		{/if}
		<button class="close-btn" onclick={() => (show = false)}>×</button>
	</dialog>
{/if}

<style>
	dialog {
		display: flex;
		top: 50%;
		transform: translate(0, -50%);
		background: white;
		padding: 1em;
		width: calc(100% - 5em);
		height: calc(100% - 5em);
		overflow-y: auto;
		font-size: 1em;

		&:has([class*='welcome']) {
			justify-content: center;
		}

		&:has([class*='assist-table']) {
			align-content: center;
		}
	}

	.close-btn {
		position: absolute;
		top: 1em;
		right: 1em;
		border: 2px solid black;
		border-radius: 3em;
		font-weight: bold;
	}

	.welcome {
		display: flex;
		flex-direction: column;
		min-height: 100%;

		& > div {
			margin: auto;
			max-width: 50em;
		}
	}

	.assist-table {
		display: grid;
		grid-auto-flow: column;
		align-self: flex-start;
		max-height: 100%;
		overflow-y: auto;

		& > div {
			display: flex;
			justify-content: center;
			align-items: center;
			border-right: 1px solid #0001;
			padding: 0.25em;
			min-width: 9em;

			input[type='text'] {
				border: 0;
				border-bottom: 1px solid #ccc;
				width: 100%;
				font-size: 1em;
				text-align: center;
			}

			input[type='checkbox'] {
				cursor: pointer;
				width: 1em;
				height: 1em;
				font-size: 0.8em;
			}
		}
	}

	.header-top {
		position: sticky;
		top: 0;
		grid-row-start: 1;
		border-bottom: 2px solid #444;
		background: white;
		min-width: 6em;
	}

	.header-left {
		position: sticky;
		left: 0;
		justify-content: flex-end !important;
		box-shadow: 5px 0 5px rgba(0, 0, 0, 0.1);
		border-right: 2px solid #444;
		background: white;
		min-width: 8em;

		input[type='text'] {
			text-align: right !important;
		}
	}

	.footer {
		position: sticky;
		bottom: 0;
		box-shadow: 0 -5px 5px rgba(0, 0, 0, 0.1);
		background: white;
	}

	.team-name {
		margin-right: 0.5em;
		border-radius: 0.5em;
		padding: 0.1em 0.5em;
		color: white;
		font-size: 0.5em;
	}

	.life {
		display: inline-block;
		margin-right: 0.5em;
		border-radius: 0.5em;
		background-color: #555;
		padding: 0.1em 0.5em;
		color: white;

		&.won {
			background-color: green;
		}

		&.lost {
			background-color: red;
		}
	}

	.header-top.header-left,
	.header-left.footer {
		z-index: 1000;
	}

	i {
		color: #888;
		font-style: normal;
	}
</style>

<script lang="ts">
	import { fade } from 'svelte/transition';
	import Toastify from 'toastify-js';
	import type { Attendant } from '$lib/attendant';
	import { RemoveHistoryEntry } from '$lib/historyEntry';
	import { AttendantState } from '$lib/state';
	import { tooltip, tooltipInteractive } from '$lib/tooltip.svelte';
	import { getGameContext } from './game.svelte';
	import { getWasedashikiContext } from './wasedashiki.svelte';

	let {
		seats,
		ti,
		atts,
		si
	}: {
		seats: (
			| {
					att: Attendant;
					i: number;
					j: number;
			  }[]
			| undefined
		)[];
		ti: number;
		atts:
			| {
					att: Attendant;
					i: number;
					j: number;
			  }[]
			| undefined;
		si: number;
	} = $props();

	let Game = getGameContext();
	let Wasedashiki = getWasedashikiContext();

	let rowStart = $derived(
		seats.slice(0, si).reduce((sum, seatAtts) => sum + (seatAtts?.length ?? 0), 1)
	);
	let maxSeat = $derived(
		seats.reduce(
			(max, atts) => Math.max(max, atts?.reduce((m, { att }) => Math.max(m, att.seat), 0) ?? 0),
			0
		)
	);
	let batsuCount = $derived(
		atts?.reduce((sum, { i }) => sum + (Game.currentState.attendants[i]?.batsuCount ?? 0), 0) ?? 0
	);
	let seatTotal = $derived(
		atts?.reduce(
			(sum, { i }) => sum + (Game.currentState.attendants[i]?.score ?? 0),
			Game.currentState.defaultRule.mode === 'aql' ? 1 : 0
		) ?? 0
	);
</script>

{#if !atts?.every(({ i }) => Game.currentState.attendants[i].life === 'removed')}
	<div
		class="grid-wrapper"
		class:group-by-seat={Game.currentState.defaultRule.mode === 'aql' ||
			Game.currentState.defaultRule.mode === 'product'}
	>
		<div
			class="seat-total"
			style:grid-row={`${rowStart} / span ${atts?.length}`}
			style:display={(atts?.length ?? 0) > 0 &&
			(Game.currentState.defaultRule.mode === 'aql' ||
				Game.currentState.defaultRule.mode === 'product')
				? ''
				: 'none'}
		>
			<div {@attach tooltip('枠の総得点')}>
				{#key seatTotal}
					<span in:fade>
						{seatTotal}
					</span>
				{/key}
			</div>
			<div
				class="batsu-count"
				style:display={Game.currentState.defaultRule.mode === 'aql' ? '' : 'none'}
			>
				{'✕'.repeat(batsuCount)}
			</div>
		</div>
		{#each atts?.filter(({ i }) => Game.currentState.attendants[i]?.life !== 'removed') as { att, i }, ai (ai)}
			{@const sAtt: AttendantState | undefined = Game.currentState.attendants[i]}
			{#if sAtt}
				<div
					class="member"
					style:grid-row-start={rowStart + ai}
					class:lizhi={sAtt.isLizhi}
					class:yasu={sAtt.yasuDisplay > 0}
					class:lost={sAtt.life === 'lost' ||
						(Game.currentState.defaultRule.mode === 'aql' && batsuCount >= 2)}
					class:first-member={si === 0 && ai === 0}
					{@attach Game.currentState.teams[ti].teamLife === 'alive' &&
						(Game.currentState.defaultRule.mode === 'aql' ? batsuCount < 2 : true) &&
						sAtt?.life === 'alive' &&
						sAtt.yasuDisplay === 0 &&
						tooltipInteractive(
							typeof document !== 'undefined'
								? `<div data-attendant-id="${i}">` +
										document
											.getElementById('hover-menu')!
											.innerHTML.replaceAll('data-on', 'on')
											.replace(
												'%teams%',
												Game.teams
													.map(
														(team, j) =>
															`<option ${ti === j ? 'selected' : ''}>${team.slice(0, 5) || `チーム${j + 1}`}</option>`
													)
													.join('')
											) +
										'</div>'
								: ''
						)}
				>
					<div
						class="seat"
						style:display={Game.currentState.defaultRule.mode === 'aql' ||
						Game.currentState.defaultRule.mode === 'product'
							? ''
							: 'none'}
						{@attach tooltip('枠を変更します。')}
					>
						<select bind:value={Game.attendants[i].seat}>
							{#each Array.from({ length: maxSeat + 2 }, (_, si) => si) as si (si)}
								<option value={si}>{si + 1}</option>
							{/each}
						</select>
					</div>
					<div>
						{#if Game.activeRules.length > 1}
							<button
								class="group"
								style:background-color={`hsl(${(360 / Game.rules.length) * Game.attendants[i].group}, 70%, 40%)`}
								onclick={() => {
									do {
										Game.attendants[i].group = (Game.attendants[i].group + 1) % Game.rules.length;
									} while (Game.rules[Game.attendants[i].group].isRemoved);
								}}
								{@attach tooltip('このプレイヤーの所属ルールグループを変更します。')}
							>
								{#key Game.attendants[i].group}
									<span class="crossfade" in:fade={{ delay: 500 }} out:fade>
										{String.fromCodePoint(65 + Game.attendants[i].group)}
									</span>
								{/key}
							</button>
						{/if}
						<button
							class="button-mapping"
							style={Wasedashiki.buttonMapping[i] == null
								? undefined
								: 1 <= Wasedashiki.buttonMapping[i] && Wasedashiki.buttonMapping[i] <= 6
									? 'background-color: red; color: white'
									: 7 <= Wasedashiki.buttonMapping[i] && Wasedashiki.buttonMapping[i] <= 12
										? 'background-color: blue; color: white'
										: 13 <= Wasedashiki.buttonMapping[i] && Wasedashiki.buttonMapping[i] <= 18
											? 'background-color: yellow; color: black'
											: 'background-color: green; color: white'}
							style:display={Wasedashiki.lastButtonID == undefined &&
							!Wasedashiki.buttonMappingRestored
								? 'none'
								: ''}
							disabled={Wasedashiki.lastButtonID == undefined && !Wasedashiki.buttonMappingRestored}
							{@attach tooltip(
								`このプレイヤーが持っているボタンは${Wasedashiki.buttonMapping[i] == null ? '???' : Wasedashiki.buttonMapping[i]}番です。クリックで紐づけ`
							)}
							onclick={() => {
								if (Wasedashiki.lastButtonID !== undefined) {
									Wasedashiki.buttonMapping = {
										...Object.fromEntries(
											Object.entries(Wasedashiki.buttonMapping).filter(
												([, v]) => v !== Wasedashiki.lastButtonID
											)
										),
										[i]: Wasedashiki.lastButtonID!
									};
									Toastify({
										text: `ボタン${Wasedashiki.lastButtonID}は${att.name || `プレイヤー${i + 1}`}が持っています`
									}).showToast();
								}
							}}
						>
							{Wasedashiki.buttonMapping[i] ?? '?'}
						</button>
						<input
							class={[
								'name',
								{
									'answerer-1st':
										Wasedashiki.answerers[(Wasedashiki.buttonMapping[i] ?? 0) - 1]?.rank === 1,
									'answerer-2nd':
										(Game.wasedashikiMode === 'endless' || Game.wasedashikiMode === 'double') &&
										Wasedashiki.answerers[(Wasedashiki.buttonMapping[i] ?? 0) - 1]?.rank === 2,
									'answerer-late':
										Game.wasedashikiMode === 'endless' &&
										Wasedashiki.answerers[(Wasedashiki.buttonMapping[i] ?? 0) - 1]?.rank === 'late'
								}
							]}
							bind:value={att.name}
							placeholder={`プレイヤー${i + 1}`}
							onpaste={(e) => Game.handlePasteEvent(e, i, ti)}
						/>
						<small class="yasu">
							{#if sAtt?.yasuDisplay > 0}
								{#if sAtt.yasuCount === 'next'}次{/if}
								{sAtt.yasuDisplay}
								休
							{/if}
						</small>
					</div>
					<div class="score">
						{#key sAtt.score}
							<span in:fade>
								{sAtt.score}
							</span>
						{/key}
					</div>
					{#if Game.currentState.teams[ti].teamLife === 'alive' && (Game.currentState.defaultRule.mode === 'aql' ? batsuCount < 2 : true) && sAtt?.life === 'alive' && sAtt.yasuDisplay === 0}
						<div class="buttons" data-attendant-id={i}>
							<button
								class="delete-btn"
								disabled={Game.currentState.teams[ti].attendantIDsPerSeat
									.flat()
									.filter((a) => a != null && Game.currentState.attendants[a].life !== 'removed')
									.length <= 1}
								onclick={() => Game.history.push(new RemoveHistoryEntry(i))}
								{@attach tooltip('このプレイヤーをリストから削除します。')}
								tabindex={-1}
							>
								削除
							</button>
							<select
								disabled={Game.history.length > 0 ||
									Game.currentState.teams[ti].attendantIDsPerSeat
										.flat()
										.filter((a) => a != null && Game.currentState.attendants[a].life !== 'removed')
										.length <= 1}
								bind:value={Game.attendants[i].team}
								onchange={() => {
									const t = Game.attendants[i].team;
									Game.attendants[i].team = Infinity;
									Game.attendants[i].seat = Game.currentState.teams[t].attendantIDsPerSeat.length;
									Game.attendants[i].team = t;
								}}
								{@attach tooltip('このプレイヤーのチームを変更します。')}
								tabindex={-1}
							>
								{#each Game.teams as team, j (j)}
									<option value={j}>{team?.slice(0, 5) || `チーム${j + 1}`}</option>
								{/each}
							</select>
							<button class="maru-btn" onclick={() => Game.clickMaru(i)} tabindex={-1}> O </button>
							<button class="batsu-btn" onclick={() => Game.clickBatsu(i)} tabindex={-1}>
								X
							</button>
						</div>
					{/if}
				</div>
			{/if}
		{/each}
	</div>
{/if}

<style>
	input {
		flex: 1 1 100%;
		border: none;
		background: transparent;
		min-width: 0;
		color: #fff;
		font-size: inherit;
		text-align: center;
		text-shadow:
			0px 0px 12px #0007,
			0px 0px 12px #0007;

		&::placeholder {
			color: #fff;
			text-shadow: none;
		}
	}

	.grid-wrapper {
		display: contents;

		&.group-by-seat {
			& .member:not(:nth-child(2)):not(:last-child) {
				border-top-right-radius: 0;
				border-bottom-right-radius: 0;
				.score {
					border-top-right-radius: 0;
					border-bottom-right-radius: 0;
				}
			}

			& .member:nth-child(2):not(:last-child) {
				border-bottom-right-radius: 0;
				.score {
					border-bottom-right-radius: 0;
				}
			}

			& .member:last-child:not(:nth-child(2)) {
				border-top-right-radius: 0;
				.score {
					border-top-right-radius: 0;
				}
			}
		}
	}

	.seat-total {
		display: flex;
		position: relative;
		grid-column: -2 / -1;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		gap: 0;
		padding-right: 0.5em;
		font-weight: bold;
		line-height: 0.8;

		&:before {
			position: absolute;
			top: 0;
			left: -1.75em;
			rotate: 180deg;
			border-left: 5px solid #fff;
			border-radius: 0.75em;
			width: 2em;
			height: 100%;
			content: '';
		}

		.batsu-count {
			color: #f55;
			font-size: 0.8em;
		}
	}

	.member {
		display: grid;
		grid-template-columns: subgrid;
		grid-column: 1 / -1;
		backdrop-filter: blur(10px);
		transition: opacity 1s ease;
		box-shadow: 0 0 15px #eeea;
		border-radius: 0 0.75em 0.75em 0;
		background-color: #ffffff40;
		height: 1.25em;
		color: #fff;
		text-shadow:
			0px 10px 50px #444,
			0px 10px 50px #444;

		&.first-member {
			border-top-left-radius: 0.5em;

			& .seat {
				border-top-left-radius: 0.5em;
			}
		}

		&:hover {
			background: white;
			input {
				color: black;
				text-shadow: none;
			}
		}

		& > div {
			display: flex;
			justify-content: center;
			align-items: center;
		}

		&.yasu {
			opacity: 0.7;
			backdrop-filter: blur(5px);
			background-color: rgba(128 128 128 / 0.3);
		}

		&.lost {
			opacity: 0.2;
		}

		&.lizhi {
			box-shadow: 0 2px 2px 3px rgb(230 230 37);
			background-color: rgba(255 255 158 / 0.5);
		}

		&:has(.answerer-1st) {
			animation: answerer-1st-wrapper 0.3s ease infinite alternate;
		}

		.button-mapping {
			display: flex;
			justify-content: center;
			align-items: center;
			z-index: 20;
			border-radius: 5em;
			background: grey;
			width: 1.5em;
			height: 1.5em;
			color: white;
			font-size: 0.7em;
		}

		.group {
			z-index: 10;
			transition: background-color 0.3s ease;
			color: white;
		}

		.name {
			&.answerer-1st {
				animation: answerer-1st 0.3s ease infinite alternate;
			}

			&.answerer-2nd {
				color: yellow;
				text-shadow:
					0px 10px 50px #aa08,
					0px 10px 50px #aa08,
					0px 10px 50px #aa08;
			}

			&.answerer-late {
				text-shadow:
					0px 10px 50px #aa08,
					0px 10px 50px #aa08,
					0px 10px 50px #aa08;
			}

			&::placeholder {
				color: #888;
			}
		}

		.yasu {
			position: absolute;
			right: 3em;
		}

		.score {
			display: flex;
			border-radius: 0 1em 1em 0;
			background: #0007;
			font-weight: bold;
			font-size: 0.8em;
		}

		.seat {
			background: #0004;
			color: #fff;

			select {
				cursor: pointer;
				border: none;
				background: transparent;
				width: 100%;
				color: #fff;
				font-size: inherit;
				text-align: center;

				option {
					background: #000;
				}
			}
		}

		.buttons {
			display: flex;
			position: absolute;
			right: 0em;
			align-items: center;
			gap: 2px;
			opacity: 0;
			height: 100%;
			pointer-events: none;

			button,
			select {
				height: 2em;
				font-size: 0.5em;
			}
		}
	}
</style>

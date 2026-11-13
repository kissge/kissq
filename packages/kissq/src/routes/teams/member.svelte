<script lang="ts">
	import { fade } from 'svelte/transition';
	import Toastify from 'toastify-js';

	import { RemoveHistoryEntry } from '$lib/historyEntry';
	import { getQuestionConsoleContext } from '$lib/questionConsole.svelte';
	import { tooltip, tooltipInteractive } from '$lib/tooltip.svelte';
	import { AttendantID, TeamID } from '$lib/types';
	import { getGroupSymbol } from '$lib/utils';
	import { getWasedashikiContext } from '$lib/wasedashiki.svelte';

	import { getDnDContext } from './dnd.svelte';
	import { getTeamGameContext } from './game.svelte';

	let {
		ti,
		si,
		ai,
		mi,
		rowStart,
		batsuCount
	}: {
		ti: number;
		si: number;
		ai: number;
		mi: number;
		rowStart: number;
		batsuCount: number;
	} = $props();

	let Game = getTeamGameContext();
	let Wasedashiki = getWasedashikiContext();
	let DnD = getDnDContext();
	let QuestionConsole = getQuestionConsoleContext();

	let sAtt = $derived(Game.currentState.attendants[ai]);
</script>

<div
	class="member"
	style:grid-row-start={rowStart + mi}
	class:lizhi={sAtt.isLizhi}
	class:yasu={sAtt.yasuDisplay > 0}
	class:lost={sAtt.life === 'lost' ||
		(Game.currentState.defaultRule.mode === 'aql' && batsuCount >= 2)}
	class:first-member={si === 0 && mi === 0}
	class:with-seat={Game.currentState.defaultRule.mode === 'aql' ||
		Game.currentState.defaultRule.mode === 'product'}
	{@attach Game.currentState.teams[ti].teamLife === 'alive' &&
		(Game.currentState.defaultRule.mode === 'aql' ? batsuCount < 2 : true) &&
		sAtt?.life === 'alive' &&
		sAtt.yasuDisplay === 0 &&
		tooltipInteractive(
			typeof document !== 'undefined'
				? `<div data-attendant-id="${ai}">` +
						document.getElementById('hover-menu')!.innerHTML.replaceAll('data-on', 'on') +
						'</div>'
				: ''
		)}
	draggable={Game.history.length === 0}
	role="listitem"
	class:is-dragging={DnD.dragTarget?.ai === ai}
	class:is-drop-target={DnD.dropTarget?.ti === ti && DnD.dropTarget.si === si}
	ondragstart={() => {
		setTimeout(() => DnD.setDragTarget({ ai, ti, si, mi }), 0);
	}}
	ondragend={() => {
		if (!DnD.dragTarget || !DnD.dropTarget) {
			DnD.setDragTarget();
			DnD.setDropTarget();
			return;
		}

		if (DnD.dropTarget.ti === Game.teams.length) {
			Game.teams.push('');
		}

		Game.attendants[ai].team = DnD.dropTarget.ti;
		Game.attendants[ai].seat = DnD.dropTarget.si;

		// seatがとびとびになったかもしれないので、前に詰める
		const emptySeats = Array.from(
			{ length: Game.currentState.teams[ti].attendantIDsPerSeat.length },
			(_, si) =>
				(Game.currentState.teams[ti].attendantIDsPerSeat[si]?.length ?? 0) > 0 ? null : si
		).filter((v): v is number => v != null);
		for (const att of Game.attendants) {
			if (att.team === ti) {
				att.seat -= emptySeats.filter((s) => s < att.seat).length;
			}
		}

		// teamが空になったかもしれないので、前に詰める
		const emptyTeams = Array.from({ length: Game.currentState.teams.length }, (_, ti) =>
			Game.currentState.teams[ti].attendantIDsPerSeat.flat().length > 0 ? null : ti
		).filter((v): v is number => v != null);
		for (const att of Game.attendants) {
			att.team -= emptyTeams.filter((t) => t < att.team).length;
		}
		emptyTeams.reverse().forEach((t) => Game.teams.splice(t, 1));

		DnD.setDragTarget();
		DnD.setDropTarget();
	}}
	ondragover={(event) => {
		event.preventDefault();
		DnD.setDropTarget({ ti, si });
	}}
	ondragleave={() => DnD.setDropTarget()}
>
	<div>
		{#if Game.activeRules.length > 1}
			<button
				class="group"
				style:background-color={`hsl(${(360 / Game.rules.length) * Game.attendants[ai].group}, 70%, 40%)`}
				onclick={() => {
					do {
						Game.attendants[ai].group = (Game.attendants[ai].group + 1) % Game.rules.length;
					} while (Game.rules[Game.attendants[ai].group].isRemoved);
				}}
				{@attach tooltip('このプレイヤーの所属ルールグループを変更します。')}
			>
				{#key Game.attendants[ai].group}
					<span class="crossfade" in:fade={{ delay: 500 }} out:fade>
						{getGroupSymbol(Game.attendants[ai].group)}
					</span>
				{/key}
			</button>
		{/if}
		<button
			class="button-mapping"
			style={Wasedashiki.buttonMapping[AttendantID(ai)] == null
				? undefined
				: 1 <= Wasedashiki.buttonMapping[AttendantID(ai)] &&
					  Wasedashiki.buttonMapping[AttendantID(ai)] <= 6
					? 'background-color: red; color: white'
					: 7 <= Wasedashiki.buttonMapping[AttendantID(ai)] &&
						  Wasedashiki.buttonMapping[AttendantID(ai)] <= 12
						? 'background-color: blue; color: white'
						: 13 <= Wasedashiki.buttonMapping[AttendantID(ai)] &&
							  Wasedashiki.buttonMapping[AttendantID(ai)] <= 18
							? 'background-color: yellow; color: black'
							: 'background-color: green; color: white'}
			style:display={Wasedashiki.lastButtonID == undefined && !Wasedashiki.buttonMappingRestored
				? 'none'
				: ''}
			disabled={Wasedashiki.lastButtonID == undefined}
			{@attach tooltip(
				`このプレイヤーが持っているボタンは${Wasedashiki.buttonMapping[AttendantID(ai)] == null ? '???' : Wasedashiki.buttonMapping[AttendantID(ai)]}番です。クリックで紐づけ`
			)}
			onclick={() => {
				if (Wasedashiki.lastButtonID !== undefined) {
					Wasedashiki.buttonMapping = {
						...Object.fromEntries(
							Object.entries(Wasedashiki.buttonMapping).filter(
								([, v]) => v !== Wasedashiki.lastButtonID
							)
						),
						[AttendantID(ai)]: Wasedashiki.lastButtonID!
					};
					Toastify({
						text: `ボタン${Wasedashiki.lastButtonID}は${Game.attendants[AttendantID(ai)].name || `プレイヤー${ai + 1}`}が持っています`
					}).showToast();
				}
			}}
		>
			{Wasedashiki.buttonMapping[AttendantID(ai)] ?? '?'}
		</button>
		<input
			class={[
				'name',
				{
					'answerer-1st':
						Wasedashiki.answerers[(Wasedashiki.buttonMapping[AttendantID(ai)] ?? 0) - 1]
							?.currentRank === 1,
					'answerer-2nd':
						(Game.wasedashikiMode === 'endless' || Game.wasedashikiMode === 'double') &&
						Wasedashiki.answerers[(Wasedashiki.buttonMapping[AttendantID(ai)] ?? 0) - 1]
							?.currentRank === 2,
					'answerer-late':
						Game.wasedashikiMode === 'endless' &&
						Wasedashiki.answerers[(Wasedashiki.buttonMapping[AttendantID(ai)] ?? 0) - 1]
							?.currentRank === 'late'
				}
			]}
			bind:value={Game.attendants[AttendantID(ai)].name}
			placeholder={`プレイヤー${ai + 1}`}
			onpaste={(e) =>
				Game.handlePasteEvent(e, AttendantID(ai), TeamID(ti)).forEach((attendant) =>
					QuestionConsole.postMessage({ command: 'attendantAdded', attendant })
				)}
		/>
		<div class="drag-handle">⠿</div>
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
		<div class="buttons" data-attendant-id={ai}>
			<div style=" position: absolute; pointer-events: none;opacity: 0">
				<button
					class="delete-btn"
					disabled={Game.currentState.teams[ti].attendantIDsPerSeat
						.flat()
						.filter((a) => a != null && Game.currentState.attendants[a].life !== 'removed')
						.length <= 1}
					onclick={() => Game.history.push(new RemoveHistoryEntry(AttendantID(ai)))}
					{@attach tooltip('このプレイヤーをリストから削除します。')}
					tabindex={-1}
				>
					削除
				</button>
			</div>
			<button
				class="maru-btn"
				onclick={() => Game.clickMaru(AttendantID(ai))}
				{@attach tooltip(
					`${Game.attendants[ai].name || 'このプレイヤー'}に1○をつけて、問題カウントを1進めます（休みの人がいれば1休減ります）`
				)}
			>
				O
			</button>
			<button
				class="batsu-btn"
				onclick={() => Game.clickBatsu(AttendantID(ai))}
				{@attach tooltip(
					Game.currentState.defaultRule.chance === 'single'
						? `${Game.attendants[ai].name || 'このプレイヤー'}に1×をつけて問題カウントを1進めます（休みの人がいれば1休減ります）`
						: `${Game.attendants[ai].name || 'このプレイヤー'}に1×をつけます（誰も正解しなければ最後にスルーボタンを押すのを忘れずに！）`
				)}
			>
				X
			</button>
		</div>
	{/if}
</div>

<style>
	input {
		flex: 1 1 100%;
		width: 100%;
		min-width: 0;
		font-size: inherit;
		color: #fff;
		text-align: center;
		text-shadow:
			0px 0px 12px #0007,
			0px 0px 12px #0007;
		background: transparent;
		border: none;

		&::placeholder {
			color: #fff;
			text-shadow: none;
		}
	}

	.member {
		box-sizing: border-box;
		display: grid;
		grid-template-columns: subgrid;
		grid-column: 1 / -1;
		width: 100%;
		min-width: 0;
		height: 1.5em;
		color: #fff;
		text-shadow:
			0px 10px 50px #444,
			0px 10px 50px #444;
		background-color: #00000040;
		border-bottom: 1px solid #333;
		border-radius: 0 0.75em 0.75em 0;
		backdrop-filter: blur(0px);
		transition: opacity 1s ease;

		&.first-member {
			border-top: 1px solid #333;
		}

		&.with-seat {
			grid-column: 2 / -2;
		}

		&[draggable='true'] {
			cursor: grab;
		}

		&[draggable='false'] .drag-handle {
			opacity: 0.2;
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
			align-items: center;
			justify-content: center;
		}

		&.yasu {
			background-color: rgba(128 128 128 / 0.3);
			opacity: 0.7;
			backdrop-filter: blur(5px);
		}

		&.lost {
			opacity: 0.2;
		}

		&.lizhi {
			background-color: rgba(255 255 158 / 0.5);
			box-shadow: 0 2px 2px 3px rgb(230 230 37);
		}

		&:has(.answerer-1st) {
			animation: answerer-1st-wrapper 0.3s ease infinite alternate;
		}

		.drag-handle {
			padding: 0 0.5em;
			color: #fff8;
			transition: opacity 0.25s ease-in-out;

			&:is(.member:hover *) {
				color: #000;
			}
		}

		.button-mapping {
			z-index: 20;
			display: flex;
			align-items: center;
			justify-content: center;
			width: 1.5em;
			height: 1.5em;
			font-size: 0.7em;
			color: white;
			background: grey;
			border-radius: 5em;
		}

		.group {
			z-index: 10;
			color: white;
			transition: background-color 0.3s ease;
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
			font-size: 0.8em;
			font-weight: bold;
			background: #fff2;
			border-radius: 0 1em 1em 0;

			&:is(:hover > *) {
				color: #000;
			}
		}

		.buttons {
			position: absolute;
			right: 4em;
			display: flex;
			gap: 2px;
			align-items: center;
			height: 100%;
			pointer-events: none;
			opacity: 0;

			&:is(:hover > *) {
				pointer-events: auto;
				opacity: 1;
			}

			button {
				height: 2em;
				font-size: 0.5em;
			}
		}
	}

	.is-dragging {
		opacity: 0.2;
	}

	.is-drop-target {
		background-color: yellow;
	}
</style>

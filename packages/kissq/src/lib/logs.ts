import type { Attendant } from './attendant';
import type { GameState, Life } from './state';

export type LogStateEntry =
	| {
			mode: 'marubatsu';
			name: string;
			group: number;
			maruCount: number;
			batsuCount: number;
			life: Life;
			i: number;
	  }
	| {
			mode: 'score' | 'MbyN' | 'survival';
			name: string;
			group: number;
			score: number;
			life: Life;
			i: number;
	  };

export interface LogEntry {
	startAt: string;
	mode?: 'single' | 'team';
	gameTitle: string;
	questionCount: number;
	rules: string;
	state: LogStateEntry[];
}

export function pushLog(
	mode: 'single' | 'team',
	gameTitle: string,
	activeRulesText: string,
	currentState: GameState,
	attendants: Attendant[]
): void {
	const logs = loadLog();

	logs.push({
		startAt: new Date().toLocaleString('ja', {
			timeZone: 'Asia/Tokyo',
			dateStyle: 'short',
			timeStyle: 'long'
		}),
		mode,
		gameTitle,
		questionCount: currentState.questionCount - 1,
		rules: activeRulesText,
		state: stateToLog(currentState, attendants)
	});

	window.localStorage.setItem('logs', JSON.stringify(logs.slice(-100)));
}

export function stateToLog(currentState: GameState, attendants: Attendant[]): LogStateEntry[] {
	return currentState.attendants
		.flatMap<LogStateEntry>((att, i) => {
			if (att.life === 'removed') {
				return [];
			}

			switch (att.rule.mode) {
				case 'marubatsu':
					return {
						mode: 'marubatsu',
						name: att.name,
						group: attendants[i].group,
						maruCount: att.maruCount,
						batsuCount: att.batsuCount,
						life: att.life,
						i
					};
				case 'score':
				case 'MbyN':
				case 'survival':
					return {
						mode: att.rule.mode,
						name: att.name,
						group: attendants[i].group,
						score: att.score,
						life: att.life,
						i
					};
				case 'aql':
				case 'product':
				case 'sum':
					throw new Error(); // TODO
			}
		})
		.toSorted((a, b) => currentState.ranking.indexOf(a.i) - currentState.ranking.indexOf(b.i));
}

export function updateLog(
	gameTitle: string,
	currentState: GameState,
	attendants: Attendant[],
	activeRulesText: string
) {
	const logs = loadLog();

	if (logs.length === 0) {
		return;
	}

	logs[logs.length - 1] = {
		...logs[logs.length - 1],
		gameTitle,
		questionCount: currentState.questionCount - 1,
		rules: activeRulesText,
		state: stateToLog(currentState, attendants)
	};

	window.localStorage.setItem('logs', JSON.stringify(logs));
}

export function loadLog(): LogEntry[] {
	return JSON.parse(window.localStorage.getItem('logs') ?? '[]');
}

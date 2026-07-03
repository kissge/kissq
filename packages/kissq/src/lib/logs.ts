import type { Life } from "./state";

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
	gameTitle: string;
	questionCount: number;
	rules: string;
	state: LogStateEntry[];
}

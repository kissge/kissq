import type { Life } from "./state";

export type LogStateEntry =
	| {
		mode: 'marubatsu';
		name: string;
		group: number;
		maruCount: number;
		batsuCount: number;
		life: Life;
	}
	| {
		mode: 'score' | 'MbyN' | 'survival';
		name: string;
		group: number;
		score: number;
		life: Life;
	};


export interface LogEntry {
	startAt: string;
	questionCount: number;
	rules: string;
	state: LogStateEntry[];
}

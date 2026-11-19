import type { APIClient } from './api';
import type { InferResponseType } from 'hono/client';

export const qZero: BaseQuestion = {
	id: 0,
	question: 'ここに問題が表示されます',
	answer: 'ここに答えが表示されます',
	comment: 'ここにコメントが表示されます',
	slashOffset: undefined as number | undefined
};

export interface BaseQuestion {
	id: number;
	question: string;
	answer: string;
	comment: string;
	slashOffset: number | undefined;
}

export interface RawQuestion extends BaseQuestion {
	shown?: 0 | 1;
	correctAnswerer?: string | null;
	likedBy?: string[];
}

export function parseComment<Q extends { comment: string }>(
	q: Q
): Q & { media: Media | undefined } {
	const [comment, footer] = q.comment.split(/(?:\n|^)--\n+/);
	const media = (() => {
		if (!/.+?:.+/.exec(footer)) {
			return undefined;
		}

		const [type, locator] = /(.+?):(.+)/.exec(footer)!.slice(1) as [Media['type'], string];

		return type === 'img' ? { type, url: locator } : { type, videoID: parseYouTubeURL(locator) };
	})();

	return { ...q, comment: comment.trim(), media };
}

function parseYouTubeURL(url: string): string {
	const match = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/.exec(url);

	return match?.[1] ?? 'ERROR: Invalid YouTube URL';
}

export type Media =
	| {
			type: 'img';
			url: string;
	  }
	| {
			type: 'youtube';
			videoID: string;
	  };
type APIQuestion = InferResponseType<
	APIClient['api']['questions'][':session_id']['$get'],
	200
>[number];
export interface CompanionParsedQuestion extends APIQuestion {
	media: Media | undefined;
}

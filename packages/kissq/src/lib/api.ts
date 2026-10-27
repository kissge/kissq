import { hc } from 'hono/client';
import type { AppType } from 'kissq-companion';

export function getAPIClient() {
	return hc<AppType>(import.meta.env.VITE_API_SERVER as string);
}

export type APIClient = ReturnType<typeof getAPIClient>;

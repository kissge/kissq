export function parseError(error: unknown): string | object {
	try {
		return JSON.parse((error as { message: string }).message);
	} catch {
		return (error as { message: string }).message ?? String(error);
	}
}

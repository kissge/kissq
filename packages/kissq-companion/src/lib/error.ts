export function parseError(error: unknown): string {
	try {
		return String(JSON.parse((error as { message: string }).message));
	} catch {
		return String((error as { message: string }).message ?? error);
	}
}

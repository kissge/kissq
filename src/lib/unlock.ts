import { browser } from '$app/env';

export async function isUnlocked(): Promise<boolean> {
	return (
		browser &&
		(await hash(window.localStorage.getItem('hash') ?? '')) ===
			'624233c0268fe544d136c26a3a0a966e3cda0cb7bd1452c5ba9d641e490861b4'
	);
}

export async function setPassword(value: string) {
	const hex1 = await hash(value.trim());
	const hex2 = await hash(hex1);
	const hex3 = await hash(hex2);

	window.localStorage.setItem('hash', hex3);
}

async function hash(value: string) {
	const encoder = new TextEncoder();
	const buffer = await window.crypto.subtle.digest('SHA-256', encoder.encode(value));
	return new Uint8Array(buffer).toHex();
}

export const isSafari =
	typeof navigator !== 'undefined' &&
	/safari/i.test(navigator.userAgent) &&
	!/chrome|android|iphone|ipad|ipod/i.test(navigator.userAgent);

export const isMacOS =
	typeof navigator !== 'undefined' && /macintosh|mac os x/i.test(navigator.userAgent);

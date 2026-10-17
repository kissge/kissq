export const isSafari =
	typeof navigator !== 'undefined' &&
	/safari/i.test(navigator.userAgent) &&
	!/chrome|android|iphone|ipad|ipod/i.test(navigator.userAgent);

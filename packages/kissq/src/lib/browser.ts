export const isSafari =
	typeof navigator !== 'undefined' &&
	/safari/i.test(navigator.userAgent) &&
	!/chrome|android/i.test(navigator.userAgent);

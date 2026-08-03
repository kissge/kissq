import type { Attachment } from 'svelte/attachments';

export function wave(): Attachment {
	return (element) => {
		// Set up
		const text = element.textContent.trim();
		const spans = [...new Intl.Segmenter().segment(text)].map((char) => {
			const span = document.createElement('span');
			span.textContent = char.segment;
			span.style.display = 'inline-block';
			span.style.transition = 'transform 0.3s ease';
			return span;
		});

		element.textContent = '';
		spans.forEach((span) => element.appendChild(span));

		// Animation
		const timers: (number | NodeJS.Timeout)[] = [];
		for (let i = 0; i < spans.length; i++) {
			const span = spans[i];
			const delay = i * 100;
			setTimeout(() => {
				let upward = true;
				const interval = setInterval(() => {
					span.style.transform = upward ? 'translateY(-5px)' : 'translateY(0)';
					upward = !upward;
				}, 300);
				timers.push(interval);
			}, delay);
		}

		// Cleanup
		return () => timers.forEach((timer) => clearInterval(timer));
	};
}

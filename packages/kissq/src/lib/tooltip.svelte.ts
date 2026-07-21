import type { Attachment } from 'svelte/attachments';
import tippy, { type Props } from 'tippy.js';
import 'tippy.js/dist/tippy.css';

export function tooltip(
	content: string | (() => HTMLElement),
	options?: Partial<Props>
): Attachment {
	return (element) => {
		const tooltip = tippy(element, { content, ...options });
		return tooltip.destroy;
	};
}

export const tooltipInDialog = (content: string) => tooltip(content, { appendTo: 'parent' });
export const tooltipInteractive = (content: () => HTMLElement) => {
	return tooltip(content, {
		interactive: true,
		allowHTML: true,
		interactiveBorder: 30,
		appendTo: document.body,
		offset: [0, 0],
		onTrigger(instance) {
			document.querySelectorAll('[data-tippy-root]').forEach((e) => {
				if (e.id === `tippy-${instance.id}`) {
					(e as HTMLElement).style.display = '';
				} else {
					(e as HTMLElement).style.display = 'none';
				}
			});
		}
	});
};

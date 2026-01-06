import type { Attachment } from 'svelte/attachments';
import tippy, { type Props } from 'tippy.js';
import 'tippy.js/dist/tippy.css';

export function tooltip(content: string, options?: Partial<Props>): Attachment {
	return (element) => {
		const tooltip = tippy(element, { content, ...options });
		return tooltip.destroy;
	};
}

export const tooltipInDialog = (content: string) => tooltip(content, { appendTo: 'parent' });

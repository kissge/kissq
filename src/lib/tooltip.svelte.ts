import tippy from 'tippy.js';
import type { Attachment } from 'svelte/attachments';
import 'tippy.js/dist/tippy.css';

export function tooltip(content: string, appendTo?: 'parent'): Attachment {
	return (element) => {
		const tooltip = tippy(element, { content, appendTo });
		return tooltip.destroy;
	};
}

export const tooltipInDialog = (content: string) => tooltip(content, 'parent');

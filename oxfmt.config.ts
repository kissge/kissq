import svelte from '@himynameisdave/oxfmt-config/svelte';
import { defineConfig } from 'oxfmt';

export default defineConfig({
	sortImports: svelte.sortImports,
	useTabs: true,
	singleQuote: true,
	trailingComma: 'none',
	printWidth: 100,
	svelte: true
});

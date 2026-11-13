import type { Config } from 'stylelint';

export default {
	plugins: ['stylelint-order'],
	extends: ['stylelint-config-html', 'stylelint-config-recess-order']
} satisfies Config;

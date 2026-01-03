import { Rule } from '$lib/rule';

export const state = $state({
	rules: [new Rule('marubatsu', 7, 3, 1, 1, null, 0, null)]
});

const _activeRules = $derived(
	state.rules.flatMap((rule, i) => (rule.isRemoved ? [] : { rule, i }))
);

export const activeRules = () => _activeRules;

export const activeRulesText = () => {
	if (_activeRules.length === 1) {
		return _activeRules[0].rule;
	}

	return _activeRules
		.slice(1)
		.reduce(
			(acc, { rule, i }) => {
				if (String(rule) === acc.at(-1)!.text) {
					acc.at(-1)!.end = i;
					return acc;
				} else {
					return [...acc, { start: i, end: i, text: String(rule) }];
				}
			},
			[{ start: _activeRules[0].i, end: _activeRules[0].i, text: String(_activeRules[0].rule) }]
		)
		.map(({ start, end, text }) =>
			start === end
				? String.fromCodePoint(65 + start) + ': ' + text
				: String.fromCodePoint(65 + start) + '–' + String.fromCodePoint(65 + end) + ': ' + text
		)
		.join(' / ');
};

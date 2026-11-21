import { loadStructure } from './scripts/structure.mjs';

const TOOLING = [
	'scripts',
	'structure',
	'ci',
	'deps',
	'deps-dev',
	'docs',
	'lint',
	'types',
	'coverage',
	'arch',
	'deadcode',
	'hooks',
	'node',
	'mutation',
];
const SECTIONS = loadStructure()
	.parts.flatMap((part) => part.sections)
	.flatMap((item) => ('dir' in item ? [item.dir.replace(/^\d{2}-/, '')] : []));

export default {
	extends: ['@commitlint/config-conventional'],
	rules: {
		'header-max-length': [2, 'always', 72],
		'scope-enum': [2, 'always', [...new Set([...TOOLING, ...SECTIONS])]],
	},
};

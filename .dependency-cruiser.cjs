const CORE = '^scripts/structure\\.mjs$';
const YAML = '^node_modules/yaml/';
const ASTRO = ['^astro:', '^node_modules/(?:astro|@astrojs/[^/]+|starlight-[^/]+)/'];
const TEST = '\\.test\\.mjs$';

/** @type {import('dependency-cruiser').IConfiguration} */
const config = {
	allowed: [
		{
			comment: 'Every script may use node builtins. Astro config may not.',
			from: { path: '^scripts/' },
			to: { dependencyTypes: ['core'] },
		},
		{
			comment: 'The core owns the manifest and page locations, so it depends on nothing in the repo.',
			from: { path: CORE },
			to: { path: YAML },
		},
		{
			comment: 'Each CLI builds on the core only. The two CLIs never import each other.',
			from: { path: '^scripts/(?:scaffold|freshness|check-build)\\.mjs$' },
			to: { path: CORE },
		},
		{
			comment:
				'Astro config reads the manifest from the core. The content schema also reads the check date rule (below).',
			from: { path: '^(?:astro\\.config\\.mjs|src/content\\.config\\.ts)$' },
			to: { path: [CORE, ...ASTRO] },
		},
		{
			comment: 'Every CLI, the commit-msg hook included, decides whether it was started directly in one place.',
			from: { path: '^scripts/(?:scaffold|freshness|check-build|forbid-trailers)\\.mjs$' },
			to: { path: '^scripts/cli\\.mjs$' },
		},
		{
			comment: 'The commitlint config reads the section folders from the core to build its scope list.',
			from: { path: '^commitlint\\.config\\.mjs$' },
			to: { path: CORE },
		},
		{
			comment: 'A lib test may use node builtins (node:test, node:assert). Lib code may not.',
			from: { path: '^src/lib/[^/]+\\.test\\.mjs$' },
			to: { dependencyTypes: ['core'] },
		},
		{
			comment:
				'One freshness rule: the roadmap CLI, the homepage data and the content schema all read it, so they agree.',
			from: { path: '^(?:scripts/freshness\\.mjs|src/lib/home\\.mjs|src/content\\.config\\.ts)$' },
			to: { path: '^src/lib/verification\\.mjs$' },
		},
		{
			comment: 'Named pages live in one module, so a lib module links to the roadmap without its own copy of the path.',
			from: { path: '^src/lib/[^/]+\\.mjs$', pathNot: '\\.test\\.mjs$' },
			to: { path: '^src/lib/pages\\.mjs$' },
		},
		{
			comment:
				'Homepage data is pure. A lib test imports only its subject. Lib modules take page paths from pages.mjs, so pages.test.mjs checks that every page exists.',
			from: { path: '^src/lib/([^/]+)\\.test\\.mjs$' },
			to: { path: ['^src/lib/$1\\.mjs$'] },
		},
		{
			comment: 'A test imports its own subject, the core and yaml.',
			from: { path: '^scripts/([^/]+)\\.test\\.mjs$' },
			to: { path: ['^scripts/$1\\.mjs$', CORE, YAML] },
		},
	],
	allowedSeverity: 'error',
	// A rule below with the same name as a preset rule replaces it.
	extends: 'dependency-cruiser/configs/recommended-strict',
	forbidden: [
		{
			name: 'not-to-unresolvable',
			comment: 'astro:* modules are virtual. Vite provides them at build time and astro check types them.',
			severity: 'error',
			from: {},
			to: { couldNotResolve: true, pathNot: '^astro:' },
		},
		{
			name: 'not-to-dev-dep',
			comment: 'Code that runs in the build or ships imports only from dependencies.',
			severity: 'error',
			from: { pathNot: TEST },
			to: { dependencyTypes: ['npm-dev'], dependencyTypesNot: ['type-only'] },
		},
		{ name: 'not-to-test', severity: 'error', from: {}, to: { path: TEST } },
	],
	options: {
		// biome-ignore lint/style/useNamingConvention: dependency-cruiser names this option, so the key cannot change.
		detectJSDocImports: true,
		tsPreCompilationDeps: true,
		enhancedResolveOptions: { exportsFields: ['exports'], conditionNames: ['import', 'node', 'default'] },
	},
};

module.exports = config;

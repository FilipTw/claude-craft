// Layer rules for scripts/, src/ and astro.config.mjs. Any import that no `allowed` rule lists is an error.
const CORE = '^scripts/structure\\.mjs$';
const YAML = '^node_modules/yaml/';
const ASTRO = ['^astro:', '^node_modules/(?:astro|@astrojs/[^/]+|starlight-[^/]+)/'];
const TEST = '\\.test\\.mjs$';

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
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
			from: { path: '^scripts/(?:scaffold|freshness)\\.mjs$' },
			to: { path: [CORE, YAML] },
		},
		{
			comment: 'Astro config reads the manifest from the core and nothing else from the repo.',
			from: { path: '^(?:astro\\.config\\.mjs|src/content\\.config\\.ts)$' },
			to: { path: [CORE, ...ASTRO] },
		},
		{
			comment: 'A test imports its own subject, the core and yaml.',
			from: { path: '^scripts/([^/]+)\\.test\\.mjs$' },
			to: { path: ['^scripts/$1\\.mjs$', CORE, YAML] },
		},
	],
	allowedSeverity: 'error',
	// The preset adds no-circular, no-orphans, not-to-unresolvable, no-deprecated-core, not-to-deprecated,
	// no-non-package-json and no-duplicate-dep-types, all as errors. A rule below with the same name replaces it.
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

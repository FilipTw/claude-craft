import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
	availableClasses,
	BUDGETS,
	foreignClassesInComponent,
	foreignClassesInCss,
	measureBudgets,
	missingClasses,
	runCheckBuild,
} from './check-build.mjs';

const scratch = mkdtempSync(join(tmpdir(), 'cc-'));
after(() => rmSync(scratch, { recursive: true, force: true }));
const tempDir = () => mkdtempSync(join(scratch, 'case-'));

/**
 * @param {string} root
 * @param {Record<string, string | Buffer>} files
 */
const writeTree = (root, files) => {
	for (const [path, content] of Object.entries(files)) {
		mkdirSync(dirname(join(root, path)), { recursive: true });
		writeFileSync(join(root, path), content);
	}
};

/**
 * A project whose selectors all exist in its build. Starlight's own CSS and component styles select
 * classes too; they are not ours, so the check must not read them.
 */
const healthy = {
	'src/styles/theme.css': '.sl-markdown-content .cc-page { color: red }\n.starlight-aside:hover { margin: 0 }\n',
	'src/components/Search.astro': "<script>document.querySelector('.pagefind-ui__search-input');</script>\n",
	'dist/01-a/index.html': '<div class="sl-markdown-content cc-page"></div>',
	'dist/pagefind/pagefind-ui.js': 'attr(input, "class", "pagefind-ui__search-input svelte-1");',
	'node_modules/@astrojs/starlight/dist/user-components/Aside.astro':
		'<aside class={`starlight-aside x`}></aside><style>.sl-starlight-own { gap: 0 }</style>',
	'dist/_astro/a.css': '.sl-starlight-built{}',
	'dist/_astro/a.woff2': Buffer.alloc(10),
};

/**
 * @param {string} root
 * @returns {{ code: 0 | 1, lines: string[] }}
 */
const runQuiet = (root) => {
	/** @type {string[]} */
	const lines = [];
	const code = runCheckBuild({ root, log: (line) => lines.push(line) });
	return { code, lines };
};

test('CSS selects foreign classes, but our cc- classes, comments, strings, url() and numbers are not classes', () => {
	const css = [
		'/* see theme.css and astro.config.mjs */',
		'.sl-markdown-content > .cc-page, .sidebar-pane:hover { margin: 0.5rem 1.25em; }',
		'.pagefind-ui__result-title:not(.cc-x) { font-family: "Outfit.Variable"; content: \'a.b\'; }',
		'.dialog-frame { background: url(./img.svg); } .-x { } ._y { }',
		'.sl-tight/* a comment right after the class */ { }',
		'.sl-then/**/span { }',
	].join('\n');

	assert.deepEqual(foreignClassesInCss(css), [
		'sl-markdown-content',
		'sidebar-pane',
		'pagefind-ui__result-title',
		'dialog-frame',
		'-x',
		'_y',
		'sl-tight',
		'sl-then',
	]);
});

test('a component selects foreign classes in its style blocks and selector calls, not in other script code', () => {
	const component = [
		'---',
		'const items = list.map((item) => item.length);',
		'---',
		'<style>.cc-own :global(.sl-flex) { gap: 0 }</style>',
		'<style is:global>.right-sidebar { top: 0 }</style>',
		'<script>',
		"document.querySelector('site-search .dialog-frame');",
		'frame.querySelectorAll<HTMLInputElement>(".pagefind-ui__search-input");',
		'event.target.closest(`[data-query].chip`);',
		"element.matches('.not-checked');",
		"frame.querySelector( '.spaced' );",
		'</script>',
	].join('\n');

	assert.deepEqual(foreignClassesInComponent(component), [
		'sl-flex',
		'right-sidebar',
		'dialog-frame',
		'pagefind-ui__search-input',
		'chip',
		'spaced',
	]);
});

test('the build carries classes from its HTML, the Pagefind bundle and the static part of Starlight component markup', () => {
	const available = availableClasses({
		html: ['<a class="sl-link-button  primary">x</a><p class="">y</p>', "<div class='ignored'></div>"],
		pagefind: ['"pagefind-ui__form svelte-1"; "pagefind-ui__message"', 'no Pagefind classes here'],
		// biome-ignore lint/suspicious/noTemplateCurlyInString: the fixture is Astro markup, where ${size} is literal text.
		components: ['<article class="card sl-flex"><span class={`icon icon--${size}`} /></article>'],
	});

	assert.deepEqual(
		[...available].toSorted(),
		['card', 'icon', 'pagefind-ui__form', 'pagefind-ui__message', 'primary', 'sl-flex', 'sl-link-button'].toSorted(),
	);
});

test('a missing class is listed once, sorted, with every file that selects it', () => {
	const sources = [
		{ file: 'src/styles/theme.css', classes: ['sl-gone', 'sl-here', 'a-gone'] },
		{ file: 'src/components/Search.astro', classes: ['sl-gone'] },
		{ file: 'src/styles/content.css', classes: ['sl-gone'] },
	];

	assert.deepEqual(missingClasses(sources, new Set(['sl-here'])), [
		'.a-gone (src/styles/theme.css)',
		'.sl-gone (src/components/Search.astro, src/styles/content.css, src/styles/theme.css)',
	]);
	assert.deepEqual(missingClasses(sources, new Set(['sl-gone', 'sl-here', 'a-gone'])), []);
});

test('budgets count gzipped CSS and fonts as shipped, against the limits of ADR 0003', () => {
	const css = Buffer.from('a'.repeat(10_000));
	const results = measureBudgets([css, css], [Buffer.alloc(300), Buffer.alloc(200)]);

	const [cssResult, fontResult] = results;
	assert.equal(cssResult?.name, 'CSS (gzip)');
	assert.equal(cssResult?.limit, 50 * 1024);
	// Repeated text gzips to a small fraction, so the sum is gzipped bytes, not raw ones.
	assert.ok(cssResult && cssResult.bytes > 0 && cssResult.bytes < css.length / 10, String(cssResult?.bytes));
	assert.deepEqual(fontResult, { name: 'Fonts', bytes: 500, limit: 100 * 1024 });
	assert.deepEqual(BUDGETS, { cssGzip: 51_200, fonts: 102_400 });
	assert.deepEqual(
		measureBudgets([], []).map(({ bytes }) => bytes),
		[0, 0],
	);
});

test('runCheckBuild passes a build that has every selected class and fits the budgets', () => {
	const root = tempDir();
	writeTree(root, healthy);

	assert.deepEqual(runQuiet(root), {
		code: 0,
		lines: [
			'Starlight and Pagefind classes: 3 of 3 found in the build.',
			'CSS (gzip): 0.0 KB of 50.0 KB',
			'Fonts: 0.0 KB of 100.0 KB',
		],
	});
});

test('runCheckBuild names a class that Starlight no longer renders, with the file that selects it, and exits 1', () => {
	const root = tempDir();
	writeTree(root, { ...healthy, 'src/styles/content.css': '.sl-renamed { color: red }\n' });

	const { code, lines } = runQuiet(root);
	assert.equal(code, 1);
	assert.equal(
		lines[0],
		'Not in the build: .sl-renamed (src/styles/content.css). Starlight or Pagefind changed its markup; update the selector.',
	);
	assert.equal(lines[1], 'Starlight and Pagefind classes: 3 of 4 found in the build.');
});

test('runCheckBuild exits 1 when the fonts are over budget, and says which budget', () => {
	const root = tempDir();
	writeTree(root, { ...healthy, 'dist/_astro/a.woff2': Buffer.alloc(BUDGETS.fonts + 1) });

	const { code, lines } = runQuiet(root);
	assert.equal(code, 1);
	assert.equal(lines.at(-1), 'Fonts: 100.0 KB of 100.0 KB. Over budget (ADR 0003).');
});

test('runCheckBuild accepts fonts exactly at the budget', () => {
	const root = tempDir();
	writeTree(root, { ...healthy, 'dist/_astro/a.woff2': Buffer.alloc(BUDGETS.fonts) });

	const { code, lines } = runQuiet(root);
	assert.equal(code, 0);
	assert.equal(lines.at(-1), 'Fonts: 100.0 KB of 100.0 KB');
});

test('runCheckBuild reads only its inputs: files with other extensions or in other folders do not count', () => {
	const root = tempDir();
	const incompressible = randomBytes(BUDGETS.cssGzip + 1);
	writeTree(root, {
		...healthy,
		'src/styles/theme.css.orig': '.sl-old-backup { }',
		'src/components/Old.astro.bak': "<script>document.querySelector('.sl-old-script');</script>",
		'src/legacy.css': '.sl-outside-styles { }',
		'dist/pagefind/pagefind-ui.js.map': '"pagefind-ui__only-in-map"',
		'dist/_astro/page.js': '"pagefind-ui__only-in-map"',
		'src/styles/content.css': '.pagefind-ui__only-in-map { }',
		'node_modules/@astrojs/starlight/dist/user-components/Card.astro.d.ts': '<p class="sl-only-in-types">',
		'src/styles/types.css': '.sl-only-in-types { }',
		'dist/pagefind/pagefind-ui.css': incompressible,
		'dist/_astro/a.css.map': incompressible,
		'dist/fonts/extra.woff2': Buffer.alloc(BUDGETS.fonts + 1),
		'dist/_astro/a.woff2.map': Buffer.alloc(BUDGETS.fonts + 1),
	});

	const { code, lines } = runQuiet(root);
	assert.equal(code, 1);
	assert.deepEqual(lines, [
		'Not in the build: .pagefind-ui__only-in-map (src/styles/content.css). Starlight or Pagefind changed its markup; update the selector.',
		'Not in the build: .sl-only-in-types (src/styles/types.css). Starlight or Pagefind changed its markup; update the selector.',
		'Starlight and Pagefind classes: 3 of 5 found in the build.',
		'CSS (gzip): 0.0 KB of 50.0 KB',
		'Fonts: 0.0 KB of 100.0 KB',
	]);
});

test('runCheckBuild ignores a compressed copy of a page, so a build without HTML still asks for a build', () => {
	const root = tempDir();
	writeTree(root, { 'dist/index.html.br': '<div class="x"></div>' });

	assert.equal(runQuiet(root).lines[0], `No HTML in ${join(root, 'dist')}. Run npm run build first.`);
});

test('the CLI that CI runs after the build reports on the real project', () => {
	const cli = fileURLToPath(new URL('./check-build.mjs', import.meta.url));
	const result = spawnSync(process.execPath, [cli], { encoding: 'utf8' });

	// CI runs the tests before the build, so dist/ may not exist yet. Either way the CLI says what it found.
	assert.match(result.stdout, /^(?:No HTML in .*Run npm run build first\.|Starlight and Pagefind classes: )/m);
});

test('runCheckBuild asks for a build when dist has no HTML, and exits 1', () => {
	const root = tempDir();

	assert.deepEqual(runQuiet(root), {
		code: 1,
		lines: [`No HTML in ${join(root, 'dist')}. Run npm run build first.`],
	});
});

test('runCheckBuild reports on stdout by default', (t) => {
	const root = tempDir();
	writeTree(root, healthy);
	const write = t.mock.method(process.stdout, 'write', () => true);
	const code = runCheckBuild({ root });
	write.mock.restore();

	assert.equal(code, 0);
	assert.equal(write.mock.calls[0]?.arguments[0], 'Starlight and Pagefind classes: 3 of 3 found in the build.\n');
});

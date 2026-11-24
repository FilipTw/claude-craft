import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';
import { isRunDirectly } from './cli.mjs';
import { ROOT } from './structure.mjs';

/**
 * Checks the built site in dist/ against two contracts that no other gate sees (ADR 0004):
 * every Starlight or Pagefind class our CSS and scripts select still exists in the build,
 * and the CSS and fonts stay within the budgets of ADR 0003.
 * @typedef {{ name: string, bytes: number, limit: number }} BudgetResult
 */

/**
 * Budgets from ADR 0003, in bytes. CSS counts every stylesheet, gzipped; fonts count every woff2 file as shipped.
 * @internal
 */
export const BUDGETS = Object.freeze({ cssGzip: 50 * 1024, fonts: 100 * 1024 });

/** Classes with this prefix are ours. Every other class in a selector belongs to Starlight, Pagefind or Expressive Code. */
const OWN = 'cc-';
const STARLIGHT_COMPONENTS = 'node_modules/@astrojs/starlight/dist/user-components';
const CLASS_SELECTOR = /\.((?:[_a-zA-Z]|-[_a-zA-Z])[\w-]*)/g;
const SELECTOR_CALL = /\.(?:querySelector(?:All)?|closest)(?:<[^>]*>)?\(\s*(['"`])(.*?)\1/g;
const STYLE_BLOCK = /<style\b[^>]*>([\s\S]*?)<\/style>/g;
const CLASS_ATTRIBUTE = /\bclass="([^"]*)"/g;
// Starlight's MDX components (Aside, Card, LinkCard) reach the HTML only once a page uses them,
// so their own markup counts too. A template literal keeps its static classes; `${...}` parts drop out.
const COMPONENT_CLASS = /\bclass=(?:"([^"]*)"|\{`([^`]*)`\})/g;
// Comments, url() and strings can hold file names such as `theme.css`, which are not classes.
const NOT_SELECTORS = [/\/\*[\s\S]*?\*\//g, /url\([^)]*\)/g, /"[^"]*"|'[^']*'/g];
// Pagefind UI renders its markup in the browser, so its classes exist only as strings in its bundle.
const PAGEFIND_CLASS = /pagefind-ui__[\w-]+/g;

/**
 * @param {string} selectors
 * @returns {string[]}
 */
const classesIn = (selectors) =>
	[...selectors.matchAll(CLASS_SELECTOR)].map((match) => String(match[1])).filter((name) => !name.startsWith(OWN));

/**
 * Classes that CSS selects and that the project does not own. Comments, strings and url() are skipped,
 * so file names such as `theme.css` or `astro.config.mjs` in them are not taken for classes.
 * @param {string} css
 * @returns {string[]}
 * @internal
 */
export function foreignClassesInCss(css) {
	// A space, as in CSS itself: a comment ends the identifier before it, so `.a/**/b` selects class `a`.
	return classesIn(NOT_SELECTORS.reduce((code, pattern) => code.replace(pattern, ' '), css));
}

/**
 * Classes that an .astro component selects that the project does not own:
 * in its `<style>` blocks and in querySelector, querySelectorAll and closest calls in its scripts.
 * @param {string} component
 * @returns {string[]}
 * @internal
 */
export function foreignClassesInComponent(component) {
	const styles = [...component.matchAll(STYLE_BLOCK)].flatMap((match) => foreignClassesInCss(String(match[1])));
	const calls = [...component.matchAll(SELECTOR_CALL)].flatMap((match) => classesIn(String(match[2])));
	return [...styles, ...calls];
}

/**
 * Every class that the built site can carry: class attributes in its HTML, the Pagefind UI bundle,
 * and the markup of Starlight's MDX components.
 * @param {{ html: string[], pagefind: string[], components: string[] }} sources File contents.
 * @returns {Set<string>}
 * @internal
 */
export function availableClasses({ html, pagefind, components }) {
	/** @param {string | undefined} list */
	const names = (list) => String(list).match(/\S+/g) ?? [];
	const fromHtml = html.flatMap((page) => [...page.matchAll(CLASS_ATTRIBUTE)].flatMap((match) => names(match[1])));
	const fromPagefind = pagefind.flatMap((script) => script.match(PAGEFIND_CLASS) ?? []);
	const fromComponents = components.flatMap((component) =>
		[...component.matchAll(COMPONENT_CLASS)].flatMap((match) => names(match[1] ?? match[2])),
	);
	return new Set([...fromHtml, ...fromPagefind, ...fromComponents].filter((name) => !name.includes('${')));
}

/**
 * @param {Array<{ file: string, classes: string[] }>} sources
 * @param {ReadonlySet<string>} available
 * @returns {string[]} One line per missing class, sorted, naming the files that select it.
 * @internal
 */
export function missingClasses(sources, available) {
	/** @type {Map<string, Set<string>>} */
	const missing = new Map();
	for (const { file, classes } of sources) {
		for (const name of classes.filter((candidate) => !available.has(candidate))) {
			missing.set(name, (missing.get(name) ?? new Set()).add(file));
		}
	}
	return [...missing]
		.toSorted(([a], [b]) => a.localeCompare(b))
		.map(([name, files]) => `.${name} (${[...files].toSorted().join(', ')})`);
}

/**
 * @param {Buffer[]} stylesheets
 * @param {Buffer[]} fonts
 * @returns {BudgetResult[]}
 * @internal
 */
export function measureBudgets(stylesheets, fonts) {
	const sum = (/** @type {number[]} */ sizes) => sizes.reduce((total, size) => total + size, 0);
	return [
		{ name: 'CSS (gzip)', bytes: sum(stylesheets.map((css) => gzipSync(css).length)), limit: BUDGETS.cssGzip },
		{ name: 'Fonts', bytes: sum(fonts.map((font) => font.length)), limit: BUDGETS.fonts },
	];
}

/** @param {number} bytes */
const kilobytes = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

/**
 * @param {string} dir
 * @param {RegExp} pattern
 * @returns {string[]}
 */
const filesIn = (dir, pattern) =>
	existsSync(dir)
		? readdirSync(dir, { recursive: true })
				.map(String)
				.filter((file) => pattern.test(file))
				.toSorted()
				.map((file) => join(dir, file))
		: [];

/**
 * @param {string} root
 * @returns {Array<{ file: string, classes: string[] }>}
 */
const readSelectors = (root) => [
	...filesIn(join(root, 'src/styles'), /\.css$/).map((file) => ({
		file: relative(root, file),
		classes: foreignClassesInCss(readFileSync(file, 'utf8')),
	})),
	...filesIn(join(root, 'src/components'), /\.astro$/).map((file) => ({
		file: relative(root, file),
		classes: foreignClassesInComponent(readFileSync(file, 'utf8')),
	})),
];

/**
 * @param {{ root?: string, dist?: string, log?: (line: string) => void, error?: (line: string) => void }} [options]
 * `log` gets the report (stdout by default), `error` each problem that makes the exit code 1 (stderr by default).
 * @returns {0 | 1}
 * @internal
 */
export function runCheckBuild({
	root = ROOT,
	dist = join(root, 'dist'),
	log = (line) => process.stdout.write(`${line}\n`),
	error = (line) => process.stderr.write(`${line}\n`),
} = {}) {
	const html = filesIn(dist, /\.html$/);
	if (html.length === 0) {
		error(`No HTML in ${dist}. Run npm run build first.`);
		return 1;
	}
	const read = (/** @type {string[]} */ files) => files.map((file) => readFileSync(file, 'utf8'));
	const available = availableClasses({
		html: read(html),
		pagefind: read(filesIn(join(dist, 'pagefind'), /\.js$/)),
		components: read(filesIn(join(root, STARLIGHT_COMPONENTS), /\.astro$/)),
	});
	const selectors = readSelectors(root);
	const missing = missingClasses(selectors, available);
	for (const line of missing) {
		error(`Not in the build: ${line}. Starlight or Pagefind changed its markup; update the selector.`);
	}
	const checked = new Set(selectors.flatMap(({ classes }) => classes)).size;
	log(`Starlight and Pagefind classes: ${checked - missing.length} of ${checked} found in the build.`);
	const assets = join(dist, '_astro');
	const budgets = measureBudgets(
		filesIn(assets, /\.css$/).map((file) => readFileSync(file)),
		filesIn(assets, /\.woff2$/).map((file) => readFileSync(file)),
	);
	for (const { name, bytes, limit } of budgets) {
		const line = `${name}: ${kilobytes(bytes)} of ${kilobytes(limit)}`;
		if (bytes > limit) {
			error(`${line}. Over budget (ADR 0003).`);
		} else {
			log(line);
		}
	}
	return missing.length > 0 || budgets.some(({ bytes, limit }) => bytes > limit) ? 1 : 0;
}

if (isRunDirectly(import.meta.url)) {
	process.exitCode = runCheckBuild();
}

// The manifest (structure.yaml) is the only source of the page tree, and this module
// is the only owner of where pages live on disk.
// The manifest seeds new pages and builds the sidebar. After a page exists, its frontmatter owns title and type.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

export const PAGE_TYPES = /** @type {const} */ (['tutorial', 'how-to', 'reference', 'explanation']);

/**
 * @typedef {(typeof PAGE_TYPES)[number]} PageType
 * @typedef {{ file: string, title: string, type: PageType }} ManifestEntry
 * @typedef {{ dir: string, label: string, items: Array<Section | ManifestEntry> }} Section
 * @typedef {{ label: string, sections: Array<Section | ManifestEntry> }} Part
 * @typedef {{ parts: Part[] }} Structure
 * @typedef {{ path: string, title: string, type: PageType, section: string }} LocatedPage
 * @typedef {string | { label: string, collapsed: boolean, items: SidebarItem[] }} SidebarItem
 * @typedef {{ ok: (value: unknown) => boolean, noun: string }} Kind
 */
export const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const DOCS = join(ROOT, 'src/content/docs');
// Pages written by hand, outside the manifest.
export const HANDWRITTEN = ['index.mdx', 'roadmap.md'];
const NAME = /^(\d{2})-[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * @param {string | URL} [path]
 * @returns {Structure}
 */
export function loadStructure(path = new URL('./structure.yaml', import.meta.url)) {
	return parseStructure(readFileSync(path, 'utf8'));
}

/**
 * @param {string} where
 * @param {string} problem
 * @returns {never}
 */
function fail(where, problem) {
	throw new Error(`structure.yaml: "${where}" ${problem}`);
}

/** @type {Kind} */
const LIST = { ok: (value) => Array.isArray(value) && value.length > 0, noun: 'a non-empty list' };
/** @type {Kind} */
const TEXT = { ok: (value) => typeof value === 'string' && value !== '', noun: 'a text' };

/**
 * @param {unknown} node
 * @param {string} where
 * @param {Record<string, Kind>} required
 * @param {string[]} [alsoAllowed]
 */
function checkShape(node, where, required, alsoAllowed = []) {
	if (node === null || typeof node !== 'object' || Array.isArray(node)) {
		fail(where, 'must be a mapping');
	}
	const allowed = [...Object.keys(required), ...alsoAllowed];
	const extra = Object.keys(node).filter((key) => !allowed.includes(key));
	if (extra.length > 0) {
		fail(where, `has unknown keys ${extra.join(', ')}. Quote titles that contain a comma`);
	}
	for (const [key, kind] of Object.entries(required)) {
		if (!kind.ok(/** @type {Record<string, unknown>} */ (node)[key])) {
			fail(where, `needs ${kind.noun} "${key}"`);
		}
	}
}

/**
 * @param {any[]} items
 * @param {string} parent
 */
function checkPrefixes(items, parent) {
	let previous = 0;
	items.forEach((item, index) => {
		const name = item?.dir ?? item?.file;
		const where = `${parent}${name ?? `[${index}]`}`;
		// Stryker disable next-line StringLiteral: any fallback without a two-digit prefix fails the same way.
		const match = NAME.exec(name ?? '');
		if (!match) {
			fail(where, 'must look like 01-kebab-case');
		}
		if (Number(match[1]) <= previous) {
			fail(where, 'prefix must be greater than the one before it');
		}
		previous = Number(match[1]);
	});
}

/**
 * @param {string} text
 * @returns {Structure}
 * @internal
 */
export function parseStructure(text) {
	const raw = parse(text);
	checkShape(raw, '(root)', { parts: LIST });
	/** @type {any[]} */
	const parts = raw.parts;
	for (const [index, part] of parts.entries()) {
		checkShape(part, `parts[${index}]`, { label: TEXT, sections: LIST });
	}
	// Top-level sections share one docs root, so their prefixes ascend across all parts.
	checkPrefixes(
		parts.flatMap((part) => part.sections),
		'',
	);
	return { parts: parts.map((part) => ({ label: part.label, sections: checkItems(part.sections, '') })) };
}

/**
 * @param {any[]} items
 * @param {string} parent
 * @returns {Array<Section | ManifestEntry>}
 */
function checkItems(items, parent) {
	return items.map((item) => {
		const where = `${parent}${item.dir ?? item.file}`;
		if (item.dir) {
			checkShape(item, where, { label: TEXT, items: LIST }, ['dir']);
			checkPrefixes(item.items, `${where}/`);
			return { dir: item.dir, label: item.label, items: checkItems(item.items, `${where}/`) };
		}
		checkShape(item, where, { title: TEXT }, ['file', 'type']);
		const type = item.type ?? 'explanation';
		if (!PAGE_TYPES.includes(type)) {
			fail(where, `has unknown type "${type}"`);
		}
		return { file: item.file, title: item.title, type };
	});
}

/**
 * @param {Structure} structure
 * @returns {LocatedPage[]}
 */
export function listPages(structure) {
	/** @type {LocatedPage[]} */
	const pages = [];
	/** @type {(items: Array<Section | ManifestEntry>, base: string, section: string | undefined) => void} */
	const walk = (items, base, section) => {
		for (const item of items) {
			if ('dir' in item) {
				walk(item.items, `${base}${item.dir}/`, section ?? item.label);
			} else {
				pages.push({ path: `${base}${item.file}`, title: item.title, type: item.type, section: section ?? item.title });
			}
		}
	};
	for (const part of structure.parts) {
		walk(part.sections, '', undefined);
	}
	return pages;
}

/**
 * @param {Structure} structure
 * @returns {Array<{ label: string, items: SidebarItem[] }>}
 */
export function toSidebar(structure) {
	/** @type {(item: Section | ManifestEntry, base: string) => SidebarItem} */
	const toItem = (item, base) =>
		'dir' in item
			? { label: item.label, collapsed: true, items: item.items.map((child) => toItem(child, `${base}${item.dir}/`)) }
			: `${base}${item.file}`;
	return structure.parts.map((part) => ({ label: part.label, items: part.sections.map((s) => toItem(s, '')) }));
}

/**
 * @param {string} docsDir
 * @param {string} path
 * @returns {string | undefined}
 */
export function findPage(docsDir, path) {
	return ['.md', '.mdx'].map((ext) => join(docsDir, `${path}${ext}`)).find((file) => existsSync(file));
}

/**
 * @param {string} docsDir
 * @param {LocatedPage[]} pages
 * @param {string[]} ignore
 * @returns {string[]}
 */
export function findOrphans(docsDir, pages, ignore) {
	const known = new Set([...pages.flatMap((p) => [`${p.path}.md`, `${p.path}.mdx`]), ...ignore]);
	return readdirSync(docsDir, { recursive: true })
		.map(String)
		.filter((file) => /\.mdx?$/.test(file) && !known.has(file))
		.sort();
}

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, parseDocument } from 'yaml';

export const PAGE_TYPES = /** @type {const} */ (['tutorial', 'how-to', 'reference', 'explanation']);

/**
 * @typedef {(typeof PAGE_TYPES)[number]} PageType
 * @typedef {{ file: string, title: string, type: PageType }} ManifestEntry
 * @typedef {{ dir: string, label: string, items: Array<Section | ManifestEntry> }} Section
 * @typedef {{ label: string, sections: Array<Section | ManifestEntry> }} Part
 * @typedef {{ parts: Part[] }} Structure
 * @typedef {{ path: string, title: string, type: PageType, section: string }} LocatedPage
 * @typedef {string | { label: string, collapsed: boolean, items: SidebarItem[] }} SidebarItem
 * @typedef {{ node: Record<string, unknown>, name: string, where: string }} Named
 */
export const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const DOCS = join(ROOT, 'src/content/docs');
export const ROADMAP = 'roadmap.md';
export const PAGES_OUTSIDE_MANIFEST = ['index.mdx', ROADMAP];
const NAME = /^(\d{2})-[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * @param {string | URL} [path]
 * @returns {Structure}
 */
export function loadStructure(path = new URL('./structure.yaml', import.meta.url)) {
	return parseStructure(readFileSync(path, 'utf8'));
}

/**
 * @param {string} text
 * @param {(reason: string) => never} reject
 */
export function parseYaml(text, reject) {
	const document = parseDocument(text);
	const [error] = document.errors;
	if (error) {
		reject(error.message.replace(/:\n[\s\S]*/, ''));
	}
	try {
		return document.toJS();
	} catch (aliasError) {
		if (aliasError instanceof ReferenceError) {
			reject(aliasError.message);
		}
		throw aliasError;
	}
}

/**
 * @param {string} where
 * @param {string} problem
 * @returns {never}
 */
function fail(where, problem) {
	throw new Error(`structure.yaml: "${where}" ${problem}`);
}

/**
 * @param {unknown} node
 * @returns {node is Record<string, unknown>}
 */
function isMapping(node) {
	return node !== null && typeof node === 'object' && !Array.isArray(node);
}

/**
 * @param {unknown} node
 * @param {string} where
 * @param {string[]} keys
 */
function mapping(node, where, keys) {
	if (!isMapping(node)) {
		fail(where, 'must be a mapping');
	}
	const extra = Object.keys(node).filter((key) => !keys.includes(key));
	if (extra.length > 0) {
		fail(where, `has unknown keys ${extra.join(', ')}. Quote titles that contain a comma`);
	}
	return node;
}

/**
 * @param {Record<string, unknown>} node
 * @param {string} where
 * @param {string} key
 */
function textAt(node, where, key) {
	const value = node[key];
	if (typeof value !== 'string' || value === '') {
		fail(where, `needs a text "${key}"`);
	}
	return value;
}

/**
 * @param {Record<string, unknown>} node
 * @param {string} where
 * @param {string} key
 * @returns {unknown[]}
 */
function listAt(node, where, key) {
	const value = node[key];
	if (!Array.isArray(value) || value.length === 0) {
		fail(where, `needs a non-empty list "${key}"`);
	}
	return value;
}

/**
 * @param {unknown[]} items
 * @param {string} parent
 * @returns {Named[]}
 */
function nameItems(items, parent) {
	let previous = 0;
	return items.map((item, index) => {
		const node = isMapping(item) ? item : {};
		const { dir, file } = node;
		const name = dir ?? file;
		const where = `${parent}${name ?? `[${index}]`}`;
		const match = typeof name === 'string' ? NAME.exec(name) : null;
		if (!match) {
			fail(where, 'must look like 01-kebab-case');
		}
		if (Number(match[1]) <= previous) {
			fail(where, 'prefix must be greater than the one before it');
		}
		previous = Number(match[1]);
		return { node, name: match[0], where };
	});
}

/**
 * @param {string} text
 * @returns {Structure}
 * @internal
 */
export function parseStructure(text) {
	const root = mapping(parse(text), '(root)', ['parts']);
	const parts = listAt(root, '(root)', 'parts').map((node, index) => {
		const where = `parts[${index}]`;
		const part = mapping(node, where, ['label', 'sections']);
		return { label: textAt(part, where, 'label'), sections: listAt(part, where, 'sections') };
	});
	checkPrefixesAscendAcrossParts(parts);
	return {
		parts: parts.map((part) => ({ label: part.label, sections: nameItems(part.sections, '').map(parseItem) })),
	};
}

/**
 * @param {Array<{ sections: unknown[] }>} parts
 */
function checkPrefixesAscendAcrossParts(parts) {
	nameItems(
		parts.flatMap((part) => part.sections),
		'',
	);
}

/**
 * @param {Named} item
 * @returns {Section | ManifestEntry}
 */
function parseItem({ node, name, where }) {
	const { dir, type } = node;
	if (dir) {
		mapping(node, where, ['dir', 'label', 'items']);
		return {
			dir: name,
			label: textAt(node, where, 'label'),
			items: nameItems(listAt(node, where, 'items'), `${where}/`).map(parseItem),
		};
	}
	mapping(node, where, ['file', 'title', 'type']);
	const title = textAt(node, where, 'title');
	const pageType = PAGE_TYPES.find((known) => known === (type ?? 'explanation'));
	if (pageType === undefined) {
		fail(where, `has unknown type "${type}"`);
	}
	return { file: name, title, type: pageType };
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

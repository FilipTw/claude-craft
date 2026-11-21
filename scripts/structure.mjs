// The manifest (structure.yaml) is the only source of the page tree, and this module
// is the only owner of where pages live on disk.
// The manifest seeds new pages and builds the sidebar. After a page exists, its frontmatter owns title and type.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

export const PAGE_TYPES = ['tutorial', 'how-to', 'reference', 'explanation'];
export const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const DOCS = join(ROOT, 'src/content/docs');
// Pages written by hand, outside the manifest.
export const HANDWRITTEN = ['index.mdx', 'roadmap.md'];
const NAME = /^(\d{2})-[a-z0-9]+(-[a-z0-9]+)*$/;

export function loadStructure(path = new URL('./structure.yaml', import.meta.url)) {
	return parseStructure(readFileSync(path, 'utf8'));
}

function fail(where, problem) {
	throw new Error(`structure.yaml: "${where}" ${problem}`);
}

const LIST = { ok: (value) => Array.isArray(value) && value.length > 0, noun: 'a non-empty list' };
const TEXT = { ok: (value) => typeof value === 'string' && value !== '', noun: 'a text' };

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
		if (!kind.ok(node[key])) {
			fail(where, `needs ${kind.noun} "${key}"`);
		}
	}
}

function checkPrefixes(items, parent) {
	let previous = 0;
	items.forEach((item, index) => {
		const name = item?.dir ?? item?.file;
		const where = `${parent}${name ?? `[${index}]`}`;
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

// Parse and validate once, at the boundary. Everything downstream trusts the result.
export function parseStructure(text) {
	const raw = parse(text);
	checkShape(raw, '(root)', { parts: LIST });
	for (const [index, part] of raw.parts.entries()) {
		checkShape(part, `parts[${index}]`, { label: TEXT, sections: LIST });
	}
	// Top-level sections share one docs root, so their prefixes ascend across all parts.
	checkPrefixes(
		raw.parts.flatMap((part) => part.sections),
		'',
	);
	return { parts: raw.parts.map((part) => ({ label: part.label, sections: checkItems(part.sections, '') })) };
}

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

// Every page once, in manifest order. `section` is the top-level section label, used for progress.
export function listPages(structure) {
	const pages = [];
	const walk = (items, base, section) => {
		for (const item of items) {
			if (item.dir) {
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

export function toSidebar(structure) {
	const toItem = (item, base) =>
		item.dir
			? { label: item.label, collapsed: true, items: item.items.map((child) => toItem(child, `${base}${item.dir}/`)) }
			: `${base}${item.file}`;
	return structure.parts.map((part) => ({ label: part.label, items: part.sections.map((s) => toItem(s, '')) }));
}

// A page may live in .md or .mdx. Returns the existing file, or undefined.
export function findPage(docsDir, path) {
	return ['.md', '.mdx'].map((ext) => join(docsDir, `${path}${ext}`)).find((file) => existsSync(file));
}

// Markdown files on disk that the manifest does not list, sorted.
export function findOrphans(docsDir, pages, ignore = []) {
	const known = new Set([...pages.flatMap((p) => [`${p.path}.md`, `${p.path}.mdx`]), ...ignore]);
	return readdirSync(docsDir, { recursive: true })
		.map(String)
		.filter((file) => /\.mdx?$/.test(file) && !known.has(file))
		.sort();
}

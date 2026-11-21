// The manifest (structure.yaml) is the only source of the page tree.
// It seeds new pages and builds the sidebar. After a page exists, its frontmatter owns title and type.
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

export const PAGE_TYPES = ['tutorial', 'how-to', 'reference', 'explanation'];
const NAME = /^(\d{2})-[a-z0-9]+(-[a-z0-9]+)*$/;

export function loadStructure(path = new URL('./structure.yaml', import.meta.url)) {
	return parseStructure(readFileSync(path, 'utf8'));
}

function fail(where, problem) {
	throw new Error(`structure.yaml: "${where}" ${problem}`);
}

function checkShape(node, where, allowed, required) {
	if (node === null || typeof node !== 'object' || Array.isArray(node)) fail(where, 'must be a mapping');
	const extra = Object.keys(node).filter((key) => !allowed.includes(key));
	if (extra.length) fail(where, `has unknown keys ${extra.join(', ')}. Quote titles that contain a comma`);
	for (const [key, kind] of Object.entries(required)) {
		const value = node[key];
		const ok = kind === 'list' ? Array.isArray(value) && value.length > 0 : typeof value === 'string' && value !== '';
		if (!ok) fail(where, `needs ${kind === 'list' ? 'a non-empty list' : 'a text'} "${key}"`);
	}
}

// Parse and validate once, at the boundary. Everything downstream trusts the result.
export function parseStructure(text) {
	const raw = parse(text);
	checkShape(raw, '(root)', ['parts'], { parts: 'list' });
	// Top-level sections share one docs root, so their prefixes ascend across all parts.
	const topLevel = { previous: 0 };
	return {
		parts: raw.parts.map((part, index) => {
			checkShape(part, `parts[${index}]`, ['label', 'sections'], { label: 'text', sections: 'list' });
			return { label: part.label, sections: checkItems(part.sections, '', topLevel) };
		}),
	};
}

function checkItems(items, parent, order = { previous: 0 }) {
	return items.map((item, index) => {
		const name = item?.dir ?? item?.file;
		const where = `${parent}${name ?? `[${index}]`}`;
		const match = NAME.exec(name ?? '');
		if (!match) fail(where, 'must look like 01-kebab-case');
		const prefix = Number(match[1]);
		if (prefix <= order.previous) fail(where, 'prefix must be greater than the one before it');
		order.previous = prefix;
		if (item.dir) {
			checkShape(item, where, ['dir', 'label', 'items'], { label: 'text', items: 'list' });
			return { dir: item.dir, label: item.label, items: checkItems(item.items, `${where}/`) };
		}
		checkShape(item, where, ['file', 'title', 'type'], { title: 'text' });
		const type = item.type ?? 'explanation';
		if (!PAGE_TYPES.includes(type)) fail(where, `has unknown type "${type}"`);
		return { file: item.file, title: item.title, type };
	});
}

export function listPages(structure) {
	const pages = [];
	const walk = (items, base) => {
		for (const item of items) {
			if (item.dir) walk(item.items, `${base}${item.dir}/`);
			else pages.push({ path: `${base}${item.file}`, title: item.title, type: item.type });
		}
	};
	for (const part of structure.parts) walk(part.sections, '');
	return pages;
}

export function toSidebar(structure) {
	const toItem = (item, base) =>
		item.dir
			? { label: item.label, collapsed: true, items: item.items.map((child) => toItem(child, `${base}${item.dir}/`)) }
			: `${base}${item.file}`;
	return structure.parts.map((part) => ({ label: part.label, items: part.sections.map((s) => toItem(s, '')) }));
}

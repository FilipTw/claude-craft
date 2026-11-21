// The manifest (structure.yaml) is the only source of the page tree.
// It seeds new pages and builds the sidebar. After a page exists, its frontmatter owns title and type.
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

export const PAGE_TYPES = ['tutorial', 'how-to', 'reference', 'explanation'];
const NAME = /^(\d{2})-[a-z0-9]+(-[a-z0-9]+)*$/;

export function loadStructure(path = new URL('./structure.yaml', import.meta.url)) {
	return parseStructure(readFileSync(path, 'utf8'));
}

// Parse and validate once, at the boundary. Everything downstream trusts the result.
export function parseStructure(text) {
	const raw = parse(text);
	return { parts: raw.parts.map((part) => ({ label: part.label, sections: checkItems(part.sections, '') })) };
}

function checkItems(items, parent) {
	let previous = 0;
	return items.map((item) => {
		const name = item.dir ?? item.file;
		const where = `${parent}${name}`;
		const match = NAME.exec(name ?? '');
		if (!match) throw new Error(`structure.yaml: "${where}" must look like 01-kebab-case`);
		const prefix = Number(match[1]);
		if (prefix <= previous) throw new Error(`structure.yaml: "${where}" prefix must be greater than the one before it`);
		previous = prefix;
		const allowed = item.dir ? ['dir', 'label', 'items'] : ['file', 'title', 'type'];
		const extra = Object.keys(item).filter((key) => !allowed.includes(key));
		if (extra.length) throw new Error(`structure.yaml: "${where}" has unknown keys ${extra.join(', ')}. Quote titles that contain a comma`);
		const text = item.dir ? item.label : item.title;
		if (typeof text !== 'string' || !text) throw new Error(`structure.yaml: "${where}" needs a ${item.dir ? 'label' : 'title'}`);
		if (item.dir) return { dir: item.dir, label: item.label, items: checkItems(item.items, `${where}/`) };
		const type = item.type ?? 'explanation';
		if (!PAGE_TYPES.includes(type)) throw new Error(`structure.yaml: "${where}" has unknown type "${type}"`);
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

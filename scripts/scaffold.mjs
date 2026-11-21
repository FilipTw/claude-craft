// Creates every page listed in structure.yaml that does not exist yet. Never overwrites.
// Safe to run any number of times: a second run changes nothing.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAGE_TYPES, listPages, loadStructure } from './structure.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DOCS = join(ROOT, 'src/content/docs');
const HANDWRITTEN = ['index.mdx', 'roadmap.md'];

// A page may live in .md or .mdx. Returns the existing file, or undefined.
export function findPage(docsDir, path) {
	return ['.md', '.mdx'].map((ext) => join(docsDir, `${path}${ext}`)).find((file) => existsSync(file));
}

export function scaffold({ docsDir, pages, templates, ignore = [] }) {
	const created = [];
	for (const page of pages) {
		if (findPage(docsDir, page.path)) continue;
		const file = join(docsDir, `${page.path}.md`);
		mkdirSync(dirname(file), { recursive: true });
		// Function replacements, so "$&" or "$'" in a title stay literal.
		const text = templates[page.type].replaceAll('{{title}}', () => JSON.stringify(page.title)).replaceAll('{{type}}', () => page.type);
		writeFileSync(file, text);
		created.push(page.path);
	}
	const known = new Set([...pages.flatMap((p) => [`${p.path}.md`, `${p.path}.mdx`]), ...ignore]);
	const orphans = readdirSync(docsDir, { recursive: true })
		.map(String)
		.filter((f) => /\.mdx?$/.test(f) && !known.has(f))
		.sort();
	return { created, orphans };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const templates = Object.fromEntries(
		PAGE_TYPES.map((type) => [type, readFileSync(join(ROOT, `scripts/templates/${type}.md`), 'utf8')]),
	);
	const { created, orphans } = scaffold({ docsDir: DOCS, pages: listPages(loadStructure()), templates, ignore: HANDWRITTEN });
	console.log(`Utworzono ${created.length} stron.`);
	for (const orphan of orphans) console.log(`Poza manifestem: ${relative(ROOT, join(DOCS, orphan))}`);
	if (orphans.length) process.exitCode = 1;
}

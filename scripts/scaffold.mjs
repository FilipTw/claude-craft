// Creates every page listed in structure.yaml that does not exist yet. Never overwrites.
// Safe to run any number of times: a second run changes nothing.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAGE_TYPES, listPages, loadStructure } from './structure.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DOCS = join(ROOT, 'src/content/docs');
const HANDWRITTEN = ['index.mdx', 'roadmap.md'];

export function scaffold({ docsDir, pages, templates, ignore = [] }) {
	const created = [];
	for (const page of pages) {
		const file = join(docsDir, `${page.path}.md`);
		if (existsSync(file)) continue;
		mkdirSync(dirname(file), { recursive: true });
		writeFileSync(file, templates[page.type].replaceAll('{{title}}', JSON.stringify(page.title)).replaceAll('{{type}}', page.type));
		created.push(page.path);
	}
	const known = new Set([...pages.map((p) => `${p.path}.md`), ...ignore]);
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

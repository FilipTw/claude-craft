// Creates every page listed in structure.yaml that does not exist yet. Never overwrites.
// Safe to run any number of times: a second run changes nothing.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DOCS, HANDWRITTEN, PAGE_TYPES, ROOT, findOrphans, findPage, listPages, loadStructure } from './structure.mjs';

export function scaffold({ docsDir, pages, templates }) {
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
	return { created };
}

// Returns the process exit code: 1 when files exist outside the manifest.
export function runScaffold({ docsDir = DOCS, pages = listPages(loadStructure()), log = console.log } = {}) {
	const templates = Object.fromEntries(PAGE_TYPES.map((type) => [type, readFileSync(join(ROOT, `scripts/templates/${type}.md`), 'utf8')]));
	const { created } = scaffold({ docsDir, pages, templates });
	const orphans = findOrphans(docsDir, pages, HANDWRITTEN);
	log(`Utworzono ${created.length} stron.`);
	for (const orphan of orphans) log(`Poza manifestem: ${orphan}. Dodaj go do scripts/structure.yaml.`);
	return orphans.length ? 1 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exitCode = runScaffold();

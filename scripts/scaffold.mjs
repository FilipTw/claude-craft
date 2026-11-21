// Creates every page listed in structure.yaml that does not exist yet. Never overwrites.
// Safe to run any number of times: a second run changes nothing.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DOCS, findOrphans, findPage, HANDWRITTEN, listPages, loadStructure, PAGE_TYPES, ROOT } from './structure.mjs';

/** @import { LocatedPage, PageType } from './structure.mjs' */

/**
 * @param {{ docsDir: string, pages: LocatedPage[], templates: Record<PageType, string> }} options
 * @returns {{ created: string[] }}
 * @internal
 */
export function scaffold({ docsDir, pages, templates }) {
	const created = [];
	for (const page of pages) {
		if (findPage(docsDir, page.path)) {
			continue;
		}
		const file = join(docsDir, `${page.path}.md`);
		mkdirSync(dirname(file), { recursive: true });
		// Function replacements, so "$&" or "$'" in a title stay literal.
		const text = templates[page.type]
			.replaceAll('{{title}}', () => JSON.stringify(page.title))
			.replaceAll('{{type}}', () => page.type);
		writeFileSync(file, text);
		created.push(page.path);
	}
	return { created };
}

/**
 * @param {{ docsDir?: string, pages?: LocatedPage[], log?: (line: string) => void }} [options]
 * @returns {0 | 1}
 * @internal
 */
export function runScaffold({
	docsDir = DOCS,
	pages = listPages(loadStructure()),
	log = (line) => process.stdout.write(`${line}\n`),
} = {}) {
	const templates = /** @type {Record<PageType, string>} */ (
		Object.fromEntries(
			PAGE_TYPES.map((type) => [type, readFileSync(join(ROOT, `scripts/templates/${type}.md`), 'utf8')]),
		)
	);
	const { created } = scaffold({ docsDir, pages, templates });
	const orphans = findOrphans(docsDir, pages, HANDWRITTEN);
	log(`Pages created: ${created.length}.`);
	for (const orphan of orphans) {
		log(`Outside the manifest: ${orphan}. Add it to scripts/structure.yaml.`);
	}
	return orphans.length > 0 ? 1 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	process.exitCode = runScaffold();
}

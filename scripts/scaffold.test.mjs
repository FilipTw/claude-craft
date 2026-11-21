import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { parse } from 'yaml';
import { runScaffold, scaffold } from './scaffold.mjs';
import { PAGE_TYPES } from './structure.mjs';

/** @import { Page, PageType } from './structure.mjs' */

/** @type {Page[]} */
const pages = [
	{ path: '01-a/01-one', title: 'Jeden', type: 'explanation', section: 'A' },
	{ path: '01-a/02-b/01-two', title: 'Dwa: "cytat"', type: 'how-to', section: 'A' },
];
const header = '---\ntitle: {{title}}\ntype: {{type}}\n---\n';
/** @type {Record<PageType, string>} */
const templates = {
	tutorial: header,
	'how-to': `${header}## Kroki\n`,
	reference: header,
	explanation: header,
};
const silent = () => undefined;

test('creates missing pages from the template of their type', () => {
	const docs = mkdtempSync(join(tmpdir(), 'cc-'));
	const { created } = scaffold({ docsDir: docs, pages, templates });
	assert.deepEqual(created, ['01-a/01-one', '01-a/02-b/01-two']);
	assert.equal(
		readFileSync(join(docs, '01-a/02-b/01-two.md'), 'utf8'),
		'---\ntitle: "Dwa: \\"cytat\\""\ntype: how-to\n---\n## Kroki\n',
	);
});

test('second run creates nothing and keeps edited pages', () => {
	const docs = mkdtempSync(join(tmpdir(), 'cc-'));
	scaffold({ docsDir: docs, pages, templates });
	writeFileSync(join(docs, '01-a/01-one.md'), 'edited');
	const { created } = scaffold({ docsDir: docs, pages, templates });
	assert.deepEqual(created, []);
	assert.equal(readFileSync(join(docs, '01-a/01-one.md'), 'utf8'), 'edited');
});

test('writes titles with $ patterns verbatim', () => {
	const docs = mkdtempSync(join(tmpdir(), 'cc-'));
	scaffold({
		docsDir: docs,
		pages: [{ path: '01-x', title: "Koszt $' i $& $$", type: 'explanation', section: 'X' }],
		templates,
	});
	assert.match(readFileSync(join(docs, '01-x.md'), 'utf8'), /^title: "Koszt \$' i \$& \$\$"$/m);
});

test('treats an existing .mdx page as present', () => {
	const docs = mkdtempSync(join(tmpdir(), 'cc-'));
	mkdirSync(join(docs, '01-a'), { recursive: true });
	writeFileSync(join(docs, '01-a/01-one.mdx'), 'x');
	const { created } = scaffold({ docsDir: docs, pages: pages.slice(0, 1), templates });
	assert.deepEqual(created, []);
	assert.equal(existsSync(join(docs, '01-a/01-one.md')), false);
});

test('runScaffold fills the real template of every page type with the manifest title and type', () => {
	const docs = mkdtempSync(join(tmpdir(), 'cc-'));
	const title = 'Hooki: "PreToolUse" #1';
	/** @type {Page[]} */
	const typed = PAGE_TYPES.map((type, index) => ({ path: `0${index + 1}-${type}`, title, type, section: 'A' }));
	runScaffold({ docsDir: docs, pages: typed, log: silent });
	for (const page of typed) {
		const text = readFileSync(join(docs, `${page.path}.md`), 'utf8');
		const frontmatter = parse(/^---\n([\s\S]*?)\n---\n/.exec(text)?.[1] ?? '');
		assert.partialDeepStrictEqual(frontmatter, { title, type: page.type });
	}
});

test('runScaffold prints the created count and each orphan on stdout by default', (t) => {
	const docs = mkdtempSync(join(tmpdir(), 'cc-'));
	writeFileSync(join(docs, '09-stray.md'), 'x');
	const write = t.mock.method(process.stdout, 'write', () => true);
	const code = runScaffold({ docsDir: docs, pages });
	write.mock.restore();
	assert.equal(code, 1);
	assert.deepEqual(
		write.mock.calls.map((call) => call.arguments[0]),
		['Utworzono 2 stron.\n', 'Poza manifestem: 09-stray.md. Dodaj go do scripts/structure.yaml.\n'],
	);
});

test('runScaffold exits 0 on a clean tree and 1 when a file is outside the manifest', () => {
	const docs = mkdtempSync(join(tmpdir(), 'cc-'));
	assert.equal(runScaffold({ docsDir: docs, pages, log: silent }), 0);
	writeFileSync(join(docs, '01-a/09-stray.md'), 'x');
	assert.equal(runScaffold({ docsDir: docs, pages, log: silent }), 1);
});

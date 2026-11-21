import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runScaffold, scaffold } from './scaffold.mjs';

const pages = [
	{ path: '01-a/01-one', title: 'Jeden', type: 'explanation' },
	{ path: '01-a/02-b/01-two', title: 'Dwa: "cytat"', type: 'how-to' },
];
const templates = { explanation: '---\ntitle: {{title}}\ntype: {{type}}\n---\n', 'how-to': '---\ntitle: {{title}}\ntype: {{type}}\n---\n## Kroki\n' };
const silent = () => {};

test('creates missing pages from the template of their type', () => {
	const docs = mkdtempSync(join(tmpdir(), 'cc-'));
	const { created } = scaffold({ docsDir: docs, pages, templates });
	assert.deepEqual(created, ['01-a/01-one', '01-a/02-b/01-two']);
	assert.equal(readFileSync(join(docs, '01-a/02-b/01-two.md'), 'utf8'), '---\ntitle: "Dwa: \\"cytat\\""\ntype: how-to\n---\n## Kroki\n');
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
	scaffold({ docsDir: docs, pages: [{ path: '01-x', title: "Koszt $' i $& $$", type: 'explanation' }], templates });
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

test('runScaffold exits 0 on a clean tree and 1 when a file is outside the manifest', () => {
	const docs = mkdtempSync(join(tmpdir(), 'cc-'));
	assert.equal(runScaffold({ docsDir: docs, pages, log: silent }), 0);
	writeFileSync(join(docs, '01-a/09-stray.md'), 'x');
	assert.equal(runScaffold({ docsDir: docs, pages, log: silent }), 1);
});

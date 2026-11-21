import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scaffold } from './scaffold.mjs';

const pages = [
	{ path: '01-a/01-one', title: 'Jeden', type: 'explanation' },
	{ path: '01-a/02-b/01-two', title: 'Dwa: "cytat"', type: 'how-to' },
];
const templates = { explanation: '---\ntitle: {{title}}\ntype: {{type}}\n---\n', 'how-to': '---\ntitle: {{title}}\ntype: {{type}}\n---\n## Kroki\n' };

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

test('reports pages that exist on disk but not in the manifest', () => {
	const docs = mkdtempSync(join(tmpdir(), 'cc-'));
	mkdirSync(join(docs, '01-a'), { recursive: true });
	writeFileSync(join(docs, '01-a/09-stray.md'), 'x');
	writeFileSync(join(docs, 'index.mdx'), 'x');
	const { orphans } = scaffold({ docsDir: docs, pages, templates, ignore: ['index.mdx'] });
	assert.deepEqual(orphans, ['01-a/09-stray.md']);
});

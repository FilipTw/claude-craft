import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { classify, renderProgress, runFreshness, writeProgress } from './freshness.mjs';

const now = new Date('2026-11-21');
const verified = (date) => `---\ntitle: A\nlastVerified: ${date}\n---\n`;

test('a page without lastVerified is todo', () => {
	assert.equal(classify('---\ntitle: A\ntype: explanation\n---\n', now), 'todo');
});

test('a page is fresh up to exactly 90 days and stale from day 91', () => {
	assert.equal(classify(verified('2026-08-23'), now), 'fresh');
	assert.equal(classify(verified('2026-08-22'), now), 'stale');
});

test('reads frontmatter with CRLF line endings and a BOM', () => {
	assert.equal(classify('﻿---\r\ntitle: A\r\nlastVerified: 2020-01-01\r\n---\r\n', now), 'stale');
});

test('an invalid or future date needs checking, never counts as fresh', () => {
	assert.equal(classify(verified('wczoraj'), now), 'stale');
	assert.equal(classify(verified('2099-01-01'), now), 'stale');
});

test('renderProgress counts each status in its own column, per section and in total', () => {
	const rows = [
		{ section: 'Hooki', status: 'fresh' },
		{ section: 'Hooki', status: 'fresh' },
		{ section: 'Hooki', status: 'todo' },
		{ section: 'MCP', status: 'stale' },
		{ section: 'MCP', status: 'todo' },
		{ section: 'MCP', status: 'todo' },
		{ section: 'MCP', status: 'todo' },
	];
	assert.equal(
		renderProgress(rows),
		[
			'| Sekcja | Aktualne | Do sprawdzenia | Do napisania |',
			'|---|---|---|---|',
			'| Hooki | 2 | 0 | 1 |',
			'| MCP | 0 | 1 | 3 |',
			'| **Razem** | **2** | **1** | **4** |',
		].join('\n'),
	);
});

test('writeProgress replaces only the text between the markers, keeping $ patterns literal', () => {
	const text = 'a\n<!-- progress:start -->\nold\n<!-- progress:end -->\nb\n';
	assert.equal(writeProgress(text, 'new $& $$'), 'a\n<!-- progress:start -->\nnew $& $$\n<!-- progress:end -->\nb\n');
});

test('writeProgress fails when the markers are missing or repeated', () => {
	assert.throws(() => writeProgress('no markers', 't'), /progress/);
	const twice = '<!-- progress:start -->\n<!-- progress:end -->\n'.repeat(2);
	assert.throws(() => writeProgress(twice, 't'), /progress/);
});

test('runFreshness groups by top-level section and writes the table into roadmap.md', () => {
	const docs = mkdtempSync(join(tmpdir(), 'cc-'));
	writeFileSync(join(docs, 'roadmap.md'), 'x\n<!-- progress:start -->\n<!-- progress:end -->\n');
	writeFileSync(join(docs, '01-a.md'), verified('2026-11-01'));
	writeFileSync(join(docs, '02-b.md'), '---\ntitle: B\n---\n');
	const pages = [
		{ path: '01-a', section: 'Hooki' },
		{ path: '02-b', section: 'Hooki' },
	];
	runFreshness({ docsDir: docs, pages, now, log: () => undefined });
	assert.match(readFileSync(join(docs, 'roadmap.md'), 'utf8'), /\| Hooki \| 1 \| 0 \| 1 \|/);
});

test('runFreshness names a page that is in the manifest but missing on disk', () => {
	const docs = mkdtempSync(join(tmpdir(), 'cc-'));
	assert.throws(
		() => runFreshness({ docsDir: docs, pages: [{ path: '01-gone', section: 'X' }], now, log: () => undefined }),
		/01-gone.*npm run scaffold/,
	);
});

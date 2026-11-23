import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { SEARCH_QUERIES, SEARCH_START_PAGES } from './search.mjs';

test('search queries are unique, case-insensitively, and not blank', () => {
	const lower = SEARCH_QUERIES.map((query) => query.toLowerCase());

	assert.equal(new Set(lower).size, SEARCH_QUERIES.length);
	assert.ok(SEARCH_QUERIES.every((query) => query.trim() === query && query.length > 0));
});

test('start pages have relative paths that end with a slash, so withBase can join them', () => {
	assert.ok(SEARCH_START_PAGES.length > 0);
	for (const { label, path } of SEARCH_START_PAGES) {
		assert.ok(label.length > 0, label);
		assert.match(path, /^[a-z0-9-]+(?:\/[a-z0-9-]+)*\/$/, path);
	}
});

test('every start page exists in src/content/docs, since the links validator does not see components', () => {
	const docs = fileURLToPath(new URL('../content/docs/', import.meta.url));
	for (const { path } of SEARCH_START_PAGES) {
		const page = join(docs, path.slice(0, -1));
		assert.ok(existsSync(`${page}.md`) || existsSync(`${page}.mdx`), path);
	}
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SEARCH_QUERIES, SEARCH_START_PAGES } from './search.mjs';

test('search queries exist, are unique case-insensitively, and are not blank', () => {
	assert.ok(SEARCH_QUERIES.length > 0, 'an empty list leaves the "Popularne" label without chips');
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

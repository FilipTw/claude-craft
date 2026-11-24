import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { ROADMAP_ID, ROADMAP_PATH } from './pages.mjs';

test('the roadmap page exists under its id, since the links validator does not see components', () => {
	const page = fileURLToPath(new URL(`../content/docs/${ROADMAP_ID}`, import.meta.url));

	assert.ok(existsSync(`${page}.md`) || existsSync(`${page}.mdx`), ROADMAP_ID);
});

test('the roadmap path is the id with the trailing slash Starlight serves it at', () => {
	assert.equal(ROADMAP_PATH, 'roadmap/');
});

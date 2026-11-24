import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import * as pages from './pages.mjs';

const PATHS = Object.entries(pages).filter(([name]) => name.endsWith('_PATH'));

test('the roadmap path is the id with the trailing slash Starlight serves it at', () => {
	assert.equal(pages.ROADMAP_PATH, `${pages.ROADMAP_ID}/`);
	assert.equal(pages.ROADMAP_PATH, 'roadmap/');
});

test('every path is relative and ends with a slash, so withBase can join it', () => {
	assert.ok(PATHS.length > 1);
	for (const [name, path] of PATHS) {
		assert.match(path, /^[a-z0-9-]+(?:\/[a-z0-9-]+)*\/$/, name);
	}
});

test('every page exists in src/content/docs, since the links validator does not see components', () => {
	for (const [name, path] of PATHS) {
		const page = fileURLToPath(new URL(`../content/docs/${path.slice(0, -1)}`, import.meta.url));
		assert.ok(existsSync(`${page}.md`) || existsSync(`${page}.mdx`), `${name}: ${path}`);
	}
});

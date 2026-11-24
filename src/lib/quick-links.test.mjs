import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { QUICK_LINKS } from './quick-links.mjs';

test('quick links exist and each has a label, a title and a relative path ending in a slash', () => {
	assert.ok(QUICK_LINKS.length > 0, 'an empty list leaves the "Szybki start" section without capsules');
	for (const { label, title, path } of QUICK_LINKS) {
		assert.ok(label.trim().length > 0, `label of ${path}`);
		assert.ok(title.trim().length > 0, `title of ${path}`);
		assert.match(path, /^[a-z0-9-]+(?:\/[a-z0-9-]+)*\/$/, path);
	}
});

test('quick links point to different pages', () => {
	const paths = QUICK_LINKS.map((link) => link.path);

	assert.equal(new Set(paths).size, paths.length);
});

test('every quick link page exists in src/content/docs, since the links validator does not see components', () => {
	const docs = fileURLToPath(new URL('../content/docs/', import.meta.url));
	for (const { path } of QUICK_LINKS) {
		const page = join(docs, path.slice(0, -1));
		assert.ok(existsSync(`${page}.md`) || existsSync(`${page}.mdx`), path);
	}
});

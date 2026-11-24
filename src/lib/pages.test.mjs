import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
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

test('every page that CSS styles by id with data-cc-page exists, so a rename cannot switch its styles off unnoticed', () => {
	const styles = new URL('../styles/', import.meta.url);
	const css = readdirSync(styles)
		.filter((file) => file.endsWith('.css'))
		.map((file) => readFileSync(new URL(file, styles), 'utf8'))
		.join('\n');
	const ids = new Set([...css.matchAll(/\[data-cc-page="([^"]+)"\]/g)].map((match) => String(match[1])));

	assert.ok(ids.size > 0, 'no [data-cc-page] selector found: update this test if the attribute was renamed');
	for (const id of ids) {
		const page = fileURLToPath(new URL(`../content/docs/${id}`, import.meta.url));
		assert.ok(existsSync(`${page}.md`) || existsSync(`${page}.mdx`), `[data-cc-page="${id}"] in src/styles`);
	}
});

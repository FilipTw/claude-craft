import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify, renderProgress } from './freshness.mjs';

const now = new Date('2026-11-21');

test('a page without lastVerified is todo', () => {
	assert.equal(classify('---\ntitle: A\ntype: explanation\n---\n', now), 'todo');
});

test('a page verified within 90 days is fresh', () => {
	assert.equal(classify('---\ntitle: A\nlastVerified: 2026-09-01\n---\n', now), 'fresh');
});

test('a page verified more than 90 days ago is stale', () => {
	assert.equal(classify('---\ntitle: A\nlastVerified: 2026-08-01\n---\n', now), 'stale');
});

test('reads frontmatter with CRLF line endings and a BOM', () => {
	assert.equal(classify('﻿---\r\ntitle: A\r\nlastVerified: 2020-01-01\r\n---\r\n', now), 'stale');
});

test('an invalid or future date needs checking, never counts as fresh', () => {
	assert.equal(classify('---\nlastVerified: wczoraj\n---\n', now), 'stale');
	assert.equal(classify('---\nlastVerified: 2099-01-01\n---\n', now), 'stale');
});

test('renderProgress counts statuses per section', () => {
	const rows = [
		{ section: 'Hooki', status: 'fresh' },
		{ section: 'Hooki', status: 'todo' },
		{ section: 'MCP', status: 'stale' },
	];
	assert.equal(
		renderProgress(rows),
		[
			'| Sekcja | Aktualne | Do sprawdzenia | Do napisania |',
			'|---|---|---|---|',
			'| Hooki | 1 | 0 | 1 |',
			'| MCP | 0 | 1 | 0 |',
			'| **Razem** | **1** | **1** | **1** |',
		].join('\n'),
	);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { verificationStatus } from './verification.mjs';

const now = new Date('2026-11-21');

test('a page without a check date is todo', () => {
	assert.equal(verificationStatus(undefined, now), 'todo');
});

test('a check is fresh from its own day up to exactly 90 days, and stale from day 91', () => {
	assert.equal(verificationStatus(new Date('2026-11-21'), now), 'fresh');
	assert.equal(verificationStatus(new Date('2026-08-23'), now), 'fresh');
	assert.equal(verificationStatus(new Date('2026-08-22'), now), 'stale');
});

test('a future or invalid date is stale, never fresh', () => {
	assert.equal(verificationStatus(new Date('2026-11-22'), now), 'stale');
	assert.equal(verificationStatus(new Date('wczoraj'), now), 'stale');
});

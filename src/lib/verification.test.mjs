import assert from 'node:assert/strict';
import { test } from 'node:test';
import { latestCheckDate, verificationStatus } from './verification.mjs';

const now = new Date('2026-11-21');

test('a page without a check date is todo', () => {
	assert.equal(verificationStatus(undefined, now), 'todo');
});

test('a check is fresh from its own day up to exactly 90 days, and stale from day 91', () => {
	assert.equal(verificationStatus(new Date('2026-11-21'), now), 'fresh');
	assert.equal(verificationStatus(new Date('2026-08-23'), now), 'fresh');
	assert.equal(verificationStatus(new Date('2026-08-22'), now), 'stale');
});

test('a date that has begun in no time zone yet, or an invalid one, is stale, never fresh', () => {
	assert.equal(verificationStatus(new Date('2026-11-22'), new Date('2026-11-21T09:59:59.999Z')), 'stale');
	assert.equal(verificationStatus(new Date('2026-11-23'), now), 'stale');
	assert.equal(verificationStatus(new Date('wczoraj'), now), 'stale');
});

test("today's date written just after midnight in Poland is fresh, though UTC is still on yesterday", () => {
	// 00:30 on 22 November in Warsaw (UTC+1)
	const justAfterMidnight = new Date('2026-11-21T23:30:00Z');

	assert.equal(verificationStatus(new Date('2026-11-22'), justAfterMidnight), 'fresh');
});

test('a date counts from the moment it begins in UTC+14, the earliest time zone', () => {
	assert.equal(verificationStatus(new Date('2026-11-22'), new Date('2026-11-21T10:00:00Z')), 'fresh');
	assert.deepEqual(latestCheckDate(new Date('2026-11-21T10:00:00Z')), new Date('2026-11-22T00:00:00Z'));
});

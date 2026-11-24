/**
 * The one rule for whether a page's check is current. The roadmap table (scripts/freshness.mjs),
 * the progress on the homepage and in the sidebar (home.mjs) and the content schema all use it, so they never disagree.
 */

/** @typedef {'todo' | 'stale' | 'fresh'} VerificationStatus */

/** A check stays current this many days, counting the day of the check as day 0. */
const MAX_AGE_DAYS = 90;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
/** UTC+14 (Kiribati) starts each calendar day first, 14 hours before UTC. */
const EARLIEST_ZONE_MS = 14 * HOUR_MS;

/**
 * The latest `lastVerified` that is not in the future on `now`. `lastVerified` is a date, read as UTC midnight,
 * so today's date counts once it has begun in any time zone. In Poland, today's date written just after
 * midnight is still a few hours ahead of UTC and must not count as future.
 * @param {Date} now
 * @returns {Date}
 */
export const latestCheckDate = (now) => new Date(now.getTime() + EARLIEST_ZONE_MS);

/**
 * `todo` without a date, `fresh` from the day of the check up to 90 days, `stale` after that.
 * A future or invalid date is `stale`: it needs checking and never counts as current.
 * @param {Date | undefined} lastVerified
 * @param {Date} now
 * @returns {VerificationStatus}
 */
export const verificationStatus = (lastVerified, now) => {
	if (lastVerified === undefined) {
		return 'todo';
	}
	const notFuture = lastVerified.getTime() <= latestCheckDate(now).getTime();
	const ageDays = (now.getTime() - lastVerified.getTime()) / DAY_MS;
	return notFuture && ageDays <= MAX_AGE_DAYS ? 'fresh' : 'stale';
};

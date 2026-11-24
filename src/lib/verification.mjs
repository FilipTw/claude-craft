/**
 * The one rule for whether a page's check is current. The roadmap table (scripts/freshness.mjs)
 * and the progress on the homepage and in the sidebar (home.mjs) both use it, so they never disagree.
 */

/** @typedef {'todo' | 'stale' | 'fresh'} VerificationStatus */

/** A check stays current this many days, counting the day of the check as day 0. */
const MAX_AGE_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

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
	const ageDays = (now.getTime() - lastVerified.getTime()) / DAY_MS;
	return ageDays >= 0 && ageDays <= MAX_AGE_DAYS ? 'fresh' : 'stale';
};

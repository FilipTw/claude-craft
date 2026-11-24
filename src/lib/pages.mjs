/**
 * Pages that components link to by name. starlight-links-validator does not see links in components,
 * so pages.test.mjs checks that each one exists. scripts/structure.mjs names the roadmap file (ROADMAP).
 */

/** Collection id of the roadmap page, as in `Astro.locals.starlightRoute.id`. */
export const ROADMAP_ID = 'roadmap';

/** The roadmap URL relative to the site base, ready for `withBase`. */
export const ROADMAP_PATH = `${ROADMAP_ID}/`;

/** The first tutorial: quick links and search suggestions both start here. */
export const FIRST_SESSION_PATH = '01-foundations/09-first-session/';

/** The first lab. */
export const FIRST_LAB_PATH = '21-labs/01-first-claude-md/';

/** CLI flags reference. */
export const CLI_FLAGS_PATH = '20-reference/01-cli-flags/';

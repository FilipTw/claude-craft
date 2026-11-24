/**
 * Pages that components link to by name. starlight-links-validator does not see links in components,
 * so pages.test.mjs checks that each one exists. scripts/structure.mjs names the roadmap file (ROADMAP).
 */

/** Collection id of the roadmap page, as in `Astro.locals.starlightRoute.id`. */
export const ROADMAP_ID = 'roadmap';

/** The roadmap URL relative to the site base, ready for `withBase`. */
export const ROADMAP_PATH = `${ROADMAP_ID}/`;

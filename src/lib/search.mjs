/**
 * Suggestions shown in the search dialog while the field is empty (ADR 0003, 2026-11-24).
 * Paths are relative to the site base; the component adds the base with `withBase`.
 */

/** Phrases a click puts into the search field. */
export const SEARCH_QUERIES = Object.freeze(['CLAUDE.md', 'Hooki', 'Skille', 'MCP', 'Uprawnienia', 'Subagenci']);

/** Pages to start from, in reading order. */
export const SEARCH_START_PAGES = Object.freeze([
	{ label: 'Pierwsza sesja', path: '01-foundations/09-first-session/' },
	{ label: 'Ścieżka nauki', path: 'roadmap/' },
	{ label: 'Flagi CLI', path: '20-reference/01-cli-flags/' },
]);

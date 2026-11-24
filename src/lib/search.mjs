/**
 * Suggestions shown in the search dialog while the field is empty (ADR 0003, 2026-11-24).
 * Paths are relative to the site base; the component adds the base with `withBase`.
 */

import { CLI_FLAGS_PATH, FIRST_SESSION_PATH, ROADMAP_PATH } from './pages.mjs';

/** Phrases a click puts into the search field. */
export const SEARCH_QUERIES = Object.freeze(['CLAUDE.md', 'Hooki', 'Skille', 'MCP', 'Uprawnienia', 'Subagenci']);

/** Pages to start from, in reading order. */
export const SEARCH_START_PAGES = Object.freeze([
	{ label: 'Pierwsza sesja', path: FIRST_SESSION_PATH },
	{ label: 'Ścieżka nauki', path: ROADMAP_PATH },
	{ label: 'Flagi CLI', path: CLI_FLAGS_PATH },
]);

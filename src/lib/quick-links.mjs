/**
 * "Szybki start" capsules on the homepage (spec: design pass 3).
 * Paths are relative to the site base; the component adds the base with `withBase`.
 */
import { CLI_FLAGS_PATH, FIRST_LAB_PATH, FIRST_SESSION_PATH } from './pages.mjs';

export const QUICK_LINKS = Object.freeze([
	{ label: 'Tutorial', title: 'Pierwsza sesja', path: FIRST_SESSION_PATH },
	{ label: 'Ćwiczenia', title: 'Laby', path: FIRST_LAB_PATH },
	{ label: 'Referencja', title: 'Flagi CLI', path: CLI_FLAGS_PATH },
]);

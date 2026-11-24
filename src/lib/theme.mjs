/**
 * The two themes and where the choice is stored (ADR 0003). ThemeSelect imports this module.
 * ThemeProvider's inline script cannot import, so it repeats the key and theme.test.mjs checks the copy.
 */

/** @typedef {'dark' | 'light'} Theme */

/**
 * Starlight's own key, so a choice stored before these overrides still applies.
 * @internal
 */
export const THEME_STORAGE_KEY = 'starlight-theme';

/**
 * Dark is the default: anything but "light" is dark, including "auto" stored by stock Starlight.
 * @param {unknown} value
 * @returns {Theme}
 */
export const toTheme = (value) => (value === 'light' ? 'light' : 'dark');

/**
 * @param {() => Pick<Storage, 'getItem'>} storage A getter, because reading `localStorage` throws when storage is blocked.
 * @returns {Theme}
 */
export const loadTheme = (storage) => {
	try {
		return toTheme(storage().getItem(THEME_STORAGE_KEY));
	} catch {
		return 'dark';
	}
};

/**
 * @param {() => Pick<Storage, 'setItem'>} storage
 * @param {Theme} theme
 */
export const saveTheme = (storage, theme) => {
	try {
		storage().setItem(THEME_STORAGE_KEY, theme);
	} catch {
		// Private mode or blocked storage: the theme still applies for this page.
	}
};

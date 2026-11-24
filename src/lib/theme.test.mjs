import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { loadTheme, saveTheme, THEME_STORAGE_KEY, toTheme } from './theme.mjs';

/** @param {Record<string, string>} [entries] */
const memoryStorage = (entries = {}) => {
	const values = new Map(Object.entries(entries));
	return {
		values,
		/** @param {string} key */
		getItem: (key) => values.get(key) ?? null,
		/** @param {string} key @param {string} value */
		setItem: (key, value) => {
			values.set(key, value);
		},
	};
};

const blocked = () => {
	throw new Error('SecurityError: storage is blocked');
};

test('only "light" is light; anything else, Starlight\'s "auto" included, is the dark default', () => {
	assert.equal(toTheme('light'), 'light');
	for (const value of ['dark', 'auto', 'Light', '', null, undefined]) {
		assert.equal(toTheme(value), 'dark', String(value));
	}
});

test("loadTheme reads the choice under Starlight's key", () => {
	assert.equal(THEME_STORAGE_KEY, 'starlight-theme');
	assert.equal(
		loadTheme(() => memoryStorage({ 'starlight-theme': 'light' })),
		'light',
	);
	assert.equal(
		loadTheme(() => memoryStorage({ 'starlight-theme': 'dark' })),
		'dark',
	);
	assert.equal(
		loadTheme(() => memoryStorage({ theme: 'light' })),
		'dark',
	);
	assert.equal(
		loadTheme(() => memoryStorage()),
		'dark',
	);
});

test('loadTheme falls back to dark when storage or reading it is blocked', () => {
	assert.equal(loadTheme(blocked), 'dark');
	assert.equal(
		loadTheme(() => ({ getItem: blocked })),
		'dark',
	);
});

test("saveTheme stores the choice under Starlight's key", () => {
	const storage = memoryStorage();
	saveTheme(() => storage, 'light');

	assert.deepEqual([...storage.values], [['starlight-theme', 'light']]);
});

test('saveTheme does not throw when storage or writing to it is blocked', () => {
	assert.doesNotThrow(() => saveTheme(blocked, 'light'));
	assert.doesNotThrow(() => saveTheme(() => ({ setItem: blocked }), 'dark'));
});

test('the inline script in ThemeProvider reads the same key, which it cannot import', () => {
	const provider = readFileSync(new URL('../components/ThemeProvider.astro', import.meta.url), 'utf8');

	assert.match(provider, new RegExp(`localStorage\\.getItem\\('${THEME_STORAGE_KEY}'\\)`));
});

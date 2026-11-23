import assert from 'node:assert/strict';
import { test } from 'node:test';
import { countLabel, percent, recentlyVerified, summarizeParts, typeLabel, withBase } from './home.mjs';

/** @param {string} href @returns {import('./home.mjs').NavLink} */
const link = (href) => ({ type: 'link', label: href, href });
/** @param {string} label @param {import('./home.mjs').NavEntry[]} entries @returns {import('./home.mjs').NavGroup} */
const group = (label, entries) => ({ type: 'group', label, entries });

test('withBase joins base and path with exactly one slash', () => {
	assert.equal(withBase('/claude-craft/', 'roadmap/'), '/claude-craft/roadmap/');
	assert.equal(withBase('/claude-craft', '/roadmap/'), '/claude-craft/roadmap/');
	assert.equal(withBase('/claude-craft//', '//roadmap/'), '/claude-craft/roadmap/');
	assert.equal(withBase('/', 'roadmap/'), '/roadmap/');
});

test('summarizeParts makes one summary per top-level group and skips top-level links', () => {
	const sidebar = [
		link('/roadmap/'),
		group('Część I: Fundamenty', [
			group('Fundamenty', [link('/a/'), group('Instalacja', [link('/b/'), link('/c/')]), link('/d/')]),
		]),
		group('Referencja i praktyka', [group('Referencja', [link('/e/')]), group('Laby', [link('/f/')])]),
	];

	assert.deepEqual(summarizeParts(sidebar, new Set(['/b/', '/d/', '/f/', '/roadmap/'])), [
		{ kicker: 'Część I', title: 'Fundamenty', href: '/a/', sections: 1, pages: 4, verified: 2 },
		{ kicker: undefined, title: 'Referencja i praktyka', href: '/e/', sections: 2, pages: 2, verified: 1 },
	]);
});

test('summarizeParts takes the first page depth first, even inside a nested section', () => {
	const sidebar = [group('Część II: Praca', [group('Pamięć', [group('Wstęp', [link('/deep/')]), link('/x/')])])];

	assert.equal(summarizeParts(sidebar, new Set())[0]?.href, '/deep/');
});

test('summarizeParts counts only direct child groups as sections', () => {
	const sidebar = [group('Część III: Mix', [link('/loose/'), group('S1', [link('/a/')]), group('S2', [link('/b/')])])];

	assert.equal(summarizeParts(sidebar, new Set())[0]?.sections, 2);
});

test('summarizeParts skips a group without pages', () => {
	assert.deepEqual(summarizeParts([group('Część IV: Pusta', [group('Nic', [])])], new Set()), []);
});

test('summarizeParts splits the label at the first colon only', () => {
	const [part] = summarizeParts([group('Część V: Git: GitHub', [link('/a/')])], new Set());

	assert.equal(part?.kicker, 'Część V');
	assert.equal(part?.title, 'Git: GitHub');
});

test('recentlyVerified keeps verified pages, newest first, up to the limit', () => {
	/** @param {string} id @param {string} [date] */
	const doc = (id, date) => ({ id, title: id, type: 'how-to', lastVerified: date ? new Date(date) : undefined });
	const docs = [doc('old', '2026-01-01'), doc('none'), doc('new', '2026-03-01'), doc('mid', '2026-02-01')];

	assert.deepEqual(
		recentlyVerified(docs, 2).map((d) => d.id),
		['new', 'mid'],
	);
	assert.deepEqual(
		recentlyVerified(docs, 10).map((d) => d.id),
		['new', 'mid', 'old'],
	);
	assert.deepEqual(recentlyVerified([doc('none')], 3), []);
});

test('recentlyVerified keeps collection order for the same date', () => {
	const date = new Date('2026-05-05');
	const docs = ['a', 'b', 'c'].map((id) => ({ id, title: id, type: 'tutorial', lastVerified: date }));

	assert.deepEqual(
		recentlyVerified(docs, 3).map((d) => d.id),
		['a', 'b', 'c'],
	);
});

test('percent rounds down and treats an empty part as 0', () => {
	assert.equal(percent(0, 12), 0);
	assert.equal(percent(1, 3), 33);
	assert.equal(percent(2, 3), 66);
	assert.equal(percent(199, 200), 99);
	assert.equal(percent(12, 12), 100);
	assert.equal(percent(0, 0), 0);
});

test('typeLabel names every Diátaxis type in Polish and passes an unknown type through', () => {
	assert.equal(typeLabel('tutorial'), 'Tutorial');
	assert.equal(typeLabel('how-to'), 'Poradnik');
	assert.equal(typeLabel('reference'), 'Referencja');
	assert.equal(typeLabel('explanation'), 'Wyjaśnienie');
	assert.equal(typeLabel('toString'), 'toString');
	assert.equal(typeLabel('other'), 'other');
});

test('countLabel picks the Polish noun form for one, few and many', () => {
	const pages = { one: 'strona', few: 'strony', many: 'stron' };

	assert.deepEqual(
		[0, 1, 2, 4, 5, 12, 14, 21, 22, 24, 25, 31, 32, 112, 122].map((n) => countLabel(n, pages)),
		[
			'0 stron',
			'1 strona',
			'2 strony',
			'4 strony',
			'5 stron',
			'12 stron',
			'14 stron',
			'21 stron',
			'22 strony',
			'24 strony',
			'25 stron',
			'31 stron',
			'32 strony',
			'112 stron',
			'122 strony',
		],
	);
	assert.equal(countLabel(1.5, pages), '1.5 strony');
});

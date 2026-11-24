import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	countLabel,
	docHref,
	pagePosition,
	percent,
	recentlyVerified,
	summarizeParts,
	summarizeSidebar,
	totalProgress,
	typeLabel,
	verifiedHrefs,
	withBase,
} from './home.mjs';

/** @param {string} href @returns {import('./home.mjs').NavLink} */
const link = (href) => ({ type: 'link', label: href, href });
/** @param {string} label @param {import('./home.mjs').NavEntry[]} entries @returns {import('./home.mjs').NavGroup} */
const group = (label, entries) => ({ type: 'group', label, entries });
/** @param {string} href @param {boolean} [isCurrent] @returns {import('./home.mjs').NavLink} */
const page = (href, isCurrent = false) => ({ type: 'link', label: href, href, isCurrent });

test('withBase joins base and path with exactly one slash', () => {
	assert.equal(withBase('/claude-craft/', 'roadmap/'), '/claude-craft/roadmap/');
	assert.equal(withBase('/claude-craft', '/roadmap/'), '/claude-craft/roadmap/');
	assert.equal(withBase('/claude-craft//', '//roadmap/'), '/claude-craft/roadmap/');
	assert.equal(withBase('/', 'roadmap/'), '/roadmap/');
});

test('docHref routes a collection id the way Starlight does, with an index page at its folder', () => {
	assert.equal(
		docHref('/claude-craft/', '01-foundations/01-prerequisites'),
		'/claude-craft/01-foundations/01-prerequisites/',
	);
	assert.equal(docHref('/claude-craft/', 'index'), '/claude-craft/');
	assert.equal(docHref('/claude-craft/', '05-labs/index'), '/claude-craft/05-labs/');
	assert.equal(docHref('/', 'index'), '/');
	assert.equal(docHref('/', 'reindex'), '/reindex/');
	assert.equal(docHref('/', 'index-of-tools/index'), '/index-of-tools/');
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
		{ kicker: 'Część I', numeral: 'I', title: 'Fundamenty', href: '/a/', sections: 1, pages: 4, verified: 2 },
		{
			kicker: 'Dodatek',
			numeral: '+',
			title: 'Referencja i praktyka',
			href: '/e/',
			sections: 2,
			pages: 2,
			verified: 1,
		},
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
	assert.equal(part?.numeral, 'V');
	assert.equal(part?.title, 'Git: GitHub');
});

test('summarizeParts takes the last word of the kicker as its numeral, and the whole kicker when it is one word', () => {
	const parts = summarizeParts(
		[group('Część XII: Agenci', [link('/a/')]), group('Aneks: Słownik', [link('/b/')])],
		new Set(),
	);

	assert.deepEqual(
		parts.map(({ kicker, numeral }) => [kicker, numeral]),
		[
			['Część XII', 'XII'],
			['Aneks', 'Aneks'],
		],
	);
});

test('summarizeSidebar counts progress from the docs collection by the freshness rule', () => {
	const sidebar = [group('Część I: A', [link('/base/01-a/'), link('/base/02-b/'), link('/base/03-c/')])];
	const docs = [
		{ id: '01-a', data: { lastVerified: new Date('2026-11-01') } },
		{ id: '02-b', data: { lastVerified: new Date('2026-01-01') } },
		{ id: '03-c', data: {} },
	];

	assert.deepEqual(summarizeSidebar(sidebar, docs, '/base/', new Date('2026-11-21')), [
		{ kicker: 'Część I', numeral: 'I', title: 'A', href: '/base/01-a/', sections: 0, pages: 3, verified: 1 },
	]);
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

test('verifiedHrefs keeps pages whose check is current and builds sidebar hrefs', () => {
	const now = new Date('2026-03-01');
	const docs = [
		{ id: '01-a/01-x', data: { lastVerified: new Date('2026-01-01') } },
		{ id: '01-a/02-y', data: {} },
		{ id: '02-b/01-z', data: { lastVerified: undefined } },
		{ id: 'roadmap', data: { lastVerified: new Date('2026-02-02') } },
		{ id: 'index', data: { lastVerified: new Date('2026-02-03') } },
	];

	assert.deepEqual(
		[...verifiedHrefs(docs, '/claude-craft/', now)],
		['/claude-craft/01-a/01-x/', '/claude-craft/roadmap/', '/claude-craft/'],
	);
});

test('verifiedHrefs drops a page the roadmap table counts as stale, so both show the same progress', () => {
	const now = new Date('2026-11-21');
	const docs = [
		{ id: '01-a/01-day-90', data: { lastVerified: new Date('2026-08-23') } },
		{ id: '01-a/02-day-91', data: { lastVerified: new Date('2026-08-22') } },
	];

	assert.deepEqual([...verifiedHrefs(docs, '/', now)], ['/01-a/01-day-90/']);
});

test('totalProgress sums verified and total pages and starts at zero', () => {
	/** @param {number} verified @param {number} pages */
	const part = (verified, pages) => ({
		kicker: 'K',
		numeral: 'K',
		title: 't',
		href: '/',
		sections: 1,
		pages,
		verified,
	});

	assert.deepEqual(totalProgress([part(1, 12), part(0, 31), part(5, 5)]), { verified: 6, pages: 48 });
	assert.deepEqual(totalProgress([]), { verified: 0, pages: 0 });
});

test('pagePosition counts the current page among all pages, depth first, from 1', () => {
	const sidebar = [
		group('Część I: A', [group('S1', [page('/a/'), group('Inst', [page('/b/'), page('/c/', true)])])]),
		group('Część II: B', [group('S2', [page('/d/')])]),
	];

	assert.deepEqual(pagePosition(sidebar), { index: 3, total: 4 });
});

test('pagePosition finds the first and the last page', () => {
	assert.deepEqual(pagePosition([page('/a/', true), page('/b/')]), { index: 1, total: 2 });
	assert.deepEqual(pagePosition([page('/a/'), page('/b/', true)]), { index: 2, total: 2 });
});

test('pagePosition returns undefined when no page in the sidebar is current', () => {
	assert.equal(pagePosition([page('/a/'), group('S', [page('/b/')])]), undefined);
	assert.equal(pagePosition([]), undefined);
});

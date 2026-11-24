/**
 * Data for the homepage. Pure functions over Starlight's sidebar and the docs collection,
 * so the components stay thin and this logic has tests.
 */

import { verificationStatus } from './verification.mjs';

/** @typedef {{ type: 'link', label: string, href: string, isCurrent?: boolean }} NavLink */
/** @typedef {{ type: 'group', label: string, entries: NavEntry[] }} NavGroup */
/** @typedef {NavLink | NavGroup} NavEntry */

/**
 * @typedef {object} PartSummary
 * @property {string | undefined} kicker For example "Część I". Undefined when the label has no colon.
 * @property {string} title For example "Fundamenty".
 * @property {string} href The first page of the part.
 * @property {number} sections
 * @property {number} pages
 * @property {number} verified Pages whose check is current, by the same rule as the roadmap table.
 */

/**
 * @typedef {object} DocSummary
 * @property {string} id
 * @property {string} title
 * @property {string} type
 * @property {Date | undefined} lastVerified
 */

/**
 * Joins the site base and a path with exactly one slash between them.
 * @param {string} base For example `/claude-craft/` or `/`.
 * @param {string} path For example `roadmap/`.
 */
export const withBase = (base, path) => `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;

/**
 * The URL Starlight serves a docs entry at. An `index` entry lives at its folder:
 * id `index` is the homepage, id `05-labs/index` is `05-labs/`.
 * @param {string} base
 * @param {string} id Collection id, for example `01-foundations/01-prerequisites`.
 */
export const docHref = (base, id) => withBase(base, `${id.replace(/(^|\/)index$/, '')}/`);

/**
 * Hrefs of pages whose check is current on `now` (verification.mjs), in the form the sidebar uses.
 * A page checked more than 90 days ago drops out, as it does from "Aktualne" in the roadmap table.
 * @param {{ id: string, data: { lastVerified?: Date | undefined } }[]} docs
 * @param {string} base
 * @param {Date} now
 * @returns {Set<string>}
 */
export const verifiedHrefs = (docs, base, now) =>
	new Set(
		docs
			.filter((doc) => verificationStatus(doc.data.lastVerified, now) === 'fresh')
			.map((doc) => docHref(base, doc.id)),
	);

/**
 * Verified and total pages across every part.
 * @param {PartSummary[]} parts
 */
export const totalProgress = (parts) =>
	parts.reduce((sum, part) => ({ verified: sum.verified + part.verified, pages: sum.pages + part.pages }), {
		verified: 0,
		pages: 0,
	});

/**
 * Every link under an entry, depth first, in sidebar order.
 * @param {NavEntry} entry
 * @returns {NavLink[]}
 */
const linksOf = (entry) => (entry.type === 'link' ? [entry] : entry.entries.flatMap(linksOf));

/**
 * Position of the current page among all sidebar pages, counted depth first from 1.
 * Undefined when no page is current, for example on the homepage.
 * @param {NavEntry[]} sidebar
 * @returns {{ index: number, total: number } | undefined}
 */
export const pagePosition = (sidebar) => {
	const links = sidebar.flatMap(linksOf);
	const index = links.findIndex((link) => link.isCurrent === true);
	return index === -1 ? undefined : { index: index + 1, total: links.length };
};

/**
 * Splits "Część I: Fundamenty" into a kicker and a title.
 * @param {string} label
 */
const splitLabel = (label) => {
	const colon = label.indexOf(': ');
	return colon === -1
		? { kicker: undefined, title: label }
		: { kicker: label.slice(0, colon), title: label.slice(colon + 2) };
};

/**
 * One summary per top-level group of the sidebar. Top-level links, such as the roadmap, are skipped.
 * @param {NavEntry[]} sidebar
 * @param {ReadonlySet<string>} verified Hrefs of pages whose check is current, from `verifiedHrefs`.
 * @returns {PartSummary[]}
 */
export const summarizeParts = (sidebar, verified) =>
	sidebar.flatMap((entry) => {
		if (entry.type === 'link') {
			return [];
		}
		const links = linksOf(entry);
		const first = links[0];
		if (!first) {
			return [];
		}
		return [
			{
				...splitLabel(entry.label),
				href: first.href,
				sections: entry.entries.filter((child) => child.type === 'group').length,
				pages: links.length,
				verified: links.filter((link) => verified.has(link.href)).length,
			},
		];
	});

/**
 * Pages with `lastVerified`, newest first. Ties keep collection order.
 * @param {DocSummary[]} docs
 * @param {number} limit
 * @returns {(DocSummary & { lastVerified: Date })[]}
 */
export const recentlyVerified = (docs, limit) =>
	docs
		.filter(/** @returns {doc is DocSummary & { lastVerified: Date }} */ (doc) => doc.lastVerified !== undefined)
		.toSorted((a, b) => b.lastVerified.getTime() - a.lastVerified.getTime())
		.slice(0, limit);

/**
 * Whole percent, rounded down, so a part never reads 100% before every page is verified.
 * @param {number} done
 * @param {number} total
 */
export const percent = (done, total) => (total === 0 ? 0 : Math.floor((done / total) * 100));

/** Polish names of the Diátaxis page types, for badges. */
const TYPE_LABELS = /** @type {const} */ ({
	tutorial: 'Tutorial',
	'how-to': 'Poradnik',
	reference: 'Referencja',
	explanation: 'Wyjaśnienie',
});

/**
 * Badge text for a page type. An unknown type falls back to the raw value.
 * @param {string} type
 */
export const typeLabel = (type) =>
	Object.hasOwn(TYPE_LABELS, type) ? TYPE_LABELS[/** @type {keyof typeof TYPE_LABELS} */ (type)] : type;

const polishPlural = new Intl.PluralRules('pl-PL');

/**
 * Which noun form each CLDR plural category takes in Polish. Fractions ("other") take the "few" form:
 * "1,5 strony". Polish never yields "zero" or "two", but the map stays total.
 * @type {Record<Intl.LDMLPluralRule, 'one' | 'few' | 'many'>}
 */
const POLISH_FORM = {
	one: 'one',
	few: 'few',
	many: 'many',
	other: 'few',
	// Stryker disable next-line StringLiteral: Polish never yields "zero", so this value cannot be observed.
	zero: 'many',
	// Stryker disable next-line StringLiteral: Polish never yields "two", so this value cannot be observed.
	two: 'few',
};

/**
 * A count with the right Polish noun form, for example "1 sekcja", "3 sekcje", "12 sekcji", "22 strony".
 * @param {number} count
 * @param {{ one: string, few: string, many: string }} forms
 */
export const countLabel = (count, forms) => `${count} ${forms[POLISH_FORM[polishPlural.select(count)]]}`;

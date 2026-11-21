import { readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DOCS, findPage, listPages, loadStructure, parseYaml, ROADMAP } from './structure.mjs';

/** @import { LocatedPage } from './structure.mjs' */
/**
 * @typedef {'todo' | 'stale' | 'fresh'} Status
 * @typedef {LocatedPage & { status: Status }} ProgressRow
 */

const MAX_AGE_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;
const START = '<!-- progress:start -->';
const END = '<!-- progress:end -->';

class DocsProblem extends Error {}

/** @param {number} ageDays */
const provesRecentCheck = (ageDays) => ageDays >= 0 && ageDays <= MAX_AGE_DAYS;

/**
 * @param {string} markdown
 * @param {Date} now
 * @returns {Status}
 * @internal
 */
export function classify(markdown, now) {
	const text = markdown.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
	const frontmatterWithFileLineNumbers = /^(---\n[\s\S]*?)\n---/.exec(text)?.[1];
	if (frontmatterWithFileLineNumbers === undefined) {
		return 'todo';
	}
	const frontmatter =
		parseYaml(frontmatterWithFileLineNumbers, (reason) => {
			throw new DocsProblem(`frontmatter is not valid YAML. ${reason}.`);
		}) ?? {};
	if (!frontmatter.lastVerified) {
		return 'todo';
	}
	const age = (now.getTime() - new Date(frontmatter.lastVerified).getTime()) / DAY_MS;
	return provesRecentCheck(age) ? 'fresh' : 'stale';
}

/**
 * @param {ProgressRow[]} rows
 * @returns {string}
 * @internal
 */
export function renderProgress(rows) {
	const sections = [...new Set(rows.map((r) => r.section))];
	/** @type {(list: ProgressRow[], status: Status) => number} */
	const count = (list, status) => list.filter((r) => r.status === status).length;
	/** @type {(name: string, list: ProgressRow[]) => string} */
	const line = (name, list) =>
		`| ${name} | ${count(list, 'fresh')} | ${count(list, 'stale')} | ${count(list, 'todo')} |`;
	return [
		'| Sekcja | Aktualne | Do sprawdzenia | Do napisania |',
		'| --- | --- | --- | --- |',
		...sections.map((s) =>
			line(
				s,
				rows.filter((r) => r.section === s),
			),
		),
		`| **Razem** | **${count(rows, 'fresh')}** | **${count(rows, 'stale')}** | **${count(rows, 'todo')}** |`,
	].join('\n');
}

/**
 * @param {string} text
 * @param {string} table
 * @returns {string}
 * @internal
 */
export function writeProgress(text, table) {
	const starts = text.split(START).length - 1;
	const ends = text.split(END).length - 1;
	if (starts !== 1 || ends !== 1) {
		throw new DocsProblem(`${ROADMAP}: needs exactly one ${START} and one ${END}`);
	}
	return text.replace(new RegExp(`${START}[\\s\\S]*?${END}`), () => `${START}\n${table}\n${END}`);
}

/**
 * @param {string} docsDir
 * @param {LocatedPage} page
 * @param {Date} now
 * @returns {ProgressRow}
 */
function readRow(docsDir, page, now) {
	const file = findPage(docsDir, page.path);
	if (!file) {
		throw new DocsProblem(`${page.path}: listed in structure.yaml but missing on disk. Run npm run scaffold.`);
	}
	try {
		return { ...page, status: classify(readFileSync(file, 'utf8'), now) };
	} catch (error) {
		if (error instanceof DocsProblem) {
			throw new DocsProblem(`${relative(docsDir, file)}: ${error.message}`);
		}
		throw error;
	}
}

/**
 * @param {{ docsDir?: string, pages?: LocatedPage[], now?: Date, log?: (line: string) => void }} [options]
 * @returns {0 | 1}
 * @internal
 */
export function runFreshness({
	docsDir = DOCS,
	pages = listPages(loadStructure()),
	now = new Date(),
	log = (line) => process.stdout.write(`${line}\n`),
} = {}) {
	try {
		const rows = pages.map((page) => readRow(docsDir, page, now));
		const roadmap = join(docsDir, ROADMAP);
		const text = readFileSync(roadmap, 'utf8');
		const updated = writeProgress(text, renderProgress(rows));
		for (const row of rows.filter((r) => r.status === 'stale')) {
			log(`Stale: ${row.path}`);
		}
		if (updated !== text) {
			writeFileSync(roadmap, updated);
		}
		log(
			`Fresh: ${rows.filter((r) => r.status === 'fresh').length}/${rows.length}. Progress table in src/content/docs/${ROADMAP}.`,
		);
		return 0;
	} catch (error) {
		if (error instanceof DocsProblem) {
			log(error.message);
			return 1;
		}
		throw error;
	}
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	process.exitCode = runFreshness();
}

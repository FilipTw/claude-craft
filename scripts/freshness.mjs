import { readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { verificationStatus } from '../src/lib/verification.mjs';
import { isRunDirectly } from './cli.mjs';
import { DOCS, DocsProblem, findPage, listPages, loadStructure, parseYaml, ROADMAP } from './structure.mjs';

/** @import { LocatedPage } from './structure.mjs' */
/** @import { VerificationStatus } from '../src/lib/verification.mjs' */
/**
 * @typedef {VerificationStatus} Status
 * @typedef {LocatedPage & { status: Status }} ProgressRow
 */

const START = '<!-- progress:start -->';
const END = '<!-- progress:end -->';
const PROGRESS_BLOCK = new RegExp(`${START}[\\s\\S]*?${END}`);

/**
 * @param {string} markdown
 * @param {Date} now
 * @returns {Status}
 * @internal
 */
export function classify(markdown, now) {
	const text = markdown.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
	const frontmatterWithFileLineNumbers = /^(---\n[\s\S]*?)\n---(?:\n|$)/.exec(text)?.[1];
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
	return verificationStatus(new Date(frontmatter.lastVerified), now);
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
	if (starts !== 1 || ends !== 1 || !PROGRESS_BLOCK.test(text)) {
		throw new DocsProblem(`${ROADMAP}: needs exactly one ${START} followed by one ${END}`);
	}
	return text.replace(PROGRESS_BLOCK, () => `${START}\n${table}\n${END}`);
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
 * @param {{ docsDir?: string, manifest?: string | URL, pages?: LocatedPage[], now?: Date, log?: (line: string) => void, error?: (line: string) => void }} [options]
 * `log` gets the report (stdout by default), `error` each problem that makes the exit code 1 (stderr by default).
 * @returns {0 | 1}
 * @internal
 */
export function runFreshness({
	docsDir = DOCS,
	manifest,
	pages,
	now = new Date(),
	log = (line) => process.stdout.write(`${line}\n`),
	error = (line) => process.stderr.write(`${line}\n`),
} = {}) {
	try {
		const rows = (pages ?? listPages(loadStructure(manifest))).map((page) => readRow(docsDir, page, now));
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
	} catch (problem) {
		if (problem instanceof DocsProblem) {
			error(problem.message);
			return 1;
		}
		throw problem;
	}
}

if (isRunDirectly(import.meta.url)) {
	process.exitCode = runFreshness();
}

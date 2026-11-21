// Reports which pages are fresh, stale (lastVerified older than 90 days), or not written yet (no lastVerified).
// Writes the progress table into roadmap.md between the progress markers.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { DOCS, findPage, listPages, loadStructure } from './structure.mjs';

/** @import { Page } from './structure.mjs' */
/**
 * @typedef {'todo' | 'stale' | 'fresh'} Status
 * @typedef {Page & { status: Status }} ProgressRow
 */

const MAX_AGE_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;
const START = '<!-- progress:start -->';
const END = '<!-- progress:end -->';

/**
 * @param {string} markdown
 * @param {Date} now
 * @returns {Status}
 * @internal
 */
export function classify(markdown, now) {
	const text = markdown.replace(/^﻿/, '').replace(/\r\n/g, '\n');
	const frontmatter = parse(/^---\n([\s\S]*?)\n---/.exec(text)?.[1] ?? '') ?? {};
	if (!frontmatter.lastVerified) {
		return 'todo';
	}
	const age = (now.getTime() - new Date(frontmatter.lastVerified).getTime()) / DAY_MS;
	// An unreadable or future date is not proof of a check, so it needs checking.
	if (!(age >= 0 && age <= MAX_AGE_DAYS)) {
		return 'stale';
	}
	return 'fresh';
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
		'|---|---|---|---|',
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
		throw new Error(`roadmap.md needs exactly one ${START} and one ${END}`);
	}
	return text.replace(new RegExp(`${START}[\\s\\S]*?${END}`), () => `${START}\n${table}\n${END}`);
}

/**
 * @param {{ docsDir?: string, pages?: Page[], now?: Date, log?: (line: string) => void }} [options]
 * @returns {ProgressRow[]}
 * @internal
 */
export function runFreshness({
	docsDir = DOCS,
	pages = listPages(loadStructure()),
	now = new Date(),
	log = (line) => process.stdout.write(`${line}\n`),
} = {}) {
	const rows = pages.map((page) => {
		const file = findPage(docsDir, page.path);
		if (!file) {
			throw new Error(`${page.path} is in structure.yaml but missing on disk. Run npm run scaffold`);
		}
		return { ...page, status: classify(readFileSync(file, 'utf8'), now) };
	});
	for (const row of rows.filter((r) => r.status === 'stale')) {
		log(`Do sprawdzenia: ${row.path}`);
	}
	const roadmap = join(docsDir, 'roadmap.md');
	const text = readFileSync(roadmap, 'utf8');
	const updated = writeProgress(text, renderProgress(rows));
	if (updated !== text) {
		writeFileSync(roadmap, updated);
	}
	log(
		`Aktualne: ${rows.filter((r) => r.status === 'fresh').length}/${rows.length}. Tabela postępu w src/content/docs/roadmap.md.`,
	);
	return rows;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	runFreshness();
}

// Reports which pages are fresh, stale (lastVerified older than 90 days), or not written yet (no lastVerified).
// Writes the progress table into roadmap.md between the progress markers.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { loadStructure } from './structure.mjs';

const MAX_AGE_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DOCS = join(ROOT, 'src/content/docs');
const START = '<!-- progress:start -->';
const END = '<!-- progress:end -->';

export function classify(markdown, now) {
	const frontmatter = parse(/^---\n([\s\S]*?)\n---/.exec(markdown)?.[1] ?? '') ?? {};
	if (!frontmatter.lastVerified) return 'todo';
	const age = (now - new Date(frontmatter.lastVerified)) / DAY_MS;
	return age > MAX_AGE_DAYS ? 'stale' : 'fresh';
}

export function renderProgress(rows) {
	const sections = [...new Set(rows.map((r) => r.section))];
	const count = (list, status) => list.filter((r) => r.status === status).length;
	const line = (name, list) => `| ${name} | ${count(list, 'fresh')} | ${count(list, 'stale')} | ${count(list, 'todo')} |`;
	return [
		'| Sekcja | Aktualne | Do sprawdzenia | Do napisania |',
		'|---|---|---|---|',
		...sections.map((s) => line(s, rows.filter((r) => r.section === s))),
		`| **Razem** | **${count(rows, 'fresh')}** | **${count(rows, 'stale')}** | **${count(rows, 'todo')}** |`,
	].join('\n');
}

function collectRows(structure, now) {
	const rows = [];
	const walk = (items, base, section) => {
		for (const item of items) {
			if (item.dir) walk(item.items, `${base}${item.dir}/`, section ?? item.label);
			else {
				const path = `${base}${item.file}`;
				rows.push({ path, section, status: classify(readFileSync(join(DOCS, `${path}.md`), 'utf8'), now) });
			}
		}
	};
	for (const part of structure.parts) walk(part.sections, '', undefined);
	return rows;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const rows = collectRows(loadStructure(), new Date());
	for (const row of rows.filter((r) => r.status === 'stale')) console.log(`Do sprawdzenia: ${row.path}`);
	const roadmap = join(DOCS, 'roadmap.md');
	const text = readFileSync(roadmap, 'utf8');
	const updated = text.replace(new RegExp(`${START}[\\s\\S]*${END}`), `${START}\n${renderProgress(rows)}\n${END}`);
	if (updated !== text) writeFileSync(roadmap, updated);
	const done = rows.filter((r) => r.status === 'fresh').length;
	console.log(`Aktualne: ${done}/${rows.length}. Tabela postępu w src/content/docs/roadmap.md.`);
}

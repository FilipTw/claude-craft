import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
	copyFileSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	statSync,
	symlinkSync,
	utimesSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { classify, renderProgress, runFreshness, writeProgress } from './freshness.mjs';
import { ROOT } from './structure.mjs';

/** @import { ProgressRow, Status } from './freshness.mjs' */
/** @import { LocatedPage } from './structure.mjs' */

const now = new Date('2026-11-21');
/** @param {string} date */
const verified = (date) => `---\ntitle: A\nlastVerified: ${date}\n---\n`;
/** @type {(section: string, status: Status) => ProgressRow} */
const row = (section, status) => ({ path: '01-x', title: 'X', type: 'explanation', section, status });

const scratch = mkdtempSync(join(tmpdir(), 'cc-'));
after(() => rmSync(scratch, { recursive: true, force: true }));
const tempDir = () => mkdtempSync(join(scratch, 'case-'));

test('a page without lastVerified or without frontmatter is todo', () => {
	assert.equal(classify('---\ntitle: A\ntype: explanation\n---\n', now), 'todo');
	assert.equal(classify('# Strona\n', now), 'todo');
});

test('only a block at the top of the page is frontmatter, not text between two rules', () => {
	assert.equal(classify('# Strona\n\n---\n\nlastVerified: 2026-11-01\n\n---\n', now), 'todo');
});

test('the frontmatter ends at a line of exactly three dashes, also at the end of the file', () => {
	assert.equal(classify('---\ntitle: A\nlastVerified: 2026-11-01\n----\n', now), 'todo');
	assert.equal(classify('---\ntitle: A\nlastVerified: 2026-11-01\n---text\n', now), 'todo');
	assert.equal(classify('---\ntitle: A\nlastVerified: 2026-11-01\n---', now), 'fresh');
});

test('a page is fresh from the day it is verified up to exactly 90 days, and stale from day 91', () => {
	assert.equal(classify(verified('2026-11-21'), now), 'fresh');
	assert.equal(classify(verified('2026-08-23'), now), 'fresh');
	assert.equal(classify(verified('2026-08-22'), now), 'stale');
});

test('reads frontmatter with CRLF line endings and a BOM', () => {
	assert.equal(classify('\uFEFF---\r\ntitle: A\r\nlastVerified: 2020-01-01\r\n---\r\n', now), 'stale');
});

test('only a BOM at the very start is dropped: as in Astro, "---" after a zero-width character does not close frontmatter', () => {
	const hiddenCharacterBeforeClosingFence = '---\ntitle: A\nlastVerified: 2026-11-01\n﻿---\n';

	assert.equal(classify(hiddenCharacterBeforeClosingFence, now), 'todo');
});

test('an invalid or future date needs checking, never counts as fresh', () => {
	assert.equal(classify(verified('wczoraj'), now), 'stale');
	assert.equal(classify(verified('2099-01-01'), now), 'stale');
});

test('renderProgress counts each status in its own column, per section and in total', () => {
	const rows = [
		row('Hooki', 'fresh'),
		row('Hooki', 'fresh'),
		row('Hooki', 'todo'),
		row('MCP', 'stale'),
		row('MCP', 'todo'),
		row('MCP', 'todo'),
		row('MCP', 'todo'),
	];
	assert.equal(
		renderProgress(rows),
		[
			'| Sekcja | Aktualne | Do sprawdzenia | Do napisania |',
			'| --- | --- | --- | --- |',
			'| Hooki | 2 | 0 | 1 |',
			'| MCP | 0 | 1 | 3 |',
			'| **Razem** | **2** | **1** | **4** |',
		].join('\n'),
	);
});

test('writeProgress replaces only the text between the markers, keeping $ patterns literal', () => {
	const text = 'a\n<!-- progress:start -->\nold\n<!-- progress:end -->\nb\n';
	assert.equal(writeProgress(text, 'new $& $$'), 'a\n<!-- progress:start -->\nnew $& $$\n<!-- progress:end -->\nb\n');
});

test('writeProgress fails unless there is exactly one start marker followed by one end marker', () => {
	for (const text of [
		'no markers',
		'<!-- progress:start -->\n<!-- progress:end -->\n'.repeat(2),
		'<!-- progress:start -->\nold\n',
		'old\n<!-- progress:end -->\n',
		'<!-- progress:end -->\nold\n<!-- progress:start -->\n',
		'<!-- progress:start -->\n<!-- progress:end -->\n<!-- progress:end -->\n',
		'<!-- progress:start -->\n<!-- progress:start -->\n<!-- progress:end -->\n',
	]) {
		assert.throws(() => writeProgress(text, 't'), {
			message: 'roadmap.md: needs exactly one <!-- progress:start --> followed by one <!-- progress:end -->',
		});
	}
});

test('runFreshness groups by top-level section and writes the table into roadmap.md', () => {
	const docs = tempDir();
	writeFileSync(join(docs, 'roadmap.md'), 'x\n<!-- progress:start -->\n<!-- progress:end -->\n');
	writeFileSync(join(docs, '01-a.md'), verified('2026-11-01'));
	writeFileSync(join(docs, '02-b.md'), '---\ntitle: B\n---\n');
	/** @type {LocatedPage[]} */
	const pages = [
		{ path: '01-a', title: 'A', type: 'explanation', section: 'Hooki' },
		{ path: '02-b', title: 'B', type: 'explanation', section: 'Hooki' },
	];
	runFreshness({ docsDir: docs, pages, now, log: () => undefined });
	assert.match(readFileSync(join(docs, 'roadmap.md'), 'utf8'), /\| Hooki \| 1 \| 0 \| 1 \|/);
});

test('runFreshness prints each stale page and the fresh count on stdout by default', (t) => {
	const docs = tempDir();
	writeFileSync(join(docs, 'roadmap.md'), '<!-- progress:start -->\n<!-- progress:end -->\n');
	writeFileSync(join(docs, '01-a.md'), verified('2026-01-01'));
	writeFileSync(join(docs, '02-b.md'), verified('2026-11-01'));
	writeFileSync(join(docs, '03-c.md'), '---\ntitle: C\n---\n');
	/** @type {LocatedPage[]} */
	const pages = [
		{ path: '01-a', title: 'A', type: 'explanation', section: 'Hooki' },
		{ path: '02-b', title: 'B', type: 'explanation', section: 'Hooki' },
		{ path: '03-c', title: 'C', type: 'explanation', section: 'Hooki' },
	];
	const write = t.mock.method(process.stdout, 'write', () => true);
	const code = runFreshness({ docsDir: docs, pages, now });
	write.mock.restore();
	assert.equal(code, 0);
	assert.deepEqual(
		write.mock.calls.map((call) => call.arguments[0]),
		['Stale: 01-a\n', 'Fresh: 1/3. Progress table in src/content/docs/roadmap.md.\n'],
	);
});

test('runFreshness prints a docs problem on stderr by default, so stdout stays empty', (t) => {
	const docs = tempDir();
	const out = t.mock.method(process.stdout, 'write', () => true);
	const err = t.mock.method(process.stderr, 'write', () => true);
	const code = runFreshness({
		docsDir: docs,
		pages: [{ path: '01-x', title: 'X', type: 'explanation', section: 'A' }],
		now,
	});
	out.mock.restore();
	err.mock.restore();

	assert.equal(code, 1);
	assert.equal(out.mock.callCount(), 0);
	assert.deepEqual(
		err.mock.calls.map((call) => call.arguments[0]),
		['01-x: listed in structure.yaml but missing on disk. Run npm run scaffold.\n'],
	);
});

test('runFreshness leaves an up-to-date roadmap.md untouched', () => {
	const docs = tempDir();
	const roadmap = join(docs, 'roadmap.md');
	writeFileSync(roadmap, '<!-- progress:start -->\n<!-- progress:end -->\n');
	writeFileSync(join(docs, '01-a.md'), verified('2026-11-01'));
	/** @type {LocatedPage[]} */
	const pages = [{ path: '01-a', title: 'A', type: 'explanation', section: 'Hooki' }];
	runFreshness({ docsDir: docs, pages, now, log: () => undefined });
	const past = new Date('2020-01-01');
	utimesSync(roadmap, past, past);
	runFreshness({ docsDir: docs, pages, now, log: () => undefined });
	assert.equal(statSync(roadmap).mtimeMs, past.getTime());
});

/**
 * @param {string} docs
 * @param {LocatedPage[]} pages
 * @returns {{ code: 0 | 1, lines: string[] }}
 */
const runQuiet = (docs, pages) => {
	/** @type {string[]} */
	const lines = [];
	const code = runFreshness({
		docsDir: docs,
		pages,
		now,
		log: (line) => lines.push(line),
		error: (line) => lines.push(line),
	});
	return { code, lines };
};

test('runFreshness names a page that is in the manifest but missing on disk and exits 1', () => {
	const docs = tempDir();
	writeFileSync(join(docs, 'roadmap.md'), '<!-- progress:start -->\n<!-- progress:end -->\n');
	assert.deepEqual(runQuiet(docs, [{ path: '01-gone', title: 'G', type: 'explanation', section: 'X' }]), {
		code: 1,
		lines: ['01-gone: listed in structure.yaml but missing on disk. Run npm run scaffold.'],
	});
});

test('runFreshness names a page whose frontmatter is not valid YAML and exits 1 without touching roadmap.md', () => {
	const docs = tempDir();
	const roadmap = '<!-- progress:start -->\nold\n<!-- progress:end -->\n';
	writeFileSync(join(docs, 'roadmap.md'), roadmap);
	writeFileSync(join(docs, '01-a.mdx'), '---\ntitle: Hooki: zdarzenia\n---\n');
	assert.deepEqual(runQuiet(docs, [{ path: '01-a', title: 'A', type: 'explanation', section: 'X' }]), {
		code: 1,
		lines: [
			'01-a.mdx: frontmatter is not valid YAML. Nested mappings are not allowed in compact mappings at line 2, column 8.',
		],
	});
	assert.equal(readFileSync(join(docs, 'roadmap.md'), 'utf8'), roadmap);
});

test('runFreshness names a page whose frontmatter alias has no anchor or expands too far, and exits 1', () => {
	const tenTimes = (/** @type {string} */ value) => `[${Array(10).fill(value).join(', ')}]`;
	const bomb = `a: &a ${tenTimes('x')}\nb: &b ${tenTimes('*a')}\nc: &c ${tenTimes('*b')}\nd: ${tenTimes('*c')}`;
	/** @type {Array<[string, string]>} */
	const cases = [
		['title: A\nsources: *x', 'Unresolved alias (the anchor must be set before the alias): x'],
		[bomb, 'Excessive alias count indicates a resource exhaustion attack'],
	];
	for (const [frontmatter, reason] of cases) {
		const docs = tempDir();
		writeFileSync(join(docs, 'roadmap.md'), '<!-- progress:start -->\n<!-- progress:end -->\n');
		writeFileSync(join(docs, '01-a.md'), `---\n${frontmatter}\n---\n`);
		assert.deepEqual(runQuiet(docs, [{ path: '01-a', title: 'A', type: 'explanation', section: 'X' }]), {
			code: 1,
			lines: [`01-a.md: frontmatter is not valid YAML. ${reason}.`],
		});
	}
});

test('runFreshness names roadmap.md when its progress markers are wrong and exits 1 before any other line', () => {
	for (const roadmap of ['no markers\n', '<!-- progress:end -->\n<!-- progress:start -->\n']) {
		const docs = tempDir();
		writeFileSync(join(docs, 'roadmap.md'), roadmap);
		writeFileSync(join(docs, '01-a.md'), verified('2020-01-01'));
		assert.deepEqual(runQuiet(docs, [{ path: '01-a', title: 'A', type: 'explanation', section: 'X' }]), {
			code: 1,
			lines: ['roadmap.md: needs exactly one <!-- progress:start --> followed by one <!-- progress:end -->'],
		});
	}
});

test('runFreshness prints the structure.yaml problem as one line and exits 1', () => {
	const docs = tempDir();
	const manifest = join(docs, 'structure.yaml');
	writeFileSync(manifest, 'parts:\n  - label: A\n    sections:\n      - { file: 01-a, titel: A }\n');
	/** @type {string[]} */
	const lines = [];
	assert.equal(
		runFreshness({ docsDir: docs, manifest, now, log: (line) => lines.push(line), error: (line) => lines.push(line) }),
		1,
	);
	assert.deepEqual(lines, ['structure.yaml: "01-a" has unknown keys titel. Quote titles that contain a comma']);
});

test('runFreshness lets an error that is not a docs problem through with its stack', () => {
	const docs = tempDir();
	writeFileSync(join(docs, 'roadmap.md'), '<!-- progress:start -->\n<!-- progress:end -->\n');
	mkdirSync(join(docs, '01-a.md'));
	assert.throws(() => runQuiet(docs, [{ path: '01-a', title: 'A', type: 'explanation', section: 'X' }]), {
		code: 'EISDIR',
	});
});

const ROADMAP_BEFORE = '# Ścieżka\n\n<!-- progress:start -->\n<!-- progress:end -->\n';

/**
 * A copy of the files the CLI runs, with a one-page manifest, in a temporary folder.
 * The CLI writes roadmap.md, so it runs there and never touches this repo.
 */
const cliProject = () => {
	const root = tempDir();
	for (const file of [
		'scripts/freshness.mjs',
		'scripts/cli.mjs',
		'scripts/structure.mjs',
		'src/lib/verification.mjs',
	]) {
		mkdirSync(dirname(join(root, file)), { recursive: true });
		copyFileSync(join(ROOT, file), join(root, file));
	}
	symlinkSync(join(ROOT, 'node_modules'), join(root, 'node_modules'), 'junction');
	writeFileSync(
		join(root, 'scripts/structure.yaml'),
		"parts:\n  - label: 'Część I: A'\n    sections:\n      - dir: 01-a\n        label: A\n        items:\n          - file: 01-one\n            title: Jeden\n",
	);
	const docs = join(root, 'src/content/docs');
	mkdirSync(join(docs, '01-a'), { recursive: true });
	writeFileSync(join(docs, '01-a/01-one.md'), '---\ntitle: Jeden\ntype: explanation\n---\n');
	writeFileSync(join(docs, 'roadmap.md'), ROADMAP_BEFORE);
	return { cli: join(root, 'scripts/freshness.mjs'), roadmap: join(docs, 'roadmap.md') };
};

test('the CLI behind npm run freshness writes the progress table of its own project and exits 0', () => {
	const { cli, roadmap } = cliProject();

	const result = spawnSync(process.execPath, [cli], { encoding: 'utf8' });

	assert.equal(result.status, 0);
	assert.equal(result.stdout, 'Fresh: 0/1. Progress table in src/content/docs/roadmap.md.\n');
	assert.match(readFileSync(roadmap, 'utf8'), /<!-- progress:start -->\n\| .+\n[\s\S]*<!-- progress:end -->/);
});

test('importing freshness.mjs does not run the CLI, so a test cannot rewrite roadmap.md', () => {
	const { cli, roadmap } = cliProject();
	const importOnly = `await import(${JSON.stringify(pathToFileURL(cli).href)});`;

	const result = spawnSync(process.execPath, ['--input-type=module', '--eval', importOnly], { encoding: 'utf8' });

	assert.equal(result.status, 0);
	assert.equal(result.stdout, '');
	assert.equal(readFileSync(roadmap, 'utf8'), ROADMAP_BEFORE);
});

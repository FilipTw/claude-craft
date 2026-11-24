import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
	copyFileSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { parse } from 'yaml';
import { runScaffold, scaffold } from './scaffold.mjs';
import { PAGE_TYPES, ROOT } from './structure.mjs';

/** @import { LocatedPage, PageType } from './structure.mjs' */

/** @type {LocatedPage[]} */
const pages = [
	{ path: '01-a/01-one', title: 'Jeden', type: 'explanation', section: 'A' },
	{ path: '01-a/02-b/01-two', title: 'Dwa: "cytat"', type: 'how-to', section: 'A' },
];
const header = '---\ntitle: {{title}}\ntype: {{type}}\n---\n';
/** @type {Record<PageType, string>} */
const templates = {
	tutorial: header,
	'how-to': `${header}## Kroki\n`,
	reference: header,
	explanation: header,
};
const silent = () => undefined;

const scratch = mkdtempSync(join(tmpdir(), 'cc-'));
after(() => rmSync(scratch, { recursive: true, force: true }));
const tempDir = () => mkdtempSync(join(scratch, 'case-'));

test('creates missing pages from the template of their type', () => {
	const docs = tempDir();
	const { created } = scaffold({ docsDir: docs, pages, templates });
	assert.deepEqual(created, ['01-a/01-one', '01-a/02-b/01-two']);
	assert.equal(
		readFileSync(join(docs, '01-a/02-b/01-two.md'), 'utf8'),
		'---\ntitle: "Dwa: \\"cytat\\""\ntype: how-to\n---\n## Kroki\n',
	);
});

test('second run creates nothing and keeps edited pages', () => {
	const docs = tempDir();
	scaffold({ docsDir: docs, pages, templates });
	writeFileSync(join(docs, '01-a/01-one.md'), 'edited');
	const { created } = scaffold({ docsDir: docs, pages, templates });
	assert.deepEqual(created, []);
	assert.equal(readFileSync(join(docs, '01-a/01-one.md'), 'utf8'), 'edited');
});

test('writes titles with $ patterns verbatim', () => {
	const docs = tempDir();
	scaffold({
		docsDir: docs,
		pages: [{ path: '01-x', title: "Koszt $' i $& $$", type: 'explanation', section: 'X' }],
		templates,
	});
	assert.match(readFileSync(join(docs, '01-x.md'), 'utf8'), /^title: "Koszt \$' i \$& \$\$"$/m);
});

test('treats an existing .mdx page as present', () => {
	const docs = tempDir();
	mkdirSync(join(docs, '01-a'), { recursive: true });
	writeFileSync(join(docs, '01-a/01-one.mdx'), 'x');
	const { created } = scaffold({ docsDir: docs, pages: pages.slice(0, 1), templates });
	assert.deepEqual(created, []);
	assert.equal(existsSync(join(docs, '01-a/01-one.md')), false);
});

test('runScaffold fills the real template of every page type with the manifest title and type', () => {
	const docs = tempDir();
	const title = 'Hooki: "PreToolUse" #1';
	/** @type {LocatedPage[]} */
	const typed = PAGE_TYPES.map((type, index) => ({ path: `0${index + 1}-${type}`, title, type, section: 'A' }));
	runScaffold({ docsDir: docs, pages: typed, log: silent });
	for (const page of typed) {
		const text = readFileSync(join(docs, `${page.path}.md`), 'utf8');
		const frontmatter = parse(/^---\n([\s\S]*?)\n---\n/.exec(text)?.[1] ?? '');
		assert.partialDeepStrictEqual(frontmatter, { title, type: page.type });
	}
});

test('runScaffold prints the created count and each orphan on stdout by default', (t) => {
	const docs = tempDir();
	writeFileSync(join(docs, '09-stray.md'), 'x');
	const write = t.mock.method(process.stdout, 'write', () => true);
	const code = runScaffold({ docsDir: docs, pages });
	write.mock.restore();
	assert.equal(code, 1);
	assert.deepEqual(
		write.mock.calls.map((call) => call.arguments[0]),
		['Pages created: 2.\n', 'Outside the manifest: 09-stray.md. Add it to scripts/structure.yaml.\n'],
	);
});

test('runScaffold exits 0 on a clean tree and 1 when a file is outside the manifest', () => {
	const docs = tempDir();
	assert.equal(runScaffold({ docsDir: docs, pages, log: silent }), 0);
	writeFileSync(join(docs, '01-a/09-stray.md'), 'x');
	assert.equal(runScaffold({ docsDir: docs, pages, log: silent }), 1);
});

test('runScaffold prints the structure.yaml problem as one line and exits 1', () => {
	const docs = tempDir();
	const manifest = join(docs, 'structure.yaml');
	writeFileSync(manifest, 'parts:\n  - label: A\n    sections:\n      - { file: 01-a, titel: A }\n');
	/** @type {string[]} */
	const lines = [];
	assert.equal(runScaffold({ docsDir: docs, manifest, log: (line) => lines.push(line) }), 1);
	assert.deepEqual(lines, ['structure.yaml: "01-a" has unknown keys titel. Quote titles that contain a comma']);
});

test('runScaffold lets an error that is not a docs problem through with its stack', () => {
	const docs = tempDir();
	writeFileSync(join(docs, '01-a'), 'a file where the folder should be');
	assert.throws(() => runScaffold({ docsDir: docs, pages, log: silent }), { code: 'EEXIST' });
});

/**
 * A copy of the files the CLI runs, with a one-page manifest and no pages yet, in a temporary folder.
 * The CLI creates pages, so it runs there and never touches this repo.
 */
const cliProject = () => {
	const root = tempDir();
	const files = ['scripts/scaffold.mjs', 'scripts/cli.mjs', 'scripts/structure.mjs'];
	for (const file of [...files, ...PAGE_TYPES.map((type) => `scripts/page-templates/${type}.md`)]) {
		mkdirSync(dirname(join(root, file)), { recursive: true });
		copyFileSync(join(ROOT, file), join(root, file));
	}
	symlinkSync(join(ROOT, 'node_modules'), join(root, 'node_modules'), 'junction');
	writeFileSync(
		join(root, 'scripts/structure.yaml'),
		"parts:\n  - label: 'Część I: A'\n    sections:\n      - dir: 01-a\n        label: A\n        items:\n          - file: 01-one\n            title: Jeden\n",
	);
	mkdirSync(join(root, 'src/content/docs'), { recursive: true });
	return { cli: join(root, 'scripts/scaffold.mjs'), page: join(root, 'src/content/docs/01-a/01-one.md') };
};

test('the CLI behind npm run scaffold creates the missing pages of its own project and exits 0', () => {
	const { cli, page } = cliProject();

	const result = spawnSync(process.execPath, [cli], { encoding: 'utf8' });

	assert.equal(result.status, 0);
	assert.equal(result.stdout, 'Pages created: 1.\n');
	assert.match(readFileSync(page, 'utf8'), /^---\ntitle: "Jeden"\ntype: explanation\n/);
});

test('importing scaffold.mjs does not run the CLI, so a test cannot create pages', () => {
	const { cli, page } = cliProject();
	const importOnly = `await import(${JSON.stringify(pathToFileURL(cli).href)});`;

	const result = spawnSync(process.execPath, ['--input-type=module', '--eval', importOnly], { encoding: 'utf8' });

	assert.equal(result.status, 0);
	assert.equal(result.stdout, '');
	assert.equal(existsSync(page), false);
});

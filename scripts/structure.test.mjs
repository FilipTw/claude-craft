import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import {
	DOCS,
	findOrphans,
	findPage,
	listPages,
	loadStructure,
	PAGES_OUTSIDE_MANIFEST,
	parseStructure,
	toSidebar,
} from './structure.mjs';

/** @import { LocatedPage } from './structure.mjs' */

const scratch = mkdtempSync(join(tmpdir(), 'cc-'));
after(() => rmSync(scratch, { recursive: true, force: true }));
const tempDir = () => mkdtempSync(join(scratch, 'case-'));

const valid = `
parts:
  - label: Część I
    sections:
      - dir: 01-basics
        label: Podstawy
        items:
          - { file: 01-intro, title: Wstęp }
          - dir: 02-install
            label: Instalacja
            items:
              - { file: 01-macos, title: macOS, type: how-to }
          - { file: 03-first, title: Pierwsza sesja, type: tutorial }
`;

test('listPages flattens the tree with paths, default type and top-level section', () => {
	assert.deepEqual(listPages(parseStructure(valid)), [
		{ path: '01-basics/01-intro', title: 'Wstęp', type: 'explanation', section: 'Podstawy' },
		{ path: '01-basics/02-install/01-macos', title: 'macOS', type: 'how-to', section: 'Podstawy' },
		{ path: '01-basics/03-first', title: 'Pierwsza sesja', type: 'tutorial', section: 'Podstawy' },
	]);
});

test('a page listed directly in a part is its own section', () => {
	const flat = 'parts:\n  - label: Część I\n    sections:\n      - { file: 01-faq, title: FAQ }\n';
	assert.deepEqual(listPages(parseStructure(flat)), [
		{ path: '01-faq', title: 'FAQ', type: 'explanation', section: 'FAQ' },
	]);
});

test('toSidebar keeps manifest order and Polish labels', () => {
	assert.deepEqual(toSidebar(parseStructure(valid)), [
		{
			label: 'Część I',
			items: [
				{
					label: 'Podstawy',
					collapsed: true,
					items: [
						'01-basics/01-intro',
						{ label: 'Instalacja', collapsed: true, items: ['01-basics/02-install/01-macos'] },
						'01-basics/03-first',
					],
				},
			],
		},
	]);
});

test('rejects a file or folder name that is not NN-kebab-case', () => {
	for (const name of ['intro', '1-intro', 'x01-intro', '01-Intro', '01-intro_x']) {
		assert.throws(() => parseStructure(valid.replace('01-intro', name)), {
			message: `structure.yaml: "01-basics/${name}" must look like 01-kebab-case`,
		});
	}
});

test('rejects prefixes out of order', () => {
	assert.throws(() => parseStructure(valid.replace('03-first', '02-first')), {
		message: 'structure.yaml: "01-basics/02-first" prefix must be greater than the one before it',
	});
});

test('rejects an unquoted title with commas, which YAML splits into extra keys', () => {
	assert.throws(() => parseStructure(valid.replace('title: Wstęp', 'title: Wstęp, cel, zakres')), {
		message: 'structure.yaml: "01-basics/01-intro" has unknown keys cel, zakres. Quote titles that contain a comma',
	});
});

test('rejects a page without a title', () => {
	assert.throws(() => parseStructure(valid.replace(', title: Wstęp', '')), /01-intro/);
});

test('rejects the same section prefix reused in a later part', () => {
	const twoParts = `${valid}\n  - label: Część II\n    sections:\n      - { file: 01-other, title: Inna }\n`;
	assert.throws(() => parseStructure(twoParts), {
		message: 'structure.yaml: "01-other" prefix must be greater than the one before it',
	});
});

test('rejects bad shapes with a structure.yaml message', () => {
	assert.throws(() => parseStructure(''), /structure\.yaml/);
	assert.throws(() => parseStructure('partz: []'), /partz/);
	assert.throws(() => parseStructure(valid.replace('label: Część I', 'lable: Część I')), /lable/);
	assert.throws(
		() =>
			parseStructure(valid.replace('label: Instalacja\n            items:', 'label: Instalacja\n            itemz:')),
		/itemz/,
	);
});

test('an error tells the editor where structure.yaml is wrong and what that place needs', () => {
	const install = 'items:\n              - { file: 01-macos, title: macOS, type: how-to }';
	/** @type {Array<[string, string]>} */
	const cases = [
		['- parts', '"(root)" must be a mapping'],
		['parts: []', '"(root)" needs a non-empty list "parts"'],
		['parts:\n  - Część I', '"parts[0]" must be a mapping'],
		[
			'parts:\n  - label: A: B\n',
			'"(root)" is not valid YAML. Nested mappings are not allowed in compact mappings at line 2, column 12',
		],
		['parts: *x', '"(root)" is not valid YAML. Unresolved alias (the anchor must be set before the alias): x'],
		['parts:\n  - { label: Część I, sections: [~] }', '"[0]" must look like 01-kebab-case'],
		['parts:\n  - { label: Część I, sections: [] }', '"parts[0]" needs a non-empty list "sections"'],
		[valid.replace('label: Część I', "label: ''"), '"parts[0]" needs a text "label"'],
		[valid.replace(install, 'items: []'), '"01-basics/02-install" needs a non-empty list "items"'],
		[valid.replace('title: Wstęp', "title: ''"), '"01-basics/01-intro" needs a text "title"'],
		[
			valid.replace('{ file: 01-intro, title: Wstęp }', '{ title: Wstęp }'),
			'"01-basics/[0]" must look like 01-kebab-case',
		],
	];
	for (const [text, problem] of cases) {
		assert.throws(() => parseStructure(text), { message: `structure.yaml: ${problem}` });
	}
});

test('rejects a folder or file name written as a YAML list and says the name must be text', () => {
	assert.throws(() => parseStructure(valid.replace('dir: 01-basics', 'dir: [01-basics]')), {
		message: 'structure.yaml: "[0]" needs a text "dir"',
	});
	assert.throws(() => parseStructure(valid.replace('file: 01-intro', 'file: [01-intro]')), {
		message: 'structure.yaml: "01-basics/[0]" needs a text "file"',
	});
});

test('rejects an unknown page type', () => {
	assert.throws(() => parseStructure(valid.replace('type: tutorial', 'type: guide')), /guide/);
});

test('findPage finds .md and .mdx pages', () => {
	const docs = tempDir();
	writeFileSync(join(docs, '01-a.mdx'), 'x');
	assert.equal(findPage(docs, '01-a'), join(docs, '01-a.mdx'));
	assert.equal(findPage(docs, '02-b'), undefined);
});

test('findOrphans lists sorted Markdown files that are not in the manifest', () => {
	const docs = tempDir();
	mkdirSync(join(docs, '01-a'));
	for (const file of ['01-a/09-z.md', '01-a/01-known.mdx', '05-b.md', '05-b.md.orig', 'index.mdx']) {
		writeFileSync(join(docs, file), 'x');
	}
	/** @type {LocatedPage[]} */
	const pages = [{ path: '01-a/01-known', title: 'Znany', type: 'explanation', section: 'A' }];
	assert.deepEqual(findOrphans(docs, pages, ['index.mdx']), ['01-a/09-z.md', '05-b.md']);
});

test('the real docs tree matches the manifest in both directions', () => {
	const pages = listPages(loadStructure());
	assert.deepEqual(
		pages.filter((p) => !findPage(DOCS, p.path)).map((p) => p.path),
		[],
		'pages missing on disk: run npm run scaffold',
	);
	assert.deepEqual(
		findOrphans(DOCS, pages, PAGES_OUTSIDE_MANIFEST),
		[],
		'files outside the manifest: add them to structure.yaml',
	);
});

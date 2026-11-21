import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseStructure, listPages, toSidebar } from './structure.mjs';

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

test('listPages flattens the tree with paths and default type', () => {
	assert.deepEqual(listPages(parseStructure(valid)), [
		{ path: '01-basics/01-intro', title: 'Wstęp', type: 'explanation' },
		{ path: '01-basics/02-install/01-macos', title: 'macOS', type: 'how-to' },
		{ path: '01-basics/03-first', title: 'Pierwsza sesja', type: 'tutorial' },
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

test('rejects a name without a two-digit prefix', () => {
	assert.throws(() => parseStructure(valid.replace('01-intro', 'intro')), /intro/);
});

test('rejects prefixes out of order', () => {
	assert.throws(() => parseStructure(valid.replace('03-first', '02-first')), /02-first/);
});

test('rejects an unquoted title with a comma, which YAML splits into an extra key', () => {
	assert.throws(() => parseStructure(valid.replace('title: Wstęp', 'title: Wstęp, cel')), /cel/);
});

test('rejects a page without a title', () => {
	assert.throws(() => parseStructure(valid.replace(', title: Wstęp', '')), /01-intro/);
});

test('rejects the same section prefix reused in a later part', () => {
	const twoParts = `${valid}\n  - label: Część II\n    sections:\n      - { file: 01-other, title: Inna }\n`;
	assert.throws(() => parseStructure(twoParts), /01-other/);
});

test('rejects bad shapes with a structure.yaml message', () => {
	assert.throws(() => parseStructure(''), /structure\.yaml/);
	assert.throws(() => parseStructure('partz: []'), /partz/);
	assert.throws(() => parseStructure(valid.replace('label: Część I', 'lable: Część I')), /lable/);
	assert.throws(() => parseStructure(valid.replace('label: Instalacja\n            items:', 'label: Instalacja\n            itemz:')), /itemz/);
});

test('rejects an unknown page type', () => {
	assert.throws(() => parseStructure(valid.replace('type: tutorial', 'type: guide')), /guide/);
});

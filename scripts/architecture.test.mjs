import assert from 'node:assert/strict';
import { globSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { after, test } from 'node:test';
import { ROOT } from './structure.mjs';

const scratch = mkdtempSync(join(tmpdir(), 'cc-'));
after(() => rmSync(scratch, { recursive: true, force: true }));
const tempDir = () => mkdtempSync(join(scratch, 'case-'));

const IMPORT = /\b(?:from|import)\s*\(?\s*(['"])(.+?)\1/g;

/**
 * dependency-cruiser does not parse .astro and .mdx files, so this scan stands in for its layer rules there.
 * @param {string} root
 * @returns {string[]} each import in an .astro or .mdx file under src/ that resolves into scripts/, as `file -> specifier`
 */
const importsIntoScripts = (root) =>
	globSync('src/**/*.{astro,mdx}', { cwd: root })
		.sort()
		.flatMap((file) =>
			[...readFileSync(join(root, file), 'utf8').matchAll(IMPORT)]
				.map((match) => match[2] ?? '')
				.filter((specifier) => /^[./]/.test(specifier))
				.filter((specifier) => {
					// Vite resolves a leading / from the project root.
					const target = specifier.startsWith('/') ? join(root, specifier) : resolve(root, dirname(file), specifier);
					return relative(root, target).split(sep)[0] === 'scripts';
				})
				.map((specifier) => `${file} -> ${specifier}`),
		);

test('no .astro or .mdx file in src imports from scripts/', () => {
	const fixture = tempDir();
	mkdirSync(join(fixture, 'src/components'), { recursive: true });
	writeFileSync(
		join(fixture, 'src/components/probe.astro'),
		"---\nimport { classify } from '../../scripts/freshness.mjs';\nimport { Card } from '@astrojs/starlight/components';\n---\n",
	);
	writeFileSync(
		join(fixture, 'src/page.mdx'),
		"import '/scripts/structure.mjs';\nimport Local from './scripts/local.astro';\n",
	);
	assert.deepEqual(importsIntoScripts(fixture), [
		'src/components/probe.astro -> ../../scripts/freshness.mjs',
		'src/page.mdx -> /scripts/structure.mjs',
	]);
	assert.deepEqual(
		importsIntoScripts(ROOT),
		[],
		'import scripts/ only from astro.config.mjs or src/content.config.ts, which dependency-cruiser checks',
	);
});

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { isRunDirectly } from './cli.mjs';

const scratch = mkdtempSync(join(tmpdir(), 'cc-'));
after(() => rmSync(scratch, { recursive: true, force: true }));

const real = join(scratch, 'real');
mkdirSync(real);
const script = join(real, 'tool.mjs');
writeFileSync(script, '');
writeFileSync(join(real, 'other.mjs'), '');
const link = join(scratch, 'link');
symlinkSync(real, link, 'junction');

test('a module started as the script runs its CLI', () => {
	assert.equal(isRunDirectly(pathToFileURL(script).href, script), true);
});

test('a module started through a symlinked folder still runs its CLI', () => {
	assert.equal(isRunDirectly(pathToFileURL(script).href, join(link, 'tool.mjs')), true);
});

test('an imported module does not run its CLI', () => {
	assert.equal(isRunDirectly(pathToFileURL(script).href, join(real, 'other.mjs')), false);
});

test('under node --eval there is no script, so no CLI runs', () => {
	assert.equal(isRunDirectly(pathToFileURL(script).href, undefined), false);
});

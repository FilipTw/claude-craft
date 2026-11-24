import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Whether the module at `moduleUrl` is the script node was started with, so its CLI should run.
 * Compares real paths: started through a symlink, `process.argv[1]` keeps the link while `import.meta.url` does not,
 * and a plain comparison would skip the CLI and exit 0 without checking anything.
 * @param {string} moduleUrl `import.meta.url` of the module.
 * @param {string | undefined} [script] The script node was started with. Undefined under `node --eval`.
 * @returns {boolean}
 */
export const isRunDirectly = (moduleUrl, script = process.argv[1]) =>
	script !== undefined && realpathSync(script) === realpathSync(fileURLToPath(moduleUrl));

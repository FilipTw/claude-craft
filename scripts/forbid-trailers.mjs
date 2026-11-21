import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * @typedef {{ rule: string, pattern: RegExp }} Rule
 * @typedef {{ line: number, rule: string, text: string }} Violation
 */

/** @type {Rule[]} */
const RULES = [
	{ rule: 'Co-Authored-By trailer', pattern: /^\s*co-authored-by\s*:/i },
	{
		rule: 'AI attribution',
		pattern:
			/^[\s\p{Extended_Pictographic}*-]*(?:generated|written|created) (?:with|by|using)\b.*\b(?:ai|anthropic|chatgpt|claude|codex|copilot|cursor|gemini|gpt|openai)\b/iu,
	},
];
// git commit --verbose puts the diff below this line, and git drops it together with the # comment lines.
const SCISSORS = '# ------------------------ >8 ------------------------';

/**
 * @param {string} message
 * @returns {Violation[]}
 * @internal
 */
export function findViolations(message) {
	const lines = message.split(/\r?\n/);
	const end = lines.indexOf(SCISSORS);
	return lines
		.slice(0, end === -1 ? lines.length : end)
		.flatMap((text, index) =>
			RULES.filter(({ pattern }) => pattern.test(text)).map(({ rule }) => ({ line: index + 1, rule, text })),
		);
}

/**
 * @param {{ file: string | undefined, log?: (line: string) => void }} options
 * @returns {0 | 1}
 * @internal
 */
export function runForbidTrailers({ file, log = (line) => process.stderr.write(`${line}\n`) }) {
	if (file === undefined) {
		log('usage: node scripts/forbid-trailers.mjs <commit-msg-file>');
		return 1;
	}
	const violations = findViolations(readFileSync(file, 'utf8'));
	for (const { line, rule, text } of violations) {
		log(`line ${line}: ${rule}: ${text}`);
	}
	if (violations.length > 0) {
		log('Remove these lines. Commits here have one author and no AI attribution.');
		return 1;
	}
	return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	process.exitCode = runForbidTrailers({ file: process.argv[2] });
}

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * @typedef {{ rule: string, matches: (line: string) => boolean }} Rule
 * @typedef {{ line: number, rule: string, text: string }} Violation
 */

const TRAILER_TOKEN = /^\s*([a-z][\w-]*)\s*:/;
const VERBS = ['generated', 'written', 'created', 'made', 'built', 'authored'];
const PREPOSITIONS = ['with', 'by', 'using', 'in'];
const VENDORS = ['anthropic', 'github', 'google', 'openai'];
const TOOLS = [
	String.raw`claude\s+code`,
	'claude',
	'chatgpt',
	'gpt',
	'openai',
	'anthropic',
	'codex',
	'copilot',
	'cursor',
	'gemini',
	'antigravity',
	'windsurf',
	'devin',
	'ai',
];
const MODEL = String.raw`[\s-]+(?:\d+(?:\.\d+)*[a-z]?|opus|sonnet|haiku|pro|flash|mini)`;
const NAME = `(?:(?:${VENDORS.join('|')})\\s+)?(?:${TOOLS.join('|')})(?:${MODEL})*`;
const LINK = String.raw`\(?<?https?://\S*`;
// The whole line is the signature. Any word after the tool name makes it prose.
const SIGNATURE = new RegExp(
	`^[^\\p{L}\\p{N}]*(?:${VERBS.join('|')})\\s+(?:${PREPOSITIONS.join('|')})\\s+(?:\\[${NAME}\\]\\(\\S*\\)|${NAME}(?:\\s+${LINK})?)[^\\p{L}\\p{N}]*$`,
	'iu',
);

/** @type {Rule[]} */
const RULES = [
	{
		rule: 'attribution trailer',
		matches: (line) => {
			const token = TRAILER_TOKEN.exec(line.toLowerCase())?.[1];
			return token !== undefined && (token.endsWith('-by') || token.split(/[-_]/).includes('ai'));
		},
	},
	{ rule: 'AI attribution', matches: (line) => SIGNATURE.test(line) },
];
// git commit --verbose puts the diff below this line, and git drops it together with the # comment lines.
const SCISSORS = '# ------------------------ >8 ------------------------';

/**
 * Folds look-alike characters (fullwidth letters, non-breaking hyphens, en dashes) into the ASCII the rules match.
 * @param {string} text
 */
const normalize = (text) => text.normalize('NFKC').replace(/\p{Pd}/gu, '-');

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
			text.startsWith('#')
				? []
				: RULES.filter(({ matches }) => matches(normalize(text))).map(({ rule }) => ({ line: index + 1, rule, text })),
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

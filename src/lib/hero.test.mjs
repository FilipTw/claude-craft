import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RAY_ANGLES, rayPolygon } from './hero.mjs';

/** @param {string} points */
const parse = (points) => points.split(' ').map((pair) => pair.split(',').map(Number));

test('RAY_ANGLES fans 13 rays from straight left (180°) to straight up (270°)', () => {
	assert.equal(RAY_ANGLES.length, 13);
	assert.equal(RAY_ANGLES[0], 180);
	assert.equal(RAY_ANGLES.at(-1), 270);
	assert.ok(RAY_ANGLES.every((angle, i) => i === 0 || angle - (RAY_ANGLES[i - 1] ?? 0) === 7.5));
});

test('rayPolygon draws a beam that is wide at the origin and narrow at its tip', () => {
	// Straight up from (400, 300): x spreads around 400, y goes from 300 to 300 - 420
	const [a, b, c, d] = parse(rayPolygon({ x: 400, y: 300 }, 270, 420, 6, 1));

	assert.deepEqual(a, [397, 300]);
	assert.deepEqual(b, [399.5, -120]);
	assert.deepEqual(c, [400.5, -120]);
	assert.deepEqual(d, [403, 300]);
});

test('rayPolygon points a beam along its angle', () => {
	// Straight left: y spreads around 300, x goes from 400 to 400 - 100
	const [a, b, c, d] = parse(rayPolygon({ x: 400, y: 300 }, 180, 100, 4, 2));

	assert.deepEqual(a, [400, 302]);
	assert.deepEqual(b, [300, 301]);
	assert.deepEqual(c, [300, 299]);
	assert.deepEqual(d, [400, 298]);
});

test('rayPolygon rounds to two decimals so the SVG stays short', () => {
	const points = rayPolygon({ x: 400, y: 300 }, 187.5, 420, 5, 0.5);

	assert.ok(
		points.split(/[ ,]/).every((n) => /^-?\d+(\.\d{1,2})?$/.test(n)),
		points,
	);
});

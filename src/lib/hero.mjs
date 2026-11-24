/**
 * Geometry of the hero's decorative starburst (ADR 0003, fifth pass).
 * Each ray is a tapered beam: wide where the rays meet, narrow at the tip, which reads as depth.
 */

/** Ray angles in degrees, every 7.5° from straight left (180) to straight up (270). */
export const RAY_ANGLES = Object.freeze(Array.from({ length: 13 }, (_, index) => 180 + index * 7.5));

/** @param {number} value */
const round = (value) => Math.round(value * 100) / 100;

/**
 * SVG `points` of one beam: a quadrilateral from `origin` along `angle`.
 * @param {{ x: number, y: number }} origin Where all rays meet.
 * @param {number} angle Degrees; 0 points right, 90 down (SVG y grows downwards).
 * @param {number} length
 * @param {number} baseWidth Width at the origin.
 * @param {number} tipWidth Width at the far end.
 * @returns {string}
 */
export const rayPolygon = (origin, angle, length, baseWidth, tipWidth) => {
	const radians = (angle * Math.PI) / 180;
	const dx = Math.cos(radians);
	const dy = Math.sin(radians);
	// Unit normal to the ray, used to spread each end to its width
	const nx = -dy;
	const ny = dx;
	const tip = { x: origin.x + dx * length, y: origin.y + dy * length };
	/** @param {{ x: number, y: number }} at @param {number} offset */
	const point = (at, offset) => `${round(at.x + nx * offset)},${round(at.y + ny * offset)}`;
	return [
		point(origin, -baseWidth / 2),
		point(tip, -tipWidth / 2),
		point(tip, tipWidth / 2),
		point(origin, baseWidth / 2),
	].join(' ');
};

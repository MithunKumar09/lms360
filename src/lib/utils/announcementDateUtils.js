/**
 * Announcement date utilities
 */

/**
 * Ensure end date is null or after start date
 * @param {Date|string|null} start
 * @param {Date|string|null} end
 * @returns {boolean}
 */
export function isValidWindow(start, end) {
	if (!start) return false;
	const s = new Date(start);
	if (Number.isNaN(s.getTime())) return false;
	if (!end) return true;
	const e = new Date(end);
	if (Number.isNaN(e.getTime())) return false;
	return e.getTime() >= s.getTime();
}

/**
 * Coerce input to ISO string (without milliseconds)
 * @param {Date|string} d
 */
export function toIsoSeconds(d) {
	const dt = new Date(d);
	if (Number.isNaN(dt.getTime())) return null;
	return new Date(dt.getTime() - (dt.getTime() % 1000)).toISOString();
}

export default { isValidWindow, toIsoSeconds };



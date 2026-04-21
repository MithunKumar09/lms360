/**
 * Structured logging with basic PII redaction.
 */

function redact(value) {
	if (value == null) return value;
	const s = String(value);
	if (s.includes('@')) {
		const [u, d] = s.split('@');
		return `${u.slice(0, 2)}***@${d}`;
	}
	if (s.length > 12) return `${s.slice(0, 4)}***${s.slice(-2)}`;
	return s;
}

export function logInfo(message, meta = {}) {
	console.log(JSON.stringify({ level: 'info', message, ...meta }));
}

export function logWarn(message, meta = {}) {
	console.warn(JSON.stringify({ level: 'warn', message, ...meta }));
}

export function logError(message, meta = {}) {
	// Redact obvious keys
	const safe = { ...meta };
	for (const k of Object.keys(safe)) {
		if (/(token|secret|password|email)/i.test(k)) {
			safe[k] = redact(safe[k]);
		}
	}
	console.error(JSON.stringify({ level: 'error', message, ...safe }));
}

export default { logInfo, logWarn, logError };



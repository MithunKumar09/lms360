/**
 * Simple in-memory rate limiter for development.
 * In production, replace with Upstash or a distributed store.
 */

const buckets = new Map();

function hit(key, limit, windowMs) {
	const now = Date.now();
	const rec = buckets.get(key) || { count: 0, reset: now + windowMs };
	if (now > rec.reset) {
		rec.count = 0;
		rec.reset = now + windowMs;
	}
	rec.count += 1;
	buckets.set(key, rec);
	return { ok: rec.count <= limit, remaining: Math.max(0, limit - rec.count), reset: rec.reset };
}

export function rateLimitByUser(userId, limit = 10, windowMs = 60_000) {
	if (!userId) return { ok: true, remaining: limit, reset: Date.now() + windowMs };
	return hit(`u:${userId}`, limit, windowMs);
}

export function rateLimitByIp(ip, limit = 30, windowMs = 60_000) {
	const key = ip || 'ip';
	return hit(`ip:${key}`, limit, windowMs);
}

export default { rateLimitByUser, rateLimitByIp };



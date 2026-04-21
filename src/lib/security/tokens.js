/**
 * Token utilities: 32-byte random tokens with SHA-256 hashing and timing-safe compare.
 */

import crypto from 'crypto';

export function generateTokenBytes(length = 32) {
	return crypto.randomBytes(length);
}

export function generateTokenHex(length = 32) {
	return generateTokenBytes(length).toString('hex');
}

export function generateTokenBase64(length = 32) {
	return generateTokenBytes(length).toString('base64url');
}

export function sha256(bufferOrString) {
	const buf = Buffer.isBuffer(bufferOrString) ? bufferOrString : Buffer.from(bufferOrString, 'utf8');
	return crypto.createHash('sha256').update(buf).digest();
}

export function timingSafeEqual(a, b) {
	const ab = Buffer.isBuffer(a) ? a : Buffer.from(a);
	const bb = Buffer.isBuffer(b) ? b : Buffer.from(b);
	if (ab.length !== bb.length) return false;
	return crypto.timingSafeEqual(ab, bb);
}

// Test stub
export function __test__() {
	const token = generateTokenBytes(32);
	const hash = sha256(token);
	return timingSafeEqual(hash, sha256(token));
}



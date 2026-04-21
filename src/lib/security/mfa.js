/**
 * MFA utilities: TOTP provisioning/verify and Email OTP (6-digit) with TTL/attempt limits.
 * Requires an OTP store. Defaults to in-memory store; in production, use Redis/Upstash.
 */

import crypto from 'crypto';
import { decryptJson, encryptJson } from './encrypt.js';

// Optional: otplib for TOTP. Ensure it's installed in your project.
let otplib;
try {
	// dynamic import to avoid breaking if not installed yet
	otplib = await import('otplib');
} catch {
	otplib = null;
}

// In-memory fallback store for email OTPs: key -> { code, exp, attempts }
const memoryStore = new Map();

function nowMs() {
	return Date.now();
}

export function generateTotpSecret() {
	if (!otplib) {
		throw new Error('otplib is not installed. Please add it to enable TOTP.');
	}
	const secret = otplib.authenticator.generateSecret();
	return encryptJson({ secret });
}

export function totpKeyUri({ secretEnc, label, issuer }) {
	if (!otplib) {
		throw new Error('otplib is not installed. Please add it to enable TOTP.');
	}
	const { secret } = decryptJson(secretEnc);
	return otplib.authenticator.keyuri(label, issuer, secret);
}

export function verifyTotp({ secretEnc, token, window = 1 }) {
	if (!otplib) {
		throw new Error('otplib is not installed. Please add it to enable TOTP.');
	}
	const { secret } = decryptJson(secretEnc);
	return otplib.authenticator.check(token, secret, { window });
}

// Email OTP (6-digit) helpers
export function generateEmailOtp() {
	const code = Math.floor(100000 + Math.random() * 900000).toString();
	return code;
}

export async function issueEmailOtp({ key, ttlMs = 5 * 60 * 1000, maxAttempts = 5, store = memoryStore }) {
	const code = generateEmailOtp();
	const exp = nowMs() + ttlMs;
	store.set(key, { code, exp, attempts: 0, maxAttempts });
	return code;
}

export async function verifyEmailOtp({ key, code, store = memoryStore }) {
	const rec = store.get(key);
	if (!rec) return { ok: false, reason: 'not_found' };
	if (nowMs() > rec.exp) {
		store.delete(key);
		return { ok: false, reason: 'expired' };
	}
	if (rec.attempts >= rec.maxAttempts) {
		store.delete(key);
		return { ok: false, reason: 'locked' };
	}
	rec.attempts += 1;
	if (crypto.timingSafeEqual(Buffer.from(rec.code), Buffer.from(code))) {
		store.delete(key);
		return { ok: true };
	}
	if (rec.attempts >= rec.maxAttempts) {
		store.delete(key);
		return { ok: false, reason: 'locked' };
	}
	return { ok: false, reason: 'invalid' };
}

export function revokeEmailOtp({ key, store = memoryStore }) {
	store.delete(key);
}

// Test stub
export async function __test__() {
	const key = 'test@example.com';
	const code = await issueEmailOtp({ key });
	const ok = await verifyEmailOtp({ key, code });
	return ok.ok === true;
}



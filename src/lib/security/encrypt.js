/**
 * AES-GCM encryption/decryption wrapper.
 * Uses MFA_KMS_KEY (base64 or hex) as the symmetric key.
 */

import crypto from 'crypto';

function getKey() {
	const raw = process.env.MFA_KMS_KEY;
	if (!raw) {
		throw new Error('MFA_KMS_KEY is not set');
	}
	// Accept base64 or hex; default to base64
	let key;
	try {
		key = Buffer.from(raw, 'base64');
	} catch {
		key = Buffer.from(raw, 'hex');
	}
	if (key.length !== 32) {
		throw new Error('MFA_KMS_KEY must be 32 bytes (256-bit) after decoding');
	}
	return key;
}

export function encryptJson(value) {
	const key = getKey();
	const iv = crypto.randomBytes(12);
	const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
	const plaintext = Buffer.from(JSON.stringify(value), 'utf8');
	const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
	const tag = cipher.getAuthTag();
	return Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

export function decryptJson(payload) {
	const key = getKey();
	const buf = Buffer.from(payload, 'base64');
	const iv = buf.subarray(0, 12);
	const tag = buf.subarray(12, 28);
	const ciphertext = buf.subarray(28);
	const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
	decipher.setAuthTag(tag);
	const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
	return JSON.parse(plaintext);
}

// Test stub
export function __test__() {
	const obj = { a: 1, b: 'x' };
	const enc = encryptJson(obj);
	const dec = decryptJson(enc);
	return dec.a === 1 && dec.b === 'x';
}



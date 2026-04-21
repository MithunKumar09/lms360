/**
 * Security tests for token hashing and MFA email OTP.
 * Run with: node tests/security.test.js
 */

import assert from 'assert';
import { sha256, timingSafeEqual } from '../src/lib/security/tokens.js';
import { issueEmailOtp, verifyEmailOtp } from '../src/lib/security/mfa.js';

function test(name, fn) {
	console.log(`• ${name}`);
	return Promise.resolve(fn()).then(() => console.log('  ✓ ok')).catch((e) => {
		console.error('  ✗ fail:', e.message);
		process.exitCode = 1;
	});
}

await test('sha256 is deterministic and timing safe compare works', async () => {
	const t = Buffer.from('abc');
	const h1 = sha256(t);
	const h2 = sha256(t);
	assert.equal(h1.equals(h2), true);
	assert.equal(timingSafeEqual(h1, h2), true);
});

await test('email OTP lifecycle works', async () => {
	const key = 'test@example.com';
	const code = await issueEmailOtp({ key });
	const res = await verifyEmailOtp({ key, code });
	assert.equal(res.ok, true);
});



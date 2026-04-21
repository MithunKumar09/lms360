/**
 * Validators tests for Users feature
 * Run with: node tests/validators.test.js
 * (These are lightweight assertions without a test runner)
 */

import assert from 'assert';
import { userCreateSchema, userInviteSchema } from '../src/lib/validation/userSchemas.js';
import { ensureStrongPassword } from '../src/lib/security/passwords.js';

function test(name, fn) {
	console.log(`• ${name}`);
	return Promise.resolve(fn()).then(() => console.log('  ✓ ok')).catch((e) => {
		console.error('  ✗ fail:', e.message);
		process.exitCode = 1;
	});
}

await test('password strength - strong passes', async () => {
	ensureStrongPassword('Str0ng#Passw0rd!');
});

await test('password strength - weak fails', async () => {
	let failed = false;
	try {
		ensureStrongPassword('12345678');
	} catch (e) {
		failed = true;
	}
	assert.equal(failed, true, 'weak password should fail');
});

await test('create student requires cohort_id', async () => {
	let failed = false;
	try {
		userCreateSchema.parse({
			email: 's@example.com',
			role: 'student',
			temp_password: 'Str0ng#Passw0rd!',
		});
	} catch {
		failed = true;
	}
	assert.equal(failed, true, 'student without cohort_id must fail');
});

await test('invite instructor requires cohort_ids or offering_ids', async () => {
	let failed = false;
	try {
		userInviteSchema.parse({
			email: 'i@example.com',
			role: 'instructor',
			delivery: 'invite_link',
			expiry_hours: 24,
		});
	} catch {
		failed = true;
	}
	assert.equal(failed, true, 'instructor without scope must fail');
});



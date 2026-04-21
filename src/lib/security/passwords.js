/**
 * Password utilities using bcryptjs and zxcvbn strength estimation.
 */

import bcrypt from 'bcryptjs';
import zxcvbn from 'zxcvbn';

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);

export function passwordStrength(password, userInputs = []) {
	try {
		const res = zxcvbn(password, userInputs);
		return {
			score: res.score,
			feedback: res.feedback,
			guessesLog10: res.guesses_log10,
		};
	} catch {
		return { score: 0, feedback: {}, guessesLog10: 0 };
	}
}

export function ensureStrongPassword(password, userInputs = [], minScore = 3) {
	const { score, feedback } = passwordStrength(password, userInputs);
	if (score < minScore) {
		const warning = feedback?.warning || 'Password is too weak';
		throw Object.assign(new Error(warning), { code: 'WEAK_PASSWORD', meta: { score, feedback } });
	}
}

export async function hashPassword(password) {
	return await bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPasswordHash(password, hash) {
	return await bcrypt.compare(password, hash);
}

// Test stub
export async function __test__() {
	const pw = 'Str0ng#Passw0rd!';
	ensureStrongPassword(pw);
	const hash = await hashPassword(pw);
	const ok = await verifyPasswordHash(pw, hash);
	return ok;
}



/**
 * Secure Password Generator
 * Generates cryptographically secure random passwords
 */

import crypto from 'crypto';

/**
 * Generate a secure random password
 * @param {Object} options - Password generation options
 * @param {number} options.length - Password length (default: 16, min: 12, max: 128)
 * @param {boolean} options.includeUppercase - Include uppercase letters (default: true)
 * @param {boolean} options.includeLowercase - Include lowercase letters (default: true)
 * @param {boolean} options.includeNumbers - Include numbers (default: true)
 * @param {boolean} options.includeSymbols - Include symbols (default: true)
 * @param {string} options.excludeChars - Characters to exclude (default: '')
 * @returns {string} Generated password
 */
export function generateSecurePassword(options = {}) {
	const {
		length = 16,
		includeUppercase = true,
		includeLowercase = true,
		includeNumbers = true,
		includeSymbols = true,
		excludeChars = ''
	} = options;

	// Validate length
	const minLength = 12;
	const maxLength = 128;
	const validLength = Math.max(minLength, Math.min(maxLength, parseInt(length, 10) || minLength));

	// Character sets
	const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	const lowercase = 'abcdefghijklmnopqrstuvwxyz';
	const numbers = '0123456789';
	const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

	// Build character pool
	let charPool = '';
	if (includeUppercase) charPool += uppercase;
	if (includeLowercase) charPool += lowercase;
	if (includeNumbers) charPool += numbers;
	if (includeSymbols) charPool += symbols;

	// Remove excluded characters
	if (excludeChars) {
		const excludeSet = new Set(excludeChars.split(''));
		charPool = charPool.split('').filter(char => !excludeSet.has(char)).join('');
	}

	// Ensure at least one character from each required set
	const requiredChars = [];
	if (includeUppercase) requiredChars.push(getRandomChar(uppercase, excludeChars));
	if (includeLowercase) requiredChars.push(getRandomChar(lowercase, excludeChars));
	if (includeNumbers) requiredChars.push(getRandomChar(numbers, excludeChars));
	if (includeSymbols) requiredChars.push(getRandomChar(symbols, excludeChars));

	// Validate we have enough characters
	if (charPool.length === 0) {
		throw new Error('No character set available after exclusions');
	}

	// Generate random password
	const password = [];
	
	// Add required characters first
	for (const char of requiredChars) {
		password.push(char);
	}

	// Fill the rest with random characters
	const remainingLength = validLength - password.length;
	for (let i = 0; i < remainingLength; i++) {
		password.push(getRandomChar(charPool, ''));
	}

	// Shuffle the password array to avoid predictable patterns
	shuffleArray(password);

	return password.join('');
}

/**
 * Get a random character from a character set
 * @param {string} charSet - Character set to choose from
 * @param {string} excludeChars - Characters to exclude
 * @returns {string} Random character
 */
function getRandomChar(charSet, excludeChars) {
	const excludeSet = new Set(excludeChars.split(''));
	const availableChars = charSet.split('').filter(char => !excludeSet.has(char));
	
	if (availableChars.length === 0) {
		throw new Error('No available characters after exclusions');
	}

	const randomIndex = crypto.randomInt(0, availableChars.length);
	return availableChars[randomIndex];
}

/**
 * Shuffle an array using Fisher-Yates algorithm with crypto.randomInt
 * @param {Array} array - Array to shuffle
 */
function shuffleArray(array) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = crypto.randomInt(0, i + 1);
		[array[i], array[j]] = [array[j], array[i]];
	}
}

/**
 * Generate a temporary password for invitations
 * Uses a more readable format while maintaining security
 * @param {number} length - Password length (default: 16)
 * @returns {string} Temporary password
 */
export function generateTemporaryPassword(length = 16) {
	// For temporary passwords, we can use a slightly more readable format
	// but still maintain strong security
	return generateSecurePassword({
		length,
		includeUppercase: true,
		includeLowercase: true,
		includeNumbers: true,
		includeSymbols: true,
		excludeChars: '0O1Il' // Exclude easily confused characters
	});
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with isValid, score, and feedback
 */
export function validatePasswordStrength(password) {
	if (!password || typeof password !== 'string') {
		return {
			isValid: false,
			score: 0,
			feedback: ['Password is required']
		};
	}

	const feedback = [];
	let score = 0;

	// Length check
	if (password.length < 12) {
		feedback.push('Password must be at least 12 characters long');
	} else if (password.length >= 16) {
		score += 2;
	} else {
		score += 1;
	}

	// Character variety checks
	const hasUppercase = /[A-Z]/.test(password);
	const hasLowercase = /[a-z]/.test(password);
	const hasNumbers = /[0-9]/.test(password);
	const hasSymbols = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password);

	if (!hasUppercase) {
		feedback.push('Password should include uppercase letters');
	} else {
		score += 1;
	}

	if (!hasLowercase) {
		feedback.push('Password should include lowercase letters');
	} else {
		score += 1;
	}

	if (!hasNumbers) {
		feedback.push('Password should include numbers');
	} else {
		score += 1;
	}

	if (!hasSymbols) {
		feedback.push('Password should include symbols');
	} else {
		score += 1;
	}

	// Common patterns check
	const commonPatterns = [
		/12345/,
		/abcde/,
		/qwerty/,
		/password/i,
		/admin/i,
		/123456/,
		/letmein/i
	];

	for (const pattern of commonPatterns) {
		if (pattern.test(password)) {
			feedback.push('Password contains common patterns');
			score -= 1;
			break;
		}
	}

	// Repetition check
	if (/(.)\1{3,}/.test(password)) {
		feedback.push('Password contains too many repeated characters');
		score -= 1;
	}

	// Sequential characters check
	if (/abcdef|bcdefg|cdefgh|defghi|efghij|fghijk|ghijkl|hijklm|ijklmn|jklmno|klmnop|lmnopq|mnopqr|nopqrs|opqrst|pqrstu|qrstuv|rstuvw|stuvwx|tuvwxy|uvwxyz/i.test(password)) {
		feedback.push('Password contains sequential characters');
		score -= 1;
	}

	const isValid = score >= 4 && password.length >= 12 && hasUppercase && hasLowercase && hasNumbers && hasSymbols;

	return {
		isValid,
		score: Math.max(0, Math.min(10, score)),
		feedback: feedback.length > 0 ? feedback : ['Password is strong']
	};
}

/**
 * Generate a password reset token
 * @returns {string} Random token (hex string)
 */
export function generatePasswordResetToken() {
	return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate an invitation token
 * @returns {string} Random token (hex string)
 */
export function generateInvitationToken() {
	return crypto.randomBytes(32).toString('hex');
}


/**
 * Generate NEXTAUTH_SECRET
 * 
 * This script generates a secure random string for NEXTAUTH_SECRET.
 * 
 * Usage:
 *   node scripts/generate-secret.js
 */

import crypto from 'crypto';

/**
 * Generate a secure random string
 */
function generateSecret() {
  return crypto.randomBytes(32).toString('base64');
}

// Generate and display the secret
const secret = generateSecret();

console.log('🔐 Generated NEXTAUTH_SECRET:');
console.log('─────────────────────────────────────');
console.log(secret);
console.log('─────────────────────────────────────');
console.log('\n💡 Add this to your .env or .env.local file:');
console.log(`NEXTAUTH_SECRET=${secret}\n`);



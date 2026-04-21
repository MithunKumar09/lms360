/**
 * TOTP (Time-based One-Time Password) Utilities
 * 
 * Implements RFC 6238 TOTP for multi-factor authentication.
 * Provides functions for secret generation, QR code creation, and verification.
 */

import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'crypto';

// Configure TOTP settings
// Window can be a number (total steps) or array [before, after]
// Using number 2 means allow current step ± 1 (total of 3 possible codes)
authenticator.options = {
  step: 30, // 30-second time steps
  window: 2, // Allow 2 steps total (1 before, current, 1 after) - better for clock drift
};

/**
 * Generate a new TOTP secret for a user
 * @param {string} email - User email
 * @returns {string} TOTP secret (base32 encoded)
 */
export function generateSecret(email) {
  return authenticator.generateSecret();
}

/**
 * Generate QR code data URL for TOTP setup
 * @param {string} email - User email
 * @param {string} secret - TOTP secret
 * @param {string} issuer - Service name (e.g., "EduRock")
 * @returns {Promise<string>} QR code as data URL
 */
export async function generateQRCode(email, secret, issuer = 'EduRock') {
  try {
    // Generate TOTP URI (standard format for authenticator apps)
    const otpAuthUrl = authenticator.keyuri(email, issuer, secret);

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      width: 300,
    });

    return qrCodeDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Verify a TOTP code against a secret
 * @param {string} token - TOTP code entered by user
 * @param {string} secret - TOTP secret
 * @returns {boolean} True if code is valid
 */
export function verifyTotp(token, secret) {
  try {
    const trimmedToken = token?.trim() || '';
    console.log('🔐 [TOTP] Verifying TOTP code...', {
      tokenLength: trimmedToken.length,
      token: trimmedToken,
      secretLength: secret?.length,
      secretPresent: !!secret,
      window: authenticator.options.window,
      step: authenticator.options.step
    });
    
    if (!secret) {
      console.log('🔐 [TOTP] ❌ Secret is missing or invalid');
      return false;
    }
    
    if (!trimmedToken || trimmedToken.length !== 6) {
      console.log('🔐 [TOTP] ❌ Token format invalid (must be 6 digits)');
      return false;
    }

    // Validate secret is valid base32 before verification
    if (!/^[A-Z2-7]+$/.test(secret)) {
      console.log('🔐 [TOTP] ❌ Secret is not valid Base32 format');
      console.log('🔐 [TOTP] Secret preview:', secret.substring(0, 10) + '...');
      return false;
    }
    
    const result = authenticator.verify({
      token: trimmedToken,
      secret: secret,
    });
    
    console.log('🔐 [TOTP] Verification result:', result);
    
    if (!result) {
      // Try to get current and adjacent tokens for debugging
      try {
        const now = Math.floor(Date.now() / 1000);
        const currentStep = Math.floor(now / 30);
        
        const currentToken = authenticator.generate(secret);
        const previousToken = authenticator.generate(secret, (currentStep - 1) * 30);
        const nextToken = authenticator.generate(secret, (currentStep + 1) * 30);
        
        // Also try with time-based generation
        const previousToken2 = authenticator.generate(secret, Date.now() - 30000);
        const nextToken2 = authenticator.generate(secret, Date.now() + 30000);
        
        console.log('🔐 [TOTP] Debug - Expected tokens:', {
          entered: trimmedToken,
          current: currentToken,
          previous: previousToken,
          next: nextToken,
          previous2: previousToken2,
          next2: nextToken2,
          matchesCurrent: trimmedToken === currentToken,
          matchesPrevious: trimmedToken === previousToken,
          matchesNext: trimmedToken === nextToken,
          matchesPrevious2: trimmedToken === previousToken2,
          matchesNext2: trimmedToken === nextToken2,
          currentTime: new Date().toISOString(),
          currentStep: currentStep,
          secretLength: secret.length,
          secretPreview: secret.substring(0, 8) + '...'
        });
      } catch (err) {
        console.log('🔐 [TOTP] Could not generate tokens for comparison:', err.message);
        console.error('🔐 [TOTP] Error details:', {
          message: err.message,
          stack: err.stack,
          secretLength: secret?.length
        });
      }
    }
    
    return result;
  } catch (error) {
    console.error('🔐 [TOTP] ❌ Error verifying TOTP:', error);
    console.error('🔐 [TOTP] ❌ Error stack:', error.stack);
    console.error('🔐 [TOTP] ❌ Error details:', {
      message: error.message,
      name: error.name
    });
    return false;
  }
}

/**
 * Get manual entry key (formatted secret for manual entry)
 * @param {string} secret - TOTP secret
 * @returns {string} Formatted secret (spaces every 4 characters)
 */
export function formatSecretForManualEntry(secret) {
  // Add spaces every 4 characters for readability
  return secret.match(/.{1,4}/g)?.join(' ') || secret;
}

/**
 * Encrypt MFA secret before storing in database
 * @param {string} secret - Plain TOTP secret
 * @param {string} encryptionKey - Encryption key (from env)
 * @returns {string} Encrypted secret (hex encoded)
 */
export function encryptSecret(secret, encryptionKey) {
  if (!encryptionKey) {
    throw new Error('MFA_ENCRYPTION_KEY is not set in environment variables');
  }

  try {
    // Use AES-256-GCM for encryption
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(encryptionKey, 'salt', 32);
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Combine IV, auth tag, and encrypted data
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Error encrypting secret:', error);
    throw new Error('Failed to encrypt MFA secret');
  }
}

/**
 * Decrypt MFA secret from database
 * @param {string} encryptedSecret - Encrypted secret from database
 * @param {string} encryptionKey - Encryption key (from env)
 * @returns {string} Decrypted TOTP secret
 */
export function decryptSecret(encryptedSecret, encryptionKey) {
  if (!encryptionKey) {
    throw new Error('MFA_ENCRYPTION_KEY is not set in environment variables');
  }

  if (!encryptedSecret) {
    throw new Error('Encrypted secret is empty or null');
  }

  try {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(encryptionKey, 'salt', 32);

    // Split IV, auth tag, and encrypted data
    const parts = encryptedSecret.split(':');
    if (parts.length !== 3) {
      console.error('🔐 [SECRET] Invalid encrypted secret format:', {
        partsCount: parts.length,
        encryptedLength: encryptedSecret?.length,
        format: parts.length !== 3 ? 'Invalid' : 'Valid'
      });
      throw new Error('Invalid encrypted secret format. Expected format: iv:authTag:encryptedData');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    if (iv.length !== 16) {
      throw new Error(`Invalid IV length: expected 16 bytes, got ${iv.length}`);
    }

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    // Validate decrypted secret is valid base32
    if (!/^[A-Z2-7]+$/.test(decrypted)) {
      console.error('🔐 [SECRET] Decrypted secret is not valid Base32:', {
        secretLength: decrypted?.length,
        secretPreview: decrypted?.substring(0, 8) + '...',
        isValidBase32: false
      });
      throw new Error('Decrypted secret is not in valid Base32 format');
    }

    console.log('🔐 [SECRET] Successfully decrypted secret:', {
      secretLength: decrypted.length,
      secretPreview: decrypted.substring(0, 4) + '...',
      isValidBase32: true
    });

    return decrypted;
  } catch (error) {
    console.error('🔐 [SECRET] ❌ Error decrypting secret:', error);
    console.error('🔐 [SECRET] ❌ Error details:', {
      message: error.message,
      name: error.name,
      encryptedLength: encryptedSecret?.length,
      encryptedPreview: encryptedSecret?.substring(0, 20) + '...'
    });
    throw new Error(`Failed to decrypt MFA secret: ${error.message}`);
  }
}

/**
 * Generate TOTP URI for manual entry
 * @param {string} email - User email
 * @param {string} secret - TOTP secret
 * @param {string} issuer - Service name
 * @returns {string} TOTP URI
 */
export function generateTotpUri(email, secret, issuer = 'EduRock') {
  return authenticator.keyuri(email, issuer, secret);
}

export default {
  generateSecret,
  generateQRCode,
  verifyTotp,
  formatSecretForManualEntry,
  encryptSecret,
  decryptSecret,
  generateTotpUri,
};



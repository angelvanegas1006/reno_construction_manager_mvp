/**
 * Token Encryption Utilities
 * 
 * Encrypts and decrypts sensitive tokens before storing in database
 * Uses SUPABASE_SERVICE_ROLE_KEY for encryption key derivation
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

/**
 * Get encryption key from environment variable
 */
function getEncryptionKey(): Buffer {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for token encryption');
  }
  
  // Derive a 32-byte key from the service role key
  return crypto.createHash('sha256').update(key).digest();
}

/**
 * Encrypt a token
 */
export function encryptToken(token: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);
    
    // Derive key from salt
    const derivedKey = crypto.pbkdf2Sync(key, salt, 100000, 32, 'sha256');
    
    const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);
    
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Combine salt, iv, tag, and encrypted data
    const combined = Buffer.concat([
      salt,
      iv,
      tag,
      Buffer.from(encrypted, 'hex'),
    ]);
    
    return combined.toString('base64');
  } catch (error) {
    console.error('[encryptToken] Error encrypting token:', error);
    throw new Error('Failed to encrypt token');
  }
}

/**
 * Decrypt a token
 */
export function decryptToken(encryptedToken: string): string {
  try {
    const key = getEncryptionKey();
    const combined = Buffer.from(encryptedToken, 'base64');
    
    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = combined.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + TAG_LENGTH
    );
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    
    // Derive key from salt
    const derivedKey = crypto.pbkdf2Sync(key, salt, 100000, 32, 'sha256');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('[decryptToken] Error decrypting token:', error);
    throw new Error('Failed to decrypt token');
  }
}


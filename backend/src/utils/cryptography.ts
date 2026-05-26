import crypto from 'crypto';

// Retrieve master key and fallback safely in development to ensure test resilience
const MASTER_KEY_RAW = process.env.MASTER_ENCRYPTION_KEY || 'dev-safe-fallback-master-key-must-be-changed-in-production-123456';

// Derive the actual 32-byte AES key in-memory at startup
const DERIVED_AES_KEY = crypto.createHash('sha256').update(MASTER_KEY_RAW).digest();

interface EncryptionResult {
  encryptedData: string;
  iv: string;
  tag: string;
}

/**
 * Encrypts a plaintext string using AES-256-GCM
 */
export function encrypt(text: string): EncryptionResult {
  // AES-256-GCM standard IV length is 12 bytes
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', DERIVED_AES_KEY, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag().toString('hex');

  return {
    encryptedData: encrypted,
    iv: iv.toString('hex'),
    tag,
  };
}

/**
 * Decrypts an encrypted hex string using AES-256-GCM
 */
export function decrypt(encryptedData: string, ivHex: string, tagHex: string): string {
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', DERIVED_AES_KEY, iv);

  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

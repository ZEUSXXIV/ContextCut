import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables for consistent key derivation across tests and runtime
dotenv.config();

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

/**
 * Hashes a password securely using scrypt with a random salt.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verifies a password against a stored scrypt salt/hash combo using timing-safe buffer matching.
 */
export function verifyPassword(password: string, storedValue: string): boolean {
  try {
    const parts = storedValue.split(':');
    if (parts.length !== 2) return false;
    const [salt, hash] = parts;
    const checkHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(checkHash, 'hex'));
  } catch (err) {
    return false;
  }
}

import { encrypt, decrypt, hashPassword, verifyPassword } from './cryptography';

describe('Cryptography Utility', () => {
  describe('AES-256-GCM Encryption / Decryption', () => {
    test('should encrypt and decrypt text successfully', () => {
      const plaintext = 'SuperSecretToken_123!';
      const encrypted = encrypt(plaintext);

      expect(encrypted.encryptedData).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.tag).toBeDefined();

      const decrypted = decrypt(encrypted.encryptedData, encrypted.iv, encrypted.tag);
      expect(decrypted).toBe(plaintext);
    });

    test('should fail decryption if data or tag is tampered with', () => {
      const plaintext = 'SensitiveCredentials';
      const encrypted = encrypt(plaintext);

      // Tamper ciphertext
      const tamperedData = encrypted.encryptedData.replace(/.$/, 'a');

      expect(() => {
        decrypt(tamperedData, encrypted.iv, encrypted.tag);
      }).toThrow();

      // Tamper tag
      const tamperedTag = encrypted.tag.replace(/.$/, 'a');
      expect(() => {
        decrypt(encrypted.encryptedData, encrypted.iv, tamperedTag);
      }).toThrow();
    });
  });

  describe('Password Hashing & Verification', () => {
    test('should hash and verify password successfully', () => {
      const password = 'mySuperStrongPassword123';
      const storedCombo = hashPassword(password);

      expect(storedCombo).toContain(':');
      const parts = storedCombo.split(':');
      expect(parts).toHaveLength(2);

      const isValid = verifyPassword(password, storedCombo);
      expect(isValid).toBe(true);

      const isInvalid = verifyPassword('wrongpassword', storedCombo);
      expect(isInvalid).toBe(false);
    });

    test('should return false for malformed stored password values', () => {
      const isValid = verifyPassword('password', 'malformedcombovalue');
      expect(isValid).toBe(false);
    });
  });
});

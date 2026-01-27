import crypto from 'crypto';

/**
 * EncryptionService
 *
 * Provides AES-256-GCM encryption/decryption for sensitive data (GitHub tokens, PATs).
 * Uses authenticated encryption to prevent tampering and ensure data integrity.
 *
 * Storage Format: encrypted:${iv}:${authTag}:${ciphertext}
 * All components are hex-encoded for safe database storage.
 */
export class EncryptionService {
  private masterKey: Buffer;
  private algorithm = 'aes-256-gcm';
  private keyLength = 32; // 256 bits

  constructor() {
    const encryptionKey = process.env.ENCRYPTION_KEY;

    if (!encryptionKey) {
      throw new Error(
        'ENCRYPTION_KEY environment variable is not set. ' +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
      );
    }

    try {
      // Decode base64-encoded master key from environment
      this.masterKey = Buffer.from(encryptionKey, 'base64');

      if (this.masterKey.length !== this.keyLength) {
        throw new Error(
          `ENCRYPTION_KEY must be ${this.keyLength} bytes (256 bits). ` +
          `Current key is ${this.masterKey.length} bytes. ` +
          'Generate a new key with the command above.'
        );
      }
    } catch (error) {
      throw new Error(
        `Invalid ENCRYPTION_KEY format. Expected base64-encoded ${this.keyLength}-byte key. ` +
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Encrypt plaintext using AES-256-GCM
   *
   * @param plaintext - The sensitive data to encrypt (e.g., GitHub token)
   * @returns Encrypted string in format: encrypted:${iv}:${authTag}:${ciphertext}
   */
  encrypt(plaintext: string): string {
    if (!plaintext || plaintext.length === 0) {
      throw new Error('Cannot encrypt empty plaintext');
    }

    // Generate random initialization vector (IV) for this encryption
    // Each encryption uses a unique IV to ensure identical plaintexts produce different ciphertexts
    const iv = crypto.randomBytes(16); // 128 bits for GCM

    // Create cipher with AES-256-GCM
    const cipher = crypto.createCipheriv(this.algorithm, this.masterKey, iv);

    // Encrypt the plaintext
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get authentication tag (GCM mode provides this for integrity verification)
    const authTag = (cipher as any).getAuthTag();

    // Return in storage format: prefix:iv:authTag:ciphertext
    return `encrypted:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt ciphertext encrypted with AES-256-GCM
   *
   * @param ciphertext - Encrypted string in format: encrypted:${iv}:${authTag}:${ciphertext}
   * @returns Decrypted plaintext
   * @throws Error if ciphertext is malformed or authentication fails
   */
  decrypt(ciphertext: string): string {
    if (!ciphertext || ciphertext.length === 0) {
      throw new Error('Cannot decrypt empty ciphertext');
    }

    // Parse the storage format
    const parts = ciphertext.split(':');

    if (parts.length !== 4) {
      throw new Error(
        `Invalid ciphertext format. Expected 4 parts (encrypted:iv:authTag:data), got ${parts.length}`
      );
    }

    const [prefix, ivHex, authTagHex, encryptedHex] = parts;

    // Validate prefix
    if (prefix !== 'encrypted') {
      throw new Error(
        `Invalid ciphertext prefix. Expected "encrypted", got "${prefix}"`
      );
    }

    try {
      // Decode hex components
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const encrypted = Buffer.from(encryptedHex, 'hex');

      // Validate component lengths
      if (iv.length !== 16) {
        throw new Error(`Invalid IV length: ${iv.length} bytes (expected 16)`);
      }

      if (authTag.length !== 16) {
        throw new Error(`Invalid auth tag length: ${authTag.length} bytes (expected 16)`);
      }

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.masterKey, iv);

      // Set authentication tag for GCM verification
      (decipher as any).setAuthTag(authTag);

      // Decrypt
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted.toString('utf8');
    } catch (error) {
      // Authentication failure or decryption error
      throw new Error(
        `Decryption failed. This could indicate tampering, wrong key, or corrupted data. ` +
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Validate that a string appears to be encrypted with the correct format
   *
   * @param value - String to check
   * @returns true if value matches encryption format
   */
  isEncrypted(value: string): boolean {
    if (!value) {
      return false;
    }

    const parts = value.split(':');
    return parts.length === 4 && parts[0] === 'encrypted';
  }

  /**
   * Re-encrypt a token (useful for key rotation)
   *
   * @param oldCiphertext - Previously encrypted value
   * @returns Newly encrypted value with fresh IV
   */
  reencrypt(oldCiphertext: string): string {
    const plaintext = this.decrypt(oldCiphertext);
    return this.encrypt(plaintext);
  }
}

// Singleton instance for application-wide use
let encryptionServiceInstance: EncryptionService | null = null;

/**
 * Get singleton EncryptionService instance
 *
 * @returns EncryptionService instance
 */
export function getEncryptionService(): EncryptionService {
  if (!encryptionServiceInstance) {
    encryptionServiceInstance = new EncryptionService();
  }
  return encryptionServiceInstance;
}

// Export singleton instance as default
export default getEncryptionService();

/**
 * End-to-End Encryption Utilities
 * Uses Web Crypto API for ECDH key exchange and AES-GCM encryption
 */

class E2EEncryption {
  constructor() {
    this.keyPair = null;
    this.sharedSecrets = new Map(); // userId -> shared secret
    this.publicKeys = new Map(); // userId -> public key
  }

  /**
   * Generate ECDH key pair
   */
  async generateKeyPair() {
    try {
      this.keyPair = await window.crypto.subtle.generateKey(
        {
          name: 'ECDH',
          namedCurve: 'P-256'
        },
        true, // extractable
        ['deriveKey', 'deriveBits']
      );

      return this.keyPair;
    } catch (error) {
      console.error('Error generating key pair:', error);
      throw error;
    }
  }

  /**
   * Export public key to base64
   */
  async exportPublicKey() {
    if (!this.keyPair) {
      await this.generateKeyPair();
    }

    const exported = await window.crypto.subtle.exportKey(
      'spki',
      this.keyPair.publicKey
    );

    return this.arrayBufferToBase64(exported);
  }

  /**
   * Import public key from base64
   */
  async importPublicKey(base64Key) {
    try {
      const keyData = this.base64ToArrayBuffer(base64Key);

      return await window.crypto.subtle.importKey(
        'spki',
        keyData,
        {
          name: 'ECDH',
          namedCurve: 'P-256'
        },
        true,
        []
      );
    } catch (error) {
      console.error('Error importing public key:', error);
      throw error;
    }
  }

  /**
   * Derive shared secret using ECDH
   */
  async deriveSharedSecret(userId, theirPublicKeyBase64) {
    try {
      if (!this.keyPair) {
        await this.generateKeyPair();
      }

      // Import their public key
      const theirPublicKey = await this.importPublicKey(theirPublicKeyBase64);
      this.publicKeys.set(userId, theirPublicKeyBase64);

      // Derive shared secret
      const sharedSecret = await window.crypto.subtle.deriveKey(
        {
          name: 'ECDH',
          public: theirPublicKey
        },
        this.keyPair.privateKey,
        {
          name: 'AES-GCM',
          length: 256
        },
        false, // not extractable
        ['encrypt', 'decrypt']
      );

      this.sharedSecrets.set(userId, sharedSecret);
      return sharedSecret;
    } catch (error) {
      console.error('Error deriving shared secret:', error);
      throw error;
    }
  }

  /**
   * Encrypt message with AES-GCM
   */
  async encryptMessage(message, userId) {
    try {
      const sharedSecret = this.sharedSecrets.get(userId);

      if (!sharedSecret) {
        throw new Error('No shared secret found for user');
      }

      // Generate random IV (12 bytes for GCM)
      const iv = window.crypto.getRandomValues(new Uint8Array(12));

      // Encode message
      const encoder = new TextEncoder();
      const data = encoder.encode(message);

      // Encrypt
      const encrypted = await window.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv,
          tagLength: 128
        },
        sharedSecret,
        data
      );

      return {
        ciphertext: this.arrayBufferToBase64(encrypted),
        iv: this.arrayBufferToBase64(iv)
      };
    } catch (error) {
      console.error('Error encrypting message:', error);
      throw error;
    }
  }

  /**
   * Decrypt message with AES-GCM
   */
  async decryptMessage(ciphertext, iv, userId) {
    try {
      const sharedSecret = this.sharedSecrets.get(userId);

      if (!sharedSecret) {
        throw new Error('No shared secret found for user');
      }

      // Convert from base64
      const ciphertextBuffer = this.base64ToArrayBuffer(ciphertext);
      const ivBuffer = this.base64ToArrayBuffer(iv);

      // Decrypt
      const decrypted = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: ivBuffer,
          tagLength: 128
        },
        sharedSecret,
        ciphertextBuffer
      );

      // Decode
      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.error('Error decrypting message:', error);
      throw error;
    }
  }

  /**
   * Encrypt file with AES-256
   */
  async encryptFile(file) {
    try {
      // Generate random key for this file
      const key = await window.crypto.subtle.generateKey(
        {
          name: 'AES-GCM',
          length: 256
        },
        true, // extractable
        ['encrypt', 'decrypt']
      );

      // Generate random IV
      const iv = window.crypto.getRandomValues(new Uint8Array(12));

      // Read file as array buffer
      const fileBuffer = await file.arrayBuffer();

      // Encrypt
      const encrypted = await window.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv,
          tagLength: 128
        },
        key,
        fileBuffer
      );

      // Export key
      const exportedKey = await window.crypto.subtle.exportKey('raw', key);

      // Create encrypted blob
      const encryptedBlob = new Blob([encrypted], { type: 'application/octet-stream' });

      return {
        encryptedFile: encryptedBlob,
        key: this.arrayBufferToBase64(exportedKey),
        iv: this.arrayBufferToBase64(iv),
        originalName: file.name,
        originalType: file.type,
        originalSize: file.size
      };
    } catch (error) {
      console.error('Error encrypting file:', error);
      throw error;
    }
  }

  /**
   * Decrypt file with AES-256
   */
  async decryptFile(encryptedBlob, keyBase64, ivBase64, originalName, originalType) {
    try {
      // Import key
      const keyBuffer = this.base64ToArrayBuffer(keyBase64);
      const key = await window.crypto.subtle.importKey(
        'raw',
        keyBuffer,
        {
          name: 'AES-GCM',
          length: 256
        },
        false,
        ['decrypt']
      );

      // Convert IV
      const ivBuffer = this.base64ToArrayBuffer(ivBase64);

      // Read encrypted blob
      const encryptedBuffer = await encryptedBlob.arrayBuffer();

      // Decrypt
      const decrypted = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: ivBuffer,
          tagLength: 128
        },
        key,
        encryptedBuffer
      );

      // Create decrypted blob
      return new Blob([decrypted], { type: originalType });
    } catch (error) {
      console.error('Error decrypting file:', error);
      throw error;
    }
  }

  /**
   * Helper: ArrayBuffer to Base64
   */
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  /**
   * Helper: Base64 to ArrayBuffer
   */
  base64ToArrayBuffer(base64) {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Clear all keys and secrets
   */
  clear() {
    this.keyPair = null;
    this.sharedSecrets.clear();
    this.publicKeys.clear();
  }

  /**
   * Check if encryption is supported
   */
  static isSupported() {
    return !!(window.crypto && window.crypto.subtle);
  }
}

// Singleton instance
const e2eEncryption = new E2EEncryption();

export default e2eEncryption;

// Named exports
export {
  E2EEncryption,
  e2eEncryption
};

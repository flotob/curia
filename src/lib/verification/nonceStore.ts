import { StoredNonce, CHALLENGE_EXPIRY_MS } from './types';

/**
 * In-memory nonce store for challenge replay protection
 * Backend-only - handles server-side state management
 */
export class NonceStore {
  private static store = new Map<string, StoredNonce>();
  private static cleanupInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize the nonce store with automatic cleanup
   */
  static initialize(): void {
    // Clean up expired nonces every minute
    if (!this.cleanupInterval) {
      this.cleanupInterval = setInterval(() => {
        this.cleanupExpired();
      }, 60 * 1000);
    }
  }

  /**
   * Generate and store a new nonce for a challenge
   */
  static storeNonce(nonce: string, upAddress: string, postId: number): void {
    const storedNonce: StoredNonce = {
      nonce,
      upAddress: upAddress.toLowerCase(),
      postId,
      createdAt: new Date(),
      used: false
    };

    this.store.set(nonce, storedNonce);
  }

  /**
   * Validate a nonce and mark it as used
   * Returns true if valid and unused, false otherwise
   */
  static validateAndConsume(
    nonce: string, 
    upAddress: string, 
    postId: number
  ): { valid: boolean; error?: string } {
    const stored = this.store.get(nonce);
    
    if (!stored) {
      return { valid: false, error: 'Nonce not found' };
    }

    // Check if already used
    if (stored.used) {
      return { valid: false, error: 'Nonce already used' };
    }

    // Check if expired
    const now = Date.now();
    const expiryTime = stored.createdAt.getTime() + CHALLENGE_EXPIRY_MS;
    if (now > expiryTime) {
      this.store.delete(nonce); // Clean up expired nonce
      return { valid: false, error: 'Challenge expired' };
    }

    // Check if nonce matches the request context
    if (stored.upAddress !== upAddress.toLowerCase()) {
      return { valid: false, error: 'Nonce address mismatch' };
    }

    if (stored.postId !== postId) {
      return { valid: false, error: 'Nonce post ID mismatch' };
    }

    // Mark as used
    stored.used = true;
    this.store.set(nonce, stored);

    return { valid: true };
  }

  /**
   * Check if a nonce exists and is valid (without consuming it)
   */
  static isValidNonce(nonce: string): boolean {
    const stored = this.store.get(nonce);
    
    if (!stored || stored.used) {
      return false;
    }

    // Check expiry
    const now = Date.now();
    const expiryTime = stored.createdAt.getTime() + CHALLENGE_EXPIRY_MS;
    return now <= expiryTime;
  }

  /**
   * Clean up expired nonces from memory
   */
  private static cleanupExpired(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [nonce, stored] of this.store.entries()) {
      const expiryTime = stored.createdAt.getTime() + CHALLENGE_EXPIRY_MS;
      if (now > expiryTime) {
        this.store.delete(nonce);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`[NonceStore] Cleaned up ${cleanedCount} expired nonces`);
    }
  }

  /**
   * Get store statistics (for monitoring)
   */
  static getStats(): {
    totalNonces: number;
    usedNonces: number;
    validNonces: number;
  } {
    const now = Date.now();
    let used = 0;
    let valid = 0;

    for (const stored of this.store.values()) {
      if (stored.used) {
        used++;
      } else {
        const expiryTime = stored.createdAt.getTime() + CHALLENGE_EXPIRY_MS;
        if (now <= expiryTime) {
          valid++;
        }
      }
    }

    return {
      totalNonces: this.store.size,
      usedNonces: used,
      validNonces: valid
    };
  }

  /**
   * Clear all nonces (for testing)
   */
  static clear(): void {
    this.store.clear();
  }

  /**
   * Shutdown cleanup interval
   */
  static shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
} 
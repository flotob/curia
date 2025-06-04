import crypto from 'crypto';
import { 
  VerificationChallenge, 
  CHALLENGE_EXPIRY_MS, 
  LUKSO_MAINNET_CHAIN_ID 
} from './types';

/**
 * Shared utilities for challenge generation and validation
 * Used by both frontend and backend to ensure consistency
 */
export class ChallengeUtils {
  
  /**
   * Generate a new verification challenge
   */
  static generateChallenge(postId: number, upAddress: string): VerificationChallenge {
    // Generate cryptographically secure random nonce
    const nonce = crypto.randomBytes(16).toString('hex');
    
    return {
      nonce,
      timestamp: Date.now(),
      postId,
      upAddress: upAddress.toLowerCase(), // Normalize address
      chainId: LUKSO_MAINNET_CHAIN_ID,
    };
  }

  /**
   * Create the message to be signed by the user
   * Following research recommendations: include UP address + chain ID + context
   */
  static createSigningMessage(challenge: VerificationChallenge): string {
    const issuedAt = new Date(challenge.timestamp).toISOString();
    
    return `LUKSO Common Ground Comment Challenge:

Profile: ${challenge.upAddress}
PostID: ${challenge.postId}
Nonce: ${challenge.nonce}
Chain: ${challenge.chainId} (LUKSO Mainnet)
Issued At: ${issuedAt}

Sign this message to prove you own the profile and meet the requirements to comment.`;
  }

  /**
   * Validate challenge format and basic properties
   */
  static validateChallengeFormat(challenge: VerificationChallenge): { 
    valid: boolean; 
    error?: string; 
  } {
    // Check required fields
    if (!challenge.nonce || typeof challenge.nonce !== 'string') {
      return { valid: false, error: 'Invalid or missing nonce' };
    }
    
    if (!challenge.timestamp || typeof challenge.timestamp !== 'number') {
      return { valid: false, error: 'Invalid or missing timestamp' };
    }
    
    if (!challenge.postId || typeof challenge.postId !== 'number') {
      return { valid: false, error: 'Invalid or missing postId' };
    }
    
    if (!challenge.upAddress || typeof challenge.upAddress !== 'string') {
      return { valid: false, error: 'Invalid or missing upAddress' };
    }
    
    if (challenge.chainId !== LUKSO_MAINNET_CHAIN_ID) {
      return { valid: false, error: 'Invalid chain ID - must be LUKSO mainnet' };
    }
    
    // Check address format (basic)
    if (!/^0x[a-fA-F0-9]{40}$/.test(challenge.upAddress)) {
      return { valid: false, error: 'Invalid Universal Profile address format' };
    }
    
    // Check nonce format (32 hex characters)
    if (!/^[a-fA-F0-9]{32}$/.test(challenge.nonce)) {
      return { valid: false, error: 'Invalid nonce format' };
    }
    
    return { valid: true };
  }

  /**
   * Check if challenge has expired
   */
  static isExpired(challenge: VerificationChallenge): boolean {
    const now = Date.now();
    const expiryTime = challenge.timestamp + CHALLENGE_EXPIRY_MS;
    return now > expiryTime;
  }

  /**
   * Get time remaining for challenge in seconds
   */
  static getTimeRemaining(challenge: VerificationChallenge): number {
    const now = Date.now();
    const expiryTime = challenge.timestamp + CHALLENGE_EXPIRY_MS;
    const remaining = Math.max(0, expiryTime - now);
    return Math.floor(remaining / 1000);
  }

  /**
   * Create a unique key for challenge storage
   */
  static createChallengeKey(challenge: VerificationChallenge): string {
    return `${challenge.upAddress}:${challenge.postId}:${challenge.nonce}`;
  }
} 
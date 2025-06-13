import crypto from 'crypto';
import { 
  VerificationChallenge,
  UPVerificationChallenge,
  CHALLENGE_EXPIRY_MS, 
  LUKSO_MAINNET_CHAIN_ID 
} from './types';

/**
 * Shared utilities for challenge generation and validation
 * Used by both frontend and backend to ensure consistency
 */
export class ChallengeUtils {
  
  /**
   * Generate a new verification challenge for Universal Profile
   */
  static generateChallenge(postId: number, upAddress: string): UPVerificationChallenge {
    // Generate cryptographically secure random nonce
    const nonce = crypto.randomBytes(16).toString('hex');
    
    return {
      type: 'universal_profile',
      nonce,
      timestamp: Date.now(),
      postId,
      upAddress: upAddress.toLowerCase(), // Normalize address
      address: upAddress.toLowerCase(), // For compatibility with new structure
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
    if (!challenge.timestamp || typeof challenge.timestamp !== 'number') {
      return { valid: false, error: 'Invalid or missing timestamp' };
    }
    
    if (!challenge.postId || typeof challenge.postId !== 'number') {
      return { valid: false, error: 'Invalid or missing postId' };
    }
    
    if (!challenge.type) {
      return { valid: false, error: 'Invalid or missing challenge type' };
    }
    
    // Validate based on challenge type
    if (challenge.type === 'universal_profile') {
      // UP challenges require a nonce field
      if (!challenge.nonce || typeof challenge.nonce !== 'string') {
        return { valid: false, error: 'Invalid or missing nonce' };
      }
      
      if (!challenge.upAddress || typeof challenge.upAddress !== 'string') {
        return { valid: false, error: 'Invalid or missing upAddress for UP challenge' };
      }
      
      if (challenge.chainId !== LUKSO_MAINNET_CHAIN_ID) {
        return { valid: false, error: 'Invalid chain ID - must be LUKSO mainnet for UP challenges' };
      }
      
      // Check UP address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(challenge.upAddress)) {
        return { valid: false, error: 'Invalid Universal Profile address format' };
      }
      
      // Check nonce format (32 hex characters for UP)
      if (!/^[a-fA-F0-9]{32}$/.test(challenge.nonce)) {
        return { valid: false, error: 'Invalid nonce format for UP challenge' };
      }
      
    } else if (challenge.type === 'ethereum_profile') {
      // Ethereum challenges use timestamp as nonce equivalent, no separate nonce field required
      if (!challenge.ethAddress || typeof challenge.ethAddress !== 'string') {
        return { valid: false, error: 'Invalid or missing ethAddress for Ethereum challenge' };
      }
      
      // Ethereum challenges should have signature and message
      if (!challenge.signature || typeof challenge.signature !== 'string') {
        return { valid: false, error: 'Invalid or missing signature for Ethereum challenge' };
      }
      
      if (!challenge.message || typeof challenge.message !== 'string') {
        return { valid: false, error: 'Invalid or missing message for Ethereum challenge' };
      }
      
      // Check Ethereum address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(challenge.ethAddress)) {
        return { valid: false, error: 'Invalid Ethereum address format' };
      }
      
      // Check signature format (should start with 0x and be hex)
      if (!/^0x[a-fA-F0-9]+$/.test(challenge.signature)) {
        return { valid: false, error: 'Invalid signature format' };
      }
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
    // For UP challenges, use nonce; for Ethereum challenges, use timestamp
    const uniqueId = challenge.nonce || challenge.timestamp.toString();
    const address = challenge.upAddress || challenge.ethAddress || 'unknown';
    return `${address}:${challenge.postId}:${uniqueId}`;
  }
} 
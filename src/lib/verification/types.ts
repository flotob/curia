// Shared types for Universal Profile gating verification
// Used by both frontend and backend

export interface VerificationChallenge {
  // Challenge metadata
  nonce: string;           // Random nonce for replay protection
  timestamp: number;       // Unix timestamp for expiry
  postId: number;          // Post being commented on
  chainId: number;         // Chain ID (42 for LUKSO mainnet, 1 for Ethereum mainnet)
  
  // Multi-chain address support
  upAddress?: string;      // Universal Profile address (optional for multi-category)
  ethAddress?: string;     // Ethereum address (optional for multi-category)
  
  // Signature data (added after user signs)
  signature?: string;      // User's signature of challenge
}

export interface VerificationResult {
  isValid: boolean;
  error?: string;
  missingRequirements?: string[];
}

export interface StoredNonce {
  nonce: string;
  upAddress: string;
  postId: number;
  createdAt: Date;
  used: boolean;
}

// Constants
export const CHALLENGE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
export const LUKSO_MAINNET_CHAIN_ID = 42;
export const ERC1271_MAGIC_VALUE = '0x1626ba7e'; 
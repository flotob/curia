// Shared types for Universal Profile gating verification
// Used by both frontend and backend

export interface VerificationChallenge {
  // Challenge metadata
  type: 'universal_profile' | 'ethereum_profile' | 'multi_category'; // Challenge type discriminator
  nonce: string;           // Random nonce for replay protection
  timestamp: number;       // Unix timestamp for expiry
  postId: number;          // Post being commented on
  chainId: number;         // Chain ID (42 for LUKSO mainnet, 1 for Ethereum mainnet)
  
  // Multi-chain address support
  upAddress?: string;      // Universal Profile address (optional for multi-category)
  ethAddress?: string;     // Ethereum address (optional for multi-category)
  address?: string;        // Primary address for single-category challenges
  
  // Signature data (added after user signs)
  signature?: string;      // User's signature of challenge
}

// Specific challenge types for better type safety
export interface UPVerificationChallenge extends VerificationChallenge {
  type: 'universal_profile';
  upAddress: string;
  chainId: 42; // LUKSO mainnet
}

export interface EthereumVerificationChallenge extends VerificationChallenge {
  type: 'ethereum_profile';
  ethAddress: string;
  address: string; // Same as ethAddress for compatibility
  chainId: 1; // Ethereum mainnet
}

export interface MultiCategoryVerificationChallenge extends VerificationChallenge {
  type: 'multi_category';
  categories: {
    type: 'universal_profile' | 'ethereum_profile';
    address: string;
    signature?: string;
  }[];
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
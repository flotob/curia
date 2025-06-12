/**
 * Multi-Category Gating Architecture
 * 
 * This file defines the interfaces and types for the extensible gating system
 * that supports multiple verification methods (UP, ENS, NFT, etc.)
 */

import { ReactNode } from 'react';

// ===== CORE CATEGORY INTERFACES =====

/**
 * Base interface for all gating categories
 */
export interface GatingCategory {
  type: GatingCategoryType;
  enabled: boolean;
  requirements: unknown; // Category-specific requirements
  metadata?: GatingCategoryMetadata;
}

/**
 * Supported gating category types
 */
export type GatingCategoryType = 
  | 'universal_profile'
  | 'ethereum_profile'
  | 'ens_domain'
  | 'nft_collection'
  | 'social_verification'
  | string; // Allow future custom types

/**
 * Category metadata for branding and display
 */
export interface GatingCategoryMetadata {
  name: string;
  description: string;
  icon: string;
  brandColor: string;
  shortName?: string; // For compact displays
}

// ===== VERIFICATION INTERFACES =====

/**
 * Result of verifying a user against category requirements
 */
export interface VerificationResult {
  isValid: boolean;
  missingRequirements: string[];
  errors: string[];
}

/**
 * Status of user verification for a category
 */
export interface VerificationStatus {
  connected: boolean;
  verified: boolean;
  requirements: RequirementStatus[];
  error?: string;
}

/**
 * Status of individual requirement within a category
 */
export interface RequirementStatus {
  key: string;
  name: string;
  required: unknown;
  actual?: unknown;
  satisfied: boolean;
  error?: string;
}

// ===== RENDERER INTERFACES =====

/**
 * Props passed to category renderer components
 */
export interface CategoryRendererProps {
  category: GatingCategory;
  userStatus: VerificationStatus;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onConnect: () => Promise<void>;
  onDisconnect: () => void;
  disabled?: boolean;
}

/**
 * Props for category configuration components
 */
export interface CategoryConfigProps {
  requirements: unknown;
  onChange: (requirements: unknown) => void;
  disabled?: boolean;
}

/**
 * Props for category connection components (commenter-side)
 */
export interface CategoryConnectionProps {
  requirements: unknown;
  onConnect: () => Promise<void>;
  onDisconnect: () => void;
  userStatus?: VerificationStatus;
  disabled?: boolean;
  postId?: number;
  onVerificationComplete?: () => void; // Callback after successful verification
}

/**
 * Abstract interface for category renderers
 */
export interface CategoryRenderer {
  // Display information
  getMetadata(): GatingCategoryMetadata;
  
  // Render components (poster-side)
  renderDisplay(props: CategoryRendererProps): ReactNode;
  renderConfig(props: CategoryConfigProps): ReactNode;
  
  // NEW: Render components (commenter-side)
  renderConnection(props: CategoryConnectionProps): ReactNode;
  
  // Verification logic
  verify(requirements: unknown, userWallet: string): Promise<VerificationResult>;
  
  // NEW: Commenter-side verification methods
  generateChallenge(address: string, postId: number): Promise<unknown>;
  verifyUserRequirements(address: string, requirements: unknown): Promise<VerificationResult>;
  validateSignature(challenge: unknown): Promise<boolean>;
  
  // Requirements processing
  validateRequirements(requirements: unknown): { valid: boolean; errors: string[] };
  getDefaultRequirements(): unknown;
}

// ===== UNIVERSAL PROFILE SPECIFIC TYPES =====

/**
 * Universal Profile gating requirements (existing structure)
 */
export interface UPGatingRequirements {
  minLyxBalance?: string;
  requiredTokens?: TokenRequirement[];
  followerRequirements?: FollowerRequirement[];
}

export interface TokenRequirement {
  contractAddress: string;
  tokenType: 'LSP7' | 'LSP8';
  name?: string;
  symbol?: string;
  minAmount?: string; // For LSP7 or LSP8 collection count
  tokenId?: string;   // For specific LSP8 NFT
}

export interface FollowerRequirement {
  type: 'minimum_followers' | 'followed_by' | 'following';
  value: string; // Number for minimum_followers, UP address for others
  description?: string;
}

/**
 * Universal Profile category implementation
 */
export interface UniversalProfileCategory extends GatingCategory {
  type: 'universal_profile';
  requirements: UPGatingRequirements;
}

// ===== ETHEREUM PROFILE SPECIFIC TYPES =====

/**
 * Ethereum ERC-20 token requirement
 */
export interface ERC20Requirement {
  contractAddress: string;
  minimum: string; // Minimum balance in smallest unit (wei)
  name?: string;
  symbol?: string;
  decimals?: number;
}

/**
 * Ethereum ERC-721 NFT collection requirement
 */
export interface ERC721Requirement {
  contractAddress: string;
  minimumCount?: number; // Minimum number of NFTs (default: 1)
  name?: string;
  symbol?: string;
}

/**
 * Ethereum ERC-1155 semi-fungible token requirement
 */
export interface ERC1155Requirement {
  contractAddress: string;
  tokenId: string;
  minimum: string; // Minimum balance for this token ID
  name?: string;
}

/**
 * EFP (Ethereum Follow Protocol) social requirements
 */
export interface EFPRequirement {
  type: 'minimum_followers' | 'must_follow' | 'must_be_followed_by';
  value: string; // Number for minimum_followers, address for others
  description?: string;
}

/**
 * Ethereum Profile gating requirements
 */
export interface EthereumGatingRequirements {
  // ENS requirements
  requiresENS?: boolean;
  ensDomainPatterns?: string[]; // e.g., ["*.eth", "*.xyz"]
  
  // Native ETH balance
  minimumETHBalance?: string; // in wei
  
  // Token requirements
  requiredERC20Tokens?: ERC20Requirement[];
  requiredERC721Collections?: ERC721Requirement[];
  requiredERC1155Tokens?: ERC1155Requirement[];
  
  // EFP social requirements
  efpRequirements?: EFPRequirement[];
}

/**
 * Ethereum Profile category implementation
 */
export interface EthereumProfileCategory extends GatingCategory {
  type: 'ethereum_profile';
  requirements: EthereumGatingRequirements;
}

// ===== FUTURE CATEGORY TYPES =====

/**
 * ENS Domain gating requirements (future implementation)
 */
export interface ENSDomainRequirements {
  requiredDomains?: string[]; // Specific domains or patterns
  minimumAge?: number; // Days since registration
  subdomainAllowed?: boolean;
  anyDomainAllowed?: boolean; // Any ENS domain counts
}

export interface ENSDomainCategory extends GatingCategory {
  type: 'ens_domain';
  requirements: ENSDomainRequirements;
}

/**
 * NFT Collection gating requirements (future implementation)
 */
export interface NFTCollectionRequirements {
  collections: NFTCollectionSpec[];
  anyCollection?: boolean; // User needs tokens from any of the collections
  allCollections?: boolean; // User needs tokens from all collections
}

export interface NFTCollectionSpec {
  contractAddress: string;
  name?: string;
  minimumCount?: number;
  specificTokenIds?: string[];
}

export interface NFTCollectionCategory extends GatingCategory {
  type: 'nft_collection';
  requirements: NFTCollectionRequirements;
}

// ===== CATEGORY REGISTRY =====

/**
 * Registry for managing category renderers
 */
export interface CategoryRegistry {
  register(type: GatingCategoryType, renderer: CategoryRenderer): void;
  get(type: GatingCategoryType): CategoryRenderer | undefined;
  list(): { type: GatingCategoryType; metadata: GatingCategoryMetadata }[];
  isSupported(type: GatingCategoryType): boolean;
}

// ===== HELPER TYPES =====

/**
 * Union type of all supported category types
 */
export type SupportedGatingCategory = 
  | UniversalProfileCategory
  | EthereumProfileCategory
  | ENSDomainCategory
  | NFTCollectionCategory;

/**
 * Multi-category gating configuration
 */
export interface MultiCategoryGating {
  categories: GatingCategory[];
  requireAll?: boolean; // If true, user must satisfy ALL categories
  requireAny?: boolean; // If true, user must satisfy ANY category (default)
} 
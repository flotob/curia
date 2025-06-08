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
  valid: boolean;
  error?: string;
  details?: Record<string, unknown>; // Additional verification details
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
 * Abstract interface for category renderers
 */
export interface CategoryRenderer {
  // Display information
  getMetadata(): GatingCategoryMetadata;
  
  // Render components
  renderDisplay(props: CategoryRendererProps): ReactNode;
  renderConfig(props: CategoryConfigProps): ReactNode;
  
  // Verification logic
  verify(requirements: unknown, userWallet: string): Promise<VerificationResult>;
  
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
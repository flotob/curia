/**
 * Lock System Types
 * 
 * TypeScript interfaces for the gating locks system that provides
 * reusable, user-friendly gating configurations
 */

import { GatingCategory } from './gating';

/**
 * Database representation of a gating lock
 */
export interface Lock {
  id: number;
  name: string;
  description?: string;
  icon?: string; // Emoji or icon identifier  
  color?: string; // Hex color code for theming
  gatingConfig: LockGatingConfig; // Complete gating configuration
  creatorUserId: string;
  communityId: string;
  isTemplate: boolean; // Curated community template
  isPublic: boolean; // Shareable within community
  tags: string[]; // For categorization and search
  usageCount: number; // Analytics
  successRate: number; // 0-1, percentage who pass verification
  avgVerificationTime: number; // Seconds
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

/**
 * Gating configuration stored in locks
 * Reuses the exact same format as posts.settings.responsePermissions
 */
export interface LockGatingConfig {
  categories: GatingCategory[];
  requireAll?: boolean; // If true, user must satisfy ALL categories
  requireAny?: boolean; // If true, user must satisfy ANY category (default)
}

/**
 * Lock creation/update request
 */
export interface CreateLockRequest {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  gatingConfig: LockGatingConfig;
  tags?: string[];
  isPublic?: boolean;
}

export interface UpdateLockRequest extends Partial<CreateLockRequest> {
  id: number;
}

/**
 * Lock with additional computed properties for UI
 */
export interface LockWithStats extends Lock {
  postsUsingLock: number; // From lock_stats view
  canEdit: boolean; // Based on user permissions
  canDelete: boolean; // Based on user permissions
  isOwned: boolean; // Created by current user
}

/**
 * Lock selection for post creation
 */
export interface LockSelection {
  lockId: number | null;
  customGating?: LockGatingConfig; // For posts that don't use locks
}

/**
 * Lock template categories for organization
 */
export interface LockTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: LockTemplateCategory;
  gatingConfig: LockGatingConfig;
}

export type LockTemplateCategory = 
  | 'ethereum' // ETH holders, ENS, ERC tokens
  | 'lukso' // LYX holders, UP tokens, followers  
  | 'social' // EFP requirements, follower counts
  | 'nft' // NFT collection ownership
  | 'mixed' // Multiple blockchain requirements
  | 'custom'; // User-created

/**
 * Lock analytics data
 */
export interface LockAnalytics {
  lockId: number;
  totalUses: number;
  totalAttempts: number;
  successfulVerifications: number;
  failedVerifications: number;
  avgVerificationTime: number;
  popularityRank: number; // Within community
  recentActivity: LockActivity[];
}

export interface LockActivity {
  type: 'created' | 'applied' | 'verified' | 'failed';
  timestamp: string;
  userId?: string;
  postId?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Lock search and filtering
 */
export interface LockSearchParams {
  communityId: string;
  query?: string; // Search in name/description
  tags?: string[]; // Filter by tags
  category?: LockTemplateCategory; // Filter by category
  creatorUserId?: string; // Filter by creator
  isTemplate?: boolean; // Only templates
  isPublic?: boolean; // Only public locks
  sortBy?: LockSortBy;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export type LockSortBy = 
  | 'name'
  | 'created_at'
  | 'updated_at'
  | 'usage_count'
  | 'success_rate'
  | 'avg_verification_time';

export interface LockSearchResponse {
  locks: LockWithStats[];
  total: number;
  hasMore: boolean;
}

/**
 * Lock validation results
 */
export interface LockValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Lock permission context
 */
export interface LockPermissions {
  canCreate: boolean;
  canEdit: (lock: Lock) => boolean;
  canDelete: (lock: Lock) => boolean;
  canUse: (lock: Lock) => boolean;
  canCreateTemplate: boolean;
}

/**
 * Quick lock presets for common use cases
 */
export interface QuickLock {
  id: string;
  name: string;
  description: string;
  icon: string;
  gatingConfig: LockGatingConfig;
  estimatedSetupTime: number; // Minutes
}

/**
 * Lock builder state for multi-step creation wizard
 */
export interface LockBuilderState {
  step: LockBuilderStep;
  selectedTemplate: any | null; // eslint-disable-line @typescript-eslint/no-explicit-any -- Template from template system (Phase 2) - TODO: proper type after integration
  metadata: Partial<CreateLockRequest>;
  requirements: Partial<LockGatingConfig>;
  validation: LockValidationResult;
  previewMode: boolean;
}

export type LockBuilderStep = 
  | 'metadata' // Name, description, icon, color
  | 'categories' // Select requirement types (UP, Ethereum, etc.)
  | 'configure' // Configure each requirement
  | 'preview' // Preview and test
  | 'save'; // Final save step

/**
 * User-friendly requirement descriptions for UI
 */
export interface RequirementDescription {
  type: string;
  title: string;
  description: string;
  icon: string;
  complexity: 'simple' | 'moderate' | 'advanced';
  estimatedTime: number; // Minutes for users to verify
  examples: string[];
}

/**
 * Lock recommendation engine data
 */
export interface LockRecommendation {
  lock: Lock;
  score: number; // 0-1, relevance score
  reason: string; // Why this lock is recommended
  confidence: number; // 0-1, confidence in recommendation
}

export interface LockRecommendationContext {
  postTitle?: string;
  postContent?: string;
  postTags?: string[];
  boardId?: number;
  userHistory?: number[]; // Lock IDs previously used
  communityTrends?: number[]; // Popular lock IDs in community
}

/**
 * Utility type for lock operations
 */
export type LockOperation = 
  | 'create'
  | 'read' 
  | 'update'
  | 'delete'
  | 'apply'
  | 'clone'
  | 'share'
  | 'analyze';

/**
 * API response types
 */
export interface LockApiResponse<T = Lock> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface LockListResponse extends LockApiResponse<LockWithStats[]> {
  pagination?: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

/**
 * Lock migration utilities for converting existing gated posts
 */
export interface LockMigrationCandidate {
  postId: number;
  gatingConfig: LockGatingConfig;
  matchingLocks: Lock[]; // Existing locks with identical config
  shouldCreateNewLock: boolean;
  suggestedLockName?: string;
}

export interface LockMigrationResult {
  postsProcessed: number;
  locksCreated: number;
  postsLinked: number;
  errors: string[];
} 
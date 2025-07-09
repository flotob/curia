/**
 * Services Layer
 * 
 * Centralized business logic services.
 * Export all services for easy importing.
 */

// Authentication Service
export {
  AuthenticationService,
  type LoginCredentials,
  type AuthUser,
  type LoginResult,
  type SessionPayload,
} from './AuthenticationService';

// Verification Service
export {
  VerificationService,
  type VerificationRequirement,
  type VerificationResult,
  type VerificationChallenge,
  type VerificationContext,
  type UPVerificationStatus,
  type EthereumVerificationStatus,
} from './VerificationService';

// Lock Service
export {
  LockService,
  type LockConfig,
  type Lock,
  type LockUsage,
  type LockStats,
  type CreateLockRequest,
  type UpdateLockRequest,
  type LockSearchFilters,
} from './LockService';

// Semantic Search Service
export {
  SemanticSearchService,
  type SemanticSearchOptions,
  type SemanticSearchResult,
  type CommentSearchResult,
  type RelatedPost,
  type CachedEmbedding,
  type EmbeddingStats,
} from './SemanticSearchService';
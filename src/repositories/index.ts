/**
 * Repository Layer
 * 
 * Data access abstraction layer.
 * Eliminates raw SQL queries from business logic.
 */

// Base Repository
export {
  BaseRepository,
  type QueryOptions,
  type PaginatedResult,
} from './BaseRepository';

// Post Repository
export {
  PostRepository,
  type PostData,
  type PostWithContext,
  type CreatePostData,
  type UpdatePostData,
  type PostFilters,
} from './PostRepository';

// Lock Repository
export {
  LockRepository,
  type LockData,
  type LockWithStats,
  type CreateLockData,
  type UpdateLockData,
  type LockFilters,
  type LockUsageData,
} from './LockRepository';
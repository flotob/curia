/**
 * Lock Service
 * 
 * Centralizes all lock management business logic.
 * Handles lock creation, application, and usage tracking.
 */

import { ValidationError, NotFoundError, ConflictError } from '@/lib/errors';
import { authFetch } from '@/utils/authFetch';

// Gating requirement interfaces
export interface GatingRequirement {
  type: string;
  [key: string]: string | number | boolean | string[] | undefined;
}

export interface GatingCategory {
  type: 'universal_profile' | 'ethereum_profile';
  fulfillment: 'any' | 'all';
  requirements: GatingRequirement[];
}

export interface GatingConfig {
  requireAll: boolean;
  categories: GatingCategory[];
}

// Lock types
export interface LockConfig {
  title: string;
  description?: string;
  gatingConfig: GatingConfig;
  visibility: 'public' | 'community' | 'private';
  tags?: string[];
}

export interface Lock {
  id: number;
  title: string;
  description?: string;
  gatingConfig: GatingConfig;
  visibility: 'public' | 'community' | 'private';
  creatorUserId: string;
  communityId: string;
  usageCount: number;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LockUsage {
  lockId: number;
  postId?: number;
  boardId?: number;
  usedBy: string;
  usedAt: string;
  context: 'post' | 'board';
}

export interface LockStats {
  totalUsage: number;
  uniqueUsers: number;
  recentUsage: Array<{
    date: string;
    count: number;
  }>;
  topPosts?: Array<{
    postId: number;
    title: string;
    usageCount: number;
  }>;
  topBoards?: Array<{
    boardId: number;
    name: string;
    usageCount: number;
  }>;
}

export interface CreateLockRequest {
  title: string;
  description?: string;
  gatingConfig: GatingConfig;
  visibility?: 'public' | 'community' | 'private';
  tags?: string[];
}

export interface UpdateLockRequest {
  title?: string;
  description?: string;
  gatingConfig?: GatingConfig;
  visibility?: 'public' | 'community' | 'private';
  tags?: string[];
}

export interface LockSearchFilters {
  communityId?: string;
  creatorUserId?: string;
  visibility?: 'public' | 'community' | 'private';
  tags?: string[];
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Lock Service
 * 
 * Provides centralized lock management functionality.
 */
export class LockService {
  /**
   * Create a new lock
   */
  static async createLock(
    config: CreateLockRequest,
    creatorUserId: string,
    communityId: string,
    token: string
  ): Promise<Lock> {
    try {
      LockService.validateLockConfig(config);

      const response = await authFetch('/api/locks', {
        method: 'POST',
        body: JSON.stringify({
          ...config,
          creatorUserId,
          communityId,
        }),
        token,
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        if (response.status === 409) {
          throw new ConflictError(
            errorData.error || 'Lock with this title already exists',
            { config, creatorUserId, communityId }
          );
        }
        
        throw new ValidationError(
          errorData.error || 'Failed to create lock',
          { statusCode: response.status, config }
        );
      }

      const result = await response.json();
      return result.lock;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof ConflictError) {
        throw error;
      }
      throw new ValidationError(
        'Lock creation failed',
        { originalError: error, config, creatorUserId, communityId }
      );
    }
  }

  /**
   * Get lock by ID
   */
  static async getLock(lockId: number, token: string): Promise<Lock> {
    try {
      const response = await authFetch(`/api/locks/${lockId}`, {
        token,
      });

      if (response.status === 404) {
        throw new NotFoundError('Lock', lockId);
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new ValidationError(
          errorData.error || 'Failed to fetch lock',
          { statusCode: response.status, lockId }
        );
      }

      const result = await response.json();
      return result.lock;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(
        'Failed to fetch lock',
        { originalError: error, lockId }
      );
    }
  }

  /**
   * Update existing lock
   */
  static async updateLock(
    lockId: number,
    updates: UpdateLockRequest,
    token: string
  ): Promise<Lock> {
    try {
      if (updates.gatingConfig) {
        LockService.validateGatingConfig(updates.gatingConfig);
      }

      const response = await authFetch(`/api/locks/${lockId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
        token,
      });

      if (response.status === 404) {
        throw new NotFoundError('Lock', lockId);
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new ValidationError(
          errorData.error || 'Failed to update lock',
          { statusCode: response.status, lockId, updates }
        );
      }

      const result = await response.json();
      return result.lock;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(
        'Lock update failed',
        { originalError: error, lockId, updates }
      );
    }
  }

  /**
   * Delete lock
   */
  static async deleteLock(lockId: number, token: string): Promise<void> {
    try {
      const response = await authFetch(`/api/locks/${lockId}`, {
        method: 'DELETE',
        token,
      });

      if (response.status === 404) {
        throw new NotFoundError('Lock', lockId);
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new ValidationError(
          errorData.error || 'Failed to delete lock',
          { statusCode: response.status, lockId }
        );
      }
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(
        'Lock deletion failed',
        { originalError: error, lockId }
      );
    }
  }

  /**
   * Search locks with filters
   */
  static async searchLocks(
    filters: LockSearchFilters,
    token: string
  ): Promise<{ locks: Lock[]; total: number }> {
    try {
      const queryParams = new URLSearchParams();
      
      if (filters.communityId) queryParams.set('communityId', filters.communityId);
      if (filters.creatorUserId) queryParams.set('creatorUserId', filters.creatorUserId);
      if (filters.visibility) queryParams.set('visibility', filters.visibility);
      if (filters.search) queryParams.set('search', filters.search);
      if (filters.limit) queryParams.set('limit', filters.limit.toString());
      if (filters.offset) queryParams.set('offset', filters.offset.toString());
      if (filters.tags) queryParams.set('tags', filters.tags.join(','));

      const response = await authFetch(`/api/locks?${queryParams.toString()}`, {
        token,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new ValidationError(
          errorData.error || 'Failed to search locks',
          { statusCode: response.status, filters }
        );
      }

      const result = await response.json();
      return {
        locks: result.locks || [],
        total: result.total || 0,
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(
        'Lock search failed',
        { originalError: error, filters }
      );
    }
  }

  /**
   * Apply lock to post
   */
  static async applyLockToPost(
    lockId: number,
    postId: number,
    token: string
  ): Promise<void> {
    try {
      const response = await authFetch(`/api/posts/${postId}/apply-lock`, {
        method: 'POST',
        body: JSON.stringify({ lockId }),
        token,
      });

      if (response.status === 404) {
        const errorData = await response.json();
        if (errorData.error?.includes('Lock')) {
          throw new NotFoundError('Lock', lockId);
        }
        throw new NotFoundError('Post', postId);
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new ValidationError(
          errorData.error || 'Failed to apply lock to post',
          { statusCode: response.status, lockId, postId }
        );
      }
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(
        'Failed to apply lock to post',
        { originalError: error, lockId, postId }
      );
    }
  }

  /**
   * Get lock usage statistics
   */
  static async getLockStats(lockId: number, token: string): Promise<LockStats> {
    try {
      const response = await authFetch(`/api/locks/${lockId}/usage`, {
        token,
      });

      if (response.status === 404) {
        throw new NotFoundError('Lock', lockId);
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new ValidationError(
          errorData.error || 'Failed to fetch lock statistics',
          { statusCode: response.status, lockId }
        );
      }

      const result = await response.json();
      return result.stats;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(
        'Failed to fetch lock statistics',
        { originalError: error, lockId }
      );
    }
  }

  /**
   * Get lock gating requirements (for verification)
   */
  static async getLockGatingRequirements(
    lockId: number
  ): Promise<{ lockId: number; requireAll: boolean; categories: GatingCategory[] }> {
    try {
      const response = await fetch(`/api/locks/${lockId}/gating-requirements`);

      if (response.status === 404) {
        throw new NotFoundError('Lock', lockId);
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new ValidationError(
          errorData.error || 'Failed to fetch lock gating requirements',
          { statusCode: response.status, lockId }
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(
        'Failed to fetch lock gating requirements',
        { originalError: error, lockId }
      );
    }
  }

  /**
   * Validate lock configuration
   */
  private static validateLockConfig(config: CreateLockRequest): void {
    if (!config.title?.trim()) {
      throw new ValidationError('Lock title is required');
    }

    if (config.title.length > 100) {
      throw new ValidationError('Lock title must be 100 characters or less');
    }

    if (config.description && config.description.length > 500) {
      throw new ValidationError('Lock description must be 500 characters or less');
    }

    if (!config.gatingConfig) {
      throw new ValidationError('Gating configuration is required');
    }

    LockService.validateGatingConfig(config.gatingConfig);

    if (config.visibility && !['public', 'community', 'private'].includes(config.visibility)) {
      throw new ValidationError('Lock visibility must be public, community, or private');
    }

    if (config.tags && config.tags.length > 10) {
      throw new ValidationError('Maximum 10 tags allowed per lock');
    }
  }

  /**
   * Validate gating configuration
   */
  private static validateGatingConfig(gatingConfig: GatingConfig): void {
    if (typeof gatingConfig.requireAll !== 'boolean') {
      throw new ValidationError('Gating config must specify requireAll as boolean');
    }

    if (!Array.isArray(gatingConfig.categories)) {
      throw new ValidationError('Gating config must contain categories array');
    }

    if (gatingConfig.categories.length === 0) {
      throw new ValidationError('At least one gating category is required');
    }

    for (const category of gatingConfig.categories) {
      if (!category.type || !['universal_profile', 'ethereum_profile'].includes(category.type)) {
        throw new ValidationError('Each category must have a valid type (universal_profile or ethereum_profile)');
      }

      if (!category.fulfillment || !['any', 'all'].includes(category.fulfillment)) {
        throw new ValidationError('Each category must specify fulfillment as "any" or "all"');
      }

      if (!Array.isArray(category.requirements) || category.requirements.length === 0) {
        throw new ValidationError('Each category must contain at least one requirement');
      }
    }
  }

  /**
   * Generate lock usage tracking ID
   */
  static generateUsageTrackingId(): string {
    return `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
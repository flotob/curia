/**
 * Post Repository
 * 
 * Abstracts all post-related database operations.
 * Replaces raw SQL queries scattered throughout the codebase.
 * Refactored to leverage enriched_posts view for performance and consistency.
 */

import { BaseRepository, QueryOptions, PaginatedResult } from './BaseRepository';
import { NotFoundError, ValidationError } from '@/lib/errors';
import {
  EnrichedPost,
  PostQueryOptions,
  PaginatedPostsResult,
  getSinglePost,
  getPostsForCommunity as enrichedGetPostsForCommunity,
  getPostsForBoard as enrichedGetPostsForBoard,
  getPostsByAuthor as enrichedGetPostsByAuthor,
  searchPosts as enrichedSearchPosts,
  buildPostsQuery,
  executePostsQuery,
  type SearchFilters
} from '@/lib/queries/enrichedPosts';

// Post types - keeping backward compatibility while extending with enriched data
export interface PostData {
  id: number;
  title: string;
  content: string;
  author_user_id: string;
  board_id: number;
  upvote_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
  tags?: string[];
  lock_id?: number;
  settings?: any;
}

export interface PostWithContext extends PostData {
  author_name: string;
  board_name: string;
  community_id: string;
  board_settings?: any;
  community_settings?: any;
  lock_gating_config?: any;
  // Extended fields from enriched_posts
  author_profile_picture_url?: string;
  user_has_upvoted?: boolean;
  share_access_count?: number;
  share_count?: number;
  last_shared_at?: string;
  most_recent_access_at?: string;
  lock_name?: string;
  lock_description?: string;
  lock_creator_user_id?: string;
  lock_is_public?: boolean;
  lock_is_template?: boolean;
}

export interface CreatePostData {
  title: string;
  content: string;
  author_user_id: string;
  board_id: number;
  tags?: string[];
  lock_id?: number;
  settings?: any;
}

export interface UpdatePostData {
  title?: string;
  content?: string;
  tags?: string[];
  lock_id?: number;
  settings?: any;
}

export interface PostFilters {
  board_id?: number;
  author_user_id?: string;
  tags?: string[];
  search?: string;
  lock_id?: number;
  community_id?: string;
}

/**
 * Performance logging utility
 */
const logPerformance = (method: string, startTime: number, resultCount: number, params?: any) => {
  const duration = Date.now() - startTime;
  console.log(`[PostRepository] ${method} completed in ${duration}ms`, {
    resultCount,
    duration,
    params: params ? JSON.stringify(params) : undefined
  });
};

/**
 * Convert EnrichedPost to PostWithContext format for backward compatibility
 */
const enrichedToContext = (enriched: EnrichedPost): PostWithContext => ({
  id: enriched.id,
  title: enriched.title,
  content: enriched.content,
  author_user_id: enriched.author_user_id,
  board_id: enriched.board_id,
  upvote_count: enriched.upvote_count,
  comment_count: enriched.comment_count,
  created_at: enriched.created_at,
  updated_at: enriched.updated_at,
  tags: enriched.tags ?? undefined,
  lock_id: enriched.lock_id,
  settings: enriched.settings,
  author_name: enriched.author_name || '',
  board_name: enriched.board_name,
  community_id: enriched.community_id || enriched.board_community_id || '',
  board_settings: enriched.board_settings,
  community_settings: enriched.community_settings,
  lock_gating_config: enriched.lock_gating_config,
  // Extended enriched fields
  author_profile_picture_url: enriched.author_profile_picture_url,
  user_has_upvoted: enriched.user_has_upvoted,
  share_access_count: enriched.share_access_count,
  share_count: enriched.share_count,
  last_shared_at: enriched.last_shared_at,
  most_recent_access_at: enriched.most_recent_access_at,
  lock_name: enriched.lock_name,
  lock_description: enriched.lock_description,
  lock_creator_user_id: enriched.lock_creator_user_id,
  lock_is_public: enriched.lock_is_public,
  lock_is_template: enriched.lock_is_template
});

/**
 * Convert PaginatedPostsResult to legacy PaginatedResult format
 */
const enrichedToPaginated = <T>(
  enrichedResult: PaginatedPostsResult,
  converter: (post: EnrichedPost) => T
): PaginatedResult<T> => ({
  items: enrichedResult.posts.map(converter),
  total: enrichedResult.pagination.total || 0,
  limit: enrichedResult.pagination.limit,
  offset: 0, // Enriched uses cursor pagination, legacy uses offset
  hasMore: enrichedResult.pagination.hasMore
});

/**
 * Post Repository
 * 
 * Centralized database operations for posts using enriched_posts utilities.
 */
export class PostRepository extends BaseRepository {
  /**
   * Find post by ID with full context - MIGRATED to enriched_posts
   */
  static async findByIdWithContext(postId: number, userId?: string): Promise<PostWithContext | null> {
    const startTime = Date.now();
    this.validateRequired({ postId }, ['postId']);

    try {
      const enrichedPost = await getSinglePost(postId, userId);
      
      logPerformance('findByIdWithContext', startTime, enrichedPost ? 1 : 0, { postId, userId });
      
      return enrichedPost ? enrichedToContext(enrichedPost) : null;
    } catch (error) {
      console.error('[PostRepository] Error in findByIdWithContext:', error);
      throw error;
    }
  }

  /**
   * Find post by ID (basic data only) - keeping lightweight for simple use cases
   */
  static async findById(postId: number): Promise<PostData | null> {
    this.validateRequired({ postId }, ['postId']);

    const query = `
      SELECT * FROM posts WHERE id = $1
    `;

    return await this.findOne<PostData>(query, [postId]);
  }

  /**
   * Get posts for community - NEW METHOD using enriched_posts
   */
  static async getPostsForCommunity(
    communityId: string,
    accessibleBoardIds: number[],
    userId?: string,
    options: Partial<PostQueryOptions> = {}
  ): Promise<PaginatedResult<PostWithContext>> {
    const startTime = Date.now();
    this.validateRequired({ communityId, accessibleBoardIds }, ['communityId', 'accessibleBoardIds']);

    try {
      const enrichedResult = await enrichedGetPostsForCommunity(
        communityId,
        accessibleBoardIds,
        userId,
        options
      );

      logPerformance('getPostsForCommunity', startTime, enrichedResult.posts.length, {
        communityId,
        boardCount: accessibleBoardIds.length,
        userId,
        options
      });

      return enrichedToPaginated(enrichedResult, enrichedToContext);
    } catch (error) {
      console.error('[PostRepository] Error in getPostsForCommunity:', error);
      throw error;
    }
  }

  /**
   * Get posts for board - NEW METHOD using enriched_posts
   */
  static async getPostsForBoard(
    boardId: number,
    userId?: string,
    options: Partial<PostQueryOptions> = {}
  ): Promise<PaginatedResult<PostWithContext>> {
    const startTime = Date.now();
    this.validateRequired({ boardId }, ['boardId']);

    try {
      const enrichedResult = await enrichedGetPostsForBoard(boardId, userId, options);

      logPerformance('getPostsForBoard', startTime, enrichedResult.posts.length, {
        boardId,
        userId,
        options
      });

      return enrichedToPaginated(enrichedResult, enrichedToContext);
    } catch (error) {
      console.error('[PostRepository] Error in getPostsForBoard:', error);
      throw error;
    }
  }

  /**
   * Get posts by author - NEW METHOD using enriched_posts
   */
  static async getPostsByAuthor(
    authorId: string,
    accessibleBoardIds: number[],
    userId?: string,
    options: Partial<PostQueryOptions> = {}
  ): Promise<PaginatedResult<PostWithContext>> {
    const startTime = Date.now();
    this.validateRequired({ authorId, accessibleBoardIds }, ['authorId', 'accessibleBoardIds']);

    try {
      const enrichedResult = await enrichedGetPostsByAuthor(
        authorId,
        accessibleBoardIds,
        userId,
        options
      );

      logPerformance('getPostsByAuthor', startTime, enrichedResult.posts.length, {
        authorId,
        boardCount: accessibleBoardIds.length,
        userId,
        options
      });

      return enrichedToPaginated(enrichedResult, enrichedToContext);
    } catch (error) {
      console.error('[PostRepository] Error in getPostsByAuthor:', error);
      throw error;
    }
  }

  /**
   * Search posts - NEW METHOD using enriched_posts
   */
  static async searchPosts(
    searchTerm: string,
    accessibleBoardIds: number[],
    userId?: string,
    filters: SearchFilters = {},
    limit = 10
  ): Promise<PostWithContext[]> {
    const startTime = Date.now();
    this.validateRequired({ searchTerm, accessibleBoardIds }, ['searchTerm', 'accessibleBoardIds']);

    try {
      const enrichedPosts = await enrichedSearchPosts(
        searchTerm,
        accessibleBoardIds,
        userId,
        filters,
        limit
      );

      logPerformance('searchPosts', startTime, enrichedPosts.length, {
        searchTerm,
        boardCount: accessibleBoardIds.length,
        userId,
        filters,
        limit
      });

      return enrichedPosts.map(enrichedToContext);
    } catch (error) {
      console.error('[PostRepository] Error in searchPosts:', error);
      throw error;
    }
  }

  /**
   * Get popular posts - NEW METHOD using enriched_posts
   */
  static async getPopularPosts(
    accessibleBoardIds: number[],
    communityId?: string,
    userId?: string,
    options: Partial<PostQueryOptions> = {}
  ): Promise<PaginatedResult<PostWithContext>> {
    const startTime = Date.now();
    this.validateRequired({ accessibleBoardIds }, ['accessibleBoardIds']);

    try {
      // Use custom query builder for popularity sorting
      const queryOptions: PostQueryOptions = {
        ...options,
        communityId,
        boardIds: accessibleBoardIds,
        userId,
        sortBy: 'popularity',
        sortOrder: 'DESC',
        includeUserVoting: !!userId,
        includeShareStats: true,
        includeLockInfo: true,
        includeCommunityInfo: true,
        limit: options.limit || 20
      };

      const queryResult = await buildPostsQuery(queryOptions);
      const enrichedPosts = await executePostsQuery(queryResult);

      logPerformance('getPopularPosts', startTime, enrichedPosts.length, {
        boardCount: accessibleBoardIds.length,
        communityId,
        userId,
        options
      });

      // Convert to paginated result format
      const paginatedResult: PaginatedPostsResult = {
        posts: enrichedPosts,
        pagination: {
          hasMore: enrichedPosts.length === (options.limit || 20),
          limit: options.limit || 20,
          total: enrichedPosts.length
        }
      };

      return enrichedToPaginated(paginatedResult, enrichedToContext);
    } catch (error) {
      console.error('[PostRepository] Error in getPopularPosts:', error);
      throw error;
    }
  }

  /**
   * Find posts by board ID with pagination - REFACTORED to use enriched_posts
   */
  static async findByBoardId(
    boardId: number,
    options: QueryOptions = {}
  ): Promise<PaginatedResult<PostData>> {
    const startTime = Date.now();
    
    // Use the new getPostsForBoard method and convert to legacy format
    const enrichedOptions: Partial<PostQueryOptions> = {
      limit: options.limit,
      offset: options.offset,
      includeShareStats: false, // Keep lightweight for backward compatibility
      includeLockInfo: false,
      includeCommunityInfo: false
    };

    const result = await this.getPostsForBoard(boardId, undefined, enrichedOptions);
    
    logPerformance('findByBoardId', startTime, result.items.length, { boardId, options });

    // Convert PostWithContext back to PostData for backward compatibility
    return {
      ...result,
      items: result.items.map(item => ({
        id: item.id,
        title: item.title,
        content: item.content,
        author_user_id: item.author_user_id,
        board_id: item.board_id,
        upvote_count: item.upvote_count,
        comment_count: item.comment_count,
        created_at: item.created_at,
        updated_at: item.updated_at,
        tags: item.tags,
        lock_id: item.lock_id,
        settings: item.settings
      }))
    };
  }

  /**
   * Search posts with filters - REFACTORED to use enriched_posts
   */
  static async search(
    filters: PostFilters,
    options: QueryOptions = {}
  ): Promise<PaginatedResult<PostWithContext>> {
    const startTime = Date.now();

    try {
      // Convert PostFilters to enriched search parameters
      if (filters.search) {
        // Use searchPosts for text search
        const accessibleBoardIds = filters.board_id ? [filters.board_id] : [];
        const searchFilters: SearchFilters = {
          boardId: filters.board_id,
          tags: filters.tags,
          authorId: filters.author_user_id
        };

        const searchResults = await this.searchPosts(
          filters.search,
          accessibleBoardIds,
          undefined,
          searchFilters,
          options.limit || 10
        );

        logPerformance('search', startTime, searchResults.length, { filters, options });

                 return {
           items: searchResults,
           total: searchResults.length,
           limit: options.limit || 10,
           offset: 0,
           hasMore: searchResults.length === (options.limit || 10)
         };
      } else {
        // Use custom query builder for other filters
        const queryOptions: PostQueryOptions = {
          boardId: filters.board_id,
          authorId: filters.author_user_id,
          communityId: filters.community_id,
          lockId: filters.lock_id,
          tags: filters.tags,
          tagOperator: 'AND',
          limit: options.limit || 20,
          includeUserVoting: false,
          includeShareStats: true,
          includeLockInfo: true,
          includeCommunityInfo: true
        };

        const queryResult = await buildPostsQuery(queryOptions);
        const enrichedPosts = await executePostsQuery(queryResult);

        logPerformance('search', startTime, enrichedPosts.length, { filters, options });

        const paginatedResult: PaginatedPostsResult = {
          posts: enrichedPosts,
          pagination: {
            hasMore: enrichedPosts.length === (options.limit || 20),
            limit: options.limit || 20,
            total: enrichedPosts.length
          }
        };

        return enrichedToPaginated(paginatedResult, enrichedToContext);
      }
    } catch (error) {
      console.error('[PostRepository] Error in search:', error);
      throw error;
    }
  }

  /**
   * Get popular posts by upvote count - REFACTORED to use new method
   */
  static async findPopular(
    communityId?: string,
    options: QueryOptions = {}
  ): Promise<PaginatedResult<PostWithContext>> {
    const startTime = Date.now();
    
    // For backward compatibility, we need to get all accessible boards
    // In practice, this method should receive accessible board IDs
    const accessibleBoardIds: number[] = []; // This should be provided by caller
    
    const enrichedOptions: Partial<PostQueryOptions> = {
      limit: options.limit,
      offset: options.offset
    };

    const result = await this.getPopularPosts(accessibleBoardIds, communityId, undefined, enrichedOptions);
    
    logPerformance('findPopular', startTime, result.items.length, { communityId, options });
    
    return result;
  }

  /**
   * Create new post
   */
  static async create(data: CreatePostData): Promise<PostData> {
    const startTime = Date.now();
    const sanitized = this.sanitizeInput(data);
    this.validateRequired(sanitized, ['title', 'content', 'author_user_id', 'board_id']);

    const query = `
      INSERT INTO posts (
        title, content, author_user_id, board_id, tags, lock_id, settings, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
      ) RETURNING *
    `;

    const values = [
      sanitized.title,
      sanitized.content,
      sanitized.author_user_id,
      sanitized.board_id,
      sanitized.tags || null,
      sanitized.lock_id || null,
      sanitized.settings ? JSON.stringify(sanitized.settings) : null,
    ];

    try {
      const result = await this.insertOne<PostData>(query, values);
      logPerformance('create', startTime, 1, { title: sanitized.title, board_id: sanitized.board_id });
      return result;
    } catch (error) {
      console.error('[PostRepository] Error in create:', error);
      throw error;
    }
  }

  /**
   * Update existing post
   */
  static async update(postId: number, data: UpdatePostData): Promise<PostData | null> {
    const startTime = Date.now();
    this.validateRequired({ postId }, ['postId']);

    const sanitized = this.sanitizeInput(data);
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Build dynamic UPDATE clause
    if (sanitized.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(sanitized.title);
    }

    if (sanitized.content !== undefined) {
      updates.push(`content = $${paramIndex++}`);
      values.push(sanitized.content);
    }

    if (sanitized.tags !== undefined) {
      updates.push(`tags = $${paramIndex++}`);
      values.push(sanitized.tags);
    }

    if (sanitized.lock_id !== undefined) {
      updates.push(`lock_id = $${paramIndex++}`);
      values.push(sanitized.lock_id);
    }

    if (sanitized.settings !== undefined) {
      updates.push(`settings = $${paramIndex++}`);
      values.push(sanitized.settings ? JSON.stringify(sanitized.settings) : null);
    }

    if (updates.length === 0) {
      throw new ValidationError('No fields to update');
    }

    updates.push(`updated_at = NOW()`);
    values.push(postId);

    const query = `
      UPDATE posts 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    try {
      const result = await this.updateOne<PostData>(query, values);
      logPerformance('update', startTime, result ? 1 : 0, { postId, updatedFields: updates.length });
      return result;
    } catch (error) {
      console.error('[PostRepository] Error in update:', error);
      throw error;
    }
  }

  /**
   * Delete post
   */
  static async delete(postId: number): Promise<boolean> {
    const startTime = Date.now();
    this.validateRequired({ postId }, ['postId']);

    const query = `DELETE FROM posts WHERE id = $1`;
    
    try {
      const deletedCount = await this.deleteRows(query, [postId]);
      logPerformance('delete', startTime, deletedCount, { postId });
      return deletedCount > 0;
    } catch (error) {
      console.error('[PostRepository] Error in delete:', error);
      throw error;
    }
  }

  /**
   * Apply lock to post
   */
  static async applyLock(postId: number, lockId: number): Promise<PostData | null> {
    const startTime = Date.now();
    this.validateRequired({ postId, lockId }, ['postId', 'lockId']);

    const query = `
      UPDATE posts 
      SET lock_id = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    try {
      const result = await this.updateOne<PostData>(query, [lockId, postId]);
      logPerformance('applyLock', startTime, result ? 1 : 0, { postId, lockId });
      return result;
    } catch (error) {
      console.error('[PostRepository] Error in applyLock:', error);
      throw error;
    }
  }

  /**
   * Remove lock from post
   */
  static async removeLock(postId: number): Promise<PostData | null> {
    const startTime = Date.now();
    this.validateRequired({ postId }, ['postId']);

    const query = `
      UPDATE posts 
      SET lock_id = NULL, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    try {
      const result = await this.updateOne<PostData>(query, [postId]);
      logPerformance('removeLock', startTime, result ? 1 : 0, { postId });
      return result;
    } catch (error) {
      console.error('[PostRepository] Error in removeLock:', error);
      throw error;
    }
  }

  /**
   * Update post vote count
   */
  static async updateVoteCount(postId: number, increment: number = 1): Promise<PostData | null> {
    const startTime = Date.now();
    this.validateRequired({ postId }, ['postId']);

    const query = `
      UPDATE posts 
      SET upvote_count = upvote_count + $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    try {
      const result = await this.updateOne<PostData>(query, [increment, postId]);
      logPerformance('updateVoteCount', startTime, result ? 1 : 0, { postId, increment });
      return result;
    } catch (error) {
      console.error('[PostRepository] Error in updateVoteCount:', error);
      throw error;
    }
  }

  /**
   * Update post comment count
   */
  static async updateCommentCount(postId: number, increment: number = 1): Promise<PostData | null> {
    const startTime = Date.now();
    this.validateRequired({ postId }, ['postId']);

    const query = `
      UPDATE posts 
      SET comment_count = comment_count + $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    try {
      const result = await this.updateOne<PostData>(query, [increment, postId]);
      logPerformance('updateCommentCount', startTime, result ? 1 : 0, { postId, increment });
      return result;
    } catch (error) {
      console.error('[PostRepository] Error in updateCommentCount:', error);
      throw error;
    }
  }

  /**
   * Get posts by lock ID - REFACTORED to use enriched_posts utilities
   */
  static async findByLockId(
    lockId: number,
    options: QueryOptions = {}
  ): Promise<PaginatedResult<PostData>> {
    const startTime = Date.now();
    this.validateRequired({ lockId }, ['lockId']);

    try {
      // Use custom query builder for lock filtering
      const queryOptions: PostQueryOptions = {
        lockId,
        limit: options.limit || 20,
        offset: options.offset || 0,
        includeShareStats: false, // Keep lightweight for backward compatibility
        includeLockInfo: false,
        includeCommunityInfo: false,
        includeUserVoting: false
      };

      const queryResult = await buildPostsQuery(queryOptions);
      const enrichedPosts = await executePostsQuery(queryResult);

      logPerformance('findByLockId', startTime, enrichedPosts.length, { lockId, options });

      // Convert to PostData format for backward compatibility
      const posts: PostData[] = enrichedPosts.map(enriched => ({
        id: enriched.id,
        title: enriched.title,
        content: enriched.content,
        author_user_id: enriched.author_user_id,
        board_id: enriched.board_id,
        upvote_count: enriched.upvote_count,
        comment_count: enriched.comment_count,
        created_at: enriched.created_at,
        updated_at: enriched.updated_at,
        tags: enriched.tags ?? undefined,
        lock_id: enriched.lock_id,
        settings: enriched.settings
      }));

      return {
        items: posts,
        total: posts.length, // This is an approximation since we don't have exact count
        limit: options.limit || 20,
        offset: options.offset || 0,
        hasMore: posts.length === (options.limit || 20)
      };
    } catch (error) {
      console.error('[PostRepository] Error in findByLockId:', error);
      throw error;
    }
  }
}
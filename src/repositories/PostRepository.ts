/**
 * Post Repository
 * 
 * Abstracts all post-related database operations.
 * Replaces raw SQL queries scattered throughout the codebase.
 */

import { BaseRepository, QueryOptions, PaginatedResult } from './BaseRepository';
import { NotFoundError, ValidationError } from '@/lib/errors';

// Post types
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
 * Post Repository
 * 
 * Centralized database operations for posts.
 */
export class PostRepository extends BaseRepository {
  /**
   * Find post by ID with full context
   */
  static async findByIdWithContext(postId: number): Promise<PostWithContext | null> {
    this.validateRequired({ postId }, ['postId']);

    const query = `
      SELECT 
        p.id, p.title, p.content, p.upvote_count, p.comment_count, 
        p.created_at, p.updated_at, p.tags, p.settings, p.lock_id, p.author_user_id, p.board_id,
        b.name as board_name, b.settings as board_settings, b.community_id,
        c.settings as community_settings,
        u.name as author_name,
        l.gating_config as lock_gating_config
      FROM posts p
      JOIN boards b ON p.board_id = b.id  
      JOIN communities c ON b.community_id = c.id
      JOIN users u ON p.author_user_id = u.user_id
      LEFT JOIN locks l ON p.lock_id = l.id
      WHERE p.id = $1
    `;

    return await this.findOne<PostWithContext>(query, [postId]);
  }

  /**
   * Find post by ID (basic data only)
   */
  static async findById(postId: number): Promise<PostData | null> {
    this.validateRequired({ postId }, ['postId']);

    const query = `
      SELECT * FROM posts WHERE id = $1
    `;

    return await this.findOne<PostData>(query, [postId]);
  }

  /**
   * Find posts by board ID with pagination
   */
  static async findByBoardId(
    boardId: number,
    options: QueryOptions = {}
  ): Promise<PaginatedResult<PostData>> {
    this.validateRequired({ boardId }, ['boardId']);

    const baseQuery = `
      SELECT p.*, u.name as author_name
      FROM posts p
      JOIN users u ON p.author_user_id = u.user_id
      WHERE p.board_id = $1
    `;

    const countQuery = `
      SELECT COUNT(*) FROM posts WHERE board_id = $1
    `;

    return await this.findPaginated<PostData>(
      baseQuery,
      countQuery,
      [boardId],
      options
    );
  }

  /**
   * Search posts with filters
   */
  static async search(
    filters: PostFilters,
    options: QueryOptions = {}
  ): Promise<PaginatedResult<PostWithContext>> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Build dynamic WHERE clause
    if (filters.board_id) {
      conditions.push(`p.board_id = $${paramIndex++}`);
      values.push(filters.board_id);
    }

    if (filters.author_user_id) {
      conditions.push(`p.author_user_id = $${paramIndex++}`);
      values.push(filters.author_user_id);
    }

    if (filters.lock_id) {
      conditions.push(`p.lock_id = $${paramIndex++}`);
      values.push(filters.lock_id);
    }

    if (filters.community_id) {
      conditions.push(`b.community_id = $${paramIndex++}`);
      values.push(filters.community_id);
    }

    if (filters.search) {
      conditions.push(`(p.title ILIKE $${paramIndex} OR p.content ILIKE $${paramIndex})`);
      values.push(`%${filters.search}%`);
      paramIndex++;
    }

    if (filters.tags && filters.tags.length > 0) {
      conditions.push(`p.tags && $${paramIndex++}`);
      values.push(filters.tags);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const baseQuery = `
      SELECT 
        p.*, 
        u.name as author_name,
        b.name as board_name,
        b.community_id,
        b.settings as board_settings,
        c.settings as community_settings,
        l.gating_config as lock_gating_config
      FROM posts p
      JOIN users u ON p.author_user_id = u.user_id
      JOIN boards b ON p.board_id = b.id
      JOIN communities c ON b.community_id = c.id
      LEFT JOIN locks l ON p.lock_id = l.id
      ${whereClause}
    `;

    const countQuery = `
      SELECT COUNT(*) 
      FROM posts p
      JOIN boards b ON p.board_id = b.id
      JOIN communities c ON b.community_id = c.id
      ${whereClause}
    `;

    return await this.findPaginated<PostWithContext>(
      baseQuery,
      countQuery,
      values,
      options
    );
  }

  /**
   * Create new post
   */
  static async create(data: CreatePostData): Promise<PostData> {
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

    return await this.insertOne<PostData>(query, values);
  }

  /**
   * Update existing post
   */
  static async update(postId: number, data: UpdatePostData): Promise<PostData | null> {
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

    return await this.updateOne<PostData>(query, values);
  }

  /**
   * Delete post
   */
  static async delete(postId: number): Promise<boolean> {
    this.validateRequired({ postId }, ['postId']);

    const query = `DELETE FROM posts WHERE id = $1`;
    const deletedCount = await this.deleteRows(query, [postId]);
    
    return deletedCount > 0;
  }

  /**
   * Apply lock to post
   */
  static async applyLock(postId: number, lockId: number): Promise<PostData | null> {
    this.validateRequired({ postId, lockId }, ['postId', 'lockId']);

    const query = `
      UPDATE posts 
      SET lock_id = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    return await this.updateOne<PostData>(query, [lockId, postId]);
  }

  /**
   * Remove lock from post
   */
  static async removeLock(postId: number): Promise<PostData | null> {
    this.validateRequired({ postId }, ['postId']);

    const query = `
      UPDATE posts 
      SET lock_id = NULL, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    return await this.updateOne<PostData>(query, [postId]);
  }

  /**
   * Update post vote count
   */
  static async updateVoteCount(postId: number, increment: number = 1): Promise<PostData | null> {
    this.validateRequired({ postId }, ['postId']);

    const query = `
      UPDATE posts 
      SET upvote_count = upvote_count + $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    return await this.updateOne<PostData>(query, [increment, postId]);
  }

  /**
   * Update post comment count
   */
  static async updateCommentCount(postId: number, increment: number = 1): Promise<PostData | null> {
    this.validateRequired({ postId }, ['postId']);

    const query = `
      UPDATE posts 
      SET comment_count = comment_count + $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    return await this.updateOne<PostData>(query, [increment, postId]);
  }

  /**
   * Get posts by lock ID
   */
  static async findByLockId(
    lockId: number,
    options: QueryOptions = {}
  ): Promise<PaginatedResult<PostData>> {
    this.validateRequired({ lockId }, ['lockId']);

    const baseQuery = `
      SELECT p.*, u.name as author_name
      FROM posts p
      JOIN users u ON p.author_user_id = u.user_id
      WHERE p.lock_id = $1
    `;

    const countQuery = `
      SELECT COUNT(*) FROM posts WHERE lock_id = $1
    `;

    return await this.findPaginated<PostData>(
      baseQuery,
      countQuery,
      [lockId],
      options
    );
  }

  /**
   * Get popular posts by upvote count
   */
  static async findPopular(
    communityId?: string,
    options: QueryOptions = {}
  ): Promise<PaginatedResult<PostWithContext>> {
    const values: any[] = [];
    let whereClause = '';
    
    if (communityId) {
      whereClause = 'WHERE c.id = $1';
      values.push(communityId);
    }

    const baseQuery = `
      SELECT 
        p.*, 
        u.name as author_name,
        b.name as board_name,
        b.community_id,
        b.settings as board_settings,
        c.settings as community_settings,
        l.gating_config as lock_gating_config
      FROM posts p
      JOIN users u ON p.author_user_id = u.user_id
      JOIN boards b ON p.board_id = b.id
      JOIN communities c ON b.community_id = c.id
      LEFT JOIN locks l ON p.lock_id = l.id
      ${whereClause}
    `;

    const countQuery = `
      SELECT COUNT(*) 
      FROM posts p
      JOIN boards b ON p.board_id = b.id
      JOIN communities c ON b.community_id = c.id
      ${whereClause}
    `;

    // Override default ordering to sort by upvote count
    const popularOptions = {
      ...options,
      orderBy: 'p.upvote_count',
      orderDirection: 'DESC' as const,
    };

    return await this.findPaginated<PostWithContext>(
      baseQuery,
      countQuery,
      values,
      popularOptions
    );
  }
}
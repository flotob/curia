/**
 * Lock Repository
 * 
 * Abstracts all lock-related database operations.
 * Replaces raw SQL queries for lock management.
 */

import { BaseRepository, QueryOptions, PaginatedResult } from './BaseRepository';
import { ValidationError } from '@/lib/errors';

// Lock types
export interface LockData {
  id: number;
  title: string;
  description?: string;
  gating_config: any;
  visibility: 'public' | 'community' | 'private';
  creator_user_id: string;
  community_id: string;
  usage_count: number;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface LockWithStats extends LockData {
  creator_name: string;
  recent_usage_count: number;
  unique_users_count: number;
}

export interface CreateLockData {
  title: string;
  description?: string;
  gating_config: any;
  visibility?: 'public' | 'community' | 'private';
  creator_user_id: string;
  community_id: string;
  tags?: string[];
}

export interface UpdateLockData {
  title?: string;
  description?: string;
  gating_config?: any;
  visibility?: 'public' | 'community' | 'private';
  tags?: string[];
}

export interface LockFilters {
  creator_user_id?: string;
  community_id?: string;
  visibility?: 'public' | 'community' | 'private';
  tags?: string[];
  search?: string;
}

export interface LockUsageData {
  lock_id: number;
  post_id?: number;
  board_id?: number;
  used_by: string;
  used_at: string;
  context: 'post' | 'board';
}

/**
 * Lock Repository
 * 
 * Centralized database operations for locks.
 */
export class LockRepository extends BaseRepository {
  /**
   * Find lock by ID
   */
  static async findById(lockId: number): Promise<LockData | null> {
    super.validateRequired({ lockId }, ['lockId']);

    const query = `
      SELECT * FROM locks WHERE id = $1
    `;

    return await super.findOne<LockData>(query, [lockId]);
  }

  /**
   * Find lock by ID with stats
   */
  static async findByIdWithStats(lockId: number): Promise<LockWithStats | null> {
    super.validateRequired({ lockId }, ['lockId']);

    const query = `
      SELECT 
        l.*,
        u.name as creator_name,
        COALESCE(recent_usage.count, 0) as recent_usage_count,
        COALESCE(unique_users.count, 0) as unique_users_count
      FROM locks l
      JOIN users u ON l.creator_user_id = u.user_id
      LEFT JOIN (
        SELECT lock_id, COUNT(*) as count
        FROM lock_usage 
        WHERE used_at > NOW() - INTERVAL '30 days'
        GROUP BY lock_id
      ) recent_usage ON l.id = recent_usage.lock_id
      LEFT JOIN (
        SELECT lock_id, COUNT(DISTINCT used_by) as count
        FROM lock_usage
        GROUP BY lock_id
      ) unique_users ON l.id = unique_users.lock_id
      WHERE l.id = $1
    `;

    return await super.findOne<LockWithStats>(query, [lockId]);
  }

  /**
   * Search locks with filters
   */
  static async search(
    filters: LockFilters,
    options: QueryOptions = {}
  ): Promise<PaginatedResult<LockWithStats>> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Build dynamic WHERE clause
    if (filters.creator_user_id) {
      conditions.push(`l.creator_user_id = $${paramIndex++}`);
      values.push(filters.creator_user_id);
    }

    if (filters.community_id) {
      conditions.push(`l.community_id = $${paramIndex++}`);
      values.push(filters.community_id);
    }

    if (filters.visibility) {
      conditions.push(`l.visibility = $${paramIndex++}`);
      values.push(filters.visibility);
    }

    if (filters.search) {
      conditions.push(`(l.title ILIKE $${paramIndex} OR l.description ILIKE $${paramIndex})`);
      values.push(`%${filters.search}%`);
      paramIndex++;
    }

    if (filters.tags && filters.tags.length > 0) {
      conditions.push(`l.tags && $${paramIndex++}`);
      values.push(filters.tags);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const baseQuery = `
      SELECT 
        l.*,
        u.name as creator_name,
        COALESCE(recent_usage.count, 0) as recent_usage_count,
        COALESCE(unique_users.count, 0) as unique_users_count
      FROM locks l
      JOIN users u ON l.creator_user_id = u.user_id
      LEFT JOIN (
        SELECT lock_id, COUNT(*) as count
        FROM lock_usage 
        WHERE used_at > NOW() - INTERVAL '30 days'
        GROUP BY lock_id
      ) recent_usage ON l.id = recent_usage.lock_id
      LEFT JOIN (
        SELECT lock_id, COUNT(DISTINCT used_by) as count
        FROM lock_usage
        GROUP BY lock_id
      ) unique_users ON l.id = unique_users.lock_id
      ${whereClause}
    `;

    const countQuery = `
      SELECT COUNT(*) 
      FROM locks l
      ${whereClause}
    `;

    return await super.findPaginated<LockWithStats>(
      baseQuery,
      countQuery,
      values,
      options
    );
  }

  /**
   * Create new lock
   */
  static async create(data: CreateLockData): Promise<LockData> {
    const sanitized = super.sanitizeInput(data);
    super.validateRequired(sanitized, ['title', 'gating_config', 'creator_user_id', 'community_id']);

    const query = `
      INSERT INTO locks (
        title, description, gating_config, visibility, creator_user_id, 
        community_id, tags, usage_count, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, 0, NOW(), NOW()
      ) RETURNING *
    `;

    const values = [
      sanitized.title,
      sanitized.description || null,
      JSON.stringify(sanitized.gating_config),
      sanitized.visibility || 'community',
      sanitized.creator_user_id,
      sanitized.community_id,
      sanitized.tags || null,
    ];

    return await super.insertOne<LockData>(query, values);
  }

  /**
   * Update existing lock
   */
  static async update(lockId: number, data: UpdateLockData): Promise<LockData | null> {
    super.validateRequired({ lockId }, ['lockId']);

    const sanitized = super.sanitizeInput(data);
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Build dynamic UPDATE clause
    if (sanitized.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(sanitized.title);
    }

    if (sanitized.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(sanitized.description);
    }

    if (sanitized.gating_config !== undefined) {
      updates.push(`gating_config = $${paramIndex++}`);
      values.push(JSON.stringify(sanitized.gating_config));
    }

    if (sanitized.visibility !== undefined) {
      updates.push(`visibility = $${paramIndex++}`);
      values.push(sanitized.visibility);
    }

    if (sanitized.tags !== undefined) {
      updates.push(`tags = $${paramIndex++}`);
      values.push(sanitized.tags);
    }

    if (updates.length === 0) {
      throw new ValidationError('No fields to update');
    }

    updates.push(`updated_at = NOW()`);
    values.push(lockId);

    const query = `
      UPDATE locks 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    return await super.updateOne<LockData>(query, values);
  }

  /**
   * Delete lock
   */
  static async delete(lockId: number): Promise<boolean> {
    super.validateRequired({ lockId }, ['lockId']);

    // Check if lock is in use
    const usageQuery = `
      SELECT COUNT(*) FROM posts WHERE lock_id = $1
      UNION ALL
      SELECT COUNT(*) FROM boards WHERE lock_ids ? $1::text
    `;

    const usageCounts = await super.findMany<{ count: string }>(usageQuery, [lockId]);
    const totalUsage = usageCounts.reduce((sum, row) => sum + parseInt(row.count, 10), 0);

    if (totalUsage > 0) {
      throw new ValidationError(
        'Cannot delete lock that is currently in use',
        { lockId, usageCount: totalUsage }
      );
    }

    const query = `DELETE FROM locks WHERE id = $1`;
    const deletedCount = await super.deleteRows(query, [lockId]);
    
    return deletedCount > 0;
  }

  /**
   * Record lock usage
   */
  static async recordUsage(data: Omit<LockUsageData, 'used_at'>): Promise<void> {
    super.validateRequired(data, ['lock_id', 'used_by', 'context']);

    return await super.withTransaction(async (client) => {
      // Insert usage record
      const usageQuery = `
        INSERT INTO lock_usage (lock_id, post_id, board_id, used_by, used_at, context)
        VALUES ($1, $2, $3, $4, NOW(), $5)
      `;

      await super.executeQuery(
        usageQuery,
        [data.lock_id, data.post_id || null, data.board_id || null, data.used_by, data.context],
        client
      );

      // Update usage count
      const updateQuery = `
        UPDATE locks 
        SET usage_count = usage_count + 1, updated_at = NOW()
        WHERE id = $1
      `;

      await super.executeQuery(updateQuery, [data.lock_id], client);
    });
  }

  /**
   * Get lock usage statistics
   */
  static async getUsageStats(lockId: number): Promise<{
    totalUsage: number;
    uniqueUsers: number;
    recentUsage: Array<{ date: string; count: number }>;
    topPosts: Array<{ post_id: number; title: string; usage_count: number }>;
    topBoards: Array<{ board_id: number; name: string; usage_count: number }>;
  }> {
    super.validateRequired({ lockId }, ['lockId']);

    // Get total and unique user counts
    const statsQuery = `
      SELECT 
        COUNT(*) as total_usage,
        COUNT(DISTINCT used_by) as unique_users
      FROM lock_usage 
      WHERE lock_id = $1
    `;

    const stats = await super.findOne<{ total_usage: string; unique_users: string }>(
      statsQuery, 
      [lockId]
    );

    // Get daily usage for last 30 days
    const recentUsageQuery = `
      SELECT 
        DATE(used_at) as date,
        COUNT(*) as count
      FROM lock_usage 
      WHERE lock_id = $1 AND used_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE(used_at)
      ORDER BY date DESC
    `;

    const recentUsage = await super.findMany<{ date: string; count: string }>(
      recentUsageQuery,
      [lockId]
    );

    // Get top posts using this lock
    const topPostsQuery = `
      SELECT 
        p.id as post_id,
        p.title,
        COUNT(lu.used_at) as usage_count
      FROM posts p
      JOIN lock_usage lu ON p.id = lu.post_id
      WHERE lu.lock_id = $1 AND lu.context = 'post'
      GROUP BY p.id, p.title
      ORDER BY usage_count DESC
      LIMIT 10
    `;

    const topPosts = await super.findMany<{ post_id: number; title: string; usage_count: string }>(
      topPostsQuery,
      [lockId]
    );

    // Get top boards using this lock
    const topBoardsQuery = `
      SELECT 
        b.id as board_id,
        b.name,
        COUNT(lu.used_at) as usage_count
      FROM boards b
      JOIN lock_usage lu ON b.id = lu.board_id
      WHERE lu.lock_id = $1 AND lu.context = 'board'
      GROUP BY b.id, b.name
      ORDER BY usage_count DESC
      LIMIT 10
    `;

    const topBoards = await super.findMany<{ board_id: number; name: string; usage_count: string }>(
      topBoardsQuery,
      [lockId]
    );

    return {
      totalUsage: parseInt(stats?.total_usage || '0', 10),
      uniqueUsers: parseInt(stats?.unique_users || '0', 10),
      recentUsage: recentUsage.map(row => ({
        date: row.date,
        count: parseInt(row.count, 10),
      })),
      topPosts: topPosts.map(row => ({
        post_id: row.post_id,
        title: row.title,
        usage_count: parseInt(row.usage_count, 10),
      })),
      topBoards: topBoards.map(row => ({
        board_id: row.board_id,
        name: row.name,
        usage_count: parseInt(row.usage_count, 10),
      })),
    };
  }

  /**
   * Get locks by community
   */
  static async findByCommunity(
    communityId: string,
    options: QueryOptions = {}
  ): Promise<PaginatedResult<LockWithStats>> {
    super.validateRequired({ communityId }, ['communityId']);

    return await this.search({ community_id: communityId }, options);
  }

  /**
   * Get locks by creator
   */
  static async findByCreator(
    creatorUserId: string,
    options: QueryOptions = {}
  ): Promise<PaginatedResult<LockWithStats>> {
    super.validateRequired({ creatorUserId }, ['creatorUserId']);

    return await this.search({ creator_user_id: creatorUserId }, options);
  }

  /**
   * Get public locks (for lock browser)
   */
  static async findPublic(
    options: QueryOptions = {}
  ): Promise<PaginatedResult<LockWithStats>> {
    return await this.search({ visibility: 'public' }, options);
  }

  /**
   * Get popular locks by usage
   */
  static async findPopular(
    communityId?: string,
    options: QueryOptions = {}
  ): Promise<PaginatedResult<LockWithStats>> {
    const filters: LockFilters = {};
    if (communityId) {
      filters.community_id = communityId;
    }

    // Override default ordering to sort by usage count
    const popularOptions = {
      ...options,
      orderBy: 'l.usage_count',
      orderDirection: 'DESC' as const,
    };

    return await this.search(filters, popularOptions);
  }

  /**
   * Check if lock title is unique within community
   */
  static async isTitleUnique(title: string, communityId: string, excludeLockId?: number): Promise<boolean> {
    super.validateRequired({ title, communityId }, ['title', 'communityId']);

    let query = `
      SELECT COUNT(*) FROM locks 
      WHERE title = $1 AND community_id = $2
    `;
    
    const values: any[] = [title, communityId];

    if (excludeLockId) {
      query += ` AND id != $3`;
      values.push(excludeLockId);
    }

    const count = await super.count(query, values);
    return count === 0;
  }
}
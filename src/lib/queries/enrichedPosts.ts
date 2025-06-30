/**
 * Comprehensive Utility Library for Enriched Posts Queries
 * 
 * This library centralizes all enriched posts query patterns used throughout the codebase,
 * providing type-safe query builders and eliminating query duplication.
 * 
 * @author Background Agent
 * @version 1.0.0
 */

import { query } from '@/lib/db';

// ========================================
// TYPESCRIPT INTERFACES
// ========================================

/**
 * Complete interface for enriched post data including all JOINed fields
 */
export interface EnrichedPost {
  // Core post fields
  id: number;
  author_user_id: string;
  title: string;
  content: string;
  tags: string[] | null;
  upvote_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
  board_id: number;
  settings: Record<string, unknown>;
  lock_id?: number;
  
  // Author fields (from users table)
  author_name: string | null;
  author_profile_picture_url: string | null;
  
  // Board fields (from boards table)
  board_name: string;
  board_community_id?: string;
  board_settings?: Record<string, unknown>;
  
  // Community fields (from communities table)
  community_id?: string;
  community_settings?: Record<string, unknown>;
  
  // User-specific fields (from votes table)
  user_has_upvoted?: boolean;
  
  // Share statistics (from links table aggregation)
  share_access_count: number;
  share_count: number;
  last_shared_at?: string;
  most_recent_access_at?: string;
  
  // Lock fields (from locks table)
  lock_name?: string;
  lock_description?: string;
  lock_gating_config?: Record<string, unknown>;
  lock_creator_user_id?: string;
  lock_is_public?: boolean;
  lock_is_template?: boolean;
}

/**
 * Options for building post queries
 */
export interface PostQueryOptions {
  // User context
  userId?: string;
  communityId?: string;
  userRoles?: string[];
  isAdmin?: boolean;
  
  // Filtering
  boardId?: number;
  boardIds?: number[];
  authorId?: string;
  tags?: string[];
  tagOperator?: 'AND' | 'OR';
  searchTerm?: string;
  lockId?: number;
  
  // Date filtering
  createdAfter?: Date;
  createdBefore?: Date;
  updatedAfter?: Date;
  
  // Pagination
  cursor?: string;
  limit?: number;
  offset?: number;
  
  // Sorting
  sortBy?: 'popularity' | 'recent' | 'activity' | 'title';
  sortOrder?: 'ASC' | 'DESC';
  
  // Inclusions
  includeUserVoting?: boolean;
  includeShareStats?: boolean;
  includeLockInfo?: boolean;
  includeBoardInfo?: boolean;
  includeCommunityInfo?: boolean;
  includeAuthorInfo?: boolean;
}

/**
 * Search filter options
 */
export interface SearchFilters {
  boardId?: number;
  tags?: string[];
  authorId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  minUpvotes?: number;
  hasLock?: boolean;
}

/**
 * Cursor pagination data
 */
export interface CursorData {
  upvoteCount: number;
  createdAt: string;
  postId: number;
}

 /**
  * Query result with metadata
  */
 export interface QueryResult {
   sql: string;
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   params: any[]; // pg library parameter types
   paramIndex: number;
 }

/**
 * Paginated query result
 */
export interface PaginatedPostsResult {
  posts: EnrichedPost[];
  pagination: {
    nextCursor?: string;
    hasMore: boolean;
    limit: number;
    total?: number;
  };
}

// ========================================
// QUERY BUILDER UTILITIES
// ========================================

/**
 * Base query builder for enriched posts with configurable JOINs and fields
 */
export const EnrichedPostsQuery = {
  
  /**
   * Core SELECT fields for posts table
   */
  getCoreFields: () => `
    p.id, p.author_user_id, p.title, p.content, p.tags, p.settings, p.lock_id,
    p.upvote_count, p.comment_count, p.created_at, p.updated_at, p.board_id
  `,
  
  /**
   * Author fields from users table
   */
  getAuthorFields: () => `
    u.name AS author_name,
    u.profile_picture_url AS author_profile_picture_url
  `,
  
  /**
   * Board fields from boards table
   */
  getBoardFields: (includeSettings = false) => includeSettings ? `
    b.id AS board_id,
    b.name AS board_name,
    b.community_id AS board_community_id,
    b.settings AS board_settings
  ` : `
    b.id AS board_id,
    b.name AS board_name
  `,
  
  /**
   * Community fields from communities table
   */
  getCommunityFields: (includeSettings = false) => includeSettings ? `
    c.id AS community_id,
    c.settings AS community_settings
  ` : `
    c.id AS community_id
  `,
  
  /**
   * User voting status field
   */
  getUserVotingField: (userId?: string) => userId ? `
    CASE WHEN v.user_id IS NOT NULL THEN TRUE ELSE FALSE END AS user_has_upvoted
  ` : '',
  
  /**
   * Share statistics fields with aggregation subquery
   */
  getShareStatsFields: () => `
    COALESCE(share_stats.total_access_count, 0) as share_access_count,
    COALESCE(share_stats.share_count, 0) as share_count,
    share_stats.last_shared_at,
    share_stats.most_recent_access_at
  `,
  
  /**
   * Lock information fields
   */
  getLockFields: () => `
    l.name as lock_name,
    l.description as lock_description,
    l.gating_config as lock_gating_config,
    l.creator_user_id as lock_creator_user_id,
    l.is_public as lock_is_public,
    l.is_template as lock_is_template
  `,
  
  /**
   * Share statistics subquery
   */
  getShareStatsSubquery: () => `
    LEFT JOIN (
      SELECT 
        post_id,
        SUM(access_count) as total_access_count,
        COUNT(*) as share_count,
        MAX(created_at) as last_shared_at,
        MAX(last_accessed_at) as most_recent_access_at
      FROM links 
      WHERE expires_at IS NULL OR expires_at > NOW()
      GROUP BY post_id
    ) share_stats ON p.id = share_stats.post_id
  `,
  
  /**
   * Build complete FROM clause with JOINs
   */
  buildFromClause: (options: PostQueryOptions) => {
    let fromClause = 'FROM posts p';
    
    // Always include users for author info
    if (options.includeAuthorInfo !== false) {
      fromClause += '\n  JOIN users u ON p.author_user_id = u.user_id';
    }
    
    // Include boards if needed
    if (options.includeBoardInfo !== false) {
      fromClause += '\n  JOIN boards b ON p.board_id = b.id';
    }
    
    // Include communities if needed
    if (options.includeCommunityInfo) {
      fromClause += '\n  JOIN communities c ON b.community_id = c.id';
    }
    
    // Include user voting if user is authenticated
    if (options.includeUserVoting && options.userId) {
      fromClause += '\n  LEFT JOIN votes v ON p.id = v.post_id AND v.user_id = $1';
    }
    
    // Include share statistics if requested
    if (options.includeShareStats !== false) {
      fromClause += '\n  ' + EnrichedPostsQuery.getShareStatsSubquery();
    }
    
    // Include lock information if requested
    if (options.includeLockInfo) {
      fromClause += '\n  LEFT JOIN locks l ON p.lock_id = l.id';
    }
    
    return fromClause;
  },
  
  /**
   * Common WHERE clause builders
   */
  forCommunity: (communityId: string, paramIndex: number) => ({
    clause: `b.community_id = $${paramIndex}`,
    params: [communityId],
    nextIndex: paramIndex + 1
  }),
  
  forBoard: (boardId: number, paramIndex: number) => ({
    clause: `p.board_id = $${paramIndex}`,
    params: [boardId],
    nextIndex: paramIndex + 1
  }),
  
  forBoards: (boardIds: number[], paramIndex: number) => ({
    clause: `p.board_id IN (${boardIds.map((_, i) => `$${paramIndex + i}`).join(', ')})`,
    params: boardIds,
    nextIndex: paramIndex + boardIds.length
  }),
  
  forAuthor: (authorId: string, paramIndex: number) => ({
    clause: `p.author_user_id = $${paramIndex}`,
    params: [authorId],
    nextIndex: paramIndex + 1
  }),
  
  withTags: (tags: string[], operator: 'AND' | 'OR', paramIndex: number) => {
    if (operator === 'AND') {
      // Use @> operator for "contains all" (AND logic)
      return {
        clause: `p.tags @> $${paramIndex}`,
        params: [tags],
        nextIndex: paramIndex + 1
      };
    } else {
      // Use && operator for "has any" (OR logic)
      return {
        clause: `p.tags && $${paramIndex}`,
        params: [tags],
        nextIndex: paramIndex + 1
      };
    }
  },
  
  withSearchTerm: (searchTerm: string, paramIndex: number) => ({
    clause: `(p.title ILIKE $${paramIndex} OR p.content ILIKE $${paramIndex})`,
    params: [`%${searchTerm}%`],
    nextIndex: paramIndex + 1
  }),
  
  withLock: (lockId: number, paramIndex: number) => ({
    clause: `p.lock_id = $${paramIndex}`,
    params: [lockId],
    nextIndex: paramIndex + 1
  }),
  
     withDateRange: (paramIndex: number, after?: Date, before?: Date) => {
     const clauses: string[] = [];
     const params: Date[] = [];
     let currentIndex = paramIndex;
     
     if (after) {
       clauses.push(`p.created_at >= $${currentIndex}`);
       params.push(after);
       currentIndex++;
     }
     
     if (before) {
       clauses.push(`p.created_at <= $${currentIndex}`);
       params.push(before);
       currentIndex++;
     }
     
     return {
       clause: clauses.join(' AND '),
       params,
       nextIndex: currentIndex
     };
   },
  
  /**
   * Cursor-based pagination WHERE clause
   */
  withCursorPagination: (cursor?: string, paramIndex: number = 1) => {
    if (!cursor) {
      return { clause: '', params: [], nextIndex: paramIndex };
    }
    
    const cursorData = parseCursor(cursor);
    if (!cursorData) {
      return { clause: '', params: [], nextIndex: paramIndex };
    }
    
    return {
      clause: `AND (
        p.upvote_count < $${paramIndex} OR 
        (p.upvote_count = $${paramIndex} AND p.created_at < $${paramIndex + 1}) OR
        (p.upvote_count = $${paramIndex} AND p.created_at = $${paramIndex + 1} AND p.id < $${paramIndex + 2})
      )`,
      params: [cursorData.upvoteCount, cursorData.createdAt, cursorData.postId],
      nextIndex: paramIndex + 3
    };
  },
  
  /**
   * Offset-based pagination
   */
  withOffsetPagination: (page: number, limit: number, paramIndex: number) => {
    const offset = (page - 1) * limit;
    return {
      clause: `LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params: [limit, offset],
      nextIndex: paramIndex + 2
    };
  },
  
  /**
   * Sorting options
   */
  byPopularity: () => 'ORDER BY p.upvote_count DESC, p.created_at DESC, p.id DESC',
  byRecent: () => 'ORDER BY p.created_at DESC, p.id DESC',
  byActivity: () => 'ORDER BY p.updated_at DESC, p.created_at DESC, p.id DESC',
  byTitle: (order: 'ASC' | 'DESC' = 'ASC') => `ORDER BY p.title ${order}, p.created_at DESC`,
  
  /**
   * Custom sorting
   */
  customSort: (sortBy: string, order: 'ASC' | 'DESC' = 'DESC') => {
    const validSorts = ['upvote_count', 'created_at', 'updated_at', 'title', 'comment_count'];
    const field = validSorts.includes(sortBy) ? sortBy : 'created_at';
    return `ORDER BY p.${field} ${order}, p.id DESC`;
  }
};

// ========================================
// COMPLETE QUERY COMPOSERS
// ========================================

/**
 * Build a complete posts query with all specified options
 */
 export async function buildPostsQuery(options: PostQueryOptions): Promise<QueryResult> {
   const fields: string[] = [EnrichedPostsQuery.getCoreFields()];
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   const params: any[] = [];
   let paramIndex = 1;
  
  // Add user parameter if needed for voting
  if (options.includeUserVoting && options.userId) {
    params.push(options.userId);
    paramIndex++;
  }
  
  // Build SELECT fields
  if (options.includeAuthorInfo !== false) {
    fields.push(EnrichedPostsQuery.getAuthorFields());
  }
  
  if (options.includeBoardInfo !== false) {
    fields.push(EnrichedPostsQuery.getBoardFields(true));
  }
  
  if (options.includeCommunityInfo) {
    fields.push(EnrichedPostsQuery.getCommunityFields(true));
  }
  
  if (options.includeUserVoting && options.userId) {
    fields.push(EnrichedPostsQuery.getUserVotingField(options.userId));
  }
  
  if (options.includeShareStats !== false) {
    fields.push(EnrichedPostsQuery.getShareStatsFields());
  }
  
  if (options.includeLockInfo) {
    fields.push(EnrichedPostsQuery.getLockFields());
  }
  
  // Build FROM clause
  const fromClause = EnrichedPostsQuery.buildFromClause(options);
  
  // Build WHERE clauses
  const whereClauses: string[] = ['1=1'];
  
  // Community filtering
  if (options.communityId) {
    const community = EnrichedPostsQuery.forCommunity(options.communityId, paramIndex);
    whereClauses.push(community.clause);
    params.push(...community.params);
    paramIndex = community.nextIndex;
  }
  
  // Board filtering
  if (options.boardId) {
    const board = EnrichedPostsQuery.forBoard(options.boardId, paramIndex);
    whereClauses.push(board.clause);
    params.push(...board.params);
    paramIndex = board.nextIndex;
  } else if (options.boardIds && options.boardIds.length > 0) {
    const boards = EnrichedPostsQuery.forBoards(options.boardIds, paramIndex);
    whereClauses.push(boards.clause);
    params.push(...boards.params);
    paramIndex = boards.nextIndex;
  }
  
  // Author filtering
  if (options.authorId) {
    const author = EnrichedPostsQuery.forAuthor(options.authorId, paramIndex);
    whereClauses.push(author.clause);
    params.push(...author.params);
    paramIndex = author.nextIndex;
  }
  
  // Tag filtering
  if (options.tags && options.tags.length > 0) {
    const tags = EnrichedPostsQuery.withTags(
      options.tags, 
      options.tagOperator || 'AND', 
      paramIndex
    );
    whereClauses.push(tags.clause);
    params.push(...tags.params);
    paramIndex = tags.nextIndex;
  }
  
  // Search term filtering
  if (options.searchTerm) {
    const search = EnrichedPostsQuery.withSearchTerm(options.searchTerm, paramIndex);
    whereClauses.push(search.clause);
    params.push(...search.params);
    paramIndex = search.nextIndex;
  }
  
  // Lock filtering
  if (options.lockId) {
    const lock = EnrichedPostsQuery.withLock(options.lockId, paramIndex);
    whereClauses.push(lock.clause);
    params.push(...lock.params);
    paramIndex = lock.nextIndex;
  }
  
     // Date range filtering
   if (options.createdAfter || options.createdBefore) {
     const dateRange = EnrichedPostsQuery.withDateRange(
       paramIndex,
       options.createdAfter,
       options.createdBefore
     );
     if (dateRange.clause) {
       whereClauses.push(dateRange.clause);
       params.push(...dateRange.params);
       paramIndex = dateRange.nextIndex;
     }
   }
  
  // Cursor pagination
  if (options.cursor) {
    const cursor = EnrichedPostsQuery.withCursorPagination(options.cursor, paramIndex);
    if (cursor.clause) {
      whereClauses.push(cursor.clause);
      params.push(...cursor.params);
      paramIndex = cursor.nextIndex;
    }
  }
  
  // Build ORDER BY clause
  let orderBy: string;
  if (options.sortBy) {
    switch (options.sortBy) {
      case 'popularity':
        orderBy = EnrichedPostsQuery.byPopularity();
        break;
      case 'recent':
        orderBy = EnrichedPostsQuery.byRecent();
        break;
      case 'activity':
        orderBy = EnrichedPostsQuery.byActivity();
        break;
      case 'title':
        orderBy = EnrichedPostsQuery.byTitle(options.sortOrder);
        break;
      default:
        orderBy = EnrichedPostsQuery.customSort(options.sortBy, options.sortOrder);
    }
  } else {
    orderBy = EnrichedPostsQuery.byPopularity(); // Default sort
  }
  
  // Add LIMIT
  let limitClause = '';
  if (options.limit) {
    limitClause = `LIMIT $${paramIndex}`;
    params.push(options.limit);
    paramIndex++;
  }
  
  // Add OFFSET (for offset-based pagination)
  if (options.offset !== undefined) {
    limitClause += ` OFFSET $${paramIndex}`;
    params.push(options.offset);
    paramIndex++;
  }
  
  // Construct final SQL
  const sql = `
    SELECT ${fields.join(',\n    ')}
    ${fromClause}
    WHERE ${whereClauses.join(' AND ')}
    ${orderBy}
    ${limitClause}
  `.trim();
  
  return {
    sql,
    params,
    paramIndex
  };
}

/**
 * Build a query for a single post by ID
 */
export async function buildSinglePostQuery(
  postId: number, 
  userId?: string,
  includeAll = true
): Promise<QueryResult> {
  const options: PostQueryOptions = {
    userId,
    includeUserVoting: !!userId,
    includeShareStats: includeAll,
    includeLockInfo: includeAll,
    includeBoardInfo: includeAll,
    includeCommunityInfo: includeAll,
    includeAuthorInfo: includeAll
  };
  
  const baseQuery = await buildPostsQuery(options);
  
  // Add post ID filter
  const postIdParam = baseQuery.params.length + 1;
  const sql = baseQuery.sql.replace(
    'WHERE 1=1',
    `WHERE p.id = $${postIdParam} AND 1=1`
  );
  
  return {
    sql,
    params: [...baseQuery.params, postId],
    paramIndex: baseQuery.paramIndex + 1
  };
}

/**
 * Build search query with filters
 */
export async function buildSearchQuery(
  searchTerm: string, 
  filters: SearchFilters,
  userId?: string,
  limit = 10
): Promise<QueryResult> {
  const options: PostQueryOptions = {
    userId,
    searchTerm,
    boardId: filters.boardId,
    tags: filters.tags,
    authorId: filters.authorId,
    createdAfter: filters.dateRange?.start,
    createdBefore: filters.dateRange?.end,
    limit,
    includeUserVoting: !!userId,
    includeShareStats: true,
    includeLockInfo: true,
    includeBoardInfo: true,
    includeAuthorInfo: true
  };
  
  const baseQuery = await buildPostsQuery(options);
  
  // Add additional filters
  const whereClauses: string[] = [];
  const additionalParams: (string | number)[] = [];
  let paramIndex = baseQuery.paramIndex;
  
  if (filters.minUpvotes !== undefined) {
    whereClauses.push(`p.upvote_count >= $${paramIndex}`);
    additionalParams.push(filters.minUpvotes);
    paramIndex++;
  }
  
  if (filters.hasLock !== undefined) {
    if (filters.hasLock) {
      whereClauses.push('p.lock_id IS NOT NULL');
    } else {
      whereClauses.push('p.lock_id IS NULL');
    }
  }
  
  let sql = baseQuery.sql;
  if (whereClauses.length > 0) {
    sql = sql.replace('WHERE ', `WHERE ${whereClauses.join(' AND ')} AND `);
  }
  
  return {
    sql,
    params: [...baseQuery.params, ...additionalParams],
    paramIndex
  };
}

// ========================================
// EXECUTION UTILITIES
// ========================================

/**
 * Execute a posts query and return enriched results
 */
export async function executePostsQuery(
  queryResult: QueryResult
): Promise<EnrichedPost[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await query(queryResult.sql, queryResult.params as any);
    
    // Transform and type the results
    return result.rows.map((row: any) => ({
      ...row,
      user_has_upvoted: row.user_has_upvoted === undefined ? false : row.user_has_upvoted,
      settings: typeof row.settings === 'string' ? JSON.parse(row.settings) : (row.settings || {}),
      board_settings: typeof row.board_settings === 'string' ? JSON.parse(row.board_settings) : row.board_settings,
      community_settings: typeof row.community_settings === 'string' ? JSON.parse(row.community_settings) : row.community_settings,
      lock_gating_config: typeof row.lock_gating_config === 'string' ? JSON.parse(row.lock_gating_config) : row.lock_gating_config,
      // Ensure share statistics have proper defaults
      share_access_count: row.share_access_count || 0,
      share_count: row.share_count || 0,
      last_shared_at: row.last_shared_at || undefined,
      most_recent_access_at: row.most_recent_access_at || undefined,
    })) as EnrichedPost[];
  } catch (error) {
    console.error('[EnrichedPostsQuery] Error executing query:', error);
    throw error;
  }
}

/**
 * Execute paginated posts query
 */
export async function executePostsQueryPaginated(
  options: PostQueryOptions
): Promise<PaginatedPostsResult> {
  const queryResult = await buildPostsQuery(options);
  const posts = await executePostsQuery(queryResult);
  
  // Generate next cursor if we have a full page
  const hasMore = options.limit ? posts.length === options.limit : false;
  const nextCursor = hasMore && posts.length > 0 ? generateCursor(posts[posts.length - 1]) : undefined;
  
  return {
    posts,
    pagination: {
      nextCursor,
      hasMore,
      limit: options.limit || 20
    }
  };
}

// ========================================
// CURSOR UTILITIES
// ========================================

/**
 * Generate cursor from post data
 */
export function generateCursor(post: EnrichedPost): string {
  const isoDate = new Date(post.created_at).toISOString();
  return `${post.upvote_count}_${isoDate}_${post.id}`;
}

/**
 * Parse cursor string into structured data
 */
export function parseCursor(cursor: string): CursorData | null {
  if (!cursor) return null;
  
  try {
    const parts = cursor.split('_');
    if (parts.length !== 3) {
      console.warn('[EnrichedPostsQuery] Invalid cursor format - expected 3 parts:', cursor);
      return null;
    }
    
    const [upvoteCount, createdAt, postId] = parts;
    
    // Validate that createdAt is a valid ISO date
    const date = new Date(createdAt);
    if (isNaN(date.getTime())) {
      console.warn('[EnrichedPostsQuery] Invalid date in cursor:', createdAt);
      return null;
    }
    
    return {
      upvoteCount: parseInt(upvoteCount, 10),
      createdAt: createdAt,
      postId: parseInt(postId, 10)
    };
  } catch (error) {
    console.warn('[EnrichedPostsQuery] Invalid cursor format:', cursor, error);
    return null;
  }
}

// ========================================
// CONVENIENCE FUNCTIONS
// ========================================

/**
 * Get posts for a specific community with user permissions
 */
export async function getPostsForCommunity(
  communityId: string,
  accessibleBoardIds: number[],
  userId?: string,
  options: Partial<PostQueryOptions> = {}
): Promise<PaginatedPostsResult> {
  return executePostsQueryPaginated({
    communityId,
    boardIds: accessibleBoardIds,
    userId,
    includeUserVoting: !!userId,
    includeShareStats: true,
    includeLockInfo: true,
    includeBoardInfo: true,
    includeAuthorInfo: true,
    sortBy: 'popularity',
    limit: 20,
    ...options
  });
}

/**
 * Get posts for a specific board
 */
export async function getPostsForBoard(
  boardId: number,
  userId?: string,
  options: Partial<PostQueryOptions> = {}
): Promise<PaginatedPostsResult> {
  return executePostsQueryPaginated({
    boardId,
    userId,
    includeUserVoting: !!userId,
    includeShareStats: true,
    includeLockInfo: true,
    includeBoardInfo: true,
    includeAuthorInfo: true,
    sortBy: 'popularity',
    limit: 20,
    ...options
  });
}

/**
 * Get posts by a specific author
 */
export async function getPostsByAuthor(
  authorId: string,
  accessibleBoardIds: number[],
  userId?: string,
  options: Partial<PostQueryOptions> = {}
): Promise<PaginatedPostsResult> {
  return executePostsQueryPaginated({
    authorId,
    boardIds: accessibleBoardIds,
    userId,
    includeUserVoting: !!userId,
    includeShareStats: true,
    includeLockInfo: true,
    includeBoardInfo: true,
    includeAuthorInfo: true,
    sortBy: 'recent',
    limit: 20,
    ...options
  });
}

/**
 * Search posts with full-text search
 */
export async function searchPosts(
  searchTerm: string,
  accessibleBoardIds: number[],
  userId?: string,
  filters: SearchFilters = {},
  limit = 10
): Promise<EnrichedPost[]> {
  // Build search query with proper board filtering from the start
  const searchOptions: PostQueryOptions = {
    userId,
    searchTerm,
    // If specific board requested and accessible, use it; otherwise filter by all accessible boards
    boardId: filters.boardId && accessibleBoardIds.includes(filters.boardId) ? filters.boardId : undefined,
    boardIds: (!filters.boardId || !accessibleBoardIds.includes(filters.boardId)) ? accessibleBoardIds : undefined,
    tags: filters.tags,
    authorId: filters.authorId,
    createdAfter: filters.dateRange?.start,
    createdBefore: filters.dateRange?.end,
    limit,
    includeUserVoting: !!userId,
    includeShareStats: true,
    includeLockInfo: true,
    includeBoardInfo: true,
    includeAuthorInfo: true
  };

  // Add additional search-specific filters
  const queryResult = await buildPostsQuery(searchOptions);
  
  // Add search-specific filters that aren't in PostQueryOptions
  const additionalClauses: string[] = [];
  const additionalParams: (string | number)[] = [];
  let paramIndex = queryResult.paramIndex;
  
  if (filters.minUpvotes !== undefined) {
    additionalClauses.push(`p.upvote_count >= $${paramIndex}`);
    additionalParams.push(filters.minUpvotes);
    paramIndex++;
  }
  
  if (filters.hasLock !== undefined) {
    if (filters.hasLock) {
      additionalClauses.push('p.lock_id IS NOT NULL');
    } else {
      additionalClauses.push('p.lock_id IS NULL');
    }
  }
  
  let sql = queryResult.sql;
  if (additionalClauses.length > 0) {
    sql = sql.replace('WHERE ', `WHERE ${additionalClauses.join(' AND ')} AND `);
  }
  
  return executePostsQuery({
    sql,
    params: [...queryResult.params, ...additionalParams],
    paramIndex
  });
}

/**
 * Get a single post by ID with full enrichment
 */
export async function getSinglePost(
  postId: number,
  userId?: string
): Promise<EnrichedPost | null> {
  const queryResult = await buildSinglePostQuery(postId, userId, true);
  const posts = await executePostsQuery(queryResult);
  return posts.length > 0 ? posts[0] : null;
}

/**
 * Get posts with specific tags
 */
export async function getPostsWithTags(
  tags: string[],
  accessibleBoardIds: number[],
  operator: 'AND' | 'OR' = 'AND',
  userId?: string,
  options: Partial<PostQueryOptions> = {}
): Promise<PaginatedPostsResult> {
  return executePostsQueryPaginated({
    tags,
    tagOperator: operator,
    boardIds: accessibleBoardIds,
    userId,
    includeUserVoting: !!userId,
    includeShareStats: true,
    includeLockInfo: true,
    includeBoardInfo: true,
    includeAuthorInfo: true,
    sortBy: 'popularity',
    limit: 20,
    ...options
  });
}

/**
 * Get posts that use a specific lock
 */
export async function getPostsWithLock(
  lockId: number,
  accessibleBoardIds: number[],
  userId?: string,
  options: Partial<PostQueryOptions> = {}
): Promise<PaginatedPostsResult> {
  return executePostsQueryPaginated({
    lockId,
    boardIds: accessibleBoardIds,
    userId,
    includeUserVoting: !!userId,
    includeShareStats: true,
    includeLockInfo: true,
    includeBoardInfo: true,
    includeAuthorInfo: true,
    sortBy: 'recent',
    limit: 20,
    ...options
  });
}

/**
 * Get recent posts for "What's New" functionality
 */
export async function getRecentPosts(
  accessibleBoardIds: number[],
  since: Date,
  userId?: string,
  limit = 50
): Promise<EnrichedPost[]> {
  const queryResult = await buildPostsQuery({
    boardIds: accessibleBoardIds,
    createdAfter: since,
    userId,
    includeUserVoting: !!userId,
    includeShareStats: true,
    includeLockInfo: true,
    includeBoardInfo: true,
    includeAuthorInfo: true,
    sortBy: 'recent',
    limit
  });
  
  return executePostsQuery(queryResult);
}

// Export the main query builder class for advanced usage
export default EnrichedPostsQuery;
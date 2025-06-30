/**
 * Comprehensive Unit Tests for Enriched Posts Query Utility Library
 * 
 * These tests validate all query builders, convenience functions, and edge cases
 * to ensure the utility library works correctly and maintains type safety.
 */

import {
  EnrichedPostsQuery,
  generateCursor,
  parseCursor,
  buildPostsQuery,
  buildSinglePostQuery,
  buildSearchQuery,
  type PostQueryOptions,
  type SearchFilters,
  type EnrichedPost,
  type CursorData
} from '../enrichedPosts';

// Mock the db query function
jest.mock('../../db', () => ({
  query: jest.fn()
}));

describe('EnrichedPostsQuery', () => {
  describe('Field Builders', () => {
    test('getCoreFields returns correct fields', () => {
      const fields = EnrichedPostsQuery.getCoreFields();
      expect(fields).toContain('p.id');
      expect(fields).toContain('p.author_user_id');
      expect(fields).toContain('p.title');
      expect(fields).toContain('p.content');
      expect(fields).toContain('p.upvote_count');
      expect(fields).toContain('p.lock_id');
    });

    test('getAuthorFields returns author-specific fields', () => {
      const fields = EnrichedPostsQuery.getAuthorFields();
      expect(fields).toContain('u.name AS author_name');
      expect(fields).toContain('u.profile_picture_url AS author_profile_picture_url');
    });

    test('getBoardFields with and without settings', () => {
      const fieldsBasic = EnrichedPostsQuery.getBoardFields(false);
      expect(fieldsBasic).toContain('b.name AS board_name');
      expect(fieldsBasic).not.toContain('b.settings AS board_settings');

      const fieldsWithSettings = EnrichedPostsQuery.getBoardFields(true);
      expect(fieldsWithSettings).toContain('b.name AS board_name');
      expect(fieldsWithSettings).toContain('b.settings AS board_settings');
    });

    test('getUserVotingField with and without userId', () => {
      const withUser = EnrichedPostsQuery.getUserVotingField('user-123');
      expect(withUser).toContain('user_has_upvoted');
      expect(withUser).toContain('CASE WHEN v.user_id IS NOT NULL');

      const withoutUser = EnrichedPostsQuery.getUserVotingField();
      expect(withoutUser).toBe('');
    });

    test('getShareStatsFields contains aggregation fields', () => {
      const fields = EnrichedPostsQuery.getShareStatsFields();
      expect(fields).toContain('share_access_count');
      expect(fields).toContain('share_count');
      expect(fields).toContain('last_shared_at');
      expect(fields).toContain('most_recent_access_at');
    });

    test('getLockFields contains lock information', () => {
      const fields = EnrichedPostsQuery.getLockFields();
      expect(fields).toContain('l.name as lock_name');
      expect(fields).toContain('l.gating_config as lock_gating_config');
      expect(fields).toContain('l.is_public as lock_is_public');
    });
  });

  describe('WHERE Clause Builders', () => {
    test('forCommunity builds correct clause', () => {
      const result = EnrichedPostsQuery.forCommunity('community-123', 1);
      expect(result.clause).toBe('b.community_id = $1');
      expect(result.params).toEqual(['community-123']);
      expect(result.nextIndex).toBe(2);
    });

    test('forBoard builds correct clause', () => {
      const result = EnrichedPostsQuery.forBoard(456, 2);
      expect(result.clause).toBe('p.board_id = $2');
      expect(result.params).toEqual([456]);
      expect(result.nextIndex).toBe(3);
    });

    test('forBoards builds correct IN clause', () => {
      const result = EnrichedPostsQuery.forBoards([1, 2, 3], 1);
      expect(result.clause).toBe('p.board_id IN ($1, $2, $3)');
      expect(result.params).toEqual([1, 2, 3]);
      expect(result.nextIndex).toBe(4);
    });

    test('forAuthor builds correct clause', () => {
      const result = EnrichedPostsQuery.forAuthor('user-789', 3);
      expect(result.clause).toBe('p.author_user_id = $3');
      expect(result.params).toEqual(['user-789']);
      expect(result.nextIndex).toBe(4);
    });

    test('withTags builds correct clauses for AND/OR', () => {
      const andResult = EnrichedPostsQuery.withTags(['web3', 'defi'], 'AND', 1);
      expect(andResult.clause).toBe('p.tags @> $1');
      expect(andResult.params).toEqual([['web3', 'defi']]);
      expect(andResult.nextIndex).toBe(2);

      const orResult = EnrichedPostsQuery.withTags(['web3', 'defi'], 'OR', 1);
      expect(orResult.clause).toBe('p.tags && $1');
      expect(orResult.params).toEqual([['web3', 'defi']]);
      expect(orResult.nextIndex).toBe(2);
    });

    test('withSearchTerm builds ILIKE clause', () => {
      const result = EnrichedPostsQuery.withSearchTerm('blockchain', 2);
      expect(result.clause).toBe('(p.title ILIKE $2 OR p.content ILIKE $2)');
      expect(result.params).toEqual(['%blockchain%']);
      expect(result.nextIndex).toBe(3);
    });

    test('withLock builds correct clause', () => {
      const result = EnrichedPostsQuery.withLock(123, 1);
      expect(result.clause).toBe('p.lock_id = $1');
      expect(result.params).toEqual([123]);
      expect(result.nextIndex).toBe(2);
    });

    test('withDateRange builds date filters', () => {
      const after = new Date('2023-01-01');
      const before = new Date('2023-12-31');

      // Test with both dates
      const bothResult = EnrichedPostsQuery.withDateRange(1, after, before);
      expect(bothResult.clause).toBe('p.created_at >= $1 AND p.created_at <= $2');
      expect(bothResult.params).toEqual([after, before]);
      expect(bothResult.nextIndex).toBe(3);

      // Test with only after date
      const afterResult = EnrichedPostsQuery.withDateRange(1, after);
      expect(afterResult.clause).toBe('p.created_at >= $1');
      expect(afterResult.params).toEqual([after]);
      expect(afterResult.nextIndex).toBe(2);

      // Test with only before date
      const beforeResult = EnrichedPostsQuery.withDateRange(1, undefined, before);
      expect(beforeResult.clause).toBe('p.created_at <= $1');
      expect(beforeResult.params).toEqual([before]);
      expect(beforeResult.nextIndex).toBe(2);

      // Test with no dates
      const noneResult = EnrichedPostsQuery.withDateRange(1);
      expect(noneResult.clause).toBe('');
      expect(noneResult.params).toEqual([]);
      expect(noneResult.nextIndex).toBe(1);
    });

    test('withCursorPagination builds cursor filter', () => {
      const cursor = '10_2023-12-01T10:00:00.000Z_123';
      const result = EnrichedPostsQuery.withCursorPagination(cursor, 1);
      
      expect(result.clause).toContain('p.upvote_count < $1');
      expect(result.clause).toContain('p.created_at < $2');
      expect(result.clause).toContain('p.id < $3');
      expect(result.params).toEqual([10, '2023-12-01T10:00:00.000Z', 123]);
      expect(result.nextIndex).toBe(4);

      // Test with no cursor
      const noCursorResult = EnrichedPostsQuery.withCursorPagination();
      expect(noCursorResult.clause).toBe('');
      expect(noCursorResult.params).toEqual([]);
      expect(noCursorResult.nextIndex).toBe(1);
    });
  });

  describe('Sorting Functions', () => {
    test('byPopularity returns correct ORDER BY', () => {
      const orderBy = EnrichedPostsQuery.byPopularity();
      expect(orderBy).toBe('ORDER BY p.upvote_count DESC, p.created_at DESC, p.id DESC');
    });

    test('byRecent returns correct ORDER BY', () => {
      const orderBy = EnrichedPostsQuery.byRecent();
      expect(orderBy).toBe('ORDER BY p.created_at DESC, p.id DESC');
    });

    test('byActivity returns correct ORDER BY', () => {
      const orderBy = EnrichedPostsQuery.byActivity();
      expect(orderBy).toBe('ORDER BY p.updated_at DESC, p.created_at DESC, p.id DESC');
    });

    test('byTitle returns correct ORDER BY with direction', () => {
      const ascOrder = EnrichedPostsQuery.byTitle('ASC');
      expect(ascOrder).toBe('ORDER BY p.title ASC, p.created_at DESC');

      const descOrder = EnrichedPostsQuery.byTitle('DESC');
      expect(descOrder).toBe('ORDER BY p.title DESC, p.created_at DESC');

      const defaultOrder = EnrichedPostsQuery.byTitle();
      expect(defaultOrder).toBe('ORDER BY p.title ASC, p.created_at DESC');
    });

    test('customSort validates fields and returns correct ORDER BY', () => {
      const validSort = EnrichedPostsQuery.customSort('comment_count', 'ASC');
      expect(validSort).toBe('ORDER BY p.comment_count ASC, p.id DESC');

      const invalidSort = EnrichedPostsQuery.customSort('invalid_field', 'DESC');
      expect(invalidSort).toBe('ORDER BY p.created_at DESC, p.id DESC');
    });
  });

  describe('FROM Clause Builder', () => {
    test('buildFromClause includes correct JOINs based on options', () => {
      const basicOptions: PostQueryOptions = {};
      const basicFrom = EnrichedPostsQuery.buildFromClause(basicOptions);
      expect(basicFrom).toContain('FROM posts p');
      expect(basicFrom).toContain('JOIN users u ON p.author_user_id = u.user_id');
      expect(basicFrom).toContain('JOIN boards b ON p.board_id = b.id');

      const fullOptions: PostQueryOptions = {
        userId: 'user-123',
        includeUserVoting: true,
        includeShareStats: true,
        includeLockInfo: true,
        includeCommunityInfo: true
      };
      const fullFrom = EnrichedPostsQuery.buildFromClause(fullOptions);
      expect(fullFrom).toContain('LEFT JOIN votes v ON p.id = v.post_id AND v.user_id = $1');
      expect(fullFrom).toContain('LEFT JOIN locks l ON p.lock_id = l.id');
      expect(fullFrom).toContain('JOIN communities c ON b.community_id = c.id');
      expect(fullFrom).toContain('share_stats ON p.id = share_stats.post_id');
    });

    test('buildFromClause excludes JOINs when options are false', () => {
      const minimalOptions: PostQueryOptions = {
        includeAuthorInfo: false,
        includeBoardInfo: false,
        includeShareStats: false
      };
      const minimalFrom = EnrichedPostsQuery.buildFromClause(minimalOptions);
      expect(minimalFrom).toBe('FROM posts p');
    });
  });
});

describe('Cursor Utilities', () => {
  test('generateCursor creates correct format', () => {
    const post: EnrichedPost = {
      id: 123,
      upvote_count: 45,
      created_at: '2023-12-01T10:00:00.000Z'
    } as EnrichedPost;

    const cursor = generateCursor(post);
    expect(cursor).toBe('45_2023-12-01T10:00:00.000Z_123');
  });

  test('parseCursor correctly parses valid cursor', () => {
    const cursor = '45_2023-12-01T10:00:00.000Z_123';
    const parsed = parseCursor(cursor);

    expect(parsed).toEqual({
      upvoteCount: 45,
      createdAt: '2023-12-01T10:00:00.000Z',
      postId: 123
    });
  });

  test('parseCursor handles invalid cursors', () => {
    expect(parseCursor('')).toBeNull();
    expect(parseCursor('invalid')).toBeNull();
    expect(parseCursor('45_invalid_date_123')).toBeNull();
    expect(parseCursor('45_2023-12-01T10:00:00.000Z')).toBeNull(); // Missing part
  });

  test('cursor round-trip maintains data integrity', () => {
    const originalPost: EnrichedPost = {
      id: 789,
      upvote_count: 12,
      created_at: '2023-11-15T14:30:45.123Z'
    } as EnrichedPost;

    const cursor = generateCursor(originalPost);
    const parsed = parseCursor(cursor);

    expect(parsed?.postId).toBe(originalPost.id);
    expect(parsed?.upvoteCount).toBe(originalPost.upvote_count);
    expect(parsed?.createdAt).toBe(originalPost.created_at);
  });
});

describe('Query Builders', () => {
  describe('buildPostsQuery', () => {
    test('builds basic query with minimal options', async () => {
      const options: PostQueryOptions = {
        limit: 20
      };

      const result = await buildPostsQuery(options);

      expect(result.sql).toContain('SELECT');
      expect(result.sql).toContain('FROM posts p');
      expect(result.sql).toContain('JOIN users u ON p.author_user_id = u.user_id');
      expect(result.sql).toContain('WHERE 1=1');
      expect(result.sql).toContain('ORDER BY p.upvote_count DESC');
      expect(result.sql).toContain('LIMIT');
      expect(result.params).toContain(20);
    });

    test('builds query with user voting', async () => {
      const options: PostQueryOptions = {
        userId: 'user-123',
        includeUserVoting: true,
        limit: 10
      };

      const result = await buildPostsQuery(options);

      expect(result.sql).toContain('LEFT JOIN votes v ON p.id = v.post_id AND v.user_id = $1');
      expect(result.sql).toContain('user_has_upvoted');
      expect(result.params[0]).toBe('user-123');
    });

    test('builds query with all filtering options', async () => {
      const options: PostQueryOptions = {
        userId: 'user-123',
        communityId: 'community-456',
        boardIds: [1, 2, 3],
        authorId: 'author-789',
        tags: ['web3', 'tutorial'],
        tagOperator: 'AND',
        searchTerm: 'blockchain',
        lockId: 999,
        createdAfter: new Date('2023-01-01'),
        createdBefore: new Date('2023-12-31'),
        cursor: '10_2023-12-01T10:00:00.000Z_123',
        limit: 50,
        sortBy: 'recent',
        includeUserVoting: true,
        includeShareStats: true,
        includeLockInfo: true,
        includeBoardInfo: true,
        includeCommunityInfo: true
      };

      const result = await buildPostsQuery(options);

      expect(result.sql).toContain('b.community_id = $');
      expect(result.sql).toContain('p.board_id IN ($');
      expect(result.sql).toContain('p.author_user_id = $');
      expect(result.sql).toContain('p.tags @> $');
      expect(result.sql).toContain('p.title ILIKE $');
      expect(result.sql).toContain('p.lock_id = $');
      expect(result.sql).toContain('p.created_at >= $');
      expect(result.sql).toContain('p.created_at <= $');
      expect(result.sql).toContain('p.upvote_count < $');
      expect(result.sql).toContain('ORDER BY p.created_at DESC');
      expect(result.sql).toContain('LIMIT $');

      expect(result.params).toContain('user-123');
      expect(result.params).toContain('community-456');
      expect(result.params).toContain(1);
      expect(result.params).toContain(2);
      expect(result.params).toContain(3);
      expect(result.params).toContain('author-789');
      expect(result.params).toContain(['web3', 'tutorial']);
      expect(result.params).toContain('%blockchain%');
      expect(result.params).toContain(999);
      expect(result.params).toContain(50);
    });

    test('builds query with custom sorting', async () => {
      const popularityOptions: PostQueryOptions = { sortBy: 'popularity' };
      const popularityResult = await buildPostsQuery(popularityOptions);
      expect(popularityResult.sql).toContain('ORDER BY p.upvote_count DESC');

      const recentOptions: PostQueryOptions = { sortBy: 'recent' };
      const recentResult = await buildPostsQuery(recentOptions);
      expect(recentResult.sql).toContain('ORDER BY p.created_at DESC');

      const activityOptions: PostQueryOptions = { sortBy: 'activity' };
      const activityResult = await buildPostsQuery(activityOptions);
      expect(activityResult.sql).toContain('ORDER BY p.updated_at DESC');

      const titleOptions: PostQueryOptions = { sortBy: 'title', sortOrder: 'ASC' };
      const titleResult = await buildPostsQuery(titleOptions);
      expect(titleResult.sql).toContain('ORDER BY p.title ASC');
    });
  });

  describe('buildSinglePostQuery', () => {
    test('builds query for single post with user', async () => {
      const result = await buildSinglePostQuery(123, 'user-456', true);

      expect(result.sql).toContain('WHERE p.id = $');
      expect(result.sql).toContain('LEFT JOIN votes v');
      expect(result.sql).toContain('LEFT JOIN locks l');
      expect(result.params).toContain('user-456');
      expect(result.params).toContain(123);
    });

    test('builds query for single post without user', async () => {
      const result = await buildSinglePostQuery(123, undefined, false);

      expect(result.sql).toContain('WHERE p.id = $');
      expect(result.sql).not.toContain('LEFT JOIN votes v');
      expect(result.params).toContain(123);
      expect(result.params).not.toContain('user-456');
    });
  });

  describe('buildSearchQuery', () => {
    test('builds search query with filters', async () => {
      const filters: SearchFilters = {
        boardId: 123,
        tags: ['web3'],
        authorId: 'author-456',
        minUpvotes: 5,
        hasLock: true,
        dateRange: {
          start: new Date('2023-01-01'),
          end: new Date('2023-12-31')
        }
      };

      const result = await buildSearchQuery(
        'blockchain development',
        filters,
        'user-789',
        10
      );

      expect(result.sql).toContain('p.title ILIKE $');
      expect(result.sql).toContain('p.content ILIKE $');
      expect(result.sql).toContain('p.board_id = $');
      expect(result.sql).toContain('p.tags @> $');
      expect(result.sql).toContain('p.author_user_id = $');
      expect(result.sql).toContain('p.upvote_count >= $');
      expect(result.sql).toContain('p.lock_id IS NOT NULL');
      expect(result.sql).toContain('p.created_at >= $');
      expect(result.sql).toContain('p.created_at <= $');

      expect(result.params).toContain('%blockchain development%');
      expect(result.params).toContain(123);
      expect(result.params).toContain(['web3']);
      expect(result.params).toContain('author-456');
      expect(result.params).toContain(5);
      expect(result.params).toContain(10);
    });

    test('builds search query with hasLock false', async () => {
      const filters: SearchFilters = {
        hasLock: false
      };

      const result = await buildSearchQuery('test', filters, 'user-123', 5);

      expect(result.sql).toContain('p.lock_id IS NULL');
    });
  });
});

describe('Performance and Edge Cases', () => {
  test('handles empty board IDs array', () => {
    const result = EnrichedPostsQuery.forBoards([], 1);
    expect(result.clause).toBe('p.board_id IN ()');
    expect(result.params).toEqual([]);
    expect(result.nextIndex).toBe(1);
  });

  test('handles empty tags array', () => {
    const result = EnrichedPostsQuery.withTags([], 'AND', 1);
    expect(result.clause).toBe('p.tags @> $1');
    expect(result.params).toEqual([[]]);
    expect(result.nextIndex).toBe(2);
  });

  test('handles very long search terms', () => {
    const longTerm = 'a'.repeat(1000);
    const result = EnrichedPostsQuery.withSearchTerm(longTerm, 1);
    expect(result.clause).toContain('ILIKE $1');
    expect(result.params[0]).toBe(`%${longTerm}%`);
  });

  test('builds complex query efficiently', async () => {
    const startTime = Date.now();
    
    const complexOptions: PostQueryOptions = {
      userId: 'user-123',
      boardIds: Array.from({ length: 100 }, (_, i) => i + 1), // 100 boards
      tags: Array.from({ length: 20 }, (_, i) => `tag-${i}`), // 20 tags
      searchTerm: 'complex search with multiple words',
      createdAfter: new Date('2020-01-01'),
      createdBefore: new Date('2024-01-01'),
      limit: 100,
      sortBy: 'popularity',
      includeUserVoting: true,
      includeShareStats: true,
      includeLockInfo: true,
      includeBoardInfo: true,
      includeCommunityInfo: true,
      includeAuthorInfo: true
    };

    const result = await buildPostsQuery(complexOptions);
    const endTime = Date.now();

    expect(endTime - startTime).toBeLessThan(100); // Should build quickly
    expect(result.sql).toBeTruthy();
    expect(result.params.length).toBeGreaterThan(0);
    expect(result.sql.length).toBeGreaterThan(500); // Complex query should be substantial
  });
});

describe('Type Safety', () => {
  test('EnrichedPost interface includes all expected fields', () => {
    const mockPost: EnrichedPost = {
      // Core fields
      id: 1,
      author_user_id: 'user-123',
      title: 'Test Post',
      content: 'Test content',
      tags: ['test'],
      upvote_count: 10,
      comment_count: 5,
      created_at: '2023-12-01T10:00:00Z',
      updated_at: '2023-12-01T10:00:00Z',
      board_id: 1,
      settings: {},

      // Author fields
      author_name: 'Test User',
      author_profile_picture_url: 'https://example.com/avatar.jpg',

      // Board fields
      board_name: 'Test Board',

      // Share statistics
      share_access_count: 0,
      share_count: 0,

      // Optional fields can be undefined
      user_has_upvoted: true,
      lock_id: 123,
      lock_name: 'Test Lock'
    };

    expect(mockPost.id).toBe(1);
    expect(mockPost.author_name).toBe('Test User');
    expect(mockPost.user_has_upvoted).toBe(true);
  });

  test('PostQueryOptions interface accepts all option types', () => {
    const options: PostQueryOptions = {
      userId: 'user-123',
      communityId: 'community-456',
      userRoles: ['role1', 'role2'],
      isAdmin: false,
      boardId: 1,
      boardIds: [1, 2, 3],
      authorId: 'author-789',
      tags: ['tag1', 'tag2'],
      tagOperator: 'AND',
      searchTerm: 'search',
      lockId: 123,
      createdAfter: new Date(),
      createdBefore: new Date(),
      updatedAfter: new Date(),
      cursor: 'cursor-string',
      limit: 20,
      offset: 0,
      sortBy: 'popularity',
      sortOrder: 'DESC',
      includeUserVoting: true,
      includeShareStats: true,
      includeLockInfo: true,
      includeBoardInfo: true,
      includeCommunityInfo: true,
      includeAuthorInfo: true
    };

    expect(options.userId).toBe('user-123');
    expect(options.tagOperator).toBe('AND');
    expect(options.sortBy).toBe('popularity');
  });
});
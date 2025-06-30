# Enriched Posts Query Utility Library

A comprehensive utility library for standardizing enriched posts queries across the codebase. This library eliminates query duplication and provides type-safe, performance-optimized query builders.

## Overview

The enriched posts system combines data from multiple database tables:
- **posts** - Core post data
- **users** - Author information
- **boards** - Board metadata
- **communities** - Community settings
- **votes** - User voting status
- **links** - Share statistics
- **locks** - Gating/verification information

## Quick Start

```typescript
import { 
  getPostsForCommunity, 
  getSinglePost, 
  searchPosts,
  EnrichedPostsQuery 
} from '@/lib/queries/enrichedPosts';

// Get posts for a community with user permissions
const result = await getPostsForCommunity(
  'community-123',
  [1, 2, 3], // accessible board IDs
  'user-456', // current user ID
  { limit: 20, cursor: 'next-page-token' }
);

// Get a single enriched post
const post = await getSinglePost(123, 'user-456');

// Search posts with filters
const searchResults = await searchPosts(
  'blockchain development',
  [1, 2, 3], // accessible board IDs
  'user-456',
  { tags: ['web3', 'tutorial'], minUpvotes: 5 }
);
```

## Core Interfaces

### EnrichedPost

Complete post data structure with all JOINed fields:

```typescript
interface EnrichedPost {
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
```

### PostQueryOptions

Comprehensive options for building queries:

```typescript
interface PostQueryOptions {
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
  
  // Inclusions (what to JOIN)
  includeUserVoting?: boolean;
  includeShareStats?: boolean;
  includeLockInfo?: boolean;
  includeBoardInfo?: boolean;
  includeCommunityInfo?: boolean;
  includeAuthorInfo?: boolean;
}
```

## Query Builder Components

### EnrichedPostsQuery Object

The core query builder with modular components:

```typescript
// Field builders
EnrichedPostsQuery.getCoreFields()
EnrichedPostsQuery.getAuthorFields()
EnrichedPostsQuery.getBoardFields(includeSettings?)
EnrichedPostsQuery.getCommunityFields(includeSettings?)
EnrichedPostsQuery.getUserVotingField(userId?)
EnrichedPostsQuery.getShareStatsFields()
EnrichedPostsQuery.getLockFields()

// WHERE clause builders
EnrichedPostsQuery.forCommunity(communityId, paramIndex)
EnrichedPostsQuery.forBoard(boardId, paramIndex)
EnrichedPostsQuery.forBoards(boardIds, paramIndex)
EnrichedPostsQuery.forAuthor(authorId, paramIndex)
EnrichedPostsQuery.withTags(tags, operator, paramIndex)
EnrichedPostsQuery.withSearchTerm(searchTerm, paramIndex)
EnrichedPostsQuery.withLock(lockId, paramIndex)
EnrichedPostsQuery.withDateRange(paramIndex, after?, before?)
EnrichedPostsQuery.withCursorPagination(cursor?, paramIndex)

// Sorting options
EnrichedPostsQuery.byPopularity()
EnrichedPostsQuery.byRecent()
EnrichedPostsQuery.byActivity()
EnrichedPostsQuery.byTitle(order?)
EnrichedPostsQuery.customSort(sortBy, order?)
```

## High-Level Functions

### Community Posts

```typescript
// Get posts for a community with user permissions
const result = await getPostsForCommunity(
  'community-123',
  [1, 2, 3], // accessible board IDs
  'user-456',
  {
    limit: 20,
    sortBy: 'popularity',
    tags: ['web3'],
    tagOperator: 'AND'
  }
);
```

### Board Posts

```typescript
// Get posts for a specific board
const result = await getPostsForBoard(
  boardId: 123,
  userId: 'user-456',
  {
    limit: 20,
    sortBy: 'recent',
    cursor: 'pagination-token'
  }
);
```

### Author Posts

```typescript
// Get posts by a specific author
const result = await getPostsByAuthor(
  'author-789',
  [1, 2, 3], // accessible board IDs
  'user-456',
  {
    limit: 20,
    sortBy: 'recent',
    createdAfter: new Date('2023-01-01')
  }
);
```

### Search Posts

```typescript
// Full-text search with filters
const posts = await searchPosts(
  'blockchain development',
  [1, 2, 3], // accessible board IDs
  'user-456',
  {
    tags: ['web3', 'tutorial'],
    minUpvotes: 5,
    hasLock: true,
    dateRange: {
      start: new Date('2023-01-01'),
      end: new Date('2023-12-31')
    }
  },
  10 // limit
);
```

### Tagged Posts

```typescript
// Get posts with specific tags
const result = await getPostsWithTags(
  ['web3', 'defi', 'nft'],
  [1, 2, 3], // accessible board IDs
  'AND', // operator: must have ALL tags
  'user-456',
  { limit: 20, sortBy: 'popularity' }
);
```

### Lock-Gated Posts

```typescript
// Get posts that use a specific lock
const result = await getPostsWithLock(
  lockId: 789,
  [1, 2, 3], // accessible board IDs
  'user-456',
  { limit: 20, sortBy: 'recent' }
);
```

### Recent Posts (What's New)

```typescript
// Get recent posts since a date
const posts = await getRecentPosts(
  [1, 2, 3], // accessible board IDs
  new Date(Date.now() - 24 * 60 * 60 * 1000), // last 24 hours
  'user-456',
  50 // limit
);
```

## Advanced Usage

### Custom Query Building

```typescript
import { buildPostsQuery, executePostsQuery } from '@/lib/queries/enrichedPosts';

// Build a complex custom query
const queryResult = await buildPostsQuery({
  userId: 'user-123',
  boardIds: [1, 2, 3],
  tags: ['web3', 'tutorial'],
  tagOperator: 'AND',
  createdAfter: new Date('2023-01-01'),
  sortBy: 'popularity',
  limit: 50,
  includeUserVoting: true,
  includeShareStats: true,
  includeLockInfo: true,
  includeBoardInfo: true,
  includeAuthorInfo: true
});

// Execute the query
const posts = await executePostsQuery(queryResult);
```

### Manual Query Construction

```typescript
// For very custom use cases, build queries manually
const fields = [
  EnrichedPostsQuery.getCoreFields(),
  EnrichedPostsQuery.getAuthorFields(),
  EnrichedPostsQuery.getBoardFields(true),
  EnrichedPostsQuery.getUserVotingField('user-123')
].join(',\n    ');

const fromClause = EnrichedPostsQuery.buildFromClause({
  includeAuthorInfo: true,
  includeBoardInfo: true,
  includeUserVoting: true,
  userId: 'user-123'
});

const whereBoards = EnrichedPostsQuery.forBoards([1, 2, 3], 2);
const whereTags = EnrichedPostsQuery.withTags(['web3'], 'AND', whereBoards.nextIndex);

const sql = `
  SELECT ${fields}
  ${fromClause}
  WHERE ${whereBoards.clause} AND ${whereTags.clause}
  ${EnrichedPostsQuery.byPopularity()}
  LIMIT 20
`;

const params = ['user-123', ...whereBoards.params, ...whereTags.params];
```

## Migration Examples

### Migrating Existing API Endpoints

**Before (src/app/api/posts/route.ts):**
```typescript
// Complex, duplicated query logic
const postsQueryText = `
  SELECT
    p.id, p.author_user_id, p.title, p.content, p.tags, p.settings, p.lock_id,
    p.upvote_count, p.comment_count, p.created_at, p.updated_at,
    u.name AS author_name, u.profile_picture_url AS author_profile_picture_url,
    b.id AS board_id, b.name AS board_name,
    COALESCE(share_stats.total_access_count, 0) as share_access_count,
    // ... 50+ lines of complex SQL
`;
```

**After:**
```typescript
import { getPostsForCommunity } from '@/lib/queries/enrichedPosts';

// Clean, maintainable code
const result = await getPostsForCommunity(
  currentCommunityId,
  accessibleBoardIds,
  currentUserId,
  {
    tags: selectedTags,
    tagOperator: 'AND',
    cursor,
    limit,
    sortBy: 'popularity'
  }
);
```

### Migrating Search Endpoints

**Before (src/app/api/search/posts/route.ts):**
```typescript
// Duplicated complex JOIN logic
const result = await query(`
  SELECT p.id, p.author_user_id, p.title, p.content, /* ... many fields ... */
  FROM posts p
  JOIN users u ON p.author_user_id = u.user_id
  JOIN boards b ON p.board_id = b.id
  WHERE (p.title ILIKE $1 OR p.content ILIKE $1)
  AND p.board_id IN (${boardIdPlaceholders})
  // ... complex filtering logic
`, [searchTerm, ...accessibleBoardIds, limit]);
```

**After:**
```typescript
import { searchPosts } from '@/lib/queries/enrichedPosts';

// Simple, type-safe search
const posts = await searchPosts(
  searchQuery,
  accessibleBoardIds,
  currentUserId,
  { tags: selectedTags },
  limit
);
```

## Performance Considerations

### Optimized JOINs
- Only includes necessary JOINs based on options
- Uses LEFT JOINs for optional data (votes, shares, locks)
- Proper indexing support for all filter combinations

### Cursor Pagination
- Efficient cursor-based pagination for large datasets
- Avoids OFFSET performance issues
- Consistent ordering with multiple sort criteria

### Query Optimization
- Parameterized queries prevent SQL injection
- Reusable prepared statements
- Minimal data transfer with field selection

## Testing

### Unit Tests

```typescript
import { EnrichedPostsQuery, generateCursor, parseCursor } from '@/lib/queries/enrichedPosts';

describe('EnrichedPostsQuery', () => {
  test('builds correct WHERE clauses', () => {
    const result = EnrichedPostsQuery.forCommunity('community-123', 1);
    expect(result.clause).toBe('b.community_id = $1');
    expect(result.params).toEqual(['community-123']);
  });
  
  test('handles cursor pagination', () => {
    const cursor = generateCursor({
      id: 123,
      upvote_count: 45,
      created_at: '2023-12-01T10:00:00Z'
    } as EnrichedPost);
    
    const parsed = parseCursor(cursor);
    expect(parsed?.postId).toBe(123);
    expect(parsed?.upvoteCount).toBe(45);
  });
});
```

### Integration Tests

```typescript
describe('Posts API Integration', () => {
  test('migrated endpoint returns same data structure', async () => {
    // Test that migrated endpoints return identical results
    const legacyResult = await legacyGetPosts(options);
    const newResult = await getPostsForCommunity(communityId, boardIds, userId, options);
    
    expect(newResult.posts).toHaveLength(legacyResult.posts.length);
    expect(newResult.posts[0]).toMatchObject(legacyResult.posts[0]);
  });
});
```

## Best Practices

### 1. Use High-Level Functions First
```typescript
// ✅ Preferred - use convenience functions
const posts = await getPostsForCommunity(communityId, boardIds, userId);

// ❌ Avoid - don't build queries manually unless necessary
const query = await buildPostsQuery({ /* complex options */ });
```

### 2. Include Only Necessary Data
```typescript
// ✅ Good - include only what you need
const posts = await getPostsForBoard(boardId, userId, {
  includeShareStats: false,
  includeLockInfo: false
});

// ❌ Wasteful - including unnecessary JOINs
const posts = await getPostsForBoard(boardId, userId, {
  includeCommunityInfo: true // not needed for board view
});
```

### 3. Handle Permissions Properly
```typescript
// ✅ Always filter by accessible boards
const accessibleBoardIds = getAccessibleBoardIds(allBoards, userRoles, isAdmin);
const posts = await getPostsForCommunity(communityId, accessibleBoardIds, userId);

// ❌ Don't bypass permission filtering
const posts = await getPostsForCommunity(communityId, allBoardIds, userId);
```

### 4. Use Cursor Pagination for Large Datasets
```typescript
// ✅ Efficient cursor pagination
const result = await getPostsForCommunity(communityId, boardIds, userId, {
  cursor: previousResult.pagination.nextCursor,
  limit: 20
});

// ❌ Inefficient offset pagination for large datasets
const result = await getPostsForCommunity(communityId, boardIds, userId, {
  offset: page * limit,
  limit
});
```

## Error Handling

```typescript
import { executePostsQuery } from '@/lib/queries/enrichedPosts';

try {
  const posts = await getPostsForCommunity(communityId, boardIds, userId);
  return NextResponse.json({ posts: posts.posts });
} catch (error) {
  console.error('[API] Error fetching posts:', error);
  return NextResponse.json(
    { error: 'Failed to fetch posts' }, 
    { status: 500 }
  );
}
```

## Future Enhancements

- **Caching Layer**: Add Redis caching for frequently accessed queries
- **Query Analytics**: Track query performance and usage patterns  
- **Batch Operations**: Support for bulk operations on multiple posts
- **Streaming Results**: Support for streaming large result sets
- **GraphQL Integration**: Expose query builders through GraphQL resolvers

## Migration Checklist

When migrating existing endpoints to use this library:

- [ ] Identify all current post-related queries
- [ ] Map existing parameters to `PostQueryOptions`
- [ ] Replace manual SQL with appropriate high-level functions
- [ ] Ensure permission filtering is maintained
- [ ] Update TypeScript interfaces to use `EnrichedPost`
- [ ] Add error handling for query execution
- [ ] Test that results match existing behavior
- [ ] Update API documentation
- [ ] Remove duplicate query code
- [ ] Add performance monitoring

This utility library provides a solid foundation for all post querying needs while maintaining type safety, performance, and consistency across the codebase.
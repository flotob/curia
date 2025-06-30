# Integration Guide: Enriched Posts Query Utility Library

This guide helps other agents integrate and migrate to the enriched posts utility library for standardized query patterns across the codebase.

## 🚀 Quick Integration Checklist

### For New Development
- [ ] Import utility functions instead of writing raw SQL
- [ ] Use `EnrichedPost` interface for type safety
- [ ] Follow established query patterns in README.md
- [ ] Add error handling for query execution

### For Existing Code Migration
- [ ] Identify current post-related queries in your files
- [ ] Map existing parameters to `PostQueryOptions`
- [ ] Replace manual SQL with appropriate convenience functions
- [ ] Test that results match existing behavior
- [ ] Remove duplicate query code

## 🔄 Common Migration Patterns

### Pattern 1: Simple Community Posts

**BEFORE:**
```typescript
// src/app/api/posts/route.ts
const postsQueryText = `
  SELECT
    p.id, p.author_user_id, p.title, p.content, p.tags, p.settings, p.lock_id,
    p.upvote_count, p.comment_count, p.created_at, p.updated_at,
    u.name AS author_name, u.profile_picture_url AS author_profile_picture_url,
    b.id AS board_id, b.name AS board_name,
    COALESCE(share_stats.total_access_count, 0) as share_access_count,
    // ... 40+ more lines
  FROM posts p
  JOIN users u ON p.author_user_id = u.user_id
  JOIN boards b ON p.board_id = b.id
  // ... complex JOINs and WHERE clauses
`;
const result = await query(postsQueryText, params);
```

**AFTER:**
```typescript
import { getPostsForCommunity } from '@/lib/queries/enrichedPosts';

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

### Pattern 2: Search with Filters

**BEFORE:**
```typescript
// src/app/api/search/posts/route.ts
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

**AFTER:**
```typescript
import { searchPosts } from '@/lib/queries/enrichedPosts';

const posts = await searchPosts(
  searchQuery,
  accessibleBoardIds,
  currentUserId,
  { tags: selectedTags },
  limit
);
```

### Pattern 3: Single Post Retrieval

**BEFORE:**
```typescript
// Multiple places with similar queries
const result = await query(`
  SELECT p.*, u.name as author_name, b.name as board_name,
         CASE WHEN v.user_id IS NOT NULL THEN TRUE ELSE FALSE END AS user_has_upvoted
  FROM posts p
  JOIN users u ON p.author_user_id = u.user_id
  JOIN boards b ON p.board_id = b.id
  LEFT JOIN votes v ON p.id = v.post_id AND v.user_id = $2
  WHERE p.id = $1
`, [postId, userId]);
```

**AFTER:**
```typescript
import { getSinglePost } from '@/lib/queries/enrichedPosts';

const post = await getSinglePost(postId, userId);
```

## 📊 Migration Impact Assessment

### Files That Should Be Migrated

1. **High Priority (Immediate)**
   - `src/app/api/posts/route.ts` - Main posts API
   - `src/app/api/search/posts/route.ts` - Search functionality
   - `src/app/api/posts/[postId]/metadata/route.ts` - Post metadata
   - `src/app/api/me/whats-new/route.ts` - What's new functionality

2. **Medium Priority (Next Sprint)**
   - `src/lib/telegram/directMetadataFetcher.ts` - Telegram integration
   - User profile post listings
   - Board-specific post endpoints
   - Community dashboard queries

3. **Low Priority (Cleanup)**
   - Legacy components with embedded queries
   - Admin panel queries
   - Analytics and reporting queries

### Expected Benefits

- **Code Reduction**: 60-80% reduction in query-related code
- **Type Safety**: Full TypeScript support with `EnrichedPost` interface
- **Performance**: Optimized JOINs and pagination patterns
- **Consistency**: Standardized data structure across all endpoints
- **Maintainability**: Centralized query logic for easier updates

## 🛠️ Step-by-Step Migration Process

### Step 1: Assessment
```bash
# Find all files with post-related queries
grep -r "FROM posts" src/
grep -r "JOIN.*posts" src/
grep -r "SELECT.*posts" src/
```

### Step 2: Import and Setup
```typescript
// Add to your API route or component
import {
  getPostsForCommunity,
  getSinglePost,
  searchPosts,
  EnrichedPost,
  type PostQueryOptions
} from '@/lib/queries/enrichedPosts';
```

### Step 3: Replace Query Logic
```typescript
// Replace this pattern:
const result = await query(complexSQL, params);
const posts = result.rows.map(transformRow);

// With this pattern:
const result = await getPostsForCommunity(communityId, boardIds, userId, options);
const posts = result.posts; // Already typed as EnrichedPost[]
```

### Step 4: Update Interfaces
```typescript
// Replace custom interfaces with standardized ones
interface CustomPost {
  id: number;
  title: string;
  // ... partial fields
}

// Use comprehensive interface instead
import { EnrichedPost } from '@/lib/queries/enrichedPosts';
```

### Step 5: Test and Validate
```typescript
// Add validation during migration
console.log('Migration test:', {
  oldResultCount: legacyResult.length,
  newResultCount: newResult.posts.length,
  firstPostMatch: JSON.stringify(legacyResult[0]) === JSON.stringify(newResult.posts[0])
});
```

## 🔧 Advanced Integration Patterns

### Custom Query Building
```typescript
import { buildPostsQuery, executePostsQuery } from '@/lib/queries/enrichedPosts';

// For complex custom requirements
const queryResult = await buildPostsQuery({
  userId: 'user-123',
  boardIds: accessibleBoardIds,
  tags: ['web3'],
  tagOperator: 'AND',
  createdAfter: new Date('2023-01-01'),
  sortBy: 'popularity',
  limit: 50,
  // Fine-tune what data to include
  includeUserVoting: true,
  includeShareStats: false, // Skip if not needed
  includeLockInfo: true,
  includeCommunityInfo: false // Skip if not needed
});

const posts = await executePostsQuery(queryResult);
```

### Performance Optimization
```typescript
// Only include what you actually need
const lightweightPosts = await getPostsForBoard(boardId, userId, {
  includeShareStats: false,     // Skip expensive aggregation
  includeLockInfo: false,       // Skip lock JOIN
  includeCommunityInfo: false,  // Skip community JOIN
  limit: 10                     // Smaller page size
});

// For high-traffic endpoints, consider caching
const cacheKey = `posts:${communityId}:${boardIds.join(',')}:${limit}`;
let result = await redis.get(cacheKey);
if (!result) {
  result = await getPostsForCommunity(communityId, boardIds, userId, options);
  await redis.setex(cacheKey, 300, JSON.stringify(result)); // 5min cache
}
```

### Error Handling Patterns
```typescript
// Standardized error handling
try {
  const posts = await getPostsForCommunity(communityId, boardIds, userId, options);
  return NextResponse.json({ posts: posts.posts, pagination: posts.pagination });
} catch (error) {
  console.error('[API] Error fetching posts:', error);
  
  // Return consistent error format
  return NextResponse.json(
    { 
      error: 'Failed to fetch posts',
      code: 'POSTS_QUERY_ERROR',
      timestamp: new Date().toISOString()
    }, 
    { status: 500 }
  );
}
```

## 📝 Testing Migration

### Unit Tests
```typescript
import { getPostsForCommunity } from '@/lib/queries/enrichedPosts';

describe('Posts API Migration', () => {
  test('migrated endpoint returns same data structure', async () => {
    const legacyResult = await legacyGetPosts(testOptions);
    const newResult = await getPostsForCommunity(
      testCommunityId, 
      testBoardIds, 
      testUserId, 
      testOptions
    );
    
    expect(newResult.posts).toHaveLength(legacyResult.posts.length);
    expect(newResult.posts[0]).toMatchObject(legacyResult.posts[0]);
  });
});
```

### Integration Tests
```typescript
// Test with real database
describe('Migration Integration', () => {
  test('cursor pagination works correctly', async () => {
    const firstPage = await getPostsForCommunity(communityId, boardIds, userId, { limit: 5 });
    expect(firstPage.posts).toHaveLength(5);
    expect(firstPage.pagination.hasMore).toBe(true);
    
    const secondPage = await getPostsForCommunity(communityId, boardIds, userId, {
      limit: 5,
      cursor: firstPage.pagination.nextCursor
    });
    expect(secondPage.posts).toHaveLength(5);
    expect(secondPage.posts[0].id).not.toBe(firstPage.posts[0].id);
  });
});
```

## 🚨 Common Pitfalls and Solutions

### Pitfall 1: Missing Permission Filtering
```typescript
// ❌ WRONG - Bypasses user permissions
const posts = await getPostsForCommunity(communityId, allBoardIds, userId);

// ✅ CORRECT - Use accessible boards
const accessibleBoardIds = getAccessibleBoardIds(allBoards, userRoles, isAdmin);
const posts = await getPostsForCommunity(communityId, accessibleBoardIds, userId);
```

### Pitfall 2: Over-fetching Data
```typescript
// ❌ WRONG - Includes unnecessary JOINs
const posts = await getPostsForBoard(boardId, userId, {
  includeCommunityInfo: true,  // Not needed for board view
  includeLockInfo: true,       // Not needed if no locks
  includeShareStats: true      // Expensive aggregation
});

// ✅ CORRECT - Only include what you need
const posts = await getPostsForBoard(boardId, userId, {
  includeShareStats: false,
  includeLockInfo: false
});
```

### Pitfall 3: Incorrect Cursor Handling
```typescript
// ❌ WRONG - Manual cursor generation
const cursor = `${post.upvote_count}_${post.id}`;

// ✅ CORRECT - Use utility function
import { generateCursor } from '@/lib/queries/enrichedPosts';
const cursor = generateCursor(post);
```

## 📈 Performance Monitoring

### Metrics to Track
```typescript
// Add performance monitoring during migration
const startTime = Date.now();
const result = await getPostsForCommunity(communityId, boardIds, userId, options);
const endTime = Date.now();

console.log(`[Performance] Posts query completed in ${endTime - startTime}ms`, {
  communityId,
  boardCount: boardIds.length,
  resultCount: result.posts.length,
  includesVoting: !!userId,
  includesShares: options.includeShareStats !== false
});
```

### Database Query Analysis
```sql
-- Monitor query performance
EXPLAIN ANALYZE 
SELECT p.id, p.title, /* ... enriched fields ... */
FROM posts p
JOIN users u ON p.author_user_id = u.user_id
-- ... generated query from utility
```

## 📋 Migration Completion Checklist

### Code Quality
- [ ] All manual SQL replaced with utility functions
- [ ] TypeScript interfaces updated to use `EnrichedPost`
- [ ] Error handling follows standardized patterns
- [ ] Performance optimizations applied (selective JOINs)
- [ ] Tests updated and passing

### Documentation
- [ ] API documentation updated with new response format
- [ ] Component documentation reflects new data structure
- [ ] Performance characteristics documented
- [ ] Migration notes added to relevant files

### Validation
- [ ] A/B tested against legacy implementation
- [ ] Performance benchmarks show improvement or parity
- [ ] All existing functionality preserved
- [ ] Edge cases handled correctly
- [ ] User-facing behavior unchanged

## 🔮 Future Enhancements

### Planned Features
- **Caching Integration**: Redis layer for high-traffic queries
- **GraphQL Support**: Expose query builders through GraphQL resolvers
- **Streaming Results**: Support for real-time post updates
- **Analytics Integration**: Built-in query performance tracking
- **Batch Operations**: Efficient bulk post operations

### Extension Points
```typescript
// The utility library is designed for extension
export interface CustomPostQueryOptions extends PostQueryOptions {
  // Add custom filtering options
  customField?: string;
  advancedFilter?: ComplexFilter;
}

// Extend base query builders
export const CustomEnrichedPostsQuery = {
  ...EnrichedPostsQuery,
  withCustomFilter: (filter: ComplexFilter, paramIndex: number) => {
    // Custom filter implementation
  }
};
```

## 🆘 Support and Troubleshooting

### Common Issues

1. **Type Errors**: Ensure all imports use correct paths and interfaces
2. **Performance Issues**: Check if unnecessary JOINs are included
3. **Permission Errors**: Verify accessible board IDs are used
4. **Pagination Issues**: Use utility functions for cursor generation

### Getting Help

1. Check the comprehensive README.md for examples
2. Review the test file for usage patterns
3. Look at existing migrated endpoints for reference patterns
4. Use the utility library's built-in error logging for debugging

This integration guide provides a complete roadmap for adopting the enriched posts utility library across the codebase, ensuring consistent, performant, and maintainable post querying patterns.
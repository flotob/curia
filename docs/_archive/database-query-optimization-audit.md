# Database Query Optimization Audit

## Executive Summary

This audit analyzed all database queries across the codebase and identified significant optimization opportunities. The findings are categorized into four main areas: repeated query patterns, N+1 query problems, complex repeated joins, and missing indexes.

## 1. Repeated Query Patterns That Could Be Extracted

### 1.1 User Statistics Queries

**Pattern Found:** User post/comment count queries are repeated across multiple endpoints.

**Occurrences:**
- `src/app/api/me/route.ts:20-21`
- `src/app/api/users/[userId]/route.ts:41-42`
- `src/app/api/users/search/route.ts:41-42`

**Current Implementation:**
```sql
SELECT COUNT(*) as count FROM posts WHERE author_user_id = $1
SELECT COUNT(*) as count FROM comments WHERE author_user_id = $1
```

**Recommendation:** Create reusable function:
```typescript
// src/lib/queries/userStats.ts
export async function getUserStats(userId: string) {
  const [postsResult, commentsResult, joinDateResult] = await Promise.all([
    query('SELECT COUNT(*) as count FROM posts WHERE author_user_id = $1', [userId]),
    query('SELECT COUNT(*) as count FROM comments WHERE author_user_id = $1', [userId]),
    query('SELECT MIN(created_at) as joined_date FROM user_communities WHERE user_id = $1', [userId])
  ]);
  
  return {
    posts_count: parseInt(postsResult.rows[0]?.count || '0'),
    comments_count: parseInt(commentsResult.rows[0]?.count || '0'),
    joined_date: joinDateResult.rows[0]?.joined_date || new Date().toISOString()
  };
}
```

### 1.2 Lock Verification Queries

**Pattern Found:** Pre-verification checks are repeated across voting, commenting, and reaction endpoints.

**Occurrences:**
- `src/app/api/posts/route.ts:315`
- `src/app/api/posts/[postId]/votes/route.ts:66,229`
- `src/app/api/posts/[postId]/comments/route.ts:532`
- `src/app/api/posts/[postId]/reactions/route.ts:204`

**Current Implementation:**
```sql
SELECT lock_id FROM pre_verifications 
WHERE user_id = $1 AND lock_id IN (${lockIdPlaceholders})
  AND verification_status = 'verified' AND expires_at > NOW()
```

**Recommendation:** Create reusable verification function:
```typescript
// src/lib/queries/lockVerification.ts
export async function getUserVerifiedLocks(userId: string, lockIds: number[]) {
  if (lockIds.length === 0) return new Set<number>();
  
  const placeholders = lockIds.map((_, index) => `$${index + 2}`).join(', ');
  const result = await query(`
    SELECT lock_id FROM pre_verifications 
    WHERE user_id = $1 AND lock_id IN (${placeholders})
      AND verification_status = 'verified' AND expires_at > NOW()
  `, [userId, ...lockIds]);
  
  return new Set(result.rows.map(row => row.lock_id));
}
```

### 1.3 Board Accessibility Pattern

**Pattern Found:** Board access checking with owned + imported boards logic is repeated.

**Occurrences:**
- `src/lib/boardPermissions.ts:87-92,126-130,183-191`
- Used indirectly in multiple APIs

**Current Implementation:** Already well-extracted in `boardPermissions.ts`, but could be optimized further.

## 2. N+1 Query Problems

### 2.1 User Profile Data in Search Results

**Problem:** `src/app/api/users/search/route.ts` and `src/app/api/users/[userId]/route.ts` fetch extended profile data individually.

**Current Issue:**
```typescript
// Individual calls for each user found
const [postsResult, commentsResult, joinDateResult] = await Promise.all([
  query(`SELECT COUNT(*) as count FROM posts WHERE author_user_id = $1`, [userId]),
  query(`SELECT COUNT(*) as count FROM comments WHERE author_user_id = $1`, [userId]),
  query(`SELECT MIN(created_at) as joined_date FROM user_communities WHERE user_id = $1`, [userId])
]);
```

**Recommendation:** Batch user stats fetching:
```typescript
// src/lib/queries/userStats.ts
export async function getBatchUserStats(userIds: string[]) {
  if (userIds.length === 0) return new Map();
  
  const placeholders = userIds.map((_, i) => `$${i + 1}`).join(',');
  const result = await query(`
    SELECT 
      u.user_id,
      COALESCE(p.post_count, 0) as posts_count,
      COALESCE(c.comment_count, 0) as comments_count,
      COALESCE(uc.joined_date, NOW()) as joined_date
    FROM (SELECT unnest(ARRAY[${placeholders}]) as user_id) u
    LEFT JOIN (
      SELECT author_user_id, COUNT(*) as post_count 
      FROM posts 
      WHERE author_user_id = ANY($${userIds.length + 1})
      GROUP BY author_user_id
    ) p ON u.user_id = p.author_user_id
    LEFT JOIN (
      SELECT author_user_id, COUNT(*) as comment_count 
      FROM comments 
      WHERE author_user_id = ANY($${userIds.length + 1})
      GROUP BY author_user_id
    ) c ON u.user_id = c.author_user_id
    LEFT JOIN (
      SELECT user_id, MIN(created_at) as joined_date 
      FROM user_communities 
      WHERE user_id = ANY($${userIds.length + 1})
      GROUP BY user_id
    ) uc ON u.user_id = uc.user_id
  `, [...userIds, `{${userIds.join(',')}}`]);
  
  return new Map(result.rows.map(row => [row.user_id, row]));
}
```

### 2.2 Board Metadata in Post Lists

**Problem:** Posts API fetches board information via JOIN, but could be optimized for repeated board access patterns.

**Current Implementation:** Already uses JOINs appropriately, but board permission checking could be cached.

### 2.3 What's New Query Duplication

**Problem:** `src/app/api/me/whats-new/route.ts` has highly similar query patterns that could be unified.

**Lines:** 88-91, 117-118, 160-163, 194-195 (similar JOIN patterns)

**Recommendation:** Create base query builder:
```typescript
// src/lib/queries/whatsNewQueries.ts
function buildBaseWhatsNewQuery(type: 'comments' | 'reactions' | 'posts') {
  const baseJoins = `
    INNER JOIN posts p ON ${type === 'comments' ? 'c.post_id' : type === 'reactions' ? 'r.post_id' : 'p.id'} = p.id
    INNER JOIN boards b ON p.board_id = b.id
    INNER JOIN communities comm ON b.community_id = comm.id
    INNER JOIN users actor ON ${type === 'comments' ? 'c.author_user_id' : type === 'reactions' ? 'r.user_id' : 'p.author_user_id'} = actor.user_id
  `;
  return baseJoins;
}
```

## 3. Complex Joins That Are Repeated

### 3.1 Post-Board-Community-User Pattern

**Most Common Join Pattern:**
```sql
FROM posts p
JOIN users u ON p.author_user_id = u.user_id
JOIN boards b ON p.board_id = b.id
JOIN communities c ON b.community_id = c.id
```

**Occurrences:**
- `src/app/api/posts/route.ts:199-200`
- `src/app/api/search/posts/route.ts:98-99`
- `src/app/api/me/whats-new/route.ts:88-91` (variations)
- `src/app/api/users/[userId]/activity/route.ts:146,172,215,243`
- Many others...

**Recommendation:** Create view or reusable query fragment:
```sql
-- Migration: create view for common post enrichment
CREATE VIEW enriched_posts AS
SELECT 
  p.id, p.author_user_id, p.title, p.content, p.tags, p.settings, p.lock_id,
  p.upvote_count, p.comment_count, p.created_at, p.updated_at,
  u.name AS author_name, 
  u.profile_picture_url AS author_profile_picture_url,
  b.id AS board_id, 
  b.name AS board_name,
  b.community_id,
  c.name AS community_name,
  c.community_short_id,
  c.plugin_id
FROM posts p
JOIN users u ON p.author_user_id = u.user_id
JOIN boards b ON p.board_id = b.id
JOIN communities c ON b.community_id = c.id;
```

### 3.2 Reaction Complex Joins

**Pattern Found:** Reactions with posts/comments and their board/community context.

**Occurrences:**
- `src/app/api/me/whats-new/route.ts:248-255,282-286`
- `src/app/api/users/[userId]/activity/route.ts:293-297,325-328`

**Current Implementation:**
```sql
LEFT JOIN posts p ON r.post_id = p.id AND p.author_user_id = $1
LEFT JOIN boards pb ON p.board_id = pb.id
LEFT JOIN communities pcomm ON pb.community_id = pcomm.id
LEFT JOIN comments c ON r.comment_id = c.id AND c.author_user_id = $1
LEFT JOIN posts cp ON c.post_id = cp.id
LEFT JOIN boards cpb ON cp.board_id = cpb.id
LEFT JOIN communities cpcomm ON cpb.community_id = cpcomm.id
```

**Recommendation:** Create materialized view for reaction context:
```sql
CREATE MATERIALIZED VIEW reaction_context AS
SELECT 
  r.id as reaction_id,
  r.user_id,
  r.emoji,
  r.created_at,
  CASE 
    WHEN r.post_id IS NOT NULL THEN 'post'
    WHEN r.comment_id IS NOT NULL THEN 'comment'
    WHEN r.lock_id IS NOT NULL THEN 'lock'
  END as content_type,
  COALESCE(p.id, cp.id) as post_id,
  COALESCE(p.title, cp.title) as post_title,
  COALESCE(p.author_user_id, c.author_user_id) as content_author_id,
  COALESCE(pb.id, cpb.id) as board_id,
  COALESCE(pb.name, cpb.name) as board_name,
  COALESCE(pcomm.id, cpcomm.id) as community_id
FROM reactions r
LEFT JOIN posts p ON r.post_id = p.id
LEFT JOIN boards pb ON p.board_id = pb.id
LEFT JOIN communities pcomm ON pb.community_id = pcomm.id
LEFT JOIN comments c ON r.comment_id = c.id
LEFT JOIN posts cp ON c.post_id = cp.id
LEFT JOIN boards cpb ON cp.board_id = cpb.id
LEFT JOIN communities cpcomm ON cpb.community_id = cpcomm.id;

-- Refresh periodically
CREATE INDEX ON reaction_context (content_author_id, community_id, created_at);
```

### 3.3 Board Permission Joins

**Pattern Found:** Owned + imported boards accessibility checks.

**Occurrences:**
- `src/lib/boardPermissions.ts:147-148,191-196`
- Used indirectly in many post/board APIs

**Current Implementation:** Well-structured but could benefit from materialized view for frequently accessed communities.

## 4. Missing Indexes Based on Query Patterns

### 4.1 Composite Indexes for What's New Queries

**Missing Indexes:**
```sql
-- For comments on user's posts filtering
CREATE INDEX idx_comments_post_author_community_created 
ON comments (author_user_id, created_at) 
INCLUDE (post_id, content);

-- For community-scoped post queries with user exclusion
CREATE INDEX idx_posts_community_author_created 
ON posts (board_id, author_user_id, created_at) 
WHERE author_user_id IS NOT NULL;

-- For reaction queries by content author and community
CREATE INDEX idx_reactions_content_community_created 
ON reactions (user_id, created_at) 
INCLUDE (post_id, comment_id, emoji);
```

### 4.2 Pre-verification Query Optimization

**Current Index:** `pre_verifications_user_id_index`

**Better Composite Index:**
```sql
-- Replace single-column index with composite
DROP INDEX IF EXISTS pre_verifications_user_id_index;
CREATE INDEX idx_pre_verifications_user_status_expiry_lock 
ON pre_verifications (user_id, verification_status, expires_at, lock_id)
WHERE verification_status = 'verified' AND expires_at > NOW();
```

### 4.3 Board Accessibility Indexes

**Missing Indexes:**
```sql
-- For accessible boards queries (getAccessibleBoards)
CREATE INDEX idx_boards_community_active 
ON boards (community_id, created_at) 
INCLUDE (id, name, description, settings);

-- For imported boards lookups
CREATE INDEX idx_imported_boards_community_active_source 
ON imported_boards (importing_community_id, is_active, source_board_id)
WHERE is_active = true;
```

### 4.4 User Activity Indexes

**Missing Indexes:**
```sql
-- For user activity queries across communities
CREATE INDEX idx_posts_author_board_created 
ON posts (author_user_id, board_id, created_at DESC) 
INCLUDE (id, title, upvote_count, comment_count);

CREATE INDEX idx_comments_author_created 
ON comments (author_user_id, created_at DESC) 
INCLUDE (id, post_id, content);

-- For cross-board activity tracking
CREATE INDEX idx_posts_comments_board_activity 
ON comments (post_id, author_user_id) 
INCLUDE (created_at);
```

### 4.5 JSON Query Optimization

**Current:** Basic GIN indexes on JSONB columns

**Enhanced Indexes:**
```sql
-- For board lock gating queries
CREATE INDEX idx_boards_lock_gating 
ON boards USING gin ((settings->'permissions'->'locks'));

-- For post gating settings
CREATE INDEX idx_posts_response_permissions 
ON posts USING gin ((settings->'responsePermissions'));

-- For community partnership permissions
CREATE INDEX idx_partnerships_permissions 
ON community_partnerships USING gin (source_to_target_permissions, target_to_source_permissions);
```

## 5. Implementation Priority

### High Priority (Immediate Impact)
1. **Create reusable user stats function** - Eliminates duplicate queries across 3+ endpoints
2. **Add composite indexes for pre-verifications** - Improves lock verification performance
3. **Create lock verification utility function** - DRY principle for security-critical code

### Medium Priority (Performance Gains)
1. **Implement batch user stats fetching** - Reduces N+1 queries in search results
2. **Add What's New query indexes** - Improves dashboard performance
3. **Create enriched_posts view** - Simplifies complex queries

### Low Priority (Long-term Optimization)
1. **Materialized views for complex joins** - Requires refresh strategy
2. **JSON-specific indexes** - Only if JSON queries become bottlenecks
3. **Query result caching** - Application-level optimization

## 6. Monitoring Recommendations

After implementing optimizations:

1. **Enable query logging** for slow queries (>100ms)
2. **Monitor index usage** with `pg_stat_user_indexes`
3. **Track query performance** for What's New and search endpoints
4. **Set up alerts** for N+1 query patterns in application logs

## 7. Migration Strategy

1. **Phase 1:** Create utility functions and basic composite indexes
2. **Phase 2:** Implement batch fetching for user stats
3. **Phase 3:** Add views and materialized views
4. **Phase 4:** Monitor and fine-tune based on production metrics

This audit provides a roadmap for systematic database optimization that should significantly improve query performance across the application.
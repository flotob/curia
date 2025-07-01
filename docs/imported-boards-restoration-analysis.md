# Imported Boards Restoration Analysis

## Problem Statement

After introducing the efficient unified `enriched_posts` query library to centralize and optimize post queries, the system lost the ability to show posts from imported boards in:

1. **Home feed** of importing community
2. **Shared board navigation** when users click on imported boards in sidebar

This breaks a key feature of partner community integrations where communities can import boards from partners and see their posts seamlessly integrated.

## Root Cause Analysis

### What Was Working (Main Branch)

The old post query system in `src/app/api/posts/route.ts`:

```typescript
// Get accessible boards (owned + imported)
const allBoards = await getAccessibleBoards(currentCommunityId);

// Filter by user permissions
const accessibleBoardIds = getAccessibleBoardIds(allBoards, userRoles, isAdmin);

// Query posts using ONLY board ID filtering
baseWhere += ` AND p.board_id IN (${boardIdPlaceholders})`;
baseParams.push(...accessibleBoardIds);
```

**Key insight**: Only filtered by `board_id`, which included both owned and imported board IDs.

### What's Broken (Fix/Layout Branch)

The new unified library in `src/lib/queries/enrichedPosts.ts`:

```typescript
// getPostsForCommunity() function
export async function getPostsForCommunity(
  communityId: string,
  accessibleBoardIds: number[],
  userId?: string,
  options: Partial<PostQueryOptions> = {}
): Promise<PaginatedPostsResult> {
  return executePostsQueryPaginated({
    communityId,        // ❌ PROBLEM: Adds b.community_id = $communityId
    boardIds: accessibleBoardIds,  // ✅ This part works fine
    // ...
  });
}

// forCommunity clause builder
forCommunity: (communityId: string, paramIndex: number) => ({
  clause: `b.community_id = $${paramIndex}`,  // ❌ PROBLEM: Excludes imported boards
  params: [communityId],
  nextIndex: paramIndex + 1
}),
```

**Issue**: The `communityId` parameter adds `WHERE b.community_id = $communityId` which excludes imported boards because:
- Imported boards have `b.community_id = source_community_id` 
- Not `b.community_id = importing_community_id`

### Impact Assessment

**Affected Endpoints:**
- `GET /api/posts` - Main home feed 
- `POST Repository.getPostsForCommunity()` - Repository layer
- Any component using `getPostsForCommunity()` utility

**Affected Features:**
- Home feed missing imported board posts
- Shared board clicks showing empty/filtered results
- Search within community missing imported content
- Activity feeds missing cross-community content

## Solution Options

### Option 1: Remove Community Filtering (Minimal Change)

**Approach:** Remove the `communityId` parameter from `getPostsForCommunity()` calls.

```typescript
// In getPostsForCommunity()
export async function getPostsForCommunity(
  communityId: string,  // Keep for API compatibility
  accessibleBoardIds: number[],
  userId?: string,
  options: Partial<PostQueryOptions> = {}
): Promise<PaginatedPostsResult> {
  return executePostsQueryPaginated({
    // communityId,  // ❌ Remove this line
    boardIds: accessibleBoardIds,  // ✅ Only filter by accessible boards
    userId,
    // ...options
  });
}
```

**Pros:**
- Minimal code change (1 line removal)
- Maintains all existing functionality
- No database migration needed
- Backward compatible
- Simple to understand and verify

**Cons:**
- Slightly less optimal queries (no community pre-filtering)
- Relies entirely on board-level filtering for security

**Complexity:** ⭐ (Very Low)

### Option 2: Smart Community Filtering (Medium Change)

**Approach:** Modify the query builder to handle imported boards intelligently.

```typescript
// New forCommunityWithImports clause builder
forCommunityWithImports: (communityId: string, paramIndex: number) => ({
  clause: `(b.community_id = $${paramIndex} OR EXISTS (
    SELECT 1 FROM imported_boards ib 
    WHERE ib.source_board_id = b.id 
      AND ib.importing_community_id = $${paramIndex}
      AND ib.is_active = true
  ))`,
  params: [communityId],
  nextIndex: paramIndex + 1
}),
```

**Pros:**
- Maintains query optimization with community filtering
- Explicitly handles imported boards
- More explicit about intent
- Could be extended for more complex filtering

**Cons:**
- More complex query with subquery
- Requires understanding of imported_boards table structure
- Potential performance impact from EXISTS subquery

**Complexity:** ⭐⭐⭐ (Medium)

### Option 3: Pre-Expand Accessible Boards (Medium Change)

**Approach:** Modify `getAccessibleBoards()` to return expanded board information that enables smart filtering.

```typescript
// Enhanced getAccessibleBoards return type
interface AccessibleBoard {
  id: number;
  name: string;
  // ... existing fields
  effective_community_id: string;  // Importing community for imported boards
  source_community_id?: string;    // Source community for imported boards
  is_imported: boolean;
}

// Smart filtering in query builder
forCommunityExpanded: (communityId: string, expandedBoards: AccessibleBoard[], paramIndex: number) => {
  const ownedBoardIds = expandedBoards.filter(b => !b.is_imported).map(b => b.id);
  const importedBoardIds = expandedBoards.filter(b => b.is_imported).map(b => b.id);
  
  if (importedBoardIds.length === 0) {
    // Simple case: only owned boards
    return forCommunity(communityId, paramIndex);
  }
  
  // Complex case: mixed owned and imported boards
  const allBoardIds = expandedBoards.map(b => b.id);
  return forBoards(allBoardIds, paramIndex);
}
```

**Pros:**
- Clean separation of concerns
- Leverages existing board permission logic
- Enables future enhancements (board-specific permissions)
- Type-safe handling of imported vs owned boards

**Cons:**
- Requires changes to `getAccessibleBoards()` function
- More complex data structures
- Larger change footprint

**Complexity:** ⭐⭐⭐⭐ (Medium-High)

### Option 4: View-Based Solution (High Change)

**Approach:** Create a database view that handles the complexity.

```sql
-- New view: accessible_posts_by_community
CREATE VIEW accessible_posts_by_community AS
SELECT 
  p.*,
  CASE 
    WHEN ib.importing_community_id IS NOT NULL 
    THEN ib.importing_community_id
    ELSE b.community_id 
  END as effective_community_id,
  b.community_id as source_community_id,
  CASE WHEN ib.id IS NOT NULL THEN true ELSE false END as is_from_imported_board
FROM posts p
JOIN boards b ON p.board_id = b.id
LEFT JOIN imported_boards ib ON b.id = ib.source_board_id AND ib.is_active = true;
```

**Pros:**
- Database handles the complexity
- Very fast queries
- Clean application logic
- Scales well with large datasets

**Cons:**
- Requires database migration
- More complex to understand and maintain
- May need to update other parts of system
- View dependencies can be fragile

**Complexity:** ⭐⭐⭐⭐⭐ (High)

### Option 5: Hybrid Approach (Recommended)

**Approach:** Combine Option 1 (immediate fix) with Option 2 (future optimization).

**Phase 1:** Remove community filtering for immediate fix
```typescript
// Quick fix - remove communityId from getPostsForCommunity calls
return executePostsQueryPaginated({
  boardIds: accessibleBoardIds,  // Only use board filtering
  userId,
  ...options
});
```

**Phase 2:** Add intelligent community filtering as optimization
```typescript
// Later enhancement - smart community filtering when no imported boards
const hasImportedBoards = allBoards.some(b => b.is_imported);
const queryOptions = hasImportedBoards 
  ? { boardIds: accessibleBoardIds }  // Use board filtering for mixed case
  : { communityId, boardIds: accessibleBoardIds };  // Use both for optimization
```

**Pros:**
- Immediate fix with minimal risk
- Path for future optimization
- Maintains performance for simple cases
- Handles complex cases correctly

**Cons:**
- Two-phase implementation
- More code paths to maintain

**Complexity:** ⭐⭐ (Low, with future ⭐⭐⭐)

## Performance Analysis

### Current Imported Boards Usage

From database schema, imported boards are tracked in `imported_boards` table:
- Each row represents one imported board
- Unique constraint: `(importing_community_id, source_board_id)`
- Active status tracking with `is_active` boolean

**Query Pattern:**
```sql
-- Getting accessible boards (existing)
SELECT b.*, ib.importing_community_id
FROM boards b
LEFT JOIN imported_boards ib ON b.id = ib.source_board_id 
WHERE b.community_id = $1 OR (ib.importing_community_id = $1 AND ib.is_active = true)
```

### Option Performance Comparison

| Option | Query Complexity | Index Usage | Migration Required |
|--------|-----------------|-------------|-------------------|
| Option 1 | Simple | Excellent (board_id index) | No |
| Option 2 | Medium | Good (board_id + subquery) | No |
| Option 3 | Simple | Excellent | No |
| Option 4 | Simple | Excellent (view indexes) | Yes |
| Option 5 | Simple → Medium | Excellent → Good | No |

### Index Analysis

**Existing indexes that help:**
- `posts_board_id_index` - Perfect for board filtering
- `idx_imported_boards_importing_community` - Good for imported board lookups
- `idx_imported_boards_source_board` - Good for imported board resolution

**No additional indexes needed** for Options 1, 2, 3, or 5.

## Security Considerations

**Current Security Model:**
1. `getAccessibleBoards()` - Returns boards user can access (owned + imported)
2. `getAccessibleBoardIds()` - Filters by user roles/permissions
3. Query filters - Use `board_id IN (accessible_board_ids)`

**Security Validation:**
All solutions maintain security because:
- Board access is pre-validated by `getAccessibleBoards()`
- Permission filtering by `getAccessibleBoardIds()` 
- Final query only includes pre-approved board IDs

**No security changes needed** - the issue is filtering too aggressively, not too permissively.

## Testing Strategy

### Manual Testing
1. **Setup:** Create partnership between Community A and Community B
2. **Import:** Community A imports a board from Community B  
3. **Post:** Create posts in the imported board (from Community B)
4. **Verify:** 
   - Posts appear in Community A home feed
   - Posts appear when clicking imported board in Community A sidebar
   - Posts do NOT appear in Community B home feed (they own the board, don't import it)

### Automated Testing
```typescript
// Test case for imported board posts
describe('Imported Boards Post Integration', () => {
  it('should show imported board posts in home feed', async () => {
    const accessibleBoards = await getAccessibleBoards(importingCommunityId);
    const accessibleBoardIds = getAccessibleBoardIds(accessibleBoards, userRoles, false);
    
    // Should include imported board IDs
    expect(accessibleBoardIds).toContain(importedBoardId);
    
    const result = await getPostsForCommunity(importingCommunityId, accessibleBoardIds, userId);
    
    // Should include posts from imported boards
    const importedBoardPosts = result.posts.filter(p => p.board_id === importedBoardId);
    expect(importedBoardPosts.length).toBeGreaterThan(0);
  });
});
```

## Recommendation

**Choose Option 5 (Hybrid Approach)** for the following reasons:

1. **Immediate Value:** Phase 1 provides instant fix with minimal risk
2. **Future-Proof:** Phase 2 allows for optimization when time allows
3. **Low Risk:** Simple change that's easy to validate and rollback
4. **Performance:** Maintains excellent performance for most use cases
5. **Maintainability:** Clean code path that's easy to understand

### Implementation Plan

**Phase 1 (Immediate - 15 minutes):**
```typescript
// src/lib/queries/enrichedPosts.ts - Line 816
export async function getPostsForCommunity(
  communityId: string,
  accessibleBoardIds: number[],
  userId?: string,
  options: Partial<PostQueryOptions> = {}
): Promise<PaginatedPostsResult> {
  return executePostsQueryPaginated({
    // communityId,  // Remove this line
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
```

**Phase 2 (Future optimization - 2-3 hours):**
- Add imported board detection to `getPostsForCommunity()`
- Use community filtering when no imported boards present
- Use board-only filtering when imported boards present
- Add performance monitoring and metrics

This approach restores functionality immediately while maintaining a path for future optimization. 
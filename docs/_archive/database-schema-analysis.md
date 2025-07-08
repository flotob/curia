# Database Schema Analysis Report

## Executive Summary

This analysis identifies opportunities for database schema optimization across four key areas:
1. **JSONB Fields**: Multiple similar JSONB fields that could benefit from normalization
2. **Foreign Keys**: Several missing relationships that should be enforced
3. **Indexes**: Some potentially unused indexes that could be optimized
4. **Data Formats**: Inconsistent storage formats for similar data types

---

## 1. JSONB Fields Normalization Opportunities

### 🔴 HIGH PRIORITY: Settings Fields Pattern

**Problem**: Four tables use nearly identical `settings` JSONB fields with overlapping structures:

```sql
-- All have identical structure and purpose
communities.settings JSONB DEFAULT '{}'  -- CommunitySettings interface
boards.settings JSONB DEFAULT '{}'       -- BoardSettings interface  
posts.settings JSONB DEFAULT '{}'        -- PostSettings interface
users.settings JSONB DEFAULT '{}'        -- UserSettings interface
```

**Current Usage Patterns**:
- **communities.settings**: `permissions.allowedRoles[]`
- **boards.settings**: `permissions.allowedRoles[]`, `permissions.locks.{lockIds[], fulfillment, verificationDuration}`
- **posts.settings**: `responsePermissions.{categories[], requireAll, requireAny, upGating}`
- **users.settings**: `{lukso, ethereum, twitter, farcaster, premium, email}`

**Normalization Recommendation**:
```sql
-- Option A: Extract common permission patterns
CREATE TABLE entity_permissions (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(20) NOT NULL, -- 'community', 'board', 'post'
  entity_id TEXT NOT NULL,
  permission_type VARCHAR(50) NOT NULL, -- 'role_access', 'lock_gating', 'response_gating'
  configuration JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Option B: Keep JSONB but standardize schema
-- Use shared TypeScript interfaces with consistent field names
```

**Impact**: Reduces duplicate JSONB parsing logic, enables cross-entity permission queries, improves maintainability.

### 🟡 MEDIUM PRIORITY: Permissions Fields

**Problem**: Partnership permissions stored as dual JSONB fields:

```sql
community_partnerships.source_to_target_permissions JSONB DEFAULT '{}'
community_partnerships.target_to_source_permissions JSONB DEFAULT '{}'
```

**Normalization Recommendation**:
```sql
CREATE TABLE partnership_permissions (
  id SERIAL PRIMARY KEY,
  partnership_id INTEGER REFERENCES community_partnerships(id),
  direction VARCHAR(20) NOT NULL, -- 'source_to_target', 'target_to_source'
  permission_type VARCHAR(50) NOT NULL,
  enabled BOOLEAN DEFAULT false,
  configuration JSONB DEFAULT '{}'
);
```

### 🟡 MEDIUM PRIORITY: Notification Settings

**Problem**: Multiple tables store notification configurations:

```sql
telegram_groups.notification_settings JSONB DEFAULT '{}'
telegram_groups.bot_permissions JSONB DEFAULT '{}'
-- Future: users may get notification_preferences JSONB
```

**Recommendation**: Create unified notification preferences system.

---

## 2. Missing Foreign Key Relationships

### 🔴 HIGH PRIORITY: User References Without Constraints

**Missing Relationships**:
```sql
-- These fields reference users but lack FK constraints:
links.shared_by_user_id VARCHAR(255) -- Should reference users(user_id)
telegram_groups.registered_by_user_id TEXT -- Should reference users(user_id)

-- Recommended fixes:
ALTER TABLE links ADD CONSTRAINT links_shared_by_user_fkey 
  FOREIGN KEY (shared_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL;

ALTER TABLE telegram_groups ADD CONSTRAINT telegram_groups_registered_by_fkey
  FOREIGN KEY (registered_by_user_id) REFERENCES users(user_id) ON DELETE CASCADE;
```

### 🟡 MEDIUM PRIORITY: Circular Reference Validation

**Missing Self-Referential Constraints**:
```sql
-- user_friends has constraint but could be enhanced:
user_friends.user_id -> users(user_id) ✓ EXISTS
user_friends.friend_user_id -> users(user_id) ✓ EXISTS

-- But missing validation that friendships are bidirectional
-- Consider adding trigger or CHECK constraint for friendship consistency
```

### 🟡 MEDIUM PRIORITY: Post-Comment-Reaction Relationships

**Complex Multi-Entity References**:
```sql
-- reactions table has mutual exclusivity but could enforce entity existence:
reactions.post_id -> posts(id) ✓ EXISTS  
reactions.comment_id -> comments(id) ✓ EXISTS
reactions.lock_id -> locks(id) ✓ EXISTS

-- Consider adding CHECK constraint to ensure referenced entities exist
-- when reaction target is not null
```

---

## 3. Potentially Unused Indexes Analysis

### 🔴 HIGH PRIORITY: Review Conditional Indexes

**Potentially Over-Specific Indexes**:
```sql
-- These may have low selectivity or rare usage:
idx_locks_public WHERE (is_public = true)         -- How many public locks exist?
idx_locks_templates WHERE (is_template = true)    -- How many templates exist?
idx_imported_boards_active_by_community WHERE (is_active = true) -- Selectivity?

-- Recommendation: Analyze query patterns:
SELECT 
  schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE idx_scan < 100  -- Indexes with low usage
ORDER BY idx_scan ASC;
```

### 🟡 MEDIUM PRIORITY: Compound Index Efficiency

**Review Multi-Column Index Order**:
```sql
-- These might benefit from column reordering based on selectivity:
posts_cursor_pagination_idx (upvote_count DESC, created_at DESC, id DESC)
idx_community_partnerships_lookup (source_community_id, target_community_id, status)

-- Analyze query patterns to optimize column order
-- Higher selectivity columns should come first
```

### 🟡 MEDIUM PRIORITY: Redundant Indexes

**Potential Overlaps**:
```sql
-- Single column indexes that might be covered by compound indexes:
posts_created_at_index vs posts_cursor_pagination_idx (includes created_at)
comments_post_id_index -- Might be covered by compound indexes

-- Run index usage analysis to identify overlaps
```

---

## 4. Inconsistent Data Format Issues

### 🔴 HIGH PRIORITY: User ID Format Inconsistencies

**Problem**: Mixed user ID storage formats:
```sql
-- TEXT type used inconsistently:
users.user_id TEXT                    -- Primary user ID
posts.author_user_id TEXT             -- References users
comments.author_user_id TEXT          -- References users
locks.creator_user_id TEXT            -- References users

-- But some fields use VARCHAR:
links.shared_by_user_id VARCHAR(255)  -- Should be TEXT to match users.user_id
```

**Recommendation**: Standardize all user ID fields to `TEXT` type for consistency.

### 🔴 HIGH PRIORITY: Community ID Format Inconsistencies  

**Problem**: Mixed community ID storage:
```sql
-- TEXT type (correct):
communities.id TEXT                   -- Primary key
boards.community_id TEXT             -- References communities

-- VARCHAR type (inconsistent):
links.community_short_id VARCHAR(100) -- Should align with communities table
```

### 🟡 MEDIUM PRIORITY: Timestamp Format Variations

**Problem**: Mixed timestamp precision and defaults:
```sql
-- Most tables use TIMESTAMPTZ with CURRENT_TIMESTAMP default ✓
-- But some variations exist:
pgmigrations.run_on TIMESTAMP         -- Missing timezone
some_backups.* TIMESTAMPTZ            -- Inconsistent naming
```

**Recommendation**: Standardize on `TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP`.

### 🟡 MEDIUM PRIORITY: Boolean vs String Status Fields

**Problem**: Mixed status representation:
```sql
-- Boolean flags (good):
locks.is_template BOOLEAN
imported_boards.is_active BOOLEAN

-- String status with constraints (also good but different pattern):
community_partnerships.status VARCHAR(20) CHECK (status IN (...))
pre_verifications.verification_status TEXT DEFAULT 'pending'

-- Recommendation: Document which pattern to use for new fields
```

### 🔃 LOW PRIORITY: Array vs JSONB for Lists

**Problem**: Different storage for similar list data:
```sql
-- Text arrays:
posts.tags TEXT[]                     -- Simple string lists
locks.tags TEXT[]                     -- Simple string lists
links.community_shortid_history TEXT[] -- Historical data

-- JSONB arrays:
boards.settings -> 'permissions' -> 'locks' -> 'lockIds' -- Number arrays in JSONB
posts.settings -> 'responsePermissions' -> 'categories' -- Object arrays in JSONB
```

**Analysis**: Current usage is appropriate - simple lists use TEXT[], complex nested data uses JSONB.

---

## Recommendations Summary

### Immediate Actions (High Priority)
1. **Add missing foreign key constraints** for user references in `links` and `telegram_groups`
2. **Standardize user ID and community ID field types** across all tables
3. **Analyze JSONB settings field usage** to identify normalization opportunities
4. **Review conditional index usage** with `pg_stat_user_indexes`

### Medium-Term Improvements
1. **Consider settings field normalization** if query patterns support it
2. **Standardize timestamp formats** across all tables
3. **Optimize compound index column ordering** based on selectivity analysis
4. **Create partnership permissions normalization** if the feature expands

### Database Health Queries
```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read 
FROM pg_stat_user_indexes 
ORDER BY idx_scan ASC;

-- Check foreign key violations (if constraints were added)
SELECT conname, conrelid::regclass, confrelid::regclass
FROM pg_constraint 
WHERE contype = 'f' AND NOT convalidated;

-- Analyze JSONB field sizes
SELECT schemaname, tablename, attname, avg_width, n_distinct
FROM pg_stats 
WHERE schemaname = 'public' AND atttypid = 'jsonb'::regtype;
```

---

## Impact Analysis

**Performance Impact**: 
- Normalization could improve query performance for permission-based filtering
- Removing unused indexes would reduce write overhead
- Proper foreign keys enable query optimization

**Maintenance Impact**:
- Standardized formats reduce developer cognitive load
- Consistent JSONB schemas enable shared validation logic
- Proper constraints prevent data integrity issues

**Risk Assessment**:
- **Low Risk**: Adding foreign keys, standardizing field types
- **Medium Risk**: Index removal (requires usage analysis first)  
- **High Risk**: JSONB normalization (requires application code changes)
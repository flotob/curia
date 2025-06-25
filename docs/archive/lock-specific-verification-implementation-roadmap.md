# Lock-Specific Verification Implementation Roadmap

## Executive Summary

After migrating the `pre_verifications` table to use lock-specific verification (removing `resource_type`, `board_id`, `post_id`), we need to systematically update all API endpoints, database queries, and frontend components to work with the new simplified schema.

## New Schema Architecture

### Before (Context-Based)
```sql
pre_verifications:
- user_id, post_id, board_id, resource_type, category_type
- Unique: (user_id, post_id, category_type) WHERE resource_type='post'
- Unique: (user_id, board_id, category_type) WHERE resource_type='board'
```

### After (Lock-Specific)  
```sql
pre_verifications:
- user_id, lock_id, category_type
- Unique: (user_id, lock_id, category_type)
- Portable across all usage contexts
```

## Files Requiring Updates

### 1. Backend API Endpoints

#### **1.1 Board Pre-Verification Endpoint**
**File**: `src/app/api/communities/[communityId]/boards/[boardId]/locks/[lockId]/pre-verify/[categoryType]/route.ts`

**Current Query (BROKEN after migration):**
```typescript
await query(`
  INSERT INTO pre_verifications 
  (user_id, board_id, category_type, verification_data, verification_status, expires_at, resource_type, verified_at) 
  VALUES ($1, $2, $3, $4, 'verified', $5, 'board', NOW())
  ON CONFLICT (user_id, board_id, category_type) WHERE resource_type = 'board' AND board_id IS NOT NULL
  DO UPDATE SET ...
`, [user.sub, boardId, categoryType, JSON.stringify(verificationDataToStore), expiresAt.toISOString()]);
```

**Required Fix:**
```typescript
await query(`
  INSERT INTO pre_verifications 
  (user_id, lock_id, category_type, verification_data, verification_status, expires_at, verified_at) 
  VALUES ($1, $2, $3, $4, 'verified', $5, NOW())
  ON CONFLICT (user_id, lock_id, category_type)
  DO UPDATE SET 
    verification_data = EXCLUDED.verification_data,
    verification_status = 'verified',
    expires_at = EXCLUDED.expires_at,
    verified_at = NOW(),
    updated_at = NOW()
`, [user.sub, lockId, categoryType, JSON.stringify(verificationDataToStore), expiresAt.toISOString()]);
```

**Impact**: Critical - board verification will fail without this fix

#### **1.2 Board Verification Status Endpoint**
**File**: `src/app/api/communities/[communityId]/boards/[boardId]/verification-status/route.ts`

**Current Query (BROKEN after migration):**
```typescript
const verificationResult = await query(`
  SELECT DISTINCT 
    pv.category_type, 
    pv.verification_status, 
    pv.verified_at, 
    pv.expires_at
  FROM pre_verifications pv
  WHERE pv.user_id = $1 
    AND pv.board_id = $2
    AND pv.resource_type = 'board'
    AND pv.verification_status = 'verified'
    AND pv.expires_at > NOW()
  ORDER BY pv.verified_at DESC
`, [currentUserId, boardId]);
```

**Required Fix:**
```typescript
// Get lock IDs for this board first
const boardResult = await query(/* get board settings */);
const lockGating = SettingsUtils.getBoardLockGating(boardSettings);
const lockIds = lockGating.lockIds;

// Then query for verifications of those specific locks
const verificationResult = await query(`
  SELECT DISTINCT 
    pv.lock_id,
    pv.category_type, 
    pv.verification_status, 
    pv.verified_at, 
    pv.expires_at
  FROM pre_verifications pv
  WHERE pv.user_id = $1 
    AND pv.lock_id = ANY($2)
    AND pv.verification_status = 'verified'
    AND pv.expires_at > NOW()
  ORDER BY pv.verified_at DESC
`, [currentUserId, lockIds]);
```

**Logic Changes Required:**
```typescript
// OLD: Category-based verification check
const verifiedCategories = new Set(verificationResult.rows.map(row => row.category_type));
const isLockVerified = enabledCategories.some(cat => verifiedCategories.has(cat.type));

// NEW: Lock-specific verification check  
const verifiedLockIds = new Set(verificationResult.rows.map(row => row.lock_id));
const isLockVerified = verifiedLockIds.has(lock.id);
```

**Impact**: Critical - board access status will show incorrect data

#### **1.3 Individual Lock Verification Status Endpoint**
**File**: `src/app/api/communities/[communityId]/boards/[boardId]/locks/[lockId]/verification-status/route.ts`

**Current Query (BROKEN after migration):**
```typescript
const verificationResult = await query(`
  SELECT category_type, verification_status, verified_at, expires_at 
  FROM pre_verifications 
  WHERE user_id = $1 AND board_id = $2 AND resource_type = 'board' 
    AND expires_at > NOW() AND verification_status = 'verified'
`, [user.sub, boardId]);
```

**Required Fix:**
```typescript
const verificationResult = await query(`
  SELECT category_type, verification_status, verified_at, expires_at 
  FROM pre_verifications 
  WHERE user_id = $1 AND lock_id = $2
    AND expires_at > NOW() AND verification_status = 'verified'
`, [user.sub, lockId]);
```

**Impact**: Critical - individual lock verification status broken

#### **1.4 Post Pre-Verification Endpoints**
**Files**: 
- `src/app/api/posts/[postId]/pre-verify/[categoryType]/route.ts`
- `src/app/api/posts/[postId]/challenge/route.ts`
- `src/app/api/posts/[postId]/ethereum-challenge/route.ts`

**Current Approach**: Post-based verification using `post_id`
**Required Change**: Must determine which lock the post uses and verify that lock specifically

**Current Query Pattern (BROKEN):**
```typescript
await query(`
  INSERT INTO pre_verifications (user_id, post_id, category_type, ..., resource_type)
  VALUES ($1, $2, $3, ..., 'post')
  ON CONFLICT (user_id, post_id, category_type) WHERE resource_type = 'post'
`, [userId, postId, categoryType, ...]);
```

**Required Fix:**
```typescript
// First, get the lock_id for this post
const postResult = await query('SELECT lock_id FROM posts WHERE id = $1', [postId]);
const lockId = postResult.rows[0]?.lock_id;

if (!lockId) {
  return NextResponse.json({ error: 'Post has no lock-based gating' }, { status: 400 });
}

// Then verify the specific lock
await query(`
  INSERT INTO pre_verifications (user_id, lock_id, category_type, ...)
  VALUES ($1, $2, $3, ...)
  ON CONFLICT (user_id, lock_id, category_type)
  DO UPDATE SET ...
`, [userId, lockId, categoryType, ...]);
```

**Impact**: Critical - post commenting will break

#### **1.5 Post Verification Status Endpoints**
**Files**:
- `src/app/api/posts/[postId]/verification-status/route.ts`
- `src/app/api/posts/[postId]/gating-requirements/route.ts`

**Current Query Pattern (BROKEN):**
```typescript
const verificationResult = await query(`
  SELECT category_type, verification_status, verified_at, expires_at
  FROM pre_verifications 
  WHERE user_id = $1 AND post_id = $2 AND resource_type = 'post'
    AND expires_at > NOW()
`, [userId, postId]);
```

**Required Fix:**
```typescript
// Get lock_id for this post
const postResult = await query('SELECT lock_id FROM posts WHERE id = $1', [postId]);
const lockId = postResult.rows[0]?.lock_id;

if (lockId) {
  const verificationResult = await query(`
    SELECT category_type, verification_status, verified_at, expires_at
    FROM pre_verifications 
    WHERE user_id = $1 AND lock_id = $2
      AND expires_at > NOW()
  `, [userId, lockId]);
}
```

**Impact**: Critical - post verification status broken

#### **1.6 Comments API with Verification Check**
**File**: `src/app/api/posts/[postId]/comments/route.ts`

**Current Verification Check (BROKEN):**
```typescript
// Check if user has pre-verified for this post
const verificationCheck = await query(`
  SELECT 1 FROM pre_verifications 
  WHERE user_id = $1 AND post_id = $2 AND resource_type = 'post'
    AND verification_status = 'verified' AND expires_at > NOW()
`, [userId, postId]);
```

**Required Fix:**
```typescript
// Get post's lock_id and check verification for that lock
const postResult = await query('SELECT lock_id FROM posts WHERE id = $1', [postId]);
const lockId = postResult.rows[0]?.lock_id;

if (lockId) {
  const verificationCheck = await query(`
    SELECT 1 FROM pre_verifications 
    WHERE user_id = $1 AND lock_id = $2
      AND verification_status = 'verified' AND expires_at > NOW()
  `, [userId, lockId]);
}
```

**Impact**: Critical - commenting will require re-verification

### 2. Database Query Updates

#### **2.1 Verification Cleanup/Maintenance Queries**
**Files**: Any cron jobs or maintenance scripts

**Current Pattern (BROKEN):**
```sql
DELETE FROM pre_verifications WHERE expires_at < NOW();
```

**Still Works**: ✅ This query is unaffected by schema changes

**Current Pattern (BROKEN):**
```sql
SELECT COUNT(*) FROM pre_verifications WHERE resource_type = 'board';
```

**Required Fix:**
```sql
-- Count lock-based verifications (all verifications are now lock-based)
SELECT COUNT(*) FROM pre_verifications;
```

#### **2.2 Analytics/Reporting Queries**
**Files**: Any admin dashboards or analytics

**Update Required**: Remove any GROUP BY or filtering on `resource_type`, `board_id`, `post_id`

### 3. Frontend Component Updates

#### **3.1 React Query Keys**
**Files**: Any components using verification-related queries

**Current Pattern (BROKEN):**
```typescript
// Board verification
const { data } = useQuery({
  queryKey: ['boardVerificationStatus', boardId],
  queryFn: () => fetchBoardVerificationStatus(boardId)
});

// Post verification  
const { data } = useQuery({
  queryKey: ['postVerificationStatus', postId],
  queryFn: () => fetchPostVerificationStatus(postId)
});
```

**Required Fix**: ✅ **No changes needed** - these component-level abstractions should continue working once the backend APIs are fixed

#### **3.2 Verification Modal Components**
**Files**:
- `src/components/boards/BoardVerificationModal.tsx` ✅ **Should work unchanged**
- `src/components/verification/LockVerificationPanel.tsx` ✅ **Should work unchanged**

**Status**: These components already pass `lockId` correctly, so they should work once backend is fixed

#### **3.3 Cache Invalidation**
**Files**: Components that invalidate verification queries

**Current Pattern**: ✅ **Should work unchanged**
```typescript
queryClient.invalidateQueries({ queryKey: ['boardVerificationStatus', boardId] });
```

**Status**: Frontend invalidation patterns should work once backend APIs are fixed

### 4. Type Definitions

#### **4.1 API Response Types**
**Files**: `src/types/*.ts`

**Current Types (May need updates):**
```typescript
interface PreVerification {
  id: number;
  user_id: string;
  post_id?: number;        // ❌ Remove
  board_id?: number;       // ❌ Remove  
  resource_type: string;   // ❌ Remove
  lock_id: number;         // ✅ Add/make required
  category_type: string;
  // ... other fields
}
```

**Required Fix:**
```typescript
interface PreVerification {
  id: number;
  user_id: string;
  lock_id: number;         // ✅ Required now
  category_type: string;
  verification_data: any;
  verification_status: string;
  expires_at: string;
  verified_at?: string;
  created_at: string;
  updated_at: string;
}
```

## Implementation Order

### **Phase 1: Backend API Fixes (Priority: Critical)**

1. **Board Pre-Verification Endpoint** - Fix INSERT query to use lock_id
2. **Board Verification Status Endpoint** - Rewrite logic for lock-specific queries  
3. **Individual Lock Status Endpoint** - Update to use lock_id instead of board_id
4. **Post Pre-Verification Endpoints** - Add lock_id resolution from post_id
5. **Post Verification Status Endpoints** - Add lock_id resolution logic
6. **Comments API** - Update verification check to use lock_id

### **Phase 2: Testing & Validation (Priority: High)**

1. **Test board verification workflow** end-to-end
2. **Test post commenting** with lock-based verification
3. **Verify verification portability** - same lock works across contexts
4. **Test expiry handling** and cleanup

### **Phase 3: Type Updates & Cleanup (Priority: Medium)**

1. **Update TypeScript interfaces** to reflect new schema
2. **Remove dead code** referencing old schema fields
3. **Update any hardcoded queries** in tests or scripts

## Breaking Changes Summary

### **Immediate Breaks After Migration:**
1. ❌ **All board verification endpoints** - return 500 errors
2. ❌ **All post verification endpoints** - return 500 errors  
3. ❌ **Comment submission** - bypasses verification checks
4. ❌ **Board access status** - shows incorrect data

### **Behavioral Changes After Fixes:**
1. ✅ **Verification becomes portable** - verify lock once, use anywhere
2. ✅ **Simpler API patterns** - single lock-based verification flow
3. ✅ **Better performance** - fewer context-specific queries
4. ✅ **Cleaner UI logic** - single verification state per lock

## Testing Strategy

### **Critical Test Cases:**
1. **Board Verification Flow**: Create board with lock → verify lock → confirm access
2. **Post Verification Flow**: Post with lock → verify lock → comment successfully  
3. **Cross-Context Portability**: Verify lock in post → use for board access (new feature!)
4. **Expiry Handling**: Verify verification expires correctly across all contexts
5. **Multiple Locks**: Board with multiple locks → verify individually → check fulfillment logic

### **Regression Testing:**
1. **Existing posts** with legacy gating should continue working
2. **Board access** should work for newly verified locks
3. **Comment submission** should work with lock-based verification
4. **Admin interfaces** should display correct verification status

## Rollback Strategy

If issues arise, the migration includes a complete `down()` function that:
1. Clears all lock-based verification data
2. Restores original schema with all columns
3. Recreates all original constraints and indexes
4. Restores original foreign key relationships

**Rollback Command:**
```bash
yarn migrate:down
```

## Success Criteria

### **Functional Requirements:**
- ✅ Board verification works with lock-specific approach
- ✅ Post verification works with lock-specific approach  
- ✅ Verification is portable across post/board contexts
- ✅ Multiple lock scenarios work with ANY/ALL fulfillment
- ✅ Verification expiry works correctly

### **Technical Requirements:**
- ✅ All API endpoints return correct responses
- ✅ Database queries are performant with new schema
- ✅ Frontend shows accurate verification status
- ✅ No 500 errors or broken functionality

### **User Experience Requirements:**
- ✅ Users can verify locks and gain access to content
- ✅ Verification state is clearly communicated in UI
- ✅ Error states provide helpful guidance
- ✅ Portable verification reduces re-verification friction

## Post-Implementation Tasks

1. **Remove debug logging** added during development
2. **Update documentation** to reflect new verification flow
3. **Monitor performance** of new lock-specific queries
4. **Cleanup old verification data** (expired entries)
5. **Update any admin dashboards** or reporting queries

This comprehensive roadmap ensures systematic implementation of lock-specific verification with minimal downtime and full backward compatibility where possible. 
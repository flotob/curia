# Multi-Lock Architecture Research & Implementation Roadmap

## Executive Summary

**REVISED APPROACH**: Instead of a complex multi-lock system, we're taking a pragmatic 4-phase approach:
1. **Fix comment verification bug** (current blocker)
2. **Add requireAny/requireAll per lock** (simple enhancement)
3. **Add board-level locking via settings** (natural extension)
4. **Migrate existing board roles to lock system** (cleanup)

This approach builds incrementally on our existing infrastructure without breaking changes.

## Phase 1: Fix Comment Verification Bug 🚨

### Problem Analysis
Users see "✓ Ready to Comment" but comment input field remains disabled. Root cause: **API mismatch between lock-based gating detection and verification status**.

### Current Bug Flow
```typescript
// 1. Frontend detects gating correctly
const hasLockGating = !!post.lock_id; // ✅ Works

// 2. GatingRequirementsPanel shows "✓ Ready to Comment" // ✅ Works

// 3. useVerificationStatus calls API // ❌ BROKEN
// /api/posts/[postId]/verification-status only checks legacy settings
// Returns canComment: false even when lock verification passes

// 4. NewCommentForm stays disabled // ❌ BROKEN
disabled={hasGating && !canComment} // canComment = false from broken API
```

### Complete Phase 1 TODO List

#### 1.1 Fix Verification Status API
**File**: `src/app/api/posts/[postId]/verification-status/route.ts`
- [ ] Update database query to include lock data:
  ```sql
  SELECT p.settings, p.lock_id, l.gating_config 
  FROM posts p 
  LEFT JOIN locks l ON p.lock_id = l.id 
  WHERE p.id = $1
  ```
- [ ] Add lock-based gating detection:
  ```typescript
  const hasLockGating = !!lock_id;
  const lockGatingConfig = hasLockGating ? JSON.parse(gating_config) : null;
  ```
- [ ] Update verification logic to handle both legacy and lock-based gating
- [ ] Test with existing lock-based posts

#### 1.2 Fix Gating Requirements API  
**File**: `src/app/api/posts/[postId]/gating-requirements/route.ts`
- [ ] Update database query to include lock data (same as above)
- [ ] Add lock-based requirements resolution
- [ ] Ensure API returns correct categories for lock-based posts
- [ ] Test requirements display matches lock configuration

#### 1.3 Fix Comment Creation API
**File**: `src/app/api/posts/[postId]/comments/route.ts`
- [ ] Update database query to include lock data
- [ ] Add lock-based gating verification logic:
  ```typescript
  if (lock_id && gating_config) {
    // Use lock's gating configuration for verification
    const lockConfig = JSON.parse(gating_config);
    return await verifyLockRequirements(lockConfig, userId, postId);
  }
  ```
- [ ] Ensure pre-verification checking works for lock-based posts
- [ ] Test comment creation with lock-based gating

#### 1.4 Testing & Validation
- [ ] Create test post with lock-based gating
- [ ] Verify gating requirements display correctly
- [ ] Complete verification flow (connect wallets, verify requirements)
- [ ] Confirm "✓ Ready to Comment" appears
- [ ] Test comment input field becomes enabled
- [ ] Successfully post a comment
- [ ] Test with both requireAny and requireAll scenarios (current hardcoded logic)

#### 1.5 Build Verification
- [ ] Run `yarn build` to ensure no TypeScript errors
- [ ] Test in development environment
- [ ] Verify no regressions in legacy gating system

**Estimated Time**: 1-2 days
**Success Criteria**: Users can comment on lock-based gated posts when verification requirements are met

---

## Phase 2: Add requireAny/requireAll Per Lock

### Goal
Allow lock creators to configure whether categories within a lock require ALL or ANY fulfillment.

### Current State
```json
// locks.gating_config (hardcoded requireAny: true)
{
  "categories": [...],
  "requireAny": true  // ← Currently hardcoded in UI
}
```

### Target State
```json
// locks.gating_config (user-configurable)
{
  "categories": [...],
  "requireAll": false  // ← User can toggle this
}
```

### Phase 2 TODO List

#### 2.1 Update Lock Creation UI
**File**: `src/components/locks/LockCreationModal.tsx`
- [ ] Add fulfillment mode toggle in configuration step
- [ ] Update preview to show "Complete ALL 2 requirements" vs "Complete ANY of 2 requirements"
- [ ] Update lock creation state management
- [ ] Test lock creation with both modes

#### 2.2 Update Lock Preview
**File**: `src/components/locks/GatingRequirementsPreview.tsx`
- [ ] Read `requireAll` from lock configuration instead of hardcoded `requireAny`
- [ ] Update header text to reflect correct logic
- [ ] Test preview accuracy

#### 2.3 Update Verification Logic
**Files**: All verification APIs from Phase 1
- [ ] Use lock's `requireAll` setting instead of hardcoded logic
- [ ] Update pre-verification checking
- [ ] Test both fulfillment modes work correctly

#### 2.4 Update Lock Browser Display
**File**: `src/components/locks/LockCard.tsx` (if needed)
- [ ] Show fulfillment mode in lock descriptions
- [ ] Add visual indicators for AND vs OR logic

**Estimated Time**: 2-3 days
**Success Criteria**: Lock creators can choose requireAll/requireAny, and verification works correctly for both modes

---

## Phase 3: Add Board-Level Locking

### Goal
Enable boards to have lock-based gating using the existing `boards.settings` JSONB field.

### Target Schema
```json
// boards.settings
{
  "permissions": {
    "allowedRoles": ["member", "admin"],  // ← Keep existing
    "lockGating": {                       // ← NEW
      "lockId": 123,
      "enabled": true
    }
  }
}
```

### Phase 3 TODO List

#### 3.1 Update Board Settings Types
**File**: `src/types/settings.ts`
- [ ] Add `lockGating` interface to `BoardSettings`
- [ ] Update `BoardPermissions` type
- [ ] Add utility functions for board lock detection

#### 3.2 Update Board Settings UI
**File**: `src/components/board-settings/*` (create if needed)
- [ ] Add lock selection for board gating
- [ ] Show current board lock status
- [ ] Allow enabling/disabling board locks
- [ ] Test board lock configuration

#### 3.3 Update Board Access Control
**Files**: Multiple API endpoints
- [ ] `src/app/api/posts/route.ts` - Check board locks for post creation
- [ ] `src/app/api/posts/[postId]/route.ts` - Check board locks for post access  
- [ ] `src/app/api/posts/[postId]/comments/route.ts` - Check board locks for comments
- [ ] `src/lib/boardPermissions.ts` - Add lock-based access checking

#### 3.4 Update Frontend Board Access
**Files**: Board-related components
- [ ] Show board lock requirements when accessing restricted boards
- [ ] Add verification flow for board access
- [ ] Update board navigation to respect lock gating

**Estimated Time**: 3-4 days
**Success Criteria**: Boards can be locked with existing locks, users must verify to access locked boards

---

## Phase 4: Migrate Board Roles to Lock System

### Goal
Replace role-based board permissions with lock-based permissions for consistency.

### Migration Strategy
- [ ] Create "Role-based" locks that mirror existing role requirements
- [ ] Migrate existing board role settings to equivalent locks
- [ ] Deprecate role-based permissions in favor of lock-based
- [ ] Clean up legacy role checking code

**Estimated Time**: 2-3 days
**Success Criteria**: All board access control uses consistent lock-based system

---

## Risk Assessment

### Phase 1 Risks
- **HIGH**: Breaking existing comment functionality
- **Mitigation**: Thorough testing, maintain backward compatibility

### Phase 2 Risks  
- **LOW**: UI complexity for requireAll/requireAny choice
- **Mitigation**: Clear labeling, good defaults

### Phase 3 Risks
- **MEDIUM**: Board access control complexity
- **Mitigation**: Incremental rollout, extensive testing

### Phase 4 Risks
- **MEDIUM**: Data migration complexity
- **Mitigation**: Careful migration scripts, rollback plan

## Success Metrics

### Phase 1
- [ ] Comment input field enables when verification complete
- [ ] Zero regressions in existing gating functionality
- [ ] Build passes without errors

### Phase 2  
- [ ] Lock creators can configure fulfillment mode
- [ ] Verification respects chosen mode
- [ ] UI clearly communicates requirements

### Phase 3
- [ ] Boards can be locked with existing locks
- [ ] Board access verification works correctly
- [ ] Performance remains acceptable

### Phase 4
- [ ] All board permissions use lock system
- [ ] Legacy role code removed
- [ ] System consistency achieved

## Timeline

- **Phase 1**: 1-2 days (PRIORITY - fixes current bug)
- **Phase 2**: 2-3 days (enhances lock flexibility)  
- **Phase 3**: 3-4 days (adds board locking)
- **Phase 4**: 2-3 days (cleanup and consistency)

**Total**: 8-12 days across 4 phases

This approach builds incrementally without breaking existing functionality, allowing us to validate each phase before proceeding to the next. 
# Board Verification Architecture Fix - Lock-Specific Verification Roadmap

## Executive Summary

**CRITICAL ARCHITECTURAL BUG IDENTIFIED**: The current board verification system incorrectly uses category-based verification instead of lock-specific verification, causing multiple locks to be marked as "verified" when only wallet connection types were verified, not the specific lock requirements.

## Problem Analysis

### Current (Broken) Architecture
```
User verifies "ethereum_profile" for board 
→ Database stores: { lock_id: NULL, category_type: 'ethereum_profile' }
→ System logic: "All locks using ethereum_profile are now satisfied"
→ Result: Multiple locks marked verified incorrectly
```

### Correct Architecture Should Be
```
User verifies Lock A (50 LYX requirement)
→ Database stores: { lock_id: 123, category_type: 'universal_profile' }
→ System logic: "Lock 123 is verified, other locks still need individual verification"
→ Result: Only specifically verified locks count toward board access
```

### Why This Matters
- **Lock A**: Requires 50 LYX balance
- **Lock B**: Requires following specific UP profiles  
- **Lock C**: Requires owning specific NFTs
- All use `universal_profile` category, but have completely different requirements
- **Current bug**: Verifying Lock A incorrectly marks Lock B and Lock C as verified

## Database Impact Analysis

### Current Pre-Verifications Table Entries (Board Context)
```sql
-- WRONG: Category-based verification for boards
lock_id: NULL
category_type: 'ethereum_profile' | 'universal_profile'
resource_type: 'board'
board_id: 62
```

### Required Pre-Verifications Table Entries (Board Context)
```sql  
-- CORRECT: Lock-specific verification for boards
lock_id: 123  -- Specific lock being verified
category_type: 'universal_profile'  -- Just metadata about wallet type used
resource_type: 'board'
board_id: 62
```

### Database Schema Changes Required
1. **Constraint Updates**: Board pre-verifications must have non-NULL lock_id
2. **Index Updates**: Add performance indexes for lock-specific queries
3. **Migration Script**: Convert existing category-based verifications to lock-specific
4. **Validation Logic**: Ensure board verifications always include lock_id

## Code Components Requiring Updates

### 1. Backend API Endpoints

#### **1.1 Board Pre-Verification Endpoint**
**File**: `src/app/api/communities/[communityId]/boards/[boardId]/locks/[lockId]/pre-verify/[categoryType]/route.ts`

**Current Problem**:
```typescript
// WRONG: Stores verification without lock_id
await query(`
  INSERT INTO pre_verifications (user_id, board_id, resource_type, category_type, ...)
  VALUES ($1, $2, 'board', $3, ...)
`, [userId, boardId, categoryType, ...]);
```

**Required Fix**:
```typescript
// CORRECT: Stores verification with specific lock_id
await query(`
  INSERT INTO pre_verifications (user_id, board_id, lock_id, resource_type, category_type, ...)
  VALUES ($1, $2, $3, 'board', $4, ...)
`, [userId, boardId, lockId, categoryType, ...]);
```

#### **1.2 Board Verification Status Endpoint**
**File**: `src/app/api/communities/[communityId]/boards/[boardId]/verification-status/route.ts`

**Current Problem**:
```typescript
// WRONG: Queries for verified categories, not verified locks
SELECT DISTINCT category_type, verification_status, verified_at, expires_at
FROM pre_verifications pv
WHERE pv.user_id = $1 AND pv.board_id = $2 AND pv.resource_type = 'board'
```

**Required Fix**:
```typescript
// CORRECT: Queries for verified locks specifically
SELECT DISTINCT lock_id, category_type, verification_status, verified_at, expires_at
FROM pre_verifications pv
WHERE pv.user_id = $1 AND pv.board_id = $2 AND pv.resource_type = 'board'
  AND pv.lock_id IS NOT NULL AND pv.verification_status = 'verified'
```

**Logic Changes Required**:
```typescript
// Current (WRONG): Category-based verification check
const verifiedCategories = new Set(verificationResult.rows.map(row => row.category_type));
const isLockVerified = enabledCategories.some(cat => verifiedCategories.has(cat.type));

// Required (CORRECT): Lock-specific verification check  
const verifiedLockIds = new Set(verificationResult.rows.map(row => row.lock_id));
const isLockVerified = verifiedLockIds.has(lock.id);
```

#### **1.3 Individual Lock Verification Status Endpoint**
**File**: `src/app/api/communities/[communityId]/boards/[boardId]/locks/[lockId]/verification-status/route.ts`

**Current Problem**: Mixed logic using both category and lock approaches
**Required Fix**: Consistent lock-specific verification queries

### 2. Frontend Components

#### **2.1 BoardAccessStatus Component**
**File**: `src/components/boards/BoardAccessStatus.tsx`

**Impact**: Should continue working correctly once backend is fixed
**Validation**: Debug logs will show correct verified counts

#### **2.2 BoardVerificationModal Component**  
**File**: `src/components/boards/BoardVerificationModal.tsx`

**Current Behavior**: Correctly passes lockId to verification
**Validation Required**: Ensure React Query invalidation targets correct queries

#### **2.3 LockVerificationPanel Component**
**File**: `src/components/verification/LockVerificationPanel.tsx`

**Current State**: Already handles board context correctly
**Validation Required**: Ensure verification context properly includes lockId

### 3. Database Migration Requirements

#### **3.1 Schema Constraints**
```sql
-- Add constraint to ensure board verifications have lock_id
ALTER TABLE pre_verifications 
ADD CONSTRAINT board_verifications_must_have_lock_id 
CHECK (
  (resource_type != 'board') OR 
  (resource_type = 'board' AND lock_id IS NOT NULL)
);
```

#### **3.2 Performance Indexes**
```sql
-- Optimize lock-specific verification queries
CREATE INDEX idx_pre_verifications_board_lock_user 
ON pre_verifications (board_id, lock_id, user_id, verification_status)
WHERE resource_type = 'board';
```

#### **3.3 Data Migration Script**
```sql
-- Handle existing category-based board verifications
-- These need manual review as we can't determine which specific lock they were for
UPDATE pre_verifications 
SET verification_status = 'needs_migration'
WHERE resource_type = 'board' AND lock_id IS NULL;
```

### 4. Testing Requirements

#### **4.1 Unit Tests**
- Board verification status calculation with multiple locks
- Lock-specific verification vs category-based verification
- Edge cases: same category different locks, expiry handling

#### **4.2 Integration Tests**  
- Complete board verification workflow
- Multi-lock board access with ANY/ALL fulfillment modes
- Verification expiry and invalidation logic

#### **4.3 Migration Tests**
- Backward compatibility during migration
- Data integrity after schema changes
- Performance impact of new indexes

## Implementation Phases

### **Phase 1: Database Foundation (2-3 days)**
**Priority**: Critical - Must be done first

1. **Create migration script** for schema constraints
2. **Add performance indexes** for lock-specific queries  
3. **Identify and handle existing data** with NULL lock_id
4. **Test migration** on development database

**Deliverables**:
- Migration script: `migrations/xxxx_board_verification_lock_specific.ts`
- Validation queries to verify data integrity
- Rollback procedures

### **Phase 2: Backend API Fixes (3-4 days)**
**Priority**: Critical - Core functionality

1. **Fix pre-verification endpoint** to store lock_id
2. **Rewrite verification status endpoint** logic  
3. **Update individual lock status endpoint**
4. **Add comprehensive logging** for debugging

**Deliverables**:
- Updated API endpoints with lock-specific logic
- Comprehensive error handling
- Debug logging for verification calculations

### **Phase 3: Frontend Validation & Testing (2 days)**  
**Priority**: High - User experience

1. **Validate frontend components** work with new backend
2. **Update React Query invalidation** strategies
3. **Test complete user workflows**
4. **Verify debug logging shows correct data**

**Deliverables**:
- Validated frontend behavior
- Updated cache invalidation logic
- Comprehensive user flow testing

### **Phase 4: Performance & Cleanup (1-2 days)**
**Priority**: Medium - Polish

1. **Performance testing** with new database queries
2. **Remove old debug logging** 
3. **Code cleanup** and documentation updates
4. **Final end-to-end testing**

**Deliverables**:
- Performance benchmarks
- Clean, production-ready code
- Updated documentation

## Risk Assessment

### **High Risk Items**
1. **Data Migration**: Existing NULL lock_id entries need careful handling
2. **Downtime Requirements**: Schema changes may require brief maintenance window
3. **Backward Compatibility**: Ensure system works during gradual rollout

### **Medium Risk Items**
1. **Performance Impact**: New indexes and query patterns need validation
2. **Cache Invalidation**: React Query strategies may need adjustment
3. **Testing Coverage**: Complex multi-lock scenarios need thorough testing

### **Low Risk Items**
1. **Frontend Components**: Most should work unchanged with fixed backend
2. **User Experience**: Verification flow remains the same for users
3. **API Interfaces**: External API contracts remain compatible

## Success Criteria

### **Functional Requirements Met**
- ✅ Board with 3 locks shows correct individual verification status
- ✅ Verifying Lock A does not affect Lock B or Lock C status
- ✅ ANY/ALL fulfillment modes work correctly with lock-specific verification
- ✅ Verification expiry applies to individual locks, not categories

### **Technical Requirements Met** 
- ✅ Database enforces lock_id for board verifications
- ✅ API queries are performant with new lock-specific logic
- ✅ Frontend shows accurate verification counts and status
- ✅ Debug logging provides clear insight into verification decisions

### **User Experience Requirements Met**
- ✅ Users understand they must verify each lock individually
- ✅ Board access status clearly shows which specific locks are verified
- ✅ Verification workflow is intuitive and responsive
- ✅ Error states provide helpful guidance

## Migration Strategy

### **Development Environment**
1. Apply database migration to development
2. Update API endpoints with lock-specific logic
3. Test complete verification workflows
4. Validate performance impact

### **Staging Environment**
1. Deploy backend changes with feature flag
2. Test with realistic data volume
3. Validate migration of existing data  
4. Performance testing under load

### **Production Deployment**
1. Brief maintenance window for database migration
2. Deploy backend changes
3. Monitor verification workflows closely
4. Rollback procedures ready if needed

## Post-Implementation Monitoring

### **Key Metrics to Track**
- Board verification completion rates
- Database query performance
- User error rates during verification
- System stability and error logs

### **Immediate Validation Steps**
1. Test board 62 with 3 locks shows correct status
2. Verify lock-specific verification works end-to-end
3. Confirm debug logs show accurate lock breakdown
4. Validate ANY/ALL fulfillment logic works correctly

## Conclusion

This is a fundamental architectural fix that corrects a core misunderstanding in the board verification system. The fix moves from category-based verification (wrong) to lock-specific verification (correct), ensuring that each lock must be individually verified regardless of wallet type overlap.

The implementation requires careful coordination between database changes, backend logic updates, and frontend validation, but the end result will be a properly functioning board gating system that behaves as users expect. 
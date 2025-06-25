# Post Creation Gating Implementation Roadmap

## Executive Summary

Complete the board lock system by implementing **post creation gating** - preventing users from creating posts until they verify board lock requirements. This pairs with existing comment gating to provide complete content control at the board level.

## Current State vs Target State

### Current State ✅
- ✅ **Comment Gating**: Users must verify locks before commenting
- ✅ **Board Lock Configuration**: Admins can set multiple locks with ANY/ALL fulfillment
- ✅ **Verification Modal**: Working board verification with real-time status updates
- ✅ **Backend Verification**: Lock-specific verification with 4-hour expiry

### Target State 🎯
- 🚀 **Post Creation Gating**: Users must verify locks before creating posts
- 🚀 **Unified Verification Flow**: Same verification modal for both posts and comments
- 🚀 **Smart UX**: Guide users through verification before they write long posts
- 🚀 **Complete Board Control**: Lock requirements apply to ALL content creation

## Architecture Overview

### Data Flow
```
User clicks "Create Post" 
→ Check board lock requirements
→ If verification needed: Show verification modal
→ User completes verification  
→ Allow post creation
→ Backend validates verification before saving post
```

### Integration Points
1. **Frontend Gating**: Pre-flight verification check
2. **Backend Validation**: Server-side verification enforcement  
3. **UI/UX Integration**: Seamless verification flow
4. **Cache Management**: Real-time status updates

## Implementation Phases

### **Phase 1: Frontend Pre-Flight Verification (2-3 days)**
**Priority**: High - Core user experience

**Goal**: Check board lock requirements before showing post creation form

#### 1.1 Board Lock Status Integration
**Files to Modify**:
- `src/app/page.tsx` (main board page with "Create Post" button)
- `src/components/modals/ModalContainer.tsx` (post creation modal container)

**Changes Needed**:
```typescript
// Add board verification status to main page
const { data: boardVerificationStatus } = useBoardVerificationStatus(boardId);

const handleCreatePost = () => {
  if (boardVerificationStatus?.hasWriteAccess) {
    // User verified - show post creation form
    setShowPostModal(true);
  } else {
    // User needs verification - show verification modal
    setShowVerificationModal(true);
  }
};
```

#### 1.2 Verification Modal Integration
**Files to Modify**:
- `src/components/boards/BoardVerificationModal.tsx` (extend for post creation context)
- `src/hooks/useBoardVerificationStatus.ts` (ensure board-wide status hook exists)

**New Components**:
- `src/components/boards/PostCreationGate.tsx` - Smart wrapper component

**PostCreationGate Architecture**:
```typescript
interface PostCreationGateProps {
  boardId: number;
  communityId: string;
  onVerificationComplete: () => void;
  children: React.ReactNode; // Post creation form
}

// Logic: Show children if verified, verification modal if not
```

#### 1.3 User Experience Enhancements
**UX Flow**:
1. **Prevention**: Don't show post creation until verified
2. **Guidance**: Clear messaging about verification requirements
3. **Progress**: Show verification progress and remaining requirements
4. **Success**: Smooth transition to post creation after verification

**UI Components**:
- Lock requirement summary in post creation button
- Verification progress indicators
- Success confirmation with transition animation

### **Phase 2: Backend Validation (2-3 days)**
**Priority**: Critical - Security enforcement

**Goal**: Validate board lock verification before allowing post creation

#### 2.1 Post Creation Endpoint Enhancement
**File**: `src/app/api/posts/route.ts`

**Current Logic**:
```typescript
// POST /api/posts
// 1. Validate user auth
// 2. Validate board access (role-based)
// 3. Create post
```

**Enhanced Logic**:
```typescript
// POST /api/posts  
// 1. Validate user auth
// 2. Validate board access (role-based)
// 3. 🚀 NEW: Validate board lock verification
// 4. Create post
```

**Board Lock Validation Logic**:
```typescript
// Get board's lock requirements
const boardResult = await query(`
  SELECT settings FROM boards WHERE id = $1
`, [boardId]);

const lockGating = SettingsUtils.getBoardLockGating(boardSettings);

if (lockGating.lockIds.length > 0) {
  // Check user's verification status for required locks
  const verificationResult = await query(`
    SELECT lock_id FROM pre_verifications 
    WHERE user_id = $1 AND lock_id = ANY($2) 
      AND verification_status = 'verified' AND expires_at > NOW()
  `, [userId, lockGating.lockIds]);
  
  const verifiedLockIds = new Set(verificationResult.rows.map(row => row.lock_id));
  
  // Apply fulfillment logic
  const hasAccess = lockGating.fulfillment === 'any'
    ? verifiedLockIds.size >= 1
    : verifiedLockIds.size >= lockGating.lockIds.length;
    
  if (!hasAccess) {
    return NextResponse.json({ 
      error: 'Board lock verification required',
      requiresVerification: true,
      lockIds: lockGating.lockIds,
      fulfillmentMode: lockGating.fulfillment
    }, { status: 403 });
  }
}
```

#### 2.2 Error Handling & User Messaging
**Verification Failure Scenarios**:
1. **No Verification**: User never verified any required locks
2. **Partial Verification**: Some locks verified, but not enough for fulfillment mode
3. **Expired Verification**: User was verified but expired
4. **New Requirements**: Board requirements changed since last verification

**Error Response Format**:
```typescript
interface PostCreationBlockedResponse {
  error: string;
  requiresVerification: true;
  lockDetails: {
    lockIds: number[];
    fulfillmentMode: 'any' | 'all';
    verifiedCount: number;
    requiredCount: number;
    nextExpiryAt?: string;
  };
  message: string;
}
```

#### 2.3 Performance Optimization
**Database Efficiency**:
- Single query to check all lock verifications
- Index optimization for user_id + lock_id lookups
- Caching of board lock configurations

**Query Optimization**:
```sql
-- Efficient batch verification check
SELECT 
  l.id as lock_id,
  pv.verification_status,
  pv.expires_at
FROM locks l
LEFT JOIN pre_verifications pv ON l.id = pv.lock_id AND pv.user_id = $1
WHERE l.id = ANY($2)
  AND (pv.verification_status = 'verified' AND pv.expires_at > NOW())
```

### **Phase 3: Advanced UX & Polish (2 days)**
**Priority**: Medium - User experience refinement

#### 3.1 Smart Post Creation Integration
**Features**:
- **Verification Status in UI**: Show lock status in post creation button
- **Progressive Disclosure**: Reveal verification requirements gradually
- **Optimistic UI**: Allow post drafting during verification process
- **Draft Persistence**: Save post drafts during verification flow

**UI Enhancements**:
```typescript
// Smart post creation button
<PostCreationButton 
  boardId={boardId}
  verificationStatus={boardVerificationStatus}
  onRequiresVerification={() => setShowVerificationModal(true)}
/>

// States:
// 1. "Create Post" (verified)
// 2. "Verify to Post" (not verified) 
// 3. "Verify 2 more locks to post" (partial)
// 4. "Re-verify to post" (expired)
```

#### 3.2 Verification Success Flow
**Post-Verification Experience**:
1. **Success Animation**: Smooth transition from verification to post creation
2. **Status Persistence**: Remember verification status across sessions
3. **Guided Onboarding**: Help new users understand the verification system
4. **Quick Re-verification**: Fast path for expired verifications

#### 3.3 Error Recovery & Edge Cases
**Edge Case Handling**:
- **Mid-Creation Expiry**: Verification expires while user is writing post
- **Requirement Changes**: Board requirements change during post creation
- **Network Failures**: Graceful degradation and retry mechanisms
- **Multiple Windows**: Sync verification status across browser tabs

### **Phase 4: Testing & Validation (1-2 days)**
**Priority**: High - Quality assurance

#### 4.1 Integration Testing
**Test Scenarios**:
1. **Happy Path**: User verifies → creates post successfully
2. **Verification Required**: Unverified user guided through verification
3. **Partial Verification**: ANY mode with 1/3 locks verified
4. **Expired Verification**: User must re-verify before posting
5. **Changing Requirements**: Admin changes locks during user session

#### 4.2 Performance Testing
**Load Testing**:
- Post creation with verification checks under load
- Database query performance with large user bases
- Frontend responsiveness during verification flows

#### 4.3 Security Testing
**Security Validation**:
- Backend validation cannot be bypassed
- Verification expiry properly enforced
- Race condition handling (verification expiring during post creation)

## Files Inventory

### **New Files to Create**
```
src/components/boards/PostCreationGate.tsx
src/components/boards/PostCreationButton.tsx
src/hooks/useBoardVerificationStatus.ts (if not exists)
src/utils/boardLockValidation.ts
```

### **Files to Modify**

#### **Frontend Components**
```
src/app/page.tsx - Add verification check to post creation
src/components/modals/ModalContainer.tsx - Integrate verification flow
src/components/boards/BoardVerificationModal.tsx - Extend for post context
src/components/boards/BoardAccessStatus.tsx - Add post creation status
```

#### **Backend APIs**
```
src/app/api/posts/route.ts - Add lock verification validation
src/lib/boardPermissions.ts - Extend with lock verification utils
src/types/boardVerification.ts - Add post creation types
```

#### **Hooks & Utilities**
```
src/hooks/useContextualGatingData.ts - Ensure board context support
src/utils/authFetch.ts - Error handling for verification failures
```

## Implementation Strategy

### **Recommended Approach: Progressive Enhancement**

#### **Week 1: Core Functionality**
- **Days 1-2**: Frontend pre-flight verification (Phase 1)
- **Days 3-4**: Backend validation (Phase 2)
- **Day 5**: Basic integration testing

#### **Week 2: Polish & Launch**
- **Days 1-2**: Advanced UX features (Phase 3)
- **Days 3-4**: Comprehensive testing (Phase 4)
- **Day 5**: Production deployment and monitoring

### **Risk Mitigation**

#### **High Risk Items**
1. **User Experience Disruption**: Verification flow must feel natural, not obstructive
2. **Performance Impact**: Verification checks could slow post creation
3. **Edge Cases**: Complex state management between verification and post creation

#### **Mitigation Strategies**
1. **UX Testing**: Early user testing of verification flow
2. **Performance Monitoring**: Database query optimization and caching
3. **Gradual Rollout**: Feature flag for controlled deployment

## Success Metrics

### **Functional Requirements**
- ✅ Users cannot create posts without board lock verification
- ✅ Verification flow is intuitive and efficient
- ✅ Backend validation prevents security bypasses
- ✅ System handles edge cases gracefully (expiry, changing requirements)

### **Performance Requirements**
- ✅ Post creation latency < 500ms additional overhead
- ✅ Verification status checks < 100ms
- ✅ UI remains responsive during verification
- ✅ Database queries optimized for scale

### **User Experience Requirements**
- ✅ Clear communication about verification requirements
- ✅ Smooth transition from verification to post creation
- ✅ Consistent experience across board/post/comment verification
- ✅ Helpful error messages and recovery flows

## Future Enhancements

### **Phase 5: Advanced Features** (Future)
- **Verification Templates**: Quick verification for common user patterns
- **Social Verification**: Allow verified users to vouch for others
- **Conditional Requirements**: Different locks based on post content/tags
- **Verification Analytics**: Track verification success rates and user flows

### **Integration Opportunities**
- **Notification System**: Alert users when verification expires
- **Mobile App**: Consistent verification flow across platforms
- **Admin Dashboard**: Verification analytics and lock performance metrics

## Conclusion

This roadmap provides a comprehensive path to implement post creation gating that:

1. **Completes the board lock system** with full content control
2. **Maintains excellent user experience** through smart UX design
3. **Ensures security** with robust backend validation
4. **Scales effectively** with optimized database queries and caching

The implementation prioritizes core functionality first, then layers on UX enhancements and polish. This approach minimizes risk while delivering maximum value to both administrators and users.

**Estimated Timeline**: 2 weeks for full implementation
**Key Dependencies**: Existing board verification system (✅ Complete)
**Risk Level**: Medium (well-defined scope, proven patterns) 
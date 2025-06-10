# Gating UX Improvement Plan: Pre-Verification Slot System

## Current State Analysis

### Current UX Flow (Problematic)
1. User writes comment and hits "Post Comment"
2. System requests signature(s) at submission time
3. User signs (potentially multiple signatures for multi-category gating)
4. Comment is posted

### Current Technical Implementation
- Frontend: Signature request happens in `NewCommentForm.tsx` on submit
- Backend: Verification happens in comment POST endpoint during submission
- Multi-category verification: Implemented but may have issues with "requireAny" mode

### Identified Issues
1. **Poor UX**: Signature requests at submission time are disruptive
2. **Multi-category bug**: Dual-gated posts only checking one category (ethereum_profile) instead of both
3. **No feedback**: Users don't know what requirements they need to satisfy upfront
4. **Repeated signatures**: No caching of verification state

## Proposed Solution: Pre-Verification Slot System

### New UX Flow (Improved)
1. User navigates to gated post
2. System displays "gating requirements slots" UI showing all required verifications
3. User fills each slot by providing signatures/verifications
4. Backend verifies each submission and marks slot as "filled"
5. Comment input only becomes active when ALL required slots are filled
6. User posts comment without additional signatures (using cached verification)

### Visual Design Concept
```
┌─ Gating Requirements ─────────────────────────────┐
│                                                   │
│ [✓] Ethereum Profile                              │
│     • ENS Domain: ✓ florianglatz.eth             │
│     • ETH Balance: ✓ 0.007 ETH                   │
│                                                   │
│ [○] LUKSO Universal Profile                       │
│     • LYX Balance: ○ Requires 4.02 LYX           │
│     • [Connect LUKSO] [Sign Challenge]            │
│                                                   │
│ Comment will be unlocked when all requirements    │
│ are satisfied.                                    │
└───────────────────────────────────────────────────┘

[Comment Input - DISABLED until slots filled]
```

## Technical Implementation Plan

### Phase 1: Backend Infrastructure

#### 1.1 Pre-Verification Storage
Create new database table to store verification states:

```sql
CREATE TABLE "pre_verifications" (
  "id" SERIAL PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "post_id" INTEGER NOT NULL,
  "category_type" TEXT NOT NULL, -- 'ethereum_profile', 'universal_profile'
  "verification_data" JSONB NOT NULL, -- stores signature, challenge, etc.
  "verification_status" TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'verified', 'expired'
  "verified_at" TIMESTAMPTZ,
  "expires_at" TIMESTAMPTZ NOT NULL, -- verification expires after 30 minutes
  "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id, post_id, category_type)
);
```

#### 1.2 New API Endpoints

**GET /api/posts/[postId]/gating-requirements**
- Returns gating categories and current verification status for user
- Shows which slots are filled vs. unfilled

**POST /api/posts/[postId]/pre-verify/[categoryType]**
- Accepts signature for specific category (ethereum_profile, universal_profile)
- Verifies signature and stores in pre_verifications table
- Returns updated verification status

**GET /api/posts/[postId]/verification-status**
- Returns current verification status for all categories
- Used to check if user can post comments

#### 1.3 Modified Comment Endpoint
Update `/api/posts/[postId]/comments` to:
- Check pre_verifications table instead of requesting new signatures
- Verify that all required categories have valid, non-expired verifications
- Remove signature request logic

### Phase 2: Frontend Implementation

#### 2.1 Gating Requirements Component
Create `GatingRequirementsPanel.tsx`:
- Displays slots for each gating category
- Shows verification status (empty, pending, verified)
- Handles signature collection for each category
- Real-time updates when verifications complete

#### 2.2 Comment Form Integration
Update `NewCommentForm.tsx`:
- Remove signature request logic
- Add dependency on verification status
- Disable comment input until all slots filled
- Show helpful messaging about requirements

#### 2.3 Verification Flow Components
- `EthereumVerificationSlot.tsx`: Handles ethereum_profile verification
- `LUKSOVerificationSlot.tsx`: Handles universal_profile verification
- `VerificationSlotContainer.tsx`: Orchestrates multiple slots

### Phase 3: Multi-Category Bug Fix

#### 3.1 Investigation Needed
Current dual-gated post only checked ethereum_profile. Need to investigate:
- Why universal_profile category was skipped
- Whether "requireAny" mode is working correctly
- If there's an issue in the multi-category verification logic

#### 3.2 Fix Implementation
- Debug `verifyMultiCategoryGatingRequirements` function
- Ensure all enabled categories are properly evaluated
- Fix "requireAny" vs "requireAll" logic

### Phase 4: Advanced Features

#### 4.1 Verification Caching
- Cache verification results for 30 minutes
- Allow users to re-use verifications across posts with same requirements
- Smart cache invalidation

#### 4.2 Progressive Disclosure
- Show only relevant slots based on user's connected wallets
- Smart prompting to connect additional wallets if needed
- Contextual help for each requirement type

#### 4.3 Verification Analytics
- Track verification completion rates
- Identify UX friction points
- A/B test different slot layouts

## Implementation Phases

### Phase 1 (Current Priority): Backend Infrastructure
**Estimated Time**: 2-3 days
1. Create pre_verifications table
2. Implement new API endpoints
3. Fix multi-category verification bug
4. Update comment posting logic

### Phase 2: Frontend Slot System
**Estimated Time**: 3-4 days
1. Build gating requirements panel
2. Create individual slot components
3. Integrate with comment form
4. Add real-time status updates

### Phase 3: Polish & Optimization
**Estimated Time**: 1-2 days
1. Improve visual design
2. Add loading states and animations
3. Error handling and edge cases
4. Testing and bug fixes

## Benefits of New System

### User Experience
- **Transparent**: Users see exactly what's required upfront
- **Progressive**: Can fill slots at their own pace
- **Efficient**: No repeated signatures for similar posts
- **Feedback-rich**: Clear visual indication of progress

### Technical Benefits
- **Scalable**: Easy to add new gating categories
- **Performant**: No signature delays at comment submission
- **Maintainable**: Clear separation of verification and posting logic
- **Analytics-friendly**: Rich data on user verification behavior

## Risks & Considerations

### Security
- Verification expiration prevents replay attacks
- Signature validation remains as stringent as current system
- Need to handle edge cases (expired verifications during comment submission)

### UX Edge Cases
- Users switching wallets mid-verification
- Network errors during slot filling
- Post requirements changing while user is verifying

### Technical Debt
- Additional database table and API endpoints
- Increased frontend complexity
- Need cleanup job for expired verifications

## Success Metrics

### User Experience Metrics
- Reduced time-to-comment on gated posts
- Increased completion rate for gated interactions
- Reduced user complaints about signature prompts

### Technical Metrics
- Decreased comment submission failure rate
- Improved frontend performance (no signature blocking)
- Reduced backend load during comment submission

## Next Steps Recommendation

1. **Immediate**: Fix multi-category verification bug to ensure dual-gated posts work correctly
2. **Phase 1**: Implement backend infrastructure for pre-verification system
3. **Phase 2**: Build frontend slot system with basic functionality
4. **Phase 3**: Polish and optimize based on user feedback

This approach transforms gating from a submission blocker into a transparent, user-friendly preparation step that users can complete at their own pace. 
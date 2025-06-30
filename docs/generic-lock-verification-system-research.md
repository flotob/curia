# Generic Lock Verification System Research

## Overview
This document analyzes the current lock verification system and designs a generic replacement that works for all contexts (posts, boards, future features) with a single set of endpoints.

## Current State Analysis

### Existing Lock Verification Endpoints

#### Post Context Endpoints
- `POST /api/posts/{postId}/pre-verify/universal_profile`
- `POST /api/posts/{postId}/pre-verify/ethereum_profile`
- `GET /api/posts/{postId}/verification-status`
- `GET /api/posts/{postId}/gating-requirements`

#### Board Context Endpoints
- `POST /api/communities/{communityId}/boards/{boardId}/locks/{lockId}/pre-verify/universal_profile`
- `POST /api/communities/{communityId}/boards/{boardId}/locks/{lockId}/pre-verify/ethereum_profile`
- `GET /api/communities/{communityId}/boards/{boardId}/locks/{lockId}/verification-status`

#### Generic Lock Endpoints (Already Exist)
- `GET /api/locks/{lockId}/gating-requirements`

### Frontend Invocation Analysis

#### Post Context Frontend Usage
- `UniversalProfileRenderer.tsx` (lines 577+): Uses challenge/response pattern
  - Calls `/api/posts/${postId}/challenge` to generate challenge
  - Signs challenge message
  - Submits to `/api/posts/${postId}/pre-verify/universal_profile`
- `EthereumConnectionWidget.tsx` (lines 181+): Uses challenge/response pattern  
  - Calls `/api/posts/${postId}/ethereum-challenge` to generate challenge
  - Signs challenge message
  - Submits to `/api/posts/${postId}/pre-verify/ethereum_profile`

#### Board Context Frontend Usage  
- `UniversalProfileRenderer.tsx` (lines 506-576): Uses simple message signing
  - Creates timestamp-based message directly
  - Signs message with UP extension
  - Submits to `/api/communities/${communityId}/boards/${boardId}/locks/${lockId}/pre-verify/universal_profile`
- `EthereumConnectionWidget.tsx` (lines 143+): Uses simple message signing
  - Creates timestamp-based message directly  
  - Signs message with wallet
  - Submits to `/api/communities/${communityId}/boards/${boardId}/locks/${lockId}/pre-verify/ethereum_profile`

#### Context Detection Pattern
Both components detect context with:
```javascript
const isBoardVerification = !postId && verificationContext?.type === 'board';
```

#### Verification Context Structure
```javascript
verificationContext: {
  type: 'board' | 'post' | 'preview',
  communityId?: string,
  boardId?: number, 
  postId?: number,
  lockId?: number
}
```

## Problems with Current System

1. **Endpoint Duplication**: Same verification logic implemented in multiple endpoints
2. **Context Coupling**: Verification logic tied to specific contexts (post/board)
3. **Inconsistent Security Models**: Different message formats for different contexts
4. **Maintenance Burden**: Changes need to be made in multiple places
5. **Future Scalability**: Adding new contexts requires new endpoint sets

## Database Analysis

### Current Schema
The `pre_verifications` table is already generic and context-agnostic:
```sql
CREATE TABLE "pre_verifications" (
    "id" integer PRIMARY KEY,
    "user_id" text NOT NULL,
    "category_type" text NOT NULL,           -- 'universal_profile', 'ethereum_profile'
    "verification_data" jsonb NOT NULL,      -- Signature, challenge, requirements
    "verification_status" text DEFAULT 'pending',
    "verified_at" timestamptz,
    "expires_at" timestamptz NOT NULL,
    "lock_id" integer NOT NULL,              -- Generic lock reference
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT UNIQUE (user_id, lock_id, category_type)
);
```

**Key insight**: The database is already designed correctly! It only stores `lock_id`, not `post_id` or `board_id`. The verification is purely about proving the user meets the lock's requirements.

### Current Endpoint Duplication Analysis

**Post Endpoints** (7 total):
1. `POST /api/posts/{postId}/pre-verify/universal_profile`
2. `POST /api/posts/{postId}/pre-verify/ethereum_profile`  
3. `GET /api/posts/{postId}/verification-status`
4. `GET /api/posts/{postId}/gating-requirements`
5. `POST /api/posts/{postId}/challenge` (UP only)
6. `POST /api/posts/{postId}/ethereum-challenge` (Ethereum only)

**Board Endpoints** (3 total):
7. `POST /api/communities/{communityId}/boards/{boardId}/locks/{lockId}/pre-verify/universal_profile`
8. `POST /api/communities/{communityId}/boards/{boardId}/locks/{lockId}/pre-verify/ethereum_profile`
9. `GET /api/communities/{communityId}/boards/{boardId}/locks/{lockId}/verification-status`

**Generic Endpoints** (1 existing):
10. `GET /api/locks/{lockId}/gating-requirements` ✅ Already exists and works

### Verification Flow Differences

**Post Verification (Complex)**:
1. Generate challenge: `POST /api/posts/{postId}/challenge`
2. Sign challenge message
3. Submit: `POST /api/posts/{postId}/pre-verify/{categoryType}` with full challenge object

**Board Verification (Simple)**:
1. Create timestamp-based message directly in frontend
2. Sign message
3. Submit: `POST /api/communities/.../pre-verify/{categoryType}` with simple payload

## Proposed Generic System

### New Generic Endpoints
Replace all 9 context-specific endpoints with 3 generic ones:

```
GET  /api/locks/{lockId}/gating-requirements     ✅ Already exists
GET  /api/locks/{lockId}/verification-status     🆕 New - replaces 2 endpoints  
POST /api/locks/{lockId}/verify/{categoryType}   🆕 New - replaces 6 endpoints
```

### Unified Verification Flow
Use the **simpler board verification pattern** for all contexts:

1. **Frontend creates message directly** (no challenge generation needed)
2. **User signs message** with wallet/UP extension  
3. **Submit to generic endpoint** with context information

### Message Format Standardization
```javascript
const message = `Verify ${categoryType} for lock access
Lock ID: ${lockId}
Address: ${userAddress}
Context: ${context.type}:${context.id}  // "post:123" or "board:456"
Timestamp: ${Date.now()}
Chain: ${chainName}

This signature proves you control this address and grants access based on lock requirements.`;
```

### Generic Endpoint Payloads

#### POST /api/locks/{lockId}/verify/{categoryType}
```json
{
  "signature": "0x...",
  "message": "Verify universal_profile for lock access...",
  "address": "0x...",
  "context": {
    "type": "post",
    "id": 123
  },
  "verificationData": {
    "requirements": {...}
  }
}
```

#### GET /api/locks/{lockId}/verification-status?context=post:123
```json
{
  "canAccess": true,
  "lockId": 456,
  "context": { "type": "post", "id": 123 },
  "requireAll": false,
  "totalCategories": 2,
  "verifiedCategories": 1,
  "categories": [...],
  "expiresAt": "2024-01-01T12:00:00Z"
}
```

## Implementation Plan

### Phase 1: Create New Generic Endpoints

#### 1.1 Create `/api/locks/[lockId]/verification-status/route.ts`
- Accept `context` query parameter: `?context=post:123` or `?context=board:456`
- Query `pre_verifications` table by `lock_id` and `user_id`
- Return standardized verification status response
- **Replaces**: 
  - `GET /api/posts/{postId}/verification-status`
  - `GET /api/communities/{communityId}/boards/{boardId}/locks/{lockId}/verification-status`

#### 1.2 Create `/api/locks/[lockId]/verify/[categoryType]/route.ts`
- Accept context in request body: `{ context: { type: "post", id: 123 } }`
- Use simple message verification (no challenge generation)
- Store verification in `pre_verifications` table with `lock_id`
- **Replaces**:
  - `POST /api/posts/{postId}/pre-verify/universal_profile`
  - `POST /api/posts/{postId}/pre-verify/ethereum_profile`
  - `POST /api/communities/{communityId}/boards/{boardId}/locks/{lockId}/pre-verify/universal_profile`
  - `POST /api/communities/{communityId}/boards/{boardId}/locks/{lockId}/pre-verify/ethereum_profile`

#### 1.3 Remove Challenge Generation Endpoints
Since we're using simple message signing, these become unnecessary:
- **Delete**: `POST /api/posts/{postId}/challenge`
- **Delete**: `POST /api/posts/{postId}/ethereum-challenge`

### Phase 2: Update Frontend Components

#### 2.1 Update Verification Components
- **UniversalProfileRenderer.tsx**: Remove dual verification flows, use single generic flow
- **EthereumConnectionWidget.tsx**: Remove dual verification flows, use single generic flow
- Use consistent message format for all contexts
- Call generic endpoints: `/api/locks/{lockId}/verify/{categoryType}`

#### 2.2 Update React Query Hooks
- **useContextualGatingData.ts**: Update to use generic verification status endpoint
- Add context parameter to API calls: `?context=post:123`
- Maintain same hook interface for backwards compatibility

#### 2.3 Update LockVerificationPanel
- Remove context-specific routing logic
- Always use generic endpoints regardless of context
- Pass context information in API calls instead of endpoint routing

### Phase 3: Remove Legacy Endpoints

#### 3.1 Delete Post Verification Endpoints
- **Delete**: `/api/posts/[postId]/pre-verify/[categoryType]/route.ts`
- **Delete**: `/api/posts/[postId]/verification-status/route.ts`
- **Delete**: `/api/posts/[postId]/challenge/route.ts`
- **Delete**: `/api/posts/[postId]/ethereum-challenge/route.ts`

#### 3.2 Delete Board Verification Endpoints  
- **Delete**: `/api/communities/[communityId]/boards/[boardId]/locks/[lockId]/pre-verify/[categoryType]/route.ts`
- **Delete**: `/api/communities/[communityId]/boards/[boardId]/locks/[lockId]/verification-status/route.ts`

#### 3.3 Update Post/Board Access Validation
- **Update**: Post creation, commenting, reactions, voting APIs
- **Update**: Board posting APIs
- Change from context-specific verification checks to generic lock verification queries
- Query `pre_verifications` by `lock_id` instead of context-specific logic

### Phase 4: Verification & Cleanup

#### 4.1 Update All API Consumers
- **Update**: All APIs that check verification status (posts, comments, reactions, votes)
- **Update**: Board access validation logic
- Ensure all use generic `lock_id` based queries

#### 4.2 Frontend Hook Cleanup
- **Remove**: Legacy hooks that are no longer needed
- **Update**: Any remaining hardcoded endpoint references
- **Test**: All verification flows in different contexts

### Benefits After Implementation

1. **Single Source of Truth**: All verification goes through `/api/locks/{lockId}/verify/{categoryType}`
2. **Consistent Security**: Same message format and verification logic for all contexts
3. **Easy to Extend**: Adding new contexts (comments, reactions, etc.) requires no new endpoints
4. **Maintainable**: Changes to verification logic only need to be made in one place
5. **Database Aligned**: Frontend architecture matches the generic `pre_verifications` table design

### Migration Strategy

- **Zero Downtime**: Implement new endpoints first, then update frontend to use them
- **Backwards Compatible**: Keep old endpoints until frontend is fully migrated
- **Gradual Rollout**: Update one verification context at a time (preview → board → post)
- **Rollback Plan**: Old endpoints remain available until new system is proven stable

---

*Document started: 2024-01-01*
*Last updated: 2024-01-01*
*Phase 1-3 completed: ✅ Generic endpoints created, legacy endpoints deleted, all broken references fixed*
*Status: ✅ FIXED - Post verification 404 error resolved, hybrid system working* 
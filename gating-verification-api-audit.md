# Gating/Verification API Endpoints Audit Report

## Executive Summary

This audit identifies **9 critical inconsistencies** across 15 API endpoints that handle gating/verification logic. The main issues are:

1. **Inconsistent verification function usage** - Some endpoints use shared functions while others implement custom logic
2. **Mixed fulfillment mode handling** - Inconsistent backward compatibility for `requireAll` vs `requireAny`
3. **Different expiration durations** - Post vs board verification use different timeframes without clear logic
4. **Inconsistent gating configuration parsing** - Some endpoints handle both legacy and lock-based gating, others don't
5. **Variable validation patterns** - Different address validation and error handling approaches

---

## Endpoint Categories & Analysis

### 1. **Generic Lock Verification Endpoints** (✅ Most Consistent)

#### `/api/locks/[lockId]/verify/[categoryType]` (POST)
- **Purpose**: Universal verification endpoint for all contexts
- **Verification Functions**: ✅ Uses shared `verifyPostGatingRequirements()` and `verifyEthereumGatingRequirements()`
- **Fulfillment Mode**: ✅ Consistent backward compatibility (`requireAll`/`requireAny`)
- **Expiration**: ⚠️ **INCONSISTENCY**: 30 minutes for posts, 4 hours for boards (hardcoded)
- **Gating Config**: ✅ Handles lock-based gating only (by design)
- **Storage**: ✅ Uses `pre_verifications` table with consistent schema

#### `/api/locks/[lockId]/verification-status` (GET)
- **Purpose**: Universal status check for all contexts
- **Verification Functions**: N/A (status only)
- **Fulfillment Mode**: ✅ Consistent backward compatibility
- **Gating Config**: ✅ Handles lock-based gating only
- **Storage**: ✅ Queries `pre_verifications` consistently

---

### 2. **Post-Specific Gating Endpoints** (⚠️ Mixed Consistency)

#### `/api/posts/[postId]/gating-requirements` (GET)
- **Purpose**: Get post gating config and verification status
- **Verification Functions**: N/A (config only)
- **Fulfillment Mode**: ✅ Consistent backward compatibility
- **Gating Config**: ✅ Handles both legacy and lock-based gating
- **Storage**: ✅ Queries `pre_verifications` for lock-based, no verification for legacy

#### `/api/posts/[postId]/comments` (POST)
- **Purpose**: Comment creation with gating verification
- **Verification Functions**: ❌ **INCONSISTENCY**: Uses shared functions for server-side verification BUT has deprecated custom verification logic for legacy challenges
- **Fulfillment Mode**: ✅ Consistent backward compatibility
- **Gating Config**: ✅ Handles both legacy and lock-based gating
- **Storage**: ✅ Queries `pre_verifications` for lock-based verification
- **Issue**: Contains deprecated `verifyMultiCategoryGatingRequirements()` function with different logic

#### `/api/posts/[postId]/reactions` (POST) & `/api/posts/[postId]/votes` (POST)
- **Purpose**: User actions with board lock verification
- **Verification Functions**: ❌ **INCONSISTENCY**: Only checks pre-verification results, doesn't perform actual verification
- **Fulfillment Mode**: ✅ Consistent logic
- **Gating Config**: ⚠️ **INCONSISTENCY**: Only handles board lock gating, ignores post-level gating
- **Storage**: ✅ Queries `pre_verifications` consistently

#### `/api/posts` (POST)
- **Purpose**: Post creation with board lock verification
- **Verification Functions**: ❌ **INCONSISTENCY**: Only checks pre-verification results
- **Fulfillment Mode**: ✅ Consistent logic
- **Gating Config**: ⚠️ **INCONSISTENCY**: Only handles board lock gating
- **Storage**: ✅ Queries `pre_verifications` consistently

---

### 3. **Board-Specific Endpoints** (✅ Mostly Consistent)

#### `/api/communities/[communityId]/boards/[boardId]/verification-status` (GET)
- **Purpose**: Board verification status
- **Verification Functions**: N/A (status only)
- **Fulfillment Mode**: ✅ Consistent logic
- **Gating Config**: ✅ Handles board lock gating
- **Storage**: ✅ Queries `pre_verifications` consistently

---

### 4. **Standalone Verification Endpoints** (❌ Major Inconsistencies)

#### `/api/ethereum/verify-requirements` (POST)
- **Purpose**: Ethereum requirements verification
- **Verification Functions**: ✅ Uses shared `verifyEthereumGatingRequirements()`
- **Fulfillment Mode**: ❌ **INCONSISTENCY**: No fulfillment mode parameter - uses function defaults
- **Issue**: Doesn't accept fulfillment mode as parameter, potentially using different logic

#### `/api/ethereum/verify-erc20` (POST), `/api/ethereum/verify-erc721` (POST), `/api/ethereum/verify-erc1155` (POST)
- **Purpose**: Individual token verification
- **Verification Functions**: ✅ Uses shared individual verification functions
- **Issue**: These are atomic verification functions, not gating context-aware

#### `/api/ethereum/validate-signature` (POST)
- **Purpose**: Basic signature validation
- **Verification Functions**: ❌ **INCONSISTENCY**: Uses `viem.verifyMessage()` instead of shared verification infrastructure
- **Issue**: Different signature validation approach than other endpoints

---

### 5. **Utility Endpoints** (🔍 Context-Dependent)

#### `/api/users/[userId]/tipping-eligibility` (GET)
- **Purpose**: Check user tipping eligibility
- **Verification Functions**: N/A (eligibility check)
- **Storage**: ✅ Queries `pre_verifications` as fallback to Common Ground profile data
- **Note**: Multi-source approach is unique but consistent with business logic

---

## Critical Inconsistencies Identified

### 🚨 **Issue #1: Mixed Verification Function Usage**

**Problem**: Some endpoints use shared verification functions while others implement custom logic.

**Affected Endpoints**:
- ✅ **Consistent**: `/api/locks/[lockId]/verify/[categoryType]`, `/api/ethereum/verify-requirements`
- ❌ **Inconsistent**: `/api/posts/[postId]/comments` (has deprecated custom functions), `/api/ethereum/validate-signature` (uses different signature validation)

**Risk**: Security vulnerabilities, different validation logic, maintenance overhead

### 🚨 **Issue #2: Fulfillment Mode Parameter Handling**

**Problem**: Not all endpoints that perform verification accept fulfillment mode parameters.

**Affected Endpoints**:
- ✅ **Accepts fulfillment**: `/api/locks/[lockId]/verify/[categoryType]` (passes `targetCategory.fulfillment`)
- ❌ **Missing fulfillment**: `/api/ethereum/verify-requirements` (uses function defaults)

**Risk**: Different verification behavior for same requirements

### 🚨 **Issue #3: Expiration Duration Inconsistencies**

**Problem**: Different verification expiration times without clear business logic.

**Details**:
- **Posts**: 30 minutes (0.5 hours)
- **Boards**: 4 hours
- **Hardcoded**: No configuration or database-driven expiration

**Risk**: User experience inconsistencies, potential security implications

### 🚨 **Issue #4: Gating Configuration Scope**

**Problem**: Some endpoints handle both legacy and lock-based gating, others only handle specific types.

**Affected Endpoints**:
- ✅ **Both**: `/api/posts/[postId]/gating-requirements`, `/api/posts/[postId]/comments`
- ❌ **Lock-only**: `/api/locks/*` (by design)
- ❌ **Board-only**: `/api/posts/[postId]/reactions`, `/api/posts/[postId]/votes`, `/api/posts` (ignores post-level gating)

**Risk**: Feature gaps, user confusion

### 🚨 **Issue #5: Verification vs Pre-verification Logic**

**Problem**: Some endpoints perform real-time verification while others only check pre-verification results.

**Real-time Verification**:
- `/api/locks/[lockId]/verify/[categoryType]`
- `/api/ethereum/verify-requirements`
- `/api/posts/[postId]/comments` (deprecated legacy path)

**Pre-verification Only**:
- `/api/posts/[postId]/reactions`
- `/api/posts/[postId]/votes`
- `/api/posts` (post creation)

**Risk**: Inconsistent security model, potential bypasses

### 🚨 **Issue #6: Address Validation Patterns**

**Problem**: Different address validation approaches across endpoints.

**Patterns**:
- **Regex**: `/^0x[a-fA-F0-9]{40}$/` (most endpoints)
- **Custom**: Some endpoints have additional validation
- **None**: Some endpoints rely on downstream validation

### 🚨 **Issue #7: Error Response Formats**

**Problem**: Inconsistent error response structures.

**Variations**:
- `{ error: string }` (simple)
- `{ error: string, requiresVerification: boolean, ... }` (detailed)
- `{ valid: boolean, error: string }` (verification-specific)

### 🚨 **Issue #8: Backward Compatibility Handling**

**Problem**: Inconsistent handling of `requireAll` vs `requireAny` fields.

**Most endpoints handle both**:
```typescript
if (lockGatingConfig.requireAll !== undefined) {
  requireAll = lockGatingConfig.requireAll;
} else if (lockGatingConfig.requireAny !== undefined) {
  requireAll = !lockGatingConfig.requireAny;
} else {
  requireAll = false; // Default
}
```

**But some endpoints might miss this logic**

### 🚨 **Issue #9: Context Parameter Handling**

**Problem**: Generic endpoints require context parameters but validation varies.

**Example**: `/api/locks/[lockId]/verification-status` requires `?context=post:123` but validation is inconsistent.

---

## Recommendations

### 1. **Standardize Verification Function Usage**
- Remove deprecated verification functions from `/api/posts/[postId]/comments`
- Ensure all endpoints use shared verification infrastructure
- Standardize signature validation approach

### 2. **Implement Consistent Fulfillment Mode Handling**
- Add fulfillment mode parameter to all verification endpoints
- Ensure consistent default behavior
- Document fulfillment mode propagation

### 3. **Unify Expiration Duration Logic**
- Move expiration settings to database configuration
- Implement consistent expiration calculation
- Consider context-specific expiration policies

### 4. **Standardize Gating Configuration Parsing**
- Create shared gating configuration parser
- Ensure consistent legacy/lock-based gating handling
- Implement consistent backward compatibility

### 5. **Clarify Verification Architecture**
- Document when to use real-time vs pre-verification
- Ensure consistent security model
- Consider performance implications

### 6. **Implement Shared Validation Library**
- Create consistent address validation
- Standardize error response formats
- Implement consistent parameter validation

### 7. **Add Configuration-Driven Settings**
- Move hardcoded values to configuration
- Implement per-context settings
- Add administrative controls

---

## Priority Matrix

| Issue | Security Risk | User Impact | Development Cost | Priority |
|-------|---------------|-------------|------------------|----------|
| Mixed verification functions | **HIGH** | Medium | Low | **P0** |
| Fulfillment mode inconsistency | **HIGH** | **HIGH** | Low | **P0** |
| Expiration duration hardcoding | Medium | **HIGH** | Medium | **P1** |
| Gating configuration scope | Medium | **HIGH** | **HIGH** | **P1** |
| Verification vs pre-verification | **HIGH** | Medium | **HIGH** | **P1** |
| Address validation patterns | Low | Low | Low | **P2** |
| Error response formats | Low | Medium | Low | **P2** |
| Backward compatibility | Medium | Low | Low | **P2** |
| Context parameter handling | Low | Low | Low | **P3** |

---

## Next Steps

1. **Immediate (P0)**: Fix verification function inconsistencies and fulfillment mode handling
2. **Short-term (P1)**: Implement configuration-driven expiration and clarify gating scope
3. **Medium-term (P2)**: Standardize validation and error handling
4. **Long-term (P3)**: Implement comprehensive configuration system

This audit provides a roadmap for achieving consistent, secure, and maintainable gating/verification across all API endpoints.
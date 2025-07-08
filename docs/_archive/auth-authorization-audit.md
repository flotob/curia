# Authentication & Authorization Logic Audit

## Executive Summary

This audit reviews the authentication and authorization patterns across the codebase, identifying inconsistencies, duplicated logic, and opportunities for consolidation. The analysis covers token handling, permission checking, context management, and middleware patterns.

## 1. Inconsistent Token Handling Patterns

### Current State
The codebase shows mixed approaches to handling authentication tokens:

#### ✅ **Consistent Pattern (Recommended)**
Most components use the `useAuth` hook properly:
```typescript
const { token } = useAuth();
// Used in: 50+ components including PostCard, VoteButton, NewPostForm, etc.
```

#### ⚠️ **Inconsistent Pattern (Manual Headers)**
Some components manually construct Authorization headers:
```typescript
// Found in: BoardLockGatingForm.tsx, EthereumConnectionWidget.tsx, etc.
headers: { 'Authorization': `Bearer ${token}` }
```

#### 🔧 **Mixed Pattern (authFetch vs Manual)**
Some components use `authFetch` utility while others manually add headers:
```typescript
// Good: Using authFetch utility
await authFetch('/api/posts', { method: 'POST', body })

// Inconsistent: Manual header construction
fetch('/api/posts', { 
  headers: { 'Authorization': `Bearer ${token}` }
})
```

### Recommendations
1. **Standardize on `authFetch` utility** - All API calls should use `authFetch`/`authFetchJson`
2. **Remove manual Authorization header construction** - Centralize token handling
3. **Create type-safe API client** - Consider wrapping `authFetch` in domain-specific clients

## 2. Permission Checking Logic Duplication

### Current State
Permission checking is scattered across multiple layers with significant duplication:

#### **Backend API Route Patterns**
Multiple API routes duplicate the same permission checking logic:

**Pattern 1: User-Community Ownership Check**
```typescript
// Duplicated across ~15 API routes
const requestingUserCommunityId = req.user?.cid;
if (communityId !== requestingUserCommunityId && !isAdmin) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

**Pattern 2: Board Access Control**
```typescript
// Duplicated in posts, comments, votes routes
const { canUserAccessBoard } = await import('@/lib/boardPermissions');
if (!canUserAccessBoard(userRoles, boardSettings, isAdmin)) {
  return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
}
```

**Pattern 3: Admin Role Checking**
```typescript
// Multiple variations across routes
const isAdmin = req.user?.adm || req.user?.sub === process.env.NEXT_PUBLIC_SUPERADMIN_ID;
```

#### **Frontend Permission Patterns**
Frontend components also duplicate permission logic:

```typescript
// Multiple components check admin status differently
const isAdmin = user?.isAdmin || user?.userId === process.env.NEXT_PUBLIC_SUPERADMIN_ID;
```

### Recommendations
1. **Create centralized permission service** - `PermissionService` class with reusable methods
2. **Add permission middleware** - Higher-order functions for common checks
3. **Standardize admin checking** - Single source of truth for admin status
4. **Create permission hooks** - Reusable hooks like `useCanAccessBoard`, `useIsAdmin`

## 3. Context Switching Complexity

### Current Authentication Contexts
The application maintains multiple authentication contexts with complex switching logic:

#### **Core Authentication Stack**
```typescript
AuthProvider
├── CgLibContext (Common Ground integration)
├── SocketContext (Real-time features)
└── ConditionalUniversalProfileProvider
    ├── UniversalProfileProvider (when activated)
    └── InactiveUPContextProvider (when dormant)
```

#### **Complex Conditional Logic**
```typescript
// ConditionalUniversalProfileProvider.tsx
const shouldInitializeUP = isUPNeeded && hasUserTriggeredConnection;

return shouldInitializeUP ? (
  <UniversalProfileProvider>
    <ActiveUPContextProvider>{children}</ActiveUPContextProvider>
  </UniversalProfileProvider>
) : (
  <InactiveUPContextProvider>{children}</InactiveUPContextProvider>
);
```

### Issues Identified
1. **Modal Interference** - Provider switching causes component unmounting
2. **State Synchronization** - Multiple contexts can get out of sync
3. **Complex Activation Logic** - Hard to debug and maintain
4. **Memory Leaks** - Provider switching without proper cleanup

### Recommendations
1. **Simplify provider hierarchy** - Reduce nesting and conditional switching
2. **Use state machines** - Implement XState for complex authentication flows
3. **Create unified auth state** - Single context with internal state management
4. **Add auth debugging tools** - DevTools integration for auth state inspection

## 4. Middleware Pattern Consolidation

### Current Middleware Patterns

#### **withAuth Middleware**
```typescript
// Single middleware handles most authentication
export const GET = withAuth(handler, false);  // Regular auth
export const POST = withAuth(handler, true);  // Admin-only
```

#### **Socket Authentication**
```typescript
// Separate authentication logic for Socket.IO
io.use(async (socket, next) => {
  const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
  socket.data.user = decoded;
});
```

#### **Manual Permission Checks**
```typescript
// Scattered throughout route handlers
if (!user || !user.sub || !user.cid) {
  return NextResponse.json({ error: 'Auth required' }, { status: 401 });
}
```

### Issues Identified
1. **Inconsistent error responses** - Different error formats across routes
2. **Duplicate JWT verification** - Same logic in multiple places
3. **Missing permission middleware** - Common patterns not abstracted
4. **No request logging** - Limited visibility into auth failures

### Recommendations
1. **Create middleware composer** - Chain multiple middleware functions
2. **Add permission-specific middleware** - `withBoardAccess`, `withCommunityOwnership`
3. **Standardize error responses** - Consistent format across all endpoints
4. **Add auth logging middleware** - Track authentication patterns and failures

## 5. Specific Issues & Solutions

### Issue 1: JWT Secret Handling
**Problem**: JWT_SECRET checked in multiple places without consistent error handling

**Current Pattern**:
```typescript
if (!JWT_SECRET) {
  console.error('JWT_SECRET is not configured');
  return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
}
```

**Solution**: Create `requireJWTSecret()` utility function

### Issue 2: User Data Extraction
**Problem**: User data extracted differently across routes

**Current Patterns**:
```typescript
const userId = req.user?.sub;
const userCommunityId = req.user?.cid;
const userRoles = req.user?.roles;
const isAdmin = req.user?.adm || false;
```

**Solution**: Create `extractUserContext(req)` utility

### Issue 3: Token Refresh Logic
**Problem**: Complex token refresh logic in AuthContext with potential race conditions

**Current Issues**:
- `isRefreshing` flag to prevent concurrent refreshes
- Complex fallback logic when CgLib data unavailable
- Manual localStorage management

**Solution**: Implement proper token refresh queue and state management

## 6. Recommended Action Plan

### Phase 1: Token Handling Standardization (1-2 days)
1. Replace all manual `Authorization` header construction with `authFetch`
2. Create typed API client wrapper around `authFetch`
3. Add ESLint rule to prevent manual header construction

### Phase 2: Permission System Consolidation (2-3 days)
1. Create `PermissionService` class with reusable methods
2. Add permission-specific middleware functions
3. Create frontend permission hooks
4. Standardize admin checking across all components

### Phase 3: Context Simplification (3-4 days)
1. Refactor ConditionalUniversalProfileProvider to reduce switching
2. Implement unified auth state management
3. Add proper cleanup for provider transitions
4. Create auth debugging tools

### Phase 4: Middleware Enhancement (2-3 days)
1. Create middleware composition utilities
2. Add specialized permission middleware
3. Standardize error response formats
4. Implement auth logging and monitoring

## 7. Code Examples for Implementation

### Standardized Permission Service
```typescript
// lib/permissions/PermissionService.ts
export class PermissionService {
  static canAccessCommunity(userCommunityId: string, targetCommunityId: string, isAdmin: boolean): boolean {
    return userCommunityId === targetCommunityId || isAdmin;
  }
  
  static canAccessBoard(userRoles: string[], boardSettings: BoardSettings, isAdmin: boolean): boolean {
    return canUserAccessBoard(userRoles, boardSettings, isAdmin);
  }
  
  static isUserAdmin(user: JwtPayload): boolean {
    return user.adm || user.sub === process.env.NEXT_PUBLIC_SUPERADMIN_ID;
  }
}
```

### Middleware Composition
```typescript
// lib/middleware/compose.ts
export const withPermissions = (...checks: PermissionCheck[]) => 
  (handler: Handler) => 
    withAuth(async (req, context) => {
      for (const check of checks) {
        const result = await check(req);
        if (!result.allowed) {
          return NextResponse.json({ error: result.reason }, { status: 403 });
        }
      }
      return handler(req, context);
    });

// Usage
export const POST = withPermissions(
  requireCommunityOwnership,
  requireBoardAccess
)(createPostHandler);
```

### Unified Auth Hook
```typescript
// hooks/useAuthPermissions.ts
export const useAuthPermissions = () => {
  const { user, token } = useAuth();
  
  return {
    canAccessBoard: useCallback((boardSettings: BoardSettings) => 
      PermissionService.canAccessBoard(user?.roles, boardSettings, user?.isAdmin), [user]),
    isAdmin: useMemo(() => PermissionService.isUserAdmin(user), [user]),
    canAccessCommunity: useCallback((communityId: string) =>
      PermissionService.canAccessCommunity(user?.cid, communityId, user?.isAdmin), [user])
  };
};
```

## Conclusion

The current authentication and authorization system shows good foundational architecture but suffers from inconsistent patterns and duplicated logic. The proposed consolidation will improve maintainability, reduce bugs, and provide better developer experience while maintaining backward compatibility.

Priority should be given to token handling standardization and permission system consolidation, as these provide the highest impact with relatively low implementation risk.
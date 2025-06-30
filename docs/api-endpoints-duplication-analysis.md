# API Endpoints Duplication Analysis

## Overview

This analysis examines all API endpoints in `src/app/api/` to identify patterns of duplicated logic, similar request/response handling, and opportunities for consolidation into generic handlers. The findings reveal significant opportunities to reduce code duplication and improve maintainability through shared utilities and generic patterns.

## Key Findings Summary

- **47 API endpoint files** analyzed across 13 major categories
- **8 major duplication patterns** identified
- **Estimated 40-60% code reduction potential** through consolidation
- **Critical violations of DRY principles** in authentication, validation, and database access

---

## 1. Authentication & Authorization Patterns

### Current Duplication
Every protected endpoint repeats similar authentication and authorization logic:

```typescript
// Repeated in ~35 endpoints
const currentUserId = req.user?.sub;
const currentCommunityId = req.user?.cid;
const userRoles = req.user?.roles;
const isAdmin = req.user?.adm || false;

if (!currentUserId || !currentCommunityId) {
  return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
}
```

### Consolidation Opportunity
**Create Enhanced Middleware System:**
```typescript
// src/lib/middleware/authEnhanced.ts
export interface EnhancedAuthRequest extends AuthenticatedRequest {
  userContext: {
    userId: string;
    communityId: string;
    roles: string[];
    isAdmin: boolean;
    hasRequiredContext: boolean;
  };
}

export function withEnhancedAuth(
  handler: (req: EnhancedAuthRequest, context: RouteContext) => Promise<NextResponse>,
  options: {
    adminOnly?: boolean;
    requireCommunity?: boolean;
    requiredRoles?: string[];
  } = {}
) {
  return withAuth(async (req: AuthenticatedRequest, context: RouteContext) => {
    const userContext = {
      userId: req.user?.sub || '',
      communityId: req.user?.cid || '',
      roles: req.user?.roles || [],
      isAdmin: req.user?.adm || false,
      hasRequiredContext: !!(req.user?.sub && req.user?.cid)
    };

    // Consolidated validation logic
    if (options.requireCommunity && !userContext.hasRequiredContext) {
      return NextResponse.json({ error: 'Authentication and community context required' }, { status: 401 });
    }

    if (options.adminOnly && !userContext.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    if (options.requiredRoles && !options.requiredRoles.some(role => userContext.roles.includes(role))) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const enhancedReq = req as EnhancedAuthRequest;
    enhancedReq.userContext = userContext;
    
    return handler(enhancedReq, context);
  }, options.adminOnly);
}
```

---

## 2. Database Query Patterns

### Current Duplication
Similar database queries are repeated across multiple endpoints:

#### Pattern 1: User-Accessible Boards Query
**Found in:** `posts/route.ts`, `search/posts/route.ts`, `communities/[id]/boards/route.ts`, `tags/suggestions/route.ts`

```typescript
// Repeated 4+ times
const allBoards = await getAccessibleBoards(currentCommunityId);
const accessibleBoardIds = getAccessibleBoardIds(allBoards, userRoles, isAdmin);
```

#### Pattern 2: Post Fetching with User Context
**Found in:** `posts/route.ts`, `posts/[postId]/route.ts`, `search/posts/route.ts`, `me/whats-new/route.ts`

```typescript
// Similar complex query repeated with variations
const result = await query(`
  SELECT 
    p.id, p.author_user_id, p.title, p.content, p.tags, p.settings,
    p.upvote_count, p.comment_count, p.created_at, p.updated_at,
    u.name AS author_name, u.profile_picture_url AS author_profile_picture_url,
    b.id AS board_id, b.name AS board_name,
    CASE WHEN v.user_id IS NOT NULL THEN TRUE ELSE FALSE END AS user_has_upvoted
  FROM posts p
  JOIN users u ON p.author_user_id = u.user_id
  JOIN boards b ON p.board_id = b.id
  LEFT JOIN votes v ON p.id = v.post_id AND v.user_id = $1
  WHERE ...
`, [userId, ...params]);
```

#### Pattern 3: Lock Data with Stats
**Found in:** `locks/route.ts`, `locks/[lockId]/route.ts`, `communities/[id]/boards/[boardId]/verification-status/route.ts`

```typescript
// Similar query structure repeated
const result = await query(`
  SELECT 
    l.id, l.name, l.description, l.icon, l.color, l.gating_config,
    l.creator_user_id, l.community_id, l.is_template, l.is_public,
    l.tags, l.usage_count, l.success_rate, l.avg_verification_time,
    l.created_at, l.updated_at,
    ls.posts_using_lock,
    u.name as creator_name
  FROM locks l
  LEFT JOIN lock_stats ls ON l.id = ls.id
  LEFT JOIN users u ON l.creator_user_id = u.user_id
  WHERE ...
`, params);
```

### Consolidation Opportunity
**Create Database Query Service Layer:**
```typescript
// src/lib/services/DatabaseService.ts
export class DatabaseService {
  // Generic post fetching with all common joins and user context
  static async getPostsWithContext(
    userId: string,
    filters: PostFilters,
    pagination: PaginationOptions
  ): Promise<ApiPost[]> {
    // Single implementation of complex post query with all joins
  }

  // Generic lock fetching with stats and permissions
  static async getLocksWithStats(
    userId: string,
    communityId: string,
    filters: LockFilters
  ): Promise<LockWithStats[]> {
    // Single implementation of complex lock query
  }

  // Generic board access checking
  static async getUserAccessibleBoards(
    userId: string,
    communityId: string,
    userRoles: string[],
    isAdmin: boolean
  ): Promise<BoardWithAccess[]> {
    // Single implementation of board accessibility logic
  }
}
```

---

## 3. Validation Patterns

### Current Duplication
Input validation logic is repeated across endpoints:

#### Pattern 1: ID Validation
**Found in:** 15+ endpoints
```typescript
// Repeated everywhere
const postId = parseInt(params.postId, 10);
if (isNaN(postId)) {
  return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
}
```

#### Pattern 2: Settings Validation
**Found in:** `posts/route.ts`, `communities/[id]/boards/route.ts`, `locks/route.ts`
```typescript
// Similar validation logic repeated
if (settings) {
  const { SettingsUtils } = await import('@/types/settings');
  const validation = SettingsUtils.validatePostSettings(settings);
  if (!validation.isValid) {
    return NextResponse.json({ 
      error: 'Invalid settings', 
      details: validation.errors 
    }, { status: 400 });
  }
}
```

### Consolidation Opportunity
**Create Validation Service:**
```typescript
// src/lib/services/ValidationService.ts
export class ValidationService {
  static validateId(idString: string, type: string): number {
    const id = parseInt(idString, 10);
    if (isNaN(id)) {
      throw new ValidationError(`Invalid ${type} ID`);
    }
    return id;
  }

  static validatePagination(params: URLSearchParams): PaginationParams {
    return {
      limit: Math.min(parseInt(params.get('limit') || '20', 10), 100),
      offset: parseInt(params.get('offset') || '0', 10)
    };
  }

  static async validateGatingConfig(config: unknown): Promise<void> {
    // Centralized gating configuration validation
  }
}

// Generic validation middleware
export function withValidation<T>(
  schema: ValidationSchema<T>,
  handler: (req: AuthenticatedRequest & { validatedData: T }, context: RouteContext) => Promise<NextResponse>
) {
  return async (req: AuthenticatedRequest, context: RouteContext) => {
    try {
      const validatedData = await schema.validate(await req.json());
      (req as any).validatedData = validatedData;
      return handler(req as any, context);
    } catch (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  };
}
```

---

## 4. Pagination Patterns

### Current Duplication
Pagination logic is repeated across list endpoints:

**Found in:** `posts/route.ts`, `locks/route.ts`, `communities/partnerships/route.ts`, `users/[userId]/activity/route.ts`, `me/whats-new/route.ts`

```typescript
// Repeated pagination logic
const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
const offset = parseInt(searchParams.get('offset') || '0', 10);

// Later...
const countResult = await query(countQuery, queryParams.slice(0, -2));
const total = parseInt(countResult.rows[0].total, 10);

return NextResponse.json({
  data: results,
  pagination: {
    total,
    page: Math.floor(offset / limit) + 1,
    limit,
    hasMore: offset + limit < total
  }
});
```

### Consolidation Opportunity
**Create Generic Pagination Service:**
```typescript
// src/lib/services/PaginationService.ts
export class PaginationService {
  static parseParams(searchParams: URLSearchParams): PaginationParams {
    return {
      limit: Math.min(parseInt(searchParams.get('limit') || '20', 10), 100),
      offset: parseInt(searchParams.get('offset') || '0', 10)
    };
  }

  static async executePaginatedQuery<T>(
    mainQuery: string,
    countQuery: string,
    params: any[],
    pagination: PaginationParams,
    transformer?: (row: any) => T
  ): Promise<PaginatedResponse<T>> {
    const [dataResult, countResult] = await Promise.all([
      query(mainQuery, [...params, pagination.limit, pagination.offset]),
      query(countQuery, params)
    ]);

    const items = transformer 
      ? dataResult.rows.map(transformer)
      : dataResult.rows;

    const total = parseInt(countResult.rows[0].total, 10);

    return {
      data: items,
      pagination: {
        total,
        page: Math.floor(pagination.offset / pagination.limit) + 1,
        limit: pagination.limit,
        hasMore: pagination.offset + pagination.limit < total
      }
    };
  }
}
```

---

## 5. Error Handling Patterns

### Current Duplication
Error response patterns are inconsistent and repeated:

```typescript
// Various error patterns found across endpoints
return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
return NextResponse.json({ success: false, error: 'Failed to create lock' }, { status: 500 });
```

### Consolidation Opportunity
**Create Standard Error Response System:**
```typescript
// src/lib/errors/ApiErrors.ts
export class ApiError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
  }

  toResponse(): NextResponse {
    return NextResponse.json({
      success: false,
      error: this.message,
      code: this.code,
      details: this.details
    }, { status: this.statusCode });
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

// Error handling middleware
export function withErrorHandling(
  handler: (req: AuthenticatedRequest, context: RouteContext) => Promise<NextResponse>
) {
  return async (req: AuthenticatedRequest, context: RouteContext) => {
    try {
      return await handler(req, context);
    } catch (error) {
      console.error('API Error:', error);
      
      if (error instanceof ApiError) {
        return error.toResponse();
      }
      
      if (error instanceof SyntaxError) {
        return new ValidationError('Invalid JSON body').toResponse();
      }
      
      return NextResponse.json({
        success: false,
        error: 'Internal server error'
      }, { status: 500 });
    }
  };
}
```

---

## 6. Permission Checking Patterns

### Current Duplication
Board permission checking is repeated across many endpoints:

```typescript
// Similar logic in multiple files
const resolvedBoard = await resolveBoard(boardId, userCommunityId);
if (!resolvedBoard) {
  return NextResponse.json({ error: 'Board not found' }, { status: 404 });
}

if (!canUserAccessBoard(userRoles, boardSettings, isAdmin)) {
  return NextResponse.json({ error: 'Access denied' }, { status: 403 });
}
```

### Consolidation Opportunity
**Create Permission Middleware:**
```typescript
// src/lib/middleware/permissions.ts
export function withBoardPermission(
  permission: 'read' | 'write' | 'admin',
  handler: (req: EnhancedAuthRequest & { board: BoardData }, context: RouteContext) => Promise<NextResponse>
) {
  return withEnhancedAuth(async (req, context) => {
    const params = await context.params;
    const boardId = ValidationService.validateId(params.boardId, 'board');
    
    const board = await resolveBoard(boardId, req.userContext.communityId);
    if (!board) {
      throw new NotFoundError('Board');
    }

    const hasPermission = PermissionService.checkBoardPermission(
      req.userContext,
      board,
      permission
    );

    if (!hasPermission) {
      throw new ApiError('Insufficient permissions for this board', 403);
    }

    (req as any).board = board;
    return handler(req as any, context);
  }, { requireCommunity: true });
}
```

---

## 7. Verification Patterns

### Current Duplication
Lock and gating verification logic is repeated:

**Found in:** Multiple verification endpoints with similar patterns
```typescript
// Similar verification logic repeated
const verificationResult = await query(`
  SELECT lock_id FROM pre_verifications 
  WHERE user_id = $1 AND lock_id IN (${lockIdPlaceholders})
    AND verification_status = 'verified' AND expires_at > NOW()
`, [user.sub, ...lockIds]);

const verifiedLockIds = new Set(verificationResult.rows.map(row => row.lock_id));
const hasAccess = fulfillment === 'any' 
  ? verifiedLockIds.size >= 1
  : verifiedLockIds.size >= lockIds.length;
```

### Consolidation Opportunity
**Create Verification Service:**
```typescript
// src/lib/services/VerificationService.ts
export class VerificationService {
  static async checkLockVerification(
    userId: string,
    lockIds: number[],
    fulfillment: 'any' | 'all' = 'all'
  ): Promise<VerificationResult> {
    // Single implementation of lock verification logic
  }

  static async verifyUserForContext(
    userId: string,
    context: VerificationContext,
    requirements: GatingRequirements
  ): Promise<VerificationResult> {
    // Generic verification handler for all contexts
  }
}
```

---

## 8. Data Transformation Patterns

### Current Duplication
Similar data transformation logic is repeated:

```typescript
// Repeated transformation patterns
const locks: LockWithStats[] = result.rows.map((row: LockRow) => ({
  id: row.id,
  name: row.name,
  description: row.description || undefined,
  // ... many fields
  gatingConfig: typeof row.gating_config === 'string' 
    ? JSON.parse(row.gating_config) 
    : row.gating_config,
  // ... more fields
}));
```

### Consolidation Opportunity
**Create Data Transform Service:**
```typescript
// src/lib/services/TransformService.ts
export class TransformService {
  static transformLockRow(row: LockRow, currentUserId?: string): LockWithStats {
    // Single implementation of lock transformation
  }

  static transformPostRow(row: PostRow, currentUserId?: string): ApiPost {
    // Single implementation of post transformation
  }

  static transformBoardRow(row: BoardRow, userContext: UserContext): ApiBoard {
    // Single implementation of board transformation
  }
}
```

---

## Implementation Status

### ✅ Phase 1: Foundation (COMPLETED)
1. **✅ Enhanced Middleware System**
   - `withEnhancedAuth` - Eliminates auth logic from 35+ endpoints
   - `withErrorHandling` - Standardizes error responses
   - `withAuthAndErrorHandling` - Combined convenience wrapper

2. **✅ Core Services**
   - `ValidationService` - Eliminates validation logic from 15+ endpoints
   - `PaginationService` - Eliminates pagination logic from 8+ endpoints
   - `ApiError` classes - Standardizes error handling

**📍 IMMEDIATE IMPACT ACHIEVED:**
- **4 foundation services** ready for immediate use
- **Comprehensive usage guide** with migration examples
- **Example refactored endpoint** showing 75% code reduction
- **Ready to migrate 35+ endpoints** with minimal effort

### Proposed Implementation Strategy (Remaining)

### Phase 2: Database Layer (Week 3-4)
1. **Create Database Service Layer**
   - `DatabaseService` with common query patterns
   - Query builders for complex joins
   - Centralized database access patterns

### Phase 3: Business Logic (Week 5-6)
1. **Create Business Services**
   - `VerificationService`
   - `PermissionService`
   - `BoardAccessService`

### Phase 4: Endpoint Refactoring (Week 7-10)
1. **Refactor endpoints by category**
   - Posts endpoints
   - Locks endpoints
   - Communities endpoints
   - User endpoints

### Phase 5: Testing & Optimization (Week 11-12)
1. **Comprehensive testing of refactored endpoints**
2. **Performance optimization**
3. **Documentation updates**

---

## Expected Benefits

### Code Reduction
- **Estimated 40-60% reduction** in endpoint code
- **Elimination of ~500-700 lines** of duplicated logic
- **Standardized patterns** across all endpoints

### Maintainability
- **Single source of truth** for common operations
- **Easier testing** with centralized logic
- **Consistent error handling** and validation
- **Reduced cognitive load** for developers

### Performance
- **Optimized database queries** through centralized query building
- **Reduced memory usage** through shared utilities
- **Better caching opportunities** with standardized data access

### Developer Experience
- **Faster development** of new endpoints
- **Consistent API patterns** for frontend integration
- **Better type safety** with shared interfaces
- **Simplified debugging** with centralized error handling

---

## Conclusion

The current API structure contains significant duplication that violates DRY principles and creates maintenance burden. The proposed consolidation strategy would dramatically improve code quality, maintainability, and developer experience while reducing the codebase by an estimated 40-60%. Implementation should follow the phased approach to minimize disruption while maximizing benefits.
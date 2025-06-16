# Major TODOs Specification - Lock System Evolution

## Executive Summary

This document specifies three critical enhancements to the lock system that will complete the transition from legacy gating to a comprehensive, flexible lock-based architecture:

1. **Preview Generation Fix**: Update metadata generation to work with the new lock-based gating system
2. **Multi-Lock Support**: Enable boards and posts to use multiple locks with flexible fulfillment logic
3. **Require-All Logic**: Add support for cumulative requirement fulfillment within locks

## Current State Analysis

### Database Schema
- **Posts**: `settings` JSONB + `lock_id` INTEGER (optional FK to locks table)
- **Boards**: `settings` JSONB (role-based permissions only)
- **Locks**: `gating_config` JSONB (categories with requireAny default)
- **Communities**: `settings` JSONB (role-based permissions only)

### Current Gating Flow
```
Post Creation → Lock Selection → Lock Applied → Verification Required
```

### Current Limitations
1. **Preview System**: Still expects legacy `settings.responsePermissions` format
2. **Single Lock**: Posts can only reference one lock via `lock_id`
3. **Require-Any Only**: Locks always use `requireAny: true` logic
4. **Board Limitations**: Boards only support role-based gating, not lock-based

## 1. Preview Generation Fix

### Problem Analysis
The current preview generation system (`src/utils/metadataUtils.ts`, `/api/posts/[postId]/metadata`) expects gating information in `posts.settings.responsePermissions` but the new system stores it in `locks.gating_config`.

### Current Preview Flow
```
Post Request → Fetch Post → Extract settings.responsePermissions → Generate Privacy-Aware Metadata
```

### Required New Flow
```
Post Request → Fetch Post + Lock → Extract lock.gating_config → Generate Privacy-Aware Metadata
```

### Implementation Strategy

#### A. Enhanced Metadata API
**File**: `src/app/api/posts/[postId]/metadata/route.ts`

```typescript
interface EnhancedPostMetadata extends PostMetadata {
  gatingContext: {
    communityGated: boolean;
    boardGated: boolean;
    postGated: boolean;
    lockGated: boolean; // NEW
    lockInfo?: {
      id: number;
      name: string;
      description?: string;
      categories: GatingCategory[];
      requireAll: boolean;
    };
    // ... existing fields
  };
}

export async function GET(request: Request, { params }: { params: { postId: string } }) {
  // Fetch post with lock information
  const postQuery = `
    SELECT p.*, l.id as lock_id, l.name as lock_name, l.description as lock_description, 
           l.gating_config, b.settings as board_settings, c.settings as community_settings
    FROM posts p
    LEFT JOIN locks l ON p.lock_id = l.id
    LEFT JOIN boards b ON p.board_id = b.id
    LEFT JOIN communities c ON b.community_id = c.id
    WHERE p.id = $1
  `;
  
  const result = await query(postQuery, [postId]);
  const post = result.rows[0];
  
  // Determine gating context
  const gatingContext = {
    communityGated: hasRoleRestrictions(post.community_settings),
    boardGated: hasRoleRestrictions(post.board_settings),
    postGated: hasLegacyGating(post.settings), // Legacy support
    lockGated: !!post.lock_id,
    lockInfo: post.lock_id ? {
      id: post.lock_id,
      name: post.lock_name,
      description: post.lock_description,
      categories: post.gating_config?.categories || [],
      requireAll: post.gating_config?.requireAll || false
    } : undefined
  };
  
  return NextResponse.json({ ...post, gatingContext });
}
```

#### B. Enhanced Description Generation
**File**: `src/utils/metadataUtils.ts`

```typescript
export function generateGatingDescription(gatingContext: GatingContext): string {
  const parts: string[] = [];
  
  if (gatingContext.communityGated) {
    parts.push("Community access required");
  }
  
  if (gatingContext.boardGated) {
    parts.push("Board access required");
  }
  
  if (gatingContext.lockGated && gatingContext.lockInfo) {
    const lock = gatingContext.lockInfo;
    const categoryCount = lock.categories.length;
    
    if (categoryCount === 1) {
      const category = lock.categories[0];
      parts.push(getCategoryDisplayName(category));
    } else if (categoryCount > 1) {
      const logic = lock.requireAll ? "all" : "any";
      parts.push(`${logic} of ${categoryCount} requirements`);
    }
  }
  
  if (gatingContext.postGated) {
    parts.push("Legacy gating active"); // Fallback
  }
  
  return parts.length > 0 ? `🔒 ${parts.join(" • ")}` : "";
}

function getCategoryDisplayName(category: GatingCategory): string {
  switch (category.type) {
    case 'universal_profile':
      return "Universal Profile required";
    case 'ethereum_profile':
      return "Ethereum wallet required";
    default:
      return "Verification required";
  }
}
```

#### C. Enhanced OG Image Generation
**File**: `src/app/api/og-image/route.tsx`

Add lock-aware visual indicators to OG images:
- Lock icon overlay for gated content
- Category-specific icons (UP logo, Ethereum logo)
- "Requires X of Y" text for multi-category locks

## 2. Multi-Lock Support

### Problem Analysis
Currently, posts can only reference one lock via `lock_id`. This limits flexibility for complex gating scenarios where multiple independent locks might be needed.

### Proposed Architecture: Settings-Based Multi-Lock

Instead of database schema changes, leverage the existing `settings` JSONB column to store multiple lock references with flexible logic.

#### A. Enhanced Settings Schema

```typescript
interface PostSettings {
  // Legacy support
  responsePermissions?: {
    upGating?: UPGatingConfig;
    categories?: GatingCategory[];
    requireAll?: boolean;
  };
  
  // NEW: Multi-lock support
  lockGating?: {
    locks: Array<{
      lockId: number;
      weight?: number; // For weighted requirements (future)
    }>;
    fulfillmentMode: 'any' | 'all' | 'weighted'; // How locks must be satisfied
    minimumLocks?: number; // For 'any' mode: minimum number to satisfy
  };
}

interface BoardSettings {
  permissions?: {
    allowedRoles?: string[];
  };
  
  // NEW: Board-level lock gating
  lockGating?: {
    locks: Array<{
      lockId: number;
    }>;
    fulfillmentMode: 'any' | 'all';
  };
}
```

#### B. Implementation Benefits

1. **No Schema Changes**: Uses existing JSONB columns
2. **Backward Compatibility**: `lock_id` FK remains for single-lock posts
3. **Flexible Logic**: Support any/all/weighted fulfillment
4. **Board Support**: Boards can now use lock-based gating
5. **Migration Path**: Gradual transition from single to multi-lock

#### C. Multi-Lock Resolution Logic

```typescript
async function resolvePostGating(post: Post): Promise<GatingRequirement[]> {
  const requirements: GatingRequirement[] = [];
  
  // 1. Legacy single lock (highest priority)
  if (post.lock_id) {
    const lock = await fetchLock(post.lock_id);
    requirements.push({
      type: 'lock',
      lockId: post.lock_id,
      categories: lock.gating_config.categories,
      requireAll: lock.gating_config.requireAll
    });
  }
  
  // 2. Multi-lock settings
  if (post.settings.lockGating?.locks) {
    for (const lockRef of post.settings.lockGating.locks) {
      const lock = await fetchLock(lockRef.lockId);
      requirements.push({
        type: 'lock',
        lockId: lockRef.lockId,
        categories: lock.gating_config.categories,
        requireAll: lock.gating_config.requireAll,
        weight: lockRef.weight
      });
    }
  }
  
  // 3. Legacy direct gating (lowest priority)
  if (post.settings.responsePermissions?.categories) {
    requirements.push({
      type: 'direct',
      categories: post.settings.responsePermissions.categories,
      requireAll: post.settings.responsePermissions.requireAll
    });
  }
  
  return requirements;
}
```

#### D. Board Multi-Lock Support

```typescript
// Enhanced board access checking
async function canUserAccessBoard(
  user: User,
  board: Board
): Promise<{ canAccess: boolean; reason?: string }> {
  // 1. Role-based access (existing)
  if (board.settings.permissions?.allowedRoles) {
    const hasRole = user.roles.some(role => 
      board.settings.permissions.allowedRoles.includes(role)
    );
    if (!hasRole) {
      return { canAccess: false, reason: 'Missing required role' };
    }
  }
  
  // 2. Lock-based access (NEW)
  if (board.settings.lockGating?.locks) {
    const lockResults = await Promise.all(
      board.settings.lockGating.locks.map(lockRef => 
        verifyUserAgainstLock(user, lockRef.lockId)
      )
    );
    
    const fulfillmentMode = board.settings.lockGating.fulfillmentMode;
    const passedLocks = lockResults.filter(result => result.passed).length;
    
    if (fulfillmentMode === 'all' && passedLocks < lockResults.length) {
      return { canAccess: false, reason: 'Must satisfy all board locks' };
    }
    
    if (fulfillmentMode === 'any' && passedLocks === 0) {
      return { canAccess: false, reason: 'Must satisfy at least one board lock' };
    }
  }
  
  return { canAccess: true };
}
```

## 3. Require-All Logic Enhancement

### Problem Analysis
Current locks always use `requireAny: true` logic, meaning users only need to satisfy one category. There's no way to require users to satisfy ALL categories within a lock.

### Current Lock Structure
```json
{
  "categories": [
    {"type": "universal_profile", "requirements": {...}},
    {"type": "ethereum_profile", "requirements": {...}}
  ],
  "requireAny": true  // Always true currently
}
```

### Enhanced Lock Structure
```json
{
  "categories": [
    {"type": "universal_profile", "requirements": {...}},
    {"type": "ethereum_profile", "requirements": {...}}
  ],
  "requireAll": false,  // NEW: Explicit require-all flag
  "requireAny": true,   // Kept for backward compatibility
  "fulfillmentMode": "any" | "all" | "weighted"  // Future: More complex logic
}
```

### Implementation Strategy

#### A. Lock Creation UI Enhancement

**File**: `src/components/locks/LockCreationModal.tsx`

```typescript
// Add fulfillment mode selection to lock creation
const FulfillmentModeSelector: React.FC<{
  value: 'any' | 'all';
  onChange: (mode: 'any' | 'all') => void;
  categoryCount: number;
}> = ({ value, onChange, categoryCount }) => {
  if (categoryCount <= 1) return null; // No choice for single category
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Requirement Fulfillment</CardTitle>
        <CardDescription>
          How should users satisfy the {categoryCount} categories above?
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup value={value} onValueChange={onChange}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="any" id="any" />
            <Label htmlFor="any">
              <strong>Any One</strong> - Users must satisfy at least one category
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="all" id="all" />
            <Label htmlFor="all">
              <strong>All Categories</strong> - Users must satisfy every category
            </Label>
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );
};
```

#### B. Verification Logic Enhancement

**File**: `src/app/api/posts/[postId]/comments/route.ts`

```typescript
async function verifyMultiCategoryGatingRequirements(
  challenge: VerificationChallenge,
  postSettings: PostSettings
): Promise<{ valid: boolean; error?: string }> {
  const categories = SettingsUtils.getGatingCategories(postSettings);
  
  if (categories.length === 0) {
    return { valid: true };
  }

  // Enhanced logic: support both requireAll and requireAny
  const requireAll = postSettings.responsePermissions?.requireAll || false;
  const requireAny = postSettings.responsePermissions?.requireAny ?? true;
  
  const results = await Promise.all(
    categories.map(category => verifyCategoryRequirements(challenge, category))
  );
  
  const passedCount = results.filter(r => r.valid).length;
  const totalCount = results.length;
  
  if (requireAll && passedCount < totalCount) {
    const failedCategories = results
      .filter(r => !r.valid)
      .map(r => r.categoryType)
      .join(', ');
    return { 
      valid: false, 
      error: `Must satisfy ALL categories. Failed: ${failedCategories}` 
    };
  }
  
  if (requireAny && passedCount === 0) {
    return { 
      valid: false, 
      error: 'Must satisfy at least ONE category' 
    };
  }
  
  return { valid: true };
}
```

#### C. UI Verification Enhancement

**File**: `src/components/gating/MultiCategoryConnection.tsx`

```typescript
// Enhanced UI to show require-all vs require-any logic
export const MultiCategoryConnection: React.FC<Props> = ({ postSettings }) => {
  const categories = SettingsUtils.getGatingCategories(postSettings);
  const requireAll = postSettings.responsePermissions?.requireAll || false;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Shield className="h-4 w-4 mr-2" />
          Verification Required
        </CardTitle>
        <CardDescription>
          {requireAll ? (
            <span className="text-orange-600 font-medium">
              ⚠️ You must satisfy ALL {categories.length} requirements below
            </span>
          ) : (
            <span className="text-blue-600">
              ✓ You must satisfy ANY ONE of the {categories.length} requirements below
            </span>
          )}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {categories.map((category, index) => (
          <div key={category.type} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">
                {requireAll ? `${index + 1}.` : '•'} {getCategoryDisplayName(category)}
              </h4>
              <CategoryStatusBadge category={category} />
            </div>
            {/* Category-specific connection UI */}
          </div>
        ))}
        
        <OverallVerificationStatus 
          categories={categories}
          requireAll={requireAll}
        />
      </CardContent>
    </Card>
  );
};
```

## Migration Strategy

### Phase 1: Preview Generation Fix (Immediate)
1. Update metadata API to fetch lock information
2. Enhance description generation for lock-based gating
3. Update OG image generation with lock indicators
4. Test with existing single-lock posts

### Phase 2: Require-All Logic (Week 1)
1. Add `requireAll` flag to lock creation UI
2. Update verification logic to support both modes
3. Enhance commenter-side UI to show fulfillment requirements
4. Update lock preview to demonstrate require-all behavior

### Phase 3: Multi-Lock Foundation (Week 2)
1. Define enhanced settings schemas
2. Create multi-lock resolution utilities
3. Update post creation UI to support multiple locks
4. Implement board-level lock gating

### Phase 4: Multi-Lock UI (Week 3)
1. Build multi-lock selection interface
2. Create fulfillment mode selectors
3. Update verification flows for multi-lock scenarios
4. Add comprehensive testing

## Risk Assessment

### Low Risk
- **Preview Generation**: Isolated change, backward compatible
- **Require-All Logic**: Additive feature, doesn't break existing

### Medium Risk
- **Multi-Lock Settings**: Complex logic, needs thorough testing
- **Board Lock Gating**: New concept, requires UI/UX validation

### Mitigation Strategies
1. **Feature Flags**: Roll out multi-lock support gradually
2. **Backward Compatibility**: Maintain support for all existing patterns
3. **Comprehensive Testing**: Unit tests for all fulfillment modes
4. **User Education**: Clear documentation and examples

## Success Metrics

### Technical Metrics
- All existing posts maintain correct preview generation
- Lock verification performance remains under 500ms
- Multi-lock resolution accuracy: 99.9%

### User Experience Metrics
- Lock creation completion rate
- User understanding of require-all vs require-any
- Board-level gating adoption rate

## Conclusion

These three enhancements will complete the evolution from legacy gating to a comprehensive lock system:

1. **Preview Fix**: Ensures social media previews work correctly with locks
2. **Multi-Lock Support**: Enables complex gating scenarios for boards and posts
3. **Require-All Logic**: Provides cumulative requirement fulfillment

The settings-based approach for multi-lock support avoids database schema changes while providing maximum flexibility. The require-all logic adds essential functionality for high-security scenarios. Together, these changes create a production-ready lock system that can handle any gating requirement. 
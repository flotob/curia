# Board-Level Lock Gating - Research & Implementation Specification

## 🎯 Implementation Status Update - January 15, 2025

**✅ PHASE 3 COMPLETE: Admin Interface & Management**

We have successfully implemented the board-level lock gating admin interface ahead of schedule! 

**What's Complete:**
- ✅ **Database Schema Extensions** - `BoardLockGating` interface and validation utilities  
- ✅ **BoardLockGatingForm Component** - Complete multi-lock configuration UI with fulfillment modes
- ✅ **Board Settings Integration** - Seamlessly integrated into existing board settings page
- ✅ **API Validation** - Extended board creation/update endpoints with lock validation
- ✅ **Multi-Lock Support** - Full ANY/ALL fulfillment logic and custom verification durations

**Key Features Delivered:**
- Professional 3-view UI: Summary → Configure → Browse Locks
- Visual lock cards with add/remove functionality
- Progressive disclosure and auto-save capabilities  
- Perfect integration with existing role-based permissions
- Theme support and mobile responsiveness

**Next Priority:** Phase 2 (UI Foundation) - Board access status component and user verification flows

---

## Executive Summary

This document specifies the implementation of lock-based gating for boards, introducing a multi-lock architecture that provides fine-grained write access control while maintaining existing role-based visibility controls. This represents a strategic evolution from single-lock post gating to a more sophisticated multi-lock board gating system.

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Core Concepts & Design Philosophy](#core-concepts--design-philosophy)
3. [Multi-Lock Architecture](#multi-lock-architecture)
4. [User Experience Flows](#user-experience-flows)
5. [Verification Duration Strategy](#verification-duration-strategy)
6. [Comment Behavior Design](#comment-behavior-design)
7. [Edge Cases & Complex Scenarios](#edge-cases--complex-scenarios)
8. [API Design & Data Flow](#api-design--data-flow)
9. [Database Schema Evolution](#database-schema-evolution)
10. [Security & Performance Considerations](#security--performance-considerations)
11. [Migration & Rollout Strategy](#migration--rollout-strategy)
12. [Future Extensibility](#future-extensibility)
13. [Implementation Phases](#implementation-phases)

---

## Current State Analysis

### Existing Gating Systems

**1. Board Role Gating (Visibility Control)**
- **Location**: `boards.settings.permissions.allowedRoles[]`
- **Function**: Controls who can SEE the board
- **Behavior**: Invisible boards don't appear in board lists
- **Implementation**: `canUserAccessBoard()` function
- **Admin Override**: Admins see all boards for management

**2. Post Lock Gating (Write Control)**
- **Location**: `posts.lock_id` → `locks.gating_config`
- **Function**: Controls who can COMMENT on posts
- **Behavior**: Users see post but need verification to comment
- **Duration**: 30-minute verification window
- **Implementation**: Pre-verification system with expiry

**3. Legacy Post Response Gating**
- **Location**: `posts.settings.responsePermissions`
- **Function**: Direct UP gating configuration
- **Status**: Being migrated to lock system

### Gap Analysis

**Missing: Board Write Access Control**
- Users can see boards but cannot control who posts in them
- No blockchain-based verification for board participation
- No persistent verification for board-level activities
- No multi-lock combination capabilities

---

## Core Concepts & Design Philosophy

### Separation of Concerns

**Role Gating = Visibility Control**
- Controls whether user can SEE the board
- Based on Common Ground roles/permissions
- Managed by community administrators
- Binary access (visible/invisible)

**Lock Gating = Write Access Control**
- Controls whether user can POST in the board
- Based on blockchain verification requirements
- Configured by board creators
- Graduated access based on verification completion

### Design Principles

1. **Visibility ≠ Write Access**: Users can see locked boards but need verification to contribute
2. **Progressive Disclosure**: Show requirements clearly before forcing verification
3. **Persistent Verification**: Board verifications last longer than post verifications
4. **Hierarchical Control**: Board locks set minimum requirements, post locks can add more
5. **Multi-Lock Support**: Boards can require multiple complementary verification types
6. **Graceful Degradation**: System works with or without lock gating

---

## Multi-Lock Architecture

### Schema Design

```typescript
interface BoardSettings {
  permissions?: {
    // Existing role-based visibility control
    allowedRoles?: string[];
    
    // NEW: Multi-lock write access control
    locks?: {
      lockIds: number[];                    // Array of required locks
      fulfillment: 'any' | 'all';         // Require ANY lock OR ALL locks
      verificationDuration?: number;       // Override default duration (hours)
    };
  };
  
  // Future extensibility
  writePermissions?: {
    requireBoardVerification?: boolean;    // Board-level verification required
    inheritPostLocks?: boolean;           // Whether post locks add to board locks
    allowedWriteRoles?: string[];         // Role-based write control (separate from visibility)
  };
}
```

### Example Configurations

**Token Gating Only**
```json
{
  "permissions": {
    "locks": {
      "lockIds": [123],
      "fulfillment": "any",
      "verificationDuration": 4
    }
  }
}
```

**Multi-Lock Requirement**
```json
{
  "permissions": {
    "allowedRoles": ["member", "contributor"],
    "locks": {
      "lockIds": [123, 456, 789],
      "fulfillment": "all",
      "verificationDuration": 6
    }
  }
}
```

**Role + Lock Hybrid**
```json
{
  "permissions": {
    "allowedRoles": ["verified"],
    "locks": {
      "lockIds": [123, 456],
      "fulfillment": "any",
      "verificationDuration": 2
    }
  }
}
```

---

## User Experience Flows

### Flow 1: Discovering a Locked Board

1. **Board Visibility Check**
   - User role validated against `allowedRoles`
   - If fail → Board not shown in lists
   - If pass → Board shown with lock indicators

2. **Board Access**
   - User clicks on board
   - Board loads showing posts (read access granted)
   - Lock requirements displayed prominently
   - "Verify to Post" button visible

3. **Verification UI**
   - Multi-lock verification panel
   - Shows fulfillment mode ("Complete ANY 1 of 3" vs "Complete ALL 3")
   - Individual lock verification buttons
   - Progress tracking for multi-lock scenarios

### Flow 2: Posting in a Locked Board

1. **Write Action Trigger**
   - User clicks "New Post" in locked board
   - System checks board verification status
   - If unverified → Show verification requirements
   - If verified → Allow post creation

2. **Verification Process**
   - Multi-lock verification similar to post gating
   - Longer duration (default 4 hours vs 30 minutes)
   - Persistent across board sessions

3. **Post Creation**
   - Standard post creation flow
   - Board lock verification carries forward
   - Post-specific locks (if any) add additional requirements

### Flow 3: Commenting in a Locked Board

1. **Comment Trigger**
   - User attempts to comment on post in locked board
   - System checks both board AND post verification
   - Hierarchical requirement validation

2. **Verification Logic**
   - Board locks are MINIMUM requirement
   - Post locks are ADDITIONAL requirements
   - User must satisfy both to comment

---

## Verification Duration Strategy

### Current System Limitations

**Post Verifications (30 minutes)**
- Designed for one-off comment interactions
- Short duration prevents abuse
- Forces re-verification for extended sessions

**Board Verification Requirements**
- Users participate in boards over longer sessions
- Multiple posts/comments in single session
- Need balance between security and UX

### Proposed Duration Schema

```typescript
interface VerificationDurations {
  post: number;      // 30 minutes (existing)
  board: number;     // 4 hours (new default)
  custom?: number;   // Board-specific override
}
```

**Duration Tiers**
- **Post-level**: 30 minutes (unchanged)
- **Board-level**: 4 hours (default)
- **Custom**: Board creators can set 1-24 hours
- **Security**: Admin-defined maximums per community

**Implementation Considerations**
- Separate verification tables for different resource types
- Cleanup jobs for expired verifications
- User notification before expiry
- Graceful re-verification flow

---

## Comment Behavior Design

### Hierarchical Verification Model

**Principle**: Board locks establish MINIMUM requirements for any activity in the board

```
Board Lock Requirements (Minimum)
    ↓
Post Lock Requirements (Additional)
    ↓
Final Verification Needed
```

### Verification Logic

```typescript
function getRequiredVerifications(boardId: number, postId?: number) {
  const boardLocks = getBoardLocks(boardId);
  const postLocks = postId ? getPostLocks(postId) : [];
  
  return {
    boardVerifications: boardLocks,
    postVerifications: postLocks,
    totalRequired: [...boardLocks, ...postLocks],
    hierarchical: true
  };
}
```

### Comment Scenarios

**Scenario 1: Board + Post Both Locked**
- User needs board verification (4 hours)
- User needs post verification (30 minutes)  
- Both must be valid to comment

**Scenario 2: Board Locked, Post Unlocked**
- User needs only board verification
- Board verification sufficient for commenting

**Scenario 3: Board Unlocked, Post Locked**
- User needs only post verification
- Standard post gating behavior

**Scenario 4: Both Unlocked**
- No verification required
- Standard commenting flow

### User Experience for Comments

```typescript
interface CommentRequirements {
  canComment: boolean;
  boardVerificationNeeded: boolean;
  postVerificationNeeded: boolean;
  boardVerificationValid: boolean;
  postVerificationValid: boolean;
  requiredActions: string[];
}
```

---

## Edge Cases & Complex Scenarios

### Lock Modification During Active Sessions

**Problem**: User verified for board, then admin modifies board locks

**Solutions**:
1. **Graceful Degradation**: Existing verifications remain valid until expiry
2. **Immediate Invalidation**: Force re-verification for all users
3. **Hybrid**: New locks apply only to new verifications

**Recommendation**: Graceful degradation with notification

### Cross-Board Comment Scenarios

**Problem**: User comments on post that appears in multiple boards

**Current Reality**: Posts belong to single boards, but shareable via links

**Solution**: Verification based on originating board, not viewing context

### Lock Deletion Handling

**Problem**: Board references deleted lock

**Solutions**:
1. **Cascade Delete**: Remove lock reference from board settings
2. **Graceful Fallback**: Ignore missing locks, continue with remaining
3. **Admin Notification**: Alert board admins of missing locks

**Recommendation**: Graceful fallback + admin notification

### Admin Override Behavior

**Levels of Override**:
1. **Community Admin**: Can bypass all gating in their community
2. **Board Moderator**: Can bypass board locks but not role restrictions
3. **Post Author**: Cannot override board locks for their own posts

### Performance Edge Cases

**Large Multi-Lock Boards**
- Boards with 10+ locks require multiple verification checks
- Database query optimization needed
- Caching strategy for frequent access patterns

**High-Traffic Verification**
- Multiple users verifying simultaneously
- Rate limiting on verification endpoints
- Batch verification processing

---

## API Design & Data Flow

### New API Endpoints

```typescript
// Board verification status
GET /api/boards/{boardId}/verification-status
POST /api/boards/{boardId}/verify

// Board lock management
GET /api/boards/{boardId}/locks
PUT /api/boards/{boardId}/locks
POST /api/boards/{boardId}/locks/{lockId}
DELETE /api/boards/{boardId}/locks/{lockId}

// Extended verification endpoints
POST /api/pre-verify/board/{boardId}/{categoryType}
GET /api/verification-status?boardId={boardId}&postId={postId}
```

### Modified API Endpoints

```typescript
// Enhanced board access checking
GET /api/boards -> includes lock verification status
GET /api/posts?boardId={boardId} -> checks board write permissions
POST /api/posts -> validates board lock requirements
POST /api/comments -> validates hierarchical lock requirements
```

### Verification Data Flow

```typescript
interface BoardVerificationRequest {
  boardId: number;
  lockIds: number[];
  fulfillmentMode: 'any' | 'all';
  durationType: 'default' | 'custom';
  customDuration?: number;
}

interface BoardVerificationResponse {
  canWrite: boolean;
  verifications: {
    lockId: number;
    verified: boolean;
    expiresAt: string;
    requiresAction: boolean;
  }[];
  fulfillmentStatus: {
    required: number;
    completed: number;
    sufficient: boolean;
  };
}
```

---

## Database Schema Evolution

### Board Settings Extension

```sql
-- Current boards table already has settings jsonb column
-- New structure:
{
  "permissions": {
    "allowedRoles": ["admin", "member"],
    "locks": {
      "lockIds": [123, 456],
      "fulfillment": "any",
      "verificationDuration": 4
    }
  }
}
```

### Enhanced Pre-Verifications Table

```sql
-- Add resource_type to handle both posts and boards
ALTER TABLE pre_verifications 
ADD COLUMN resource_type VARCHAR(20) DEFAULT 'post' NOT NULL;

-- Add board_id for board verifications
ALTER TABLE pre_verifications 
ADD COLUMN board_id INTEGER;

-- Update constraints
ALTER TABLE pre_verifications 
ADD CONSTRAINT pre_verifications_board_id_fkey 
FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE;

-- New unique constraint for board verifications
CREATE UNIQUE INDEX pre_verifications_unique_user_board_category 
ON pre_verifications (user_id, board_id, category_type)
WHERE resource_type = 'board';
```

### Lock Usage Tracking

```sql
-- Update lock_stats view to include board usage
CREATE OR REPLACE VIEW lock_stats AS 
SELECT l.id,
  l.name,
  l.community_id,
  l.creator_user_id,
  l.is_template,
  l.is_public,
  l.usage_count,
  l.success_rate,
  l.avg_verification_time,
  COUNT(DISTINCT p.id) AS posts_using_lock,
  COUNT(DISTINCT b.id) AS boards_using_lock,
  l.created_at,
  l.updated_at
FROM locks l
LEFT JOIN posts p ON (p.lock_id = l.id)
LEFT JOIN boards b ON (b.settings->'permissions'->'locks'->>'lockIds' @> CAST(l.id AS TEXT))
GROUP BY l.id;
```

---

## Security & Performance Considerations

### Security Threats

**1. Verification Bypass Attempts**
- Client-side verification manipulation
- Expired verification exploitation
- Cross-board verification reuse

**Mitigations**:
- Server-side verification validation
- Cryptographic challenge signatures
- Resource-specific verification scoping

**2. DoS via Complex Lock Combinations**
- Boards with excessive lock requirements
- Computationally expensive verification chains
- Rapid verification request spamming

**Mitigations**:
- Lock count limits per board
- Rate limiting on verification endpoints
- Async verification processing

### Performance Optimizations

**1. Database Query Patterns**

```sql
-- Efficient board access checking with locks
SELECT b.*, 
  COALESCE(
    JSONB_ARRAY_LENGTH(b.settings->'permissions'->'locks'->'lockIds'), 
    0
  ) as lock_count
FROM boards b 
WHERE b.community_id = $1 
  AND (
    b.settings->'permissions'->>'allowedRoles' IS NULL 
    OR b.settings->'permissions'->'allowedRoles' @> $2::jsonb
  );
```

**2. Caching Strategy**
- Board lock configurations (Redis, 1-hour TTL)
- User verification status (Redis, TTL matches verification expiry)
- Lock metadata (Application cache, invalidate on lock updates)

**3. Batch Operations**
- Bulk verification status checking
- Batch lock requirement fetching
- Parallel verification processing

---

## Migration & Rollout Strategy

### Phase 1: Foundation (Week 1-2)

**Database Schema**
- Extend pre_verifications table for board support
- Update lock_stats view for board usage tracking
- Create indexes for efficient board lock queries

**Basic API Implementation**
- Board verification status endpoint
- Board lock management endpoints
- Extended verification endpoint support

### Phase 2: Core Functionality (Week 3-4)

**Verification Engine**
- Multi-lock verification processing
- Duration management system
- Hierarchical verification logic (board + post)

**Admin Interface**
- Board lock selection UI
- Multi-lock configuration panel
- Verification duration settings

### Phase 3: User Experience (Week 5-6)

**User-Facing UI**
- Board lock indicators
- Multi-lock verification panels
- Progressive verification flows

**Enhanced Features**
- Lock requirement previews
- Verification status persistence
- Graceful error handling

### Phase 4: Optimization & Polish (Week 7-8)

**Performance Optimization**
- Query optimization and indexing
- Caching implementation
- Batch processing capabilities

**Advanced Features**
- Custom verification durations
- Lock requirement templates
- Analytics and reporting

### Rollout Strategy

**1. Feature Flags**
- Board lock gating disabled by default
- Community-level opt-in for beta testing
- Gradual rollout based on feedback

**2. Backward Compatibility**
- Existing role-based board gating unchanged
- Optional lock gating layered on top
- No breaking changes to existing APIs

**3. Migration Path**
- No existing data migration required
- New boards can immediately use lock gating
- Existing boards can opt-in via settings

---

## Future Extensibility

### Advanced Lock Combinations

**Conditional Logic**
```json
{
  "permissions": {
    "locks": {
      "requirements": [
        {
          "condition": "OR",
          "locks": [123, 456]  // Token OR Social
        },
        {
          "condition": "AND", 
          "locks": [789]       // AND Identity
        }
      ]
    }
  }
}
```

**Time-Based Locks**
```json
{
  "permissions": {
    "locks": {
      "lockIds": [123],
      "schedule": {
        "activeHours": "09:00-17:00",
        "timezone": "UTC",
        "days": ["MON", "TUE", "WED", "THU", "FRI"]
      }
    }
  }
}
```

### Cross-Board Lock Inheritance

**Community Lock Templates**
```json
{
  "communitySettings": {
    "defaultBoardLocks": {
      "lockIds": [100],  // Community membership lock
      "inherited": true,
      "overridable": false
    }
  }
}
```

### Advanced Verification Types

**Progressive Verification**
- Initial verification for basic posting
- Enhanced verification for pinning/moderating
- Time-based verification escalation

**Social Reputation Integration**
- Verification based on board participation history
- Community-specific reputation requirements
- Cross-community reputation portability

---

## User Interface Design & Placement Strategy

### UI Placement Analysis

**Option 1: Sidebar Enhancement**
- **Pros**: Persistent visibility, doesn't affect main content layout
- **Cons**: Hidden on mobile by default, limited space for verification details
- **Verdict**: Supplementary indicators only

**Option 2: Mobile Header Integration** 
- **Pros**: Always visible on mobile, space-efficient
- **Cons**: Very limited space, desktop users might miss it
- **Verdict**: Status indicator only, not primary interface

**Option 3: Top of Board Content (Expandable)**
- **Pros**: Highly visible on all devices, progressive disclosure, contextually relevant
- **Cons**: Takes vertical space when expanded
- **Verdict**: **PRIMARY CHOICE** - Best balance of visibility and functionality

### Board Access Status Component

**Component Architecture**
```typescript
interface BoardAccessStatusProps {
  board: ApiBoard;
  userVerificationStatus: BoardVerificationStatus;
  onVerificationStart: () => void;
  onExpand: (expanded: boolean) => void;
  theme: 'light' | 'dark';
}

interface BoardVerificationStatus {
  canRead: boolean;
  canWrite: boolean;
  roleAccess: boolean;
  lockAccess: {
    required: boolean;
    verified: boolean;
    partiallyVerified: boolean;
    expired: boolean;
    locks: LockVerificationStatus[];
  };
  hierarchicalRequirements?: {
    boardLocks: Lock[];
    futurePostLocks: boolean;  // Whether posts might have additional locks
  };
}
```

### Visual Design System

**Color Coding Strategy**
```typescript
const ACCESS_STATES = {
  FULL_ACCESS: {
    color: 'emerald',        // Green - can read & write
    bgClass: 'bg-emerald-50 dark:bg-emerald-950',
    borderClass: 'border-emerald-200 dark:border-emerald-800',
    textClass: 'text-emerald-800 dark:text-emerald-200',
    iconColor: 'text-emerald-600 dark:text-emerald-400'
  },
  PARTIAL_ACCESS: {
    color: 'amber',          // Yellow - can read, limited write
    bgClass: 'bg-amber-50 dark:bg-amber-950',
    borderClass: 'border-amber-200 dark:border-amber-800', 
    textClass: 'text-amber-800 dark:text-amber-200',
    iconColor: 'text-amber-600 dark:text-amber-400'
  },
  READ_ONLY: {
    color: 'red',            // Red - read only, verification required
    bgClass: 'bg-red-50 dark:bg-red-950',
    borderClass: 'border-red-200 dark:border-red-800',
    textClass: 'text-red-800 dark:text-red-200', 
    iconColor: 'text-red-600 dark:text-red-400'
  },
  NO_ACCESS: {
    color: 'slate',          // Gray - no access (shouldn't normally show)
    bgClass: 'bg-slate-50 dark:bg-slate-950',
    borderClass: 'border-slate-200 dark:border-slate-800',
    textClass: 'text-slate-800 dark:text-slate-200',
    iconColor: 'text-slate-600 dark:text-slate-400'
  }
} as const;
```

### Component States & Responsive Design

**Collapsed State (Default)**
```tsx
<div className={cn(
  "mx-4 md:mx-6 lg:mx-8 mb-6 rounded-xl border transition-all duration-200 hover:shadow-md",
  ACCESS_STATES[accessState].bgClass,
  ACCESS_STATES[accessState].borderClass
)}>
  <div className="p-4 flex items-center justify-between">
    {/* Left: Status indicator with icon */}
    <div className="flex items-center space-x-3">
      <div className={cn(
        "p-2 rounded-lg",
        accessState === 'FULL_ACCESS' && "bg-emerald-100 dark:bg-emerald-900",
        accessState === 'PARTIAL_ACCESS' && "bg-amber-100 dark:bg-amber-900", 
        accessState === 'READ_ONLY' && "bg-red-100 dark:bg-red-900"
      )}>
        {getAccessIcon(accessState)}
      </div>
      
      <div>
        <h3 className={cn("font-medium text-sm", ACCESS_STATES[accessState].textClass)}>
          {getAccessTitle(accessState)}
        </h3>
        <p className={cn("text-xs opacity-75", ACCESS_STATES[accessState].textClass)}>
          {getAccessDescription(accessState)}
        </p>
      </div>
    </div>

    {/* Right: Action button + expand toggle */}
    <div className="flex items-center space-x-2">
      {accessState === 'READ_ONLY' && (
        <Button size="sm" variant="outline" onClick={onVerificationStart}>
          Verify to Post
        </Button>
      )}
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setExpanded(!expanded)}
        className="p-1"
      >
        <ChevronDown className={cn(
          "h-4 w-4 transition-transform",
          expanded && "rotate-180"
        )} />
      </Button>
    </div>
  </div>
</div>
```

**Expanded State (Detailed Info)**
```tsx
{expanded && (
  <div className="px-4 pb-4 border-t border-opacity-20">
    {/* Board Lock Requirements */}
    {boardLocks.length > 0 && (
      <div className="mt-4 space-y-3">
        <h4 className="font-medium text-sm">Board Requirements</h4>
        <div className="space-y-2">
          {boardLocks.map((lock) => (
            <LockRequirementCard 
              key={lock.id}
              lock={lock}
              verificationStatus={getVerificationStatus(lock.id)}
              onVerify={() => handleLockVerification(lock.id)}
            />
          ))}
        </div>
        
        {/* Fulfillment Mode Indicator */}
        <div className="text-xs opacity-75">
          Complete {fulfillmentMode === 'any' ? 'ANY 1' : 'ALL'} of {boardLocks.length} requirements
        </div>
      </div>
    )}

    {/* Future Post Requirements Notice */}
    {futurePostLocks && (
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start space-x-2">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-800 dark:text-blue-200">Additional Verification May Be Required</p>
            <p className="text-blue-700 dark:text-blue-300 text-xs mt-1">
              Individual posts in this board may have their own requirements beyond these board-level ones.
            </p>
          </div>
        </div>
      </div>
    )}

    {/* Verification Duration Info */}
    {isVerified && (
      <div className="mt-4 text-xs opacity-75">
        Verification valid for {verificationDuration} hours • Expires {expiryTime}
      </div>
    )}
  </div>
)}
```

### Mobile-Specific Adaptations

**Responsive Breakpoints**
- **Mobile (< 768px)**: Full-width component, larger touch targets
- **Tablet (768px - 1024px)**: Slight margins, condensed layout
- **Desktop (> 1024px)**: Full layout with hover effects

**Mobile Optimizations**
```tsx
// Mobile-specific styling
const mobileClasses = {
  container: "mx-3 mb-4 sm:mx-4 sm:mb-6",
  padding: "p-3 sm:p-4", 
  text: "text-sm sm:text-base",
  buttons: "text-sm px-3 py-1.5 sm:px-4 sm:py-2",
  spacing: "space-x-2 sm:space-x-3"
};

// Touch-friendly interaction
const handleTouchInteraction = (e: TouchEvent) => {
  // Prevent double-tap zoom on verification buttons
  e.preventDefault();
  // Handle touch-specific verification flow
};
```

### Integration with Existing Components

**Sidebar Enhancement**
```tsx
// Add lock indicators to board names in sidebar
{board.settings?.permissions?.locks && (
  <div className="flex items-center space-x-1 ml-2">
    <Lock className="h-3 w-3 text-amber-500" />
    {isVerifiedForBoard(board.id) ? (
      <CheckCircle className="h-3 w-3 text-emerald-500" />
    ) : (
      <AlertCircle className="h-3 w-3 text-red-500" />
    )}
  </div>
)}
```

**Mobile Header Integration**
```tsx
// Show lock status in mobile header when in locked board
{currentBoard?.settings?.permissions?.locks && (
  <div className="ml-2">
    {isVerifiedForBoard(currentBoard.id) ? (
      <CheckCircle className="h-4 w-4 text-emerald-500" />
    ) : (
      <Lock className="h-4 w-4 text-amber-500" />
    )}
  </div>
)}
```

### Accessibility Considerations

**Screen Reader Support**
```tsx
<div 
  role="region"
  aria-label={`Board access control: ${getAccessTitle(accessState)}`}
  aria-expanded={expanded}
>
  <div 
    role="button"
    tabIndex={0}
    aria-describedby="board-access-description"
    onKeyDown={handleKeyDown}
  >
    {/* Status content */}
  </div>
  
  <div id="board-access-description" className="sr-only">
    {getDetailedAccessDescription(accessState)}
  </div>
</div>
```

**Keyboard Navigation**
- Space/Enter: Toggle expanded state
- Tab: Navigate between verification buttons
- Esc: Collapse if expanded

### Animation & Transitions

**Micro-interactions**
```css
.board-access-transition {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.verification-success {
  animation: pulseGreen 0.6s ease-in-out;
}

@keyframes pulseGreen {
  0%, 100% { background-color: rgb(34 197 94 / 0.1); }
  50% { background-color: rgb(34 197 94 / 0.2); }
}
```

### Component Hierarchy & Data Flow

**Board Page Structure**
```tsx
<BoardPage>
  <BoardAccessStatusComponent />  {/* NEW: Top of content */}
  <BoardHeader />
  <PostsList />
  <CreatePostButton />  {/* Disabled if no write access */}
</BoardPage>
```

**State Management**
```typescript
// Board verification context
const BoardVerificationProvider = ({ children, boardId }: Props) => {
  const [verificationStatus, setVerificationStatus] = useState<BoardVerificationStatus>();
  const [isVerifying, setIsVerifying] = useState(false);
  
  const refreshVerificationStatus = useCallback(() => {
    // Fetch current verification status
  }, [boardId]);
  
  return (
    <BoardVerificationContext.Provider value={{
      verificationStatus,
      isVerifying,
      refreshVerificationStatus,
      startVerification,
      handleVerificationComplete
    }}>
      {children}
    </BoardVerificationContext.Provider>
  );
};
```

## Implementation Phases - Updated Roadmap

### Phase 1: Foundation & Database (2 weeks)

**Week 1: Database Schema & Backend Foundation**
- [ ] Extend pre_verifications table for board support (resource_type, board_id)
- [ ] Create board verification indexes for performance
- [ ] Update lock_stats view to include board usage tracking
- [ ] Write database migration scripts with rollback support
- [ ] Create new board verification API endpoints structure

**Week 2: Core API Implementation**
- [ ] Board verification status endpoint (`GET /api/boards/{boardId}/verification-status`)
- [ ] Board lock management endpoints for CRUD operations
- [ ] Enhanced verification endpoints with multi-lock support
- [ ] Multi-lock verification algorithm with fulfillment modes
- [ ] Duration management system (4-hour default, custom overrides)

### Phase 2: UI Foundation & Components (2 weeks)

**Week 3: Core UI Components**
- [ ] **BoardAccessStatusComponent** - Main expandable component
- [ ] **LockRequirementCard** - Individual lock verification UI
- [ ] **BoardVerificationProvider** - React context for state management
- [ ] Color-coded access states system (green/yellow/red)
- [ ] Mobile-responsive design with touch-friendly interactions

**Week 4: Integration & User Flows**
- [ ] Integrate BoardAccessStatus into board page layout
- [ ] Sidebar lock indicators for board names
- [ ] Mobile header lock status integration
- [ ] Verification flow modals and progressive disclosure
- [ ] Error handling and loading states

### Phase 3: Admin Interface & Management ✅ **COMPLETED**

**Week 5: Board Lock Management UI** ✅
- [x] Enhanced board settings page with lock selection
- [x] Multi-lock configuration panel with fulfillment modes
- [x] Custom verification duration settings
- [x] Lock requirement preview and testing interface
- [ ] Board lock usage analytics and reporting

**Week 6: Advanced Features** (Future Enhancement)
- [ ] Lock template system for common board configurations
- [ ] Bulk board lock management for admins
- [ ] Lock performance metrics and optimization suggestions
- [ ] Advanced lock combination builder
- [ ] Import/export lock configurations

### Phase 4: Verification Engine & Logic (2 weeks)

**Week 7: Multi-Lock Processing Engine**
- [ ] Hierarchical verification logic (board + post requirements)
- [ ] Fulfillment mode algorithms (ANY/ALL lock combinations)
- [ ] Board verification duration management and expiry handling
- [ ] Cross-board verification state management
- [ ] Admin override functionality with proper audit trails

**Week 8: Integration & Edge Cases**
- [ ] Post creation permission integration with board locks
- [ ] Comment permission integration with hierarchical requirements
- [ ] Lock modification during active sessions handling
- [ ] Deleted lock graceful fallback mechanisms
- [ ] Performance optimization for multi-lock scenarios

### Phase 5: Polish, Testing & Launch (2 weeks)

**Week 9: Performance & Security**
- [ ] Database query optimization and indexing
- [ ] Redis caching implementation for verification states
- [ ] Rate limiting and security hardening
- [ ] Load testing with simulated multi-lock scenarios
- [ ] API response time optimization (<200ms target)

**Week 10: Launch Preparation**
- [ ] Feature flag implementation for gradual rollout
- [ ] Comprehensive documentation and user guides
- [ ] Beta testing with select communities and feedback collection
- [ ] Accessibility testing and WCAG compliance verification
- [ ] Production deployment with monitoring and rollback plans

### Enhanced Delivery Timeline

**Total Duration**: 10 weeks (vs original 8 weeks)
**Reasoning**: Added dedicated UI development phase and more thorough testing

**Critical Path Priorities**:
1. **Weeks 1-2**: Backend foundation enables all subsequent work
2. **Weeks 3-4**: UI components enable user-facing functionality
3. **Weeks 5-6**: Admin interface enables board creators to configure locks
4. **Weeks 7-8**: Verification engine enables complete functionality
5. **Weeks 9-10**: Polish and launch ensure production readiness

**Risk Mitigation**:
- Feature flags allow safe production deployment
- Database migrations are reversible
- UI components are modular and independently testable
- API endpoints maintain backward compatibility

**Success Criteria per Phase**:
- **Phase 1**: All board verification APIs return correct data
- **Phase 2**: BoardAccessStatusComponent renders correctly on all devices
- **Phase 3**: Board admins can configure multi-lock requirements
- **Phase 4**: Users can verify against board locks and post in locked boards
- **Phase 5**: System handles production load with <200ms response times

---

## Success Metrics

### Technical Metrics
- **Verification Success Rate**: >95% for valid users
- **API Response Time**: <200ms for verification status checks
- **Database Performance**: <50ms for board access queries
- **Error Rate**: <1% for verification operations

### User Experience Metrics  
- **Board Lock Adoption**: 25% of boards use lock gating within 3 months
- **User Verification Completion**: >80% completion rate for started verifications
- **Session Persistence**: Average verification lasts 3+ hours
- **User Satisfaction**: >4.5/5 rating for verification experience

### Business Impact Metrics
- **Community Engagement**: Increase in quality posts on locked boards
- **Creator Satisfaction**: Board creators report better content curation
- **Platform Differentiation**: Unique blockchain-gated community features
- **Revenue Potential**: Foundation for premium community features

---

## Conclusion

Board-level lock gating represents a significant evolution in community access control, moving from simple role-based visibility to sophisticated blockchain-verified participation requirements. The multi-lock architecture provides immediate value while establishing a foundation for future innovations in decentralized community governance.

The hierarchical verification model (board + post) creates intuitive user experiences while maintaining security and flexibility. By implementing this system thoughtfully, we can provide communities with powerful tools for creating exclusive, verified spaces while preserving the open nature of traditional discussion boards.

The phased implementation approach ensures stability and allows for iterative improvement based on real-world usage patterns and community feedback. 
# Shared Boards Implementation Roadmap

## Overview

**Shared Boards** is a powerful enhancement to the Community Partnerships system that allows partner communities to share their non-role-gated boards with each other. This enables cross-community collaboration while maintaining security through the existing lock-based verification system.

## Current System Analysis

### 1. **Partnership System Foundation** ✅ 
The partnership system is well-established with:
- Partnership creation, acceptance, rejection flows
- Permission-based partnerships with configurable settings
- Real-time partnership notifications
- Cross-community navigation utilities
- Partnership widgets in sidebar and presence systems

### 2. **Board Permission Architecture** ✅
- **Role-based visibility**: Boards can be restricted to specific community roles via `settings.permissions.allowedRoles`
- **Lock-based write access**: Boards can require blockchain verification via `settings.permissions.locks`
- **Filtering system**: `filterAccessibleBoards()` and `canUserAccessBoard()` functions exist
- **Admin override**: Community admins can access all boards regardless of restrictions

### 3. **Lock System Compatibility** ✅
- Locks work **across communities** - blockchain verification is universal
- Lock verification endpoints support community-agnostic usage
- Cross-community verification already functional in post context

### 4. **Navigation Infrastructure** ✅
- Cross-community navigation system exists (`useCrossCommunityNavigation`)
- URL building utilities with parameter preservation
- Context-aware routing for different verification scenarios

## Feature Requirements

### Core Functionality
1. **Admin-only shared board creation interface** - Button in left sidebar
2. **Partner community board browser** - Similar to board creation page
3. **Board filtering** - Show only non-role-gated boards from partners
4. **Separate sidebar section** - "Shared Boards" with clear organization
5. **Cross-community access** - Load shared boards as if they were local
6. **Clear context indication** - Right sidebar shows source community
7. **Lock compatibility** - Existing lock system works seamlessly

### User Experience
- **Intuitive discovery**: Admins can easily browse and add shared boards
- **Clear separation**: Shared boards are visually distinct from local boards
- **Contextual awareness**: Users always know they're viewing content from another community
- **Seamless interaction**: Shared boards feel native but with appropriate attribution

## Implementation Roadmap

### **Phase 1: Data Model & API Foundation** 🎯

#### 1.1 Database Schema
```sql
-- New table to track which boards are shared by each community
CREATE TABLE "shared_boards" (
    "id" SERIAL PRIMARY KEY,
    "source_community_id" TEXT NOT NULL,
    "target_community_id" TEXT NOT NULL, 
    "board_id" INTEGER NOT NULL,
    "shared_by_user_id" TEXT NOT NULL,
    "shared_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN DEFAULT TRUE,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure a board can only be shared once per community pair
    CONSTRAINT "unique_shared_board" UNIQUE ("source_community_id", "target_community_id", "board_id"),
    
    -- Foreign key constraints
    CONSTRAINT "shared_boards_source_community_fkey" FOREIGN KEY ("source_community_id") REFERENCES communities("id") ON DELETE CASCADE,
    CONSTRAINT "shared_boards_target_community_fkey" FOREIGN KEY ("target_community_id") REFERENCES communities("id") ON DELETE CASCADE,
    CONSTRAINT "shared_boards_board_fkey" FOREIGN KEY ("board_id") REFERENCES boards("id") ON DELETE CASCADE,
    CONSTRAINT "shared_boards_shared_by_fkey" FOREIGN KEY ("shared_by_user_id") REFERENCES users("user_id") ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX "idx_shared_boards_target_community" ON "shared_boards" ("target_community_id", "is_active");
CREATE INDEX "idx_shared_boards_source_community" ON "shared_boards" ("source_community_id", "is_active");
CREATE INDEX "idx_shared_boards_board" ON "shared_boards" ("board_id");
```

#### 1.2 API Endpoints

**GET /api/communities/[communityId]/shared-boards/available**
- Returns all non-role-gated boards from partner communities
- Includes board metadata, source community info, partnership status
- Filtered by active partnerships only

**POST /api/communities/[communityId]/shared-boards**
- Creates a new shared board relationship
- Admin-only endpoint
- Validates partnership exists and board eligibility

**GET /api/communities/[communityId]/shared-boards**
- Returns all shared boards accessible to current community
- Includes full board details plus source community context

**DELETE /api/communities/[communityId]/shared-boards/[sharedBoardId]**
- Removes shared board relationship
- Admin-only endpoint

#### 1.3 TypeScript Interfaces
```typescript
interface SharedBoard {
  id: number;
  sourceCommunityId: string;
  targetCommunityId: string;
  boardId: number;
  sharedByUserId: string;
  sharedAt: string;
  isActive: boolean;
  
  // Populated via joins
  board: ApiBoard;
  sourceCommunity: {
    id: string;
    name: string;
    logoUrl?: string;
    communityShortId?: string;
    pluginId?: string;
  };
  partnership: CommunityPartnership;
}

interface AvailableSharedBoard {
  board: ApiBoard;
  sourceCommunity: {
    id: string;
    name: string;
    logoUrl?: string;
  };
  partnership: CommunityPartnership;
  isAlreadyShared: boolean;
}
```

### **Phase 2: Board Browser & Selection Interface** 🎯

#### 2.1 Shared Board Creation Page
**Route**: `/create-shared-board`

**Component Structure**:
```
CreateSharedBoardPage
├── PartnerCommunitySelector
│   ├── CommunityCard (with logos, partnership status)
│   └── BoardList (filtered for non-role-gated boards)
├── SelectedBoardsPreview
└── CreateSharedBoardForm
```

**Key Features**:
- Browse all partner communities with accepted partnerships
- Show boards that are NOT role-gated (public to all community members)
- Filter out boards that are already shared
- Show board descriptions, post counts, last activity
- Multi-select interface for bulk sharing
- Preview selected boards before confirmation

#### 2.2 Board Filtering Logic
```typescript
function filterShareableBoards(boards: ApiBoard[]): ApiBoard[] {
  return boards.filter(board => {
    // Only include boards without role restrictions
    const hasRoleGating = SettingsUtils.hasPermissionRestrictions(board.settings);
    return !hasRoleGating;
  });
}
```

#### 2.3 Partnership Validation
- Only show communities with `status: 'accepted'` partnerships
- Check partnership permissions for cross-community board sharing
- Validate admin permissions in source community

### **Phase 3: Sidebar Integration** 🎯

#### 3.1 Left Sidebar Enhancement
**Location**: After "Create Board" button, before admin section

```tsx
{/* Shared Boards Section */}
{user?.isAdmin && hasSharedBoards && (
  <div className="pt-6 pb-2">
    <h3 className="px-3 text-xs font-semibold uppercase tracking-wider mb-3">
      Shared Boards
    </h3>
    <div className="space-y-1">
      {sharedBoardsList.map((sharedBoard) => (
        <SharedBoardLink 
          key={sharedBoard.id}
          sharedBoard={sharedBoard}
          isActive={currentBoardId === sharedBoard.board.id.toString()}
          theme={theme}
        />
      ))}
    </div>
  </div>
)}

{/* Add Shared Board Link - Admin Only */}
{user?.isAdmin && (
  <Link
    href={buildUrl('/create-shared-board')}
    className="admin-action-link"
  >
    <Plus size={16} />
    <span>+ Shared Board</span>
  </Link>
)}
```

#### 3.2 Shared Board Link Component
```tsx
const SharedBoardLink = ({ sharedBoard, isActive, theme }) => (
  <Link
    href={buildSharedBoardUrl(sharedBoard)}
    className={cn("shared-board-link", { active: isActive })}
  >
    <div className="shared-board-icon">
      <LayoutDashboard size={16} />
      {/* Source community indicator */}
      <CommunityBadge community={sharedBoard.sourceCommunity} />
    </div>
    <span className="board-name">{sharedBoard.board.name}</span>
    <span className="source-indicator">
      from {sharedBoard.sourceCommunity.name}
    </span>
  </Link>
);
```

### **Phase 4: Cross-Community Board Loading** 🎯

#### 4.1 URL Routing Strategy
**Current**: `/?boardId=123&communityId=abc`
**Enhanced**: `/?boardId=123&communityId=abc&sourceBoard=shared:456`

#### 4.2 Board Data Loading
```typescript
// Enhanced board fetching logic
const { data: currentBoard } = useQuery({
  queryKey: ['board', currentBoardId, isSharedBoard],
  queryFn: async () => {
    if (isSharedBoard) {
      // Load shared board with source community context
      return authFetchJson<SharedBoardDetails>(
        `/api/communities/${user.cid}/shared-boards/${sharedBoardId}`,
        { token }
      );
    } else {
      // Load local board normally
      return authFetchJson<ApiBoard>(
        `/api/communities/${user.cid}/boards/${currentBoardId}`,
        { token }
      );
    }
  },
  enabled: !!currentBoardId && !!token
});
```

#### 4.3 Post Loading for Shared Boards
```typescript
// Posts API enhancement for shared boards
const { data: posts } = useQuery({
  queryKey: ['posts', currentBoardId, isSharedBoard],
  queryFn: async () => {
    if (isSharedBoard) {
      // Load posts from source community
      return authFetchJson<ApiPost[]>(
        `/api/communities/${sourceBoard.sourceCommunityId}/boards/${sourceBoard.boardId}/posts`,
        { token }
      );
    } else {
      // Load posts normally
      return authFetchJson<ApiPost[]>(`/api/posts?boardId=${currentBoardId}`, { token });
    }
  }
});
```

### **Phase 5: Context Indication & Right Sidebar** 🎯

#### 5.1 Right Sidebar Enhancement
```tsx
// Enhanced ContextualNavigationCard
{isSharedBoard && (
  <Card className="border-l-4 border-l-blue-500">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-blue-500" />
        Shared Board
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={sourceBoard.sourceCommunity.logoUrl} />
          <AvatarFallback>{sourceBoard.sourceCommunity.name[0]}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{sourceBoard.sourceCommunity.name}</p>
          <p className="text-xs text-muted-foreground">
            Partnership • {sourceBoard.board.name}
          </p>
        </div>
      </div>
      
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => navigateToSourceCommunity()}
        className="w-full mt-3"
      >
        <ExternalLink className="h-3 w-3 mr-1" />
        Visit Source Community
      </Button>
    </CardContent>
  </Card>
)}
```

#### 5.2 Visual Indicators
- **Board title prefix**: "📋 Board Name (from Community Name)"
- **Header context**: Breadcrumb showing source community
- **Subtle styling**: Different border color or background tint
- **Lock compatibility**: All existing lock verification works seamlessly

### **Phase 6: Security & Permissions** 🎯

#### 6.1 Access Control Validation
```typescript
// Enhanced board access checking for shared boards
export async function canUserAccessSharedBoard(
  userId: string,
  sharedBoardId: number,
  userCommunityId: string
): Promise<boolean> {
  // 1. Verify user's community has access to this shared board
  const sharedBoard = await getSharedBoard(sharedBoardId);
  if (sharedBoard.targetCommunityId !== userCommunityId) {
    return false;
  }
  
  // 2. Verify partnership is still active
  const partnership = await getPartnership(
    sharedBoard.sourceCommunityId, 
    sharedBoard.targetCommunityId
  );
  if (partnership.status !== 'accepted') {
    return false;
  }
  
  // 3. Verify board is still shareable (not role-gated)
  const sourceBoard = await getBoard(sharedBoard.boardId);
  const hasRoleGating = SettingsUtils.hasPermissionRestrictions(sourceBoard.settings);
  if (hasRoleGating) {
    return false; // Board became role-gated after sharing
  }
  
  return true;
}
```

#### 6.2 Lock Verification Compatibility
- **No changes needed**: Existing lock system works across communities
- **Context routing**: Verification endpoints use community-agnostic lock IDs
- **Permission inheritance**: Shared board lock requirements apply to all users

### **Phase 7: Management & Administration** 🎯

#### 7.1 Shared Board Management Page
**Route**: `/shared-boards` (admin only)

**Features**:
- List all shared boards (both incoming and outgoing)
- Remove shared board relationships
- View sharing statistics and usage
- Partnership health indicators

#### 7.2 Audit Trail
- Track who shared which boards when
- Monitor cross-community access patterns
- Partnership impact analytics

## Technical Considerations

### 1. **Performance**
- **Caching Strategy**: Cache shared board lists with partnership invalidation
- **Data Loading**: Parallel loading of board data and source community context
- **Query Optimization**: Efficient joins for shared board lookups

### 2. **Security**
- **Partnership Validation**: Always verify active partnerships before access
- **Board State Validation**: Re-check board eligibility on each access
- **Admin Permissions**: Strict admin-only controls for sharing/unsharing

### 3. **User Experience**
- **Clear Context**: Never confuse users about which community they're viewing
- **Seamless Navigation**: Cross-community navigation feels natural
- **Consistent Styling**: Shared boards integrate smoothly with existing UI

### 4. **Data Consistency**
- **Partnership Changes**: Handle partnership suspension/termination gracefully
- **Board Changes**: React to board permission changes in source communities
- **Real-time Updates**: Socket events for shared board changes

## Success Metrics

### 1. **Adoption Metrics**
- Number of shared board relationships created
- Cross-community engagement rates
- Time spent in shared vs local boards

### 2. **Partnership Enhancement**
- Increased partnership utilization
- Stronger cross-community collaboration
- Partnership retention rates

### 3. **User Experience**
- Low confusion rates about board context
- High success rates for cross-community navigation
- Positive feedback on feature discoverability

## Next Steps

### **Immediate (Phase 1)**
1. **Create database migration** for `shared_boards` table
2. **Implement core API endpoints** for shared board CRUD operations
3. **Add TypeScript interfaces** and validation utilities
4. **Write unit tests** for permission checking logic

### **Short-term (Phase 2-3)**
1. **Build shared board creation page** with partnership/board browser
2. **Enhance left sidebar** with shared boards section
3. **Implement board filtering** logic for shareable boards
4. **Add admin controls** for managing shared boards

### **Medium-term (Phase 4-5)**
1. **Enhance board data loading** for cross-community context
2. **Update right sidebar** with source community indication
3. **Implement cross-community posting** and interaction
4. **Add visual indicators** throughout the UI

### **Long-term (Phase 6-7)**
1. **Comprehensive security audit** of cross-community access
2. **Performance optimization** for shared board queries
3. **Analytics dashboard** for partnership utilization
4. **Advanced features** like board synchronization options

## Questions for Discussion

1. **Sharing Granularity**: Should we allow sharing individual posts or only entire boards?
2. **Lock Compatibility**: Any special considerations for cross-community lock verification?
3. **Partnership Permissions**: Should sharing be governed by partnership permission settings?
4. **Board State Changes**: How to handle when a shared board becomes role-gated after sharing?
5. **User Notifications**: Should users be notified when new shared boards become available?

## Conclusion

The Shared Boards feature represents a natural evolution of the partnership system, enabling deeper cross-community collaboration while maintaining security and user experience standards. The implementation leverages existing infrastructure (locks, permissions, navigation) while adding targeted enhancements for cross-community context.

The phased approach ensures stable development with clear milestones, allowing for user feedback and iteration at each stage. The feature will significantly enhance the value proposition of community partnerships and strengthen the network effect of the platform. 
# Board & Community Permissions Roadmap

## Executive Summary

This document outlines the implementation of **multi-level role-based permissions** for both communities and boards, allowing admins to:
1. **Community-level access**: Restrict who can access the entire plugin
2. **Board-level access**: Restrict who can access specific boards within the community

The design prioritizes flexibility for future settings while maintaining security and performance.

## Current System Analysis

### Database Schema
- **Communities Table**: `id`, `name`, `created_at`, `updated_at`
- **Boards Table**: `id`, `community_id`, `name`, `description`, `created_at`, `updated_at`
- **Users Table**: Basic profile sync from Common Ground

### Authentication & Authorization
- **JWT-based plugin auth** with Common Ground integration
- **Role resolution**: User role IDs + Community role definitions → Admin status
- **Admin determination**: Role titles vs `NEXT_PUBLIC_ADMIN_ROLE_IDS` env var
- **API protection**: `withAuth` middleware with admin-only flag

### Current Role Structure (from Common Ground)
```typescript
interface CommunityRole {
  id: string;           // "fb14a7d5-bbda-4257-8809-4229c2a71b0f"
  title: string;        // "CG Core Team", "Admin", "Member", etc.
  type: string;         // "PREDEFINED", "CUSTOM_MANUAL_ASSIGN", etc.
  permissions: string[]; // ["WEBRTC_CREATE", "COMMUNITY_MANAGE_INFO", ...]
  assignmentRules: any | null;
}
```

## Feature Requirements

### 1. Multi-Level Settings Storage
- **Community JSON config**: Plugin-wide access control and settings
- **Board JSON config**: Board-specific access control and settings
- **Hierarchical permissions**: Community access required before board access
- **Future extensibility**: Framework for additional settings at both levels

### 2. Access Control Hierarchy
```
Community Access Check → Board Access Check → Content Access
     ↓                        ↓                   ↓
Plugin Entry              Board Visibility    Posts/Comments
```

- **Community Level**: Can user access the plugin at all?
- **Board Level**: Can user see/interact with specific boards?
- **Default Behavior**: No restrictions (backward compatibility)
- **Admin Override**: Admins always have full access at all levels

### 3. Security Considerations
- **Role validation**: Ensure role IDs exist in community
- **Access enforcement**: Check permissions on all operations
- **Performance**: Efficient role checking without N+1 queries
- **Graceful handling**: If roles change/deleted in Common Ground
- **Audit trail**: Log access attempts and permission changes

## Implementation Plan

### Phase 1: Database Schema Changes

#### Migration 1: Add Community Settings Column
```typescript
// migrations/TIMESTAMP_add-community-settings.ts
export async function up(pgm: MigrationBuilder): Promise<void> {
  // Add JSON settings column to communities table with default empty object
  pgm.addColumn('communities', {
    settings: {
      type: 'jsonb',
      notNull: true,
      default: '{}'
    }
  });

  // Add GIN index for efficient JSON queries
  pgm.createIndex('communities', 'settings', { method: 'gin' });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropIndex('communities', 'settings');
  pgm.dropColumn('communities', 'settings');
}
```

#### Migration 2: Add Board Settings Column
```typescript
// migrations/TIMESTAMP_add-board-settings.ts
export async function up(pgm: MigrationBuilder): Promise<void> {
  // Add JSON settings column to boards table with default empty object
  pgm.addColumn('boards', {
    settings: {
      type: 'jsonb',
      notNull: true,
      default: '{}'
    }
  });

  // Add GIN index for efficient JSON queries
  pgm.createIndex('boards', 'settings', { method: 'gin' });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropIndex('boards', 'settings');
  pgm.dropColumn('boards', 'settings');
}
```

#### Settings Schema Design
```typescript
interface CommunitySettings {
  permissions?: {
    allowedRoles?: string[]; // Role IDs that can access the entire plugin
    // Future: allowedUsers?: string[]; // Individual user overrides
  };
  // Future community-wide settings:
  // branding?: { customTheme: string; logoOverride: string };
  // features?: { enableNotifications: boolean; enableIntegrations: boolean };
  // moderation?: { globalModerationLevel: 'strict' | 'moderate' | 'permissive' };
}

interface BoardSettings {
  permissions?: {
    allowedRoles?: string[]; // Role IDs that can access this board (subset of community access)
    // Future: allowedUsers?: string[]; // Individual user overrides
  };
  // Future board-specific settings:
  // moderation?: { autoModerationLevel: 'strict' | 'moderate' | 'permissive' };
  // notifications?: { emailDigest: boolean; pushNotifications: boolean };
  // appearance?: { theme: string; customCSS: string };
}
```

### Phase 2: API Infrastructure Changes

#### A. Enhanced Type Definitions
```typescript
// src/types/settings.ts
export interface CommunitySettings {
  permissions?: {
    allowedRoles?: string[];
  };
}

export interface BoardSettings {
  permissions?: {
    allowedRoles?: string[];
  };
}

// src/app/api/communities/[communityId]/route.ts
export interface ApiCommunity {
  id: string;
  name: string;
  settings: CommunitySettings;
  created_at: string;
  updated_at: string;
  // Computed fields:
  user_can_access?: boolean;  // Based on current user's roles
}

// src/app/api/communities/[communityId]/boards/route.ts
export interface ApiBoard {
  id: number;
  community_id: string;
  name: string;
  description: string | null;
  settings: BoardSettings;
  created_at: string;
  updated_at: string;
  // Computed fields:
  user_can_access?: boolean;  // Based on current user's roles (after community access)
  user_can_post?: boolean;    // Future: differentiate read vs write
}
```

#### B. Community Access Validation Middleware
```typescript
// src/lib/communityAuth.ts
export interface CommunityAccessRequest extends AuthenticatedRequest {
  communityAccess?: {
    communityId: string;
    canAccess: boolean;
    community: ApiCommunity;
  };
}

export function withCommunityAccess(
  handler: (req: CommunityAccessRequest, context: any) => Promise<NextResponse>,
  requireAccess: boolean = true
) {
  return withAuth(async (req: AuthenticatedRequest, context: any) => {
    const { communityId } = context.params || { communityId: req.user?.cid };
    
    if (!communityId) {
      return NextResponse.json({ error: 'Community ID required' }, { status: 400 });
    }
    
    // Fetch community with settings
    const community = await getCommunityWithSettings(communityId);
    if (!community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    // Check community access permissions
    const userRoles = await getUserRoles(req.user!.sub, communityId);
    const canAccess = await checkCommunityAccess(community, userRoles, req.user!.adm);
    
    if (requireAccess && !canAccess) {
      return NextResponse.json({ 
        error: 'Access denied to this community', 
        code: 'COMMUNITY_ACCESS_DENIED' 
      }, { status: 403 });
    }

    // Augment request with community access info
    const communityReq = req as CommunityAccessRequest;
    communityReq.communityAccess = {
      communityId,
      canAccess,
      community
    };

    return handler(communityReq, context);
  });
}
```

#### C. Enhanced Board Access Validation Middleware
```typescript
// src/lib/boardAuth.ts
export interface BoardAccessRequest extends CommunityAccessRequest {
  boardAccess?: {
    boardId: number;
    canAccess: boolean;
    canPost: boolean;
    board: ApiBoard;
  };
}

export function withBoardAccess(
  handler: (req: BoardAccessRequest, context: any) => Promise<NextResponse>,
  requireAccess: boolean = true
) {
  return withCommunityAccess(async (req: CommunityAccessRequest, context: any) => {
    const { boardId } = context.params;
    
    // Community access already validated by withCommunityAccess
    if (!req.communityAccess?.canAccess) {
      return NextResponse.json({ 
        error: 'Community access required for board access',
        code: 'COMMUNITY_ACCESS_REQUIRED'
      }, { status: 403 });
    }
    
    // Fetch board with settings
    const board = await getBoardWithSettings(boardId);
    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    // Verify board belongs to user's community
    if (board.community_id !== req.communityAccess.communityId) {
      return NextResponse.json({ error: 'Board not found in this community' }, { status: 404 });
    }

    // Check board access permissions (user already has community access)
    const userRoles = await getUserRoles(req.user!.sub, board.community_id);
    const canAccess = await checkBoardAccess(board, userRoles, req.user!.adm);
    
    if (requireAccess && !canAccess) {
      return NextResponse.json({ 
        error: 'Access denied to this board',
        code: 'BOARD_ACCESS_DENIED'
      }, { status: 403 });
    }

    // Augment request with board access info
    const boardReq = req as BoardAccessRequest;
    boardReq.boardAccess = {
      boardId: board.id,
      canAccess,
      canPost: canAccess, // Same for now, differentiate later
      board
    };

    return handler(boardReq, context);
  });
}
```

#### D. Enhanced Role Resolution Service
```typescript
// src/lib/roleService.ts
export async function getUserRoles(userId: string, communityId: string): Promise<string[]> {
  // Cache strategy: Redis/memory cache for role lookups
  // Key: `user_roles:${userId}:${communityId}`
  // TTL: 5-15 minutes
  // Fallback: Re-fetch from Common Ground if needed
  // Return array of role IDs for the user in this community
}

export async function checkCommunityAccess(
  community: ApiCommunity, 
  userRoles: string[], 
  isAdmin: boolean = false
): Promise<boolean> {
  // Admin override - admins always have access
  if (isAdmin) return true;
  
  // No restrictions set - allow all community members
  const allowedRoles = community.settings?.permissions?.allowedRoles;
  if (!allowedRoles || allowedRoles.length === 0) return true;
  
  // Check if user has any allowed role
  return userRoles.some(roleId => allowedRoles.includes(roleId));
}

export async function checkBoardAccess(
  board: ApiBoard, 
  userRoles: string[], 
  isAdmin: boolean = false
): Promise<boolean> {
  // Admin override - admins always have access
  if (isAdmin) return true;
  
  // No restrictions set - allow all who have community access
  const allowedRoles = board.settings?.permissions?.allowedRoles;
  if (!allowedRoles || allowedRoles.length === 0) return true;
  
  // Check if user has any allowed role
  return userRoles.some(roleId => allowedRoles.includes(roleId));
}

export async function validateRoleIds(roleIds: string[], communityId: string): Promise<boolean> {
  // Validate that all role IDs exist in the given community
  // This prevents injection of invalid role IDs
  // Could cache community roles for performance
  const communityRoles = await getCommunityRoles(communityId);
  const validRoleIds = communityRoles.map(role => role.id);
  
  return roleIds.every(roleId => validRoleIds.includes(roleId));
}
```

### Phase 3: API Route Updates

#### A. Enhanced Board Creation/Editing
```typescript
// PATCH /api/communities/[communityId]/boards/[boardId]
export const PATCH = withAuth(async (req: AuthenticatedRequest, context) => {
  const { boardId } = context.params;
  const { name, description, settings } = await req.json();
  
  // Validate settings schema
  if (settings?.permissions?.allowedRoles) {
    await validateRoleIds(settings.permissions.allowedRoles, context.params.communityId);
  }
  
  // Update board with new settings
  const result = await query(
    'UPDATE boards SET name = $1, description = $2, settings = $3, updated_at = NOW() WHERE id = $4 AND community_id = $5 RETURNING *',
    [name, description, JSON.stringify(settings), boardId, context.params.communityId]
  );
  
  return NextResponse.json(result.rows[0]);
}, true); // Admin only
```

#### B. Access-Controlled Post Operations
```typescript
// GET /api/posts?boardId=X - Filter accessible boards
// POST /api/posts - Validate board access before creation
// GET /api/boards/[boardId]/posts - Use withBoardAccess middleware

export const GET = withBoardAccess(async (req: BoardAccessRequest, context) => {
  const { boardId } = context.params;
  
  // User already validated for board access by middleware
  const posts = await query(
    'SELECT * FROM posts WHERE board_id = $1 ORDER BY created_at DESC',
    [boardId]
  );
  
  return NextResponse.json(posts.rows);
});
```

### Phase 4: Frontend Implementation

#### A. Enhanced Board Creation Form
```typescript
// src/components/boards/BoardForm.tsx
interface BoardFormProps {
  mode: 'create' | 'edit';
  board?: ApiBoard;
  onSave: (board: Partial<ApiBoard>) => void;
}

export const BoardForm: React.FC<BoardFormProps> = ({ mode, board, onSave }) => {
  const [settings, setSettings] = useState<BoardSettings>(board?.settings || {});
  const { data: communityRoles } = useQuery(['communityRoles'], fetchCommunityRoles);
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Basic fields */}
      <Input name="name" />
      <Textarea name="description" />
      
      {/* Permissions Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Access Permissions</h3>
        <div className="space-y-2">
          <Label>
            <Checkbox 
              checked={!settings.permissions?.allowedRoles?.length}
              onChange={(checked) => {
                if (checked) {
                  setSettings(prev => ({
                    ...prev,
                    permissions: { ...prev.permissions, allowedRoles: [] }
                  }));
                }
              }}
            />
            Allow all community members
          </Label>
          
          {settings.permissions?.allowedRoles?.length > 0 && (
            <div className="ml-6 space-y-2">
              <Label>Restrict to specific roles:</Label>
              <MultiSelect
                options={communityRoles?.map(role => ({ 
                  value: role.id, 
                  label: role.title 
                }))}
                value={settings.permissions.allowedRoles}
                onChange={(roleIds) => {
                  setSettings(prev => ({
                    ...prev,
                    permissions: { ...prev.permissions, allowedRoles: roleIds }
                  }));
                }}
              />
            </div>
          )}
        </div>
      </div>
      
      <Button type="submit">
        {mode === 'create' ? 'Create Board' : 'Update Board'}
      </Button>
    </form>
  );
};
```

#### B. Board Access Feedback
```typescript
// Enhanced PostCard to show access restrictions
export const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const { user } = useAuth();
  const { data: boardAccess } = useQuery(
    ['boardAccess', post.board_id], 
    () => checkBoardAccess(post.board_id)
  );
  
  if (!boardAccess?.canAccess) {
    return (
      <Card className="opacity-60">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 text-muted-foreground">
            <Lock size={16} />
            <span>This post is in a restricted board</span>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Regular post card rendering...
};
```

#### C. Board Management UI
```typescript
// src/components/boards/BoardSettings.tsx
export const BoardSettings: React.FC<{ boardId: number }> = ({ boardId }) => {
  const { data: board } = useQuery(['board', boardId], () => fetchBoard(boardId));
  const [showPermissions, setShowPermissions] = useState(false);
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{board?.name} Settings</h2>
        <Button variant="outline" onClick={() => setShowPermissions(!showPermissions)}>
          <Settings size={16} className="mr-2" />
          Permissions
        </Button>
      </div>
      
      {showPermissions && (
        <Card>
          <CardHeader>
            <CardTitle>Access Permissions</CardTitle>
            <CardDescription>
              Control who can see and interact with this board
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BoardForm mode="edit" board={board} onSave={handleSave} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};
```

### Phase 5: Navigation & UX Enhancements

#### A. Filtered Board Lists
```typescript
// Only show accessible boards in sidebar
const { data: accessibleBoards } = useQuery(
  ['accessibleBoards', user?.userId], 
  async () => {
    const allBoards = await fetchBoards();
    return allBoards.filter(board => board.user_can_access);
  }
);
```

#### B. Access Denied States
```typescript
// Graceful handling when accessing restricted boards directly
if (boardAccessError?.status === 403) {
  return (
    <div className="text-center py-12">
      <Lock size={48} className="mx-auto text-muted-foreground mb-4" />
      <h2 className="text-xl font-semibold mb-2">Board Access Restricted</h2>
      <p className="text-muted-foreground mb-4">
        You don't have permission to view this board.
      </p>
      <Button asChild>
        <Link href="/">Return to Home</Link>
      </Button>
    </div>
  );
}
```

## Performance Considerations

### 1. Caching Strategy
- **Role lookups**: Cache user roles per community (5-15 min TTL)
- **Board settings**: Cache board configurations (until update)
- **Access checks**: Memoize access validation within request

### 2. Database Optimization
- **JSONB indexing**: GIN index on settings column for efficient queries
- **Role validation**: Batch role existence checks
- **Query optimization**: Join boards + settings in single query

### 3. Security Best Practices
- **Input validation**: Validate all role IDs against community
- **Admin override**: Always allow admin access regardless of settings
- **Audit logging**: Log permission changes and access attempts
- **Rate limiting**: Prevent abuse of role validation endpoints

## Migration & Rollback Strategy

### 1. Backward Compatibility
- **Default settings**: Empty permissions = unrestricted access
- **Existing boards**: Auto-migrate with default unrestricted settings
- **API versioning**: Maintain compatibility during transition

### 2. Rollback Plan
- **Database rollback**: Migration down() removes settings column
- **API fallback**: Graceful degradation if settings invalid/missing
- **Frontend fallback**: Hide permission UI if backend doesn't support

## Future Extensibility

### 1. Additional Permission Types
```typescript
interface BoardSettings {
  permissions?: {
    allowedRoles?: string[];
    allowedUsers?: string[];     // Individual user overrides
    postingRoles?: string[];     // Separate read vs write permissions
    moderatorRoles?: string[];   // Board-specific moderation
  };
  moderation?: {
    autoModerationLevel?: 'strict' | 'moderate' | 'permissive';
    requireApproval?: boolean;
    wordFilter?: string[];
  };
  notifications?: {
    emailDigest?: boolean;
    pushNotifications?: boolean;
    mentionNotifications?: boolean;
  };
  appearance?: {
    theme?: string;
    customCSS?: string;
    bannerImage?: string;
  };
}
```

### 2. Advanced Features Roadmap
- **Time-based restrictions**: Schedule access windows
- **Invitation-only boards**: Generate invite links
- **Board hierarchies**: Parent/child board relationships
- **Cross-community boards**: Multi-community collaboration
- **Custom permissions**: Plugin-specific permission types

## Testing Strategy

### 1. Unit Tests
- Role validation logic
- Access check algorithms  
- Settings schema validation
- Migration up/down operations

### 2. Integration Tests
- API endpoint access control
- Board creation with permissions
- User role changes impact
- Cross-community access prevention

### 3. End-to-End Tests
- Admin creates restricted board
- Non-privileged user access denied
- Role-based board visibility
- Permission changes take effect

## Deployment Checklist

### 1. Pre-deployment
- [ ] Database migration tested in staging
- [ ] Role validation service deployed
- [ ] Cache warming strategy implemented
- [ ] Monitoring/alerting configured

### 2. Deployment
- [ ] Run database migration
- [ ] Deploy API changes
- [ ] Deploy frontend updates
- [ ] Verify cache invalidation

### 3. Post-deployment
- [ ] Verify existing boards accessible
- [ ] Test permission creation/editing
- [ ] Monitor performance metrics
- [ ] Check error rates/logs

---

## Summary

This roadmap provides a comprehensive path to implementing board-level role permissions while maintaining system performance, security, and extensibility. The phased approach allows for incremental development and testing, minimizing risk while delivering significant value to community administrators.

The JSON-based settings storage provides flexibility for future enhancements while the role-based access control integrates seamlessly with Common Ground's existing permission system. 
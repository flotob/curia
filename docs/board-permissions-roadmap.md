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

#### A. Community Settings Management
```typescript
// GET /api/communities/[communityId]
export const GET = withCommunityAccess(async (req: CommunityAccessRequest, context) => {
  // User already validated for community access by middleware
  const community = req.communityAccess!.community;
  
  // Return community with user's access status
  return NextResponse.json({
    ...community,
    user_can_access: req.communityAccess!.canAccess
  });
});

// PATCH /api/communities/[communityId] - Admin only
export const PATCH = withAuth(async (req: AuthenticatedRequest, context) => {
  const { communityId } = context.params;
  const { name, settings } = await req.json();
  
  // Validate user is admin for this community
  if (req.user?.cid !== communityId) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }
  
  // Validate settings schema
  if (settings?.permissions?.allowedRoles) {
    const isValid = await validateRoleIds(settings.permissions.allowedRoles, communityId);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid role IDs provided' }, { status: 400 });
    }
  }
  
  // Update community with new settings
  const result = await query(
    'UPDATE communities SET name = $1, settings = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
    [name, JSON.stringify(settings), communityId]
  );
  
  return NextResponse.json(result.rows[0]);
}, true); // Admin only
```

#### B. Enhanced Board Creation/Editing
```typescript
// GET /api/communities/[communityId]/boards
export const GET = withCommunityAccess(async (req: CommunityAccessRequest, context) => {
  const communityId = context.params.communityId;
  
  try {
    const result = await query(
      'SELECT id, name, description, settings FROM boards WHERE community_id = $1 ORDER BY name ASC',
      [communityId]
    );

    // Check board access for each board and add user_can_access field
    const userRoles = await getUserRoles(req.user!.sub, communityId);
    const boardsWithAccess = await Promise.all(
      result.rows.map(async (board) => {
        const canAccess = await checkBoardAccess(board, userRoles, req.user!.adm);
        return {
          ...board,
          user_can_access: canAccess
        };
      })
    );

    // Filter to only return accessible boards (or show all to admins for management)
    const accessibleBoards = req.user?.adm 
      ? boardsWithAccess 
      : boardsWithAccess.filter(board => board.user_can_access);

    return NextResponse.json(accessibleBoards);
  } catch (error) {
    console.error(`[API] Error fetching boards for community ${communityId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch boards' }, { status: 500 });
  }
});

// PATCH /api/communities/[communityId]/boards/[boardId] - Admin only
export const PATCH = withAuth(async (req: AuthenticatedRequest, context) => {
  const { communityId, boardId } = context.params;
  const { name, description, settings } = await req.json();
  
  // Validate settings schema
  if (settings?.permissions?.allowedRoles) {
    const isValid = await validateRoleIds(settings.permissions.allowedRoles, communityId);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid role IDs provided' }, { status: 400 });
    }
  }
  
  // Update board with new settings
  const result = await query(
    'UPDATE boards SET name = $1, description = $2, settings = $3, updated_at = NOW() WHERE id = $4 AND community_id = $5 RETURNING *',
    [name, description, JSON.stringify(settings), boardId, communityId]
  );
  
  return NextResponse.json(result.rows[0]);
}, true); // Admin only
```

#### C. Access-Controlled Post Operations
```typescript
// GET /api/posts?boardId=X - Filter accessible boards
export const GET = withCommunityAccess(async (req: CommunityAccessRequest, context) => {
  const url = new URL(req.url);
  const boardId = url.searchParams.get('boardId');
  const communityId = req.communityAccess!.communityId;
  
  let postsQuery = 'SELECT p.*, b.name as board_name FROM posts p JOIN boards b ON p.board_id = b.id WHERE b.community_id = $1';
  let queryParams = [communityId];
  
  if (boardId) {
    // Validate board access before showing posts
    const board = await getBoardWithSettings(parseInt(boardId));
    if (board) {
      const userRoles = await getUserRoles(req.user!.sub, communityId);
      const canAccess = await checkBoardAccess(board, userRoles, req.user!.adm);
      
      if (!canAccess) {
        return NextResponse.json({ error: 'Access denied to this board' }, { status: 403 });
      }
      
      postsQuery += ' AND p.board_id = $2';
      queryParams.push(boardId);
    }
  } else {
    // Filter to only accessible boards
    const userRoles = await getUserRoles(req.user!.sub, communityId);
    const accessibleBoards = await getAccessibleBoards(userRoles, communityId, req.user!.adm);
    const boardIds = accessibleBoards.map(board => board.id);
    
    if (boardIds.length === 0) {
      return NextResponse.json({ posts: [], pagination: { currentPage: 1, totalPages: 0, totalPosts: 0, limit: 10 } });
    }
    
    postsQuery += ` AND p.board_id = ANY($2)`;
    queryParams.push(boardIds);
  }
  
  postsQuery += ' ORDER BY p.created_at DESC';
  
  const result = await query(postsQuery, queryParams);
  return NextResponse.json({ posts: result.rows });
});

// POST /api/posts - Validate both community and board access
export const POST = withBoardAccess(async (req: BoardAccessRequest, context) => {
  // User already validated for both community and board access by middleware
  const { title, content, tags, boardId } = await req.json();
  
  // Proceed with post creation - access already verified
  const result = await query(
    'INSERT INTO posts (author_user_id, title, content, tags, board_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [req.user!.sub, title, content, tags || [], boardId]
  );
  
  return NextResponse.json(result.rows[0], { status: 201 });
});
```

### Phase 4: Frontend Implementation

#### A. Community Settings Management
```typescript
// src/components/community/CommunitySettingsForm.tsx
interface CommunitySettingsFormProps {
  community: ApiCommunity;
  onSave: (community: Partial<ApiCommunity>) => void;
}

export const CommunitySettingsForm: React.FC<CommunitySettingsFormProps> = ({ community, onSave }) => {
  const [settings, setSettings] = useState<CommunitySettings>(community?.settings || {});
  const { data: communityRoles } = useQuery(['communityRoles'], fetchCommunityRoles);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Plugin Access Control</CardTitle>
        <CardDescription>
          Control who can access this community's plugin
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
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
              Allow all community members to access the plugin
            </Label>
            
            {settings.permissions?.allowedRoles?.length > 0 && (
              <div className="ml-6 space-y-2">
                <Label>Restrict plugin access to specific roles:</Label>
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
                <div className="text-sm text-muted-foreground">
                  Only users with these roles will be able to access the plugin
                </div>
              </div>
            )}
          </div>
        </div>
        
        <Button onClick={() => onSave({ ...community, settings })}>
          Save Community Settings
        </Button>
      </CardContent>
    </Card>
  );
};
```

#### B. Enhanced Board Creation Form
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
  const { data: communitySettings } = useQuery(['communitySettings'], fetchCommunitySettings);
  
  // Available roles are limited by community-level restrictions
  const availableRoles = useMemo(() => {
    if (!communityRoles) return [];
    
    const communityAllowedRoles = communitySettings?.permissions?.allowedRoles;
    if (!communityAllowedRoles || communityAllowedRoles.length === 0) {
      return communityRoles; // Community allows all roles
    }
    
    // Only show roles that are allowed at community level
    return communityRoles.filter(role => communityAllowedRoles.includes(role.id));
  }, [communityRoles, communitySettings]);
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Basic fields */}
      <Input name="name" />
      <Textarea name="description" />
      
      {/* Permissions Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Board Access Permissions</h3>
        
        {communitySettings?.permissions?.allowedRoles?.length > 0 && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start space-x-2">
              <Info size={16} className="text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100">Community Access Restriction Active</p>
                <p className="text-blue-700 dark:text-blue-300">
                  This community restricts plugin access to specific roles. Board permissions can only further restrict access within those roles.
                </p>
              </div>
            </div>
          </div>
        )}
        
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
            Allow all users with community access
          </Label>
          
          {settings.permissions?.allowedRoles?.length > 0 && (
            <div className="ml-6 space-y-2">
              <Label>Restrict to specific roles:</Label>
              <MultiSelect
                options={availableRoles?.map(role => ({ 
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
                disabled={availableRoles.length === 0}
              />
              {availableRoles.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No additional role restrictions available due to community settings
                </p>
              )}
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

#### C. Access Denied States & Error Handling
```typescript
// src/components/access/CommunityAccessDenied.tsx
export const CommunityAccessDenied: React.FC = () => {
  const { user } = useAuth();
  
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center space-y-6 max-w-md">
        <div className="space-y-4">
          <Lock size={64} className="mx-auto text-muted-foreground" />
          <h1 className="text-2xl font-semibold">Community Access Restricted</h1>
          <p className="text-muted-foreground">
            This community has restricted access to this plugin. You need specific permissions to continue.
          </p>
        </div>
        
        <div className="space-y-3">
          <div className="p-4 bg-muted/50 rounded-lg text-sm">
            <p className="font-medium mb-1">Your Current Status:</p>
            <p>User: {user?.name}</p>
            <p>Community Member: Yes</p>
            <p>Plugin Access: Denied</p>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Please contact a community administrator if you believe you should have access.
          </p>
        </div>
        
        <Button 
          onClick={() => window.location.reload()} 
          variant="outline"
          className="w-full"
        >
          Refresh Page
        </Button>
      </div>
    </div>
  );
};

// src/components/access/BoardAccessDenied.tsx
export const BoardAccessDenied: React.FC<{ boardName?: string }> = ({ boardName }) => {
  return (
    <div className="text-center py-12">
      <Lock size={48} className="mx-auto text-muted-foreground mb-4" />
      <h2 className="text-xl font-semibold mb-2">Board Access Restricted</h2>
      <p className="text-muted-foreground mb-4">
        {boardName 
          ? `You don't have permission to view the "${boardName}" board.`
          : "You don't have permission to view this board."
        }
      </p>
      <p className="text-sm text-muted-foreground mb-6">
        This board is restricted to specific community roles.
      </p>
      <Button asChild>
        <Link href="/">Return to Home</Link>
      </Button>
    </div>
  );
};

// Enhanced error handling in API calls
export const useApiWithAccessHandling = () => {
  const navigate = useNavigate();
  
  const handleApiError = useCallback((error: any) => {
    if (error?.response?.status === 403) {
      const errorCode = error?.response?.data?.code;
      
      switch (errorCode) {
        case 'COMMUNITY_ACCESS_DENIED':
          // Redirect to community access denied page
          navigate('/access-denied/community');
          break;
        case 'BOARD_ACCESS_DENIED':
          // Show board access denied component
          return { showBoardAccessDenied: true };
        default:
          // Generic access denied
          toast.error('Access denied');
      }
    }
    
    return { error };
  }, [navigate]);
  
  return { handleApiError };
};
```

#### D. Enhanced Community Settings Page
```typescript
// src/app/community-settings/page.tsx - Updated to include access control
export default function CommunitySettingsPage() {
  // ... existing code ...
  
  return (
    <div className="space-y-8">
      {/* Existing community overview section */}
      
      {/* New: Community Access Control Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield size={20} />
            Access Control
          </CardTitle>
          <CardDescription>
            Manage who can access this community's plugin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CommunitySettingsForm 
            community={communityInfo} 
            onSave={handleSaveCommunitySettings} 
          />
        </CardContent>
      </Card>
      
      {/* Enhanced: Board Management with Access Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutDashboard size={20} />
            Board Management
          </CardTitle>
          <CardDescription>
            Manage boards and their access permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {boardsList?.map(board => (
              <div key={board.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">{board.name}</h4>
                  <p className="text-sm text-muted-foreground">{board.description}</p>
                  {board.settings?.permissions?.allowedRoles?.length > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <Lock size={12} />
                      <span className="text-xs text-muted-foreground">Access restricted</span>
                    </div>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => openBoardSettings(board.id)}
                >
                  <Settings size={14} className="mr-1" />
                  Settings
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Phase 5: Navigation & UX Enhancements

#### A. Enhanced Authentication Flow
```typescript
// src/components/layout/AppInitializer.tsx
export const AppInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, login } = useAuth();
  const [accessStatus, setAccessStatus] = useState<'loading' | 'granted' | 'community_denied' | 'board_denied'>('loading');
  
  useEffect(() => {
    const checkAccess = async () => {
      if (!isAuthenticated) return;
      
      try {
        // Check community access first
        const communityAccess = await checkCommunityAccess();
        if (!communityAccess.canAccess) {
          setAccessStatus('community_denied');
          return;
        }
        
        setAccessStatus('granted');
      } catch (error) {
        console.error('Access check failed:', error);
        setAccessStatus('community_denied');
      }
    };
    
    checkAccess();
  }, [isAuthenticated, user]);
  
  if (accessStatus === 'loading') {
    return <LoadingScreen />;
  }
  
  if (accessStatus === 'community_denied') {
    return <CommunityAccessDenied />;
  }
  
  return <>{children}</>;
};
```

#### B. Filtered Board Lists & Navigation
```typescript
// Enhanced sidebar to only show accessible boards
const { data: accessibleBoards } = useQuery(
  ['accessibleBoards', user?.userId], 
  async () => {
    // This API call will now handle both community and board level filtering
    const allBoards = await fetchBoards();
    return allBoards.filter(board => board.user_can_access);
  }
);

// Enhanced board navigation with access indicators
export const BoardNavigation: React.FC = () => {
  const { data: boards } = useQuery(['boards'], fetchBoards);
  const { user } = useAuth();
  
  return (
    <div className="space-y-1">
      {boards?.map(board => (
        <div key={board.id} className="relative">
          <Link
            href={`/boards/${board.id}`}
            className={cn(
              "flex items-center justify-between p-2 rounded-lg hover:bg-muted",
              !board.user_can_access && "opacity-50 pointer-events-none"
            )}
          >
            <div className="flex items-center space-x-2">
              <LayoutDashboard size={16} />
              <span>{board.name}</span>
            </div>
            
            {!board.user_can_access && (
              <Lock size={12} className="text-muted-foreground" />
            )}
          </Link>
          
          {!board.user_can_access && user?.isAdmin && (
            <Tooltip content="You can access this as an admin, but regular users cannot">
              <Info size={12} className="absolute top-2 right-6 text-amber-500" />
            </Tooltip>
          )}
        </div>
      ))}
    </div>
  );
};
```

#### C. Progressive Access Feedback
```typescript
// Enhanced PostCard to show multi-level access info
export const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const { user } = useAuth();
  const { data: accessInfo } = useQuery(
    ['postAccess', post.id], 
    () => checkPostAccess(post.id)
  );
  
  if (accessInfo?.communityAccessDenied) {
    return (
      <Card className="opacity-60 border-amber-200">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 text-amber-600">
            <Shield size={16} />
            <span>Community access required</span>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (accessInfo?.boardAccessDenied) {
    return (
      <Card className="opacity-60 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 text-blue-600">
            <Lock size={16} />
            <span>Board "{post.board_name}" access required</span>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Regular post card rendering...
};
```

## Performance Considerations

### 1. Enhanced Caching Strategy
- **Community settings**: Cache per community (30 min TTL, invalidate on update)
- **Board settings**: Cache per board (15 min TTL, invalidate on update)  
- **User roles**: Cache user roles per community (5-15 min TTL)
- **Access computations**: Memoize access validation within request lifecycle
- **Role hierarchy**: Cache community → board role relationships

### 2. Database Optimization
- **JSONB indexing**: GIN indexes on both community and board settings columns
- **Composite queries**: Join communities + boards + settings in single queries
- **Role batch validation**: Validate multiple role IDs in single Common Ground call
- **Access aggregation**: Pre-compute user access for frequently accessed content

### 3. Security Best Practices
- **Hierarchical validation**: Always check community access before board access
- **Input validation**: Validate all role IDs against community at both levels
- **Admin override consistency**: Ensure admin bypass works at all levels
- **Audit logging**: Log permission changes and access attempts at both levels
- **Rate limiting**: Prevent abuse of role validation and access check endpoints
- **Defense in depth**: Multiple validation layers (middleware, business logic, UI)

## Migration & Rollback Strategy

### 1. Enhanced Backward Compatibility
- **Community settings**: Default empty object = unrestricted access (existing behavior)
- **Board settings**: Default empty object = unrestricted access (existing behavior)
- **Hierarchical defaults**: If community restricts access, boards inherit those restrictions
- **API versioning**: Maintain compatibility during transition for both levels
- **Graceful degradation**: System works if either level's settings are invalid

### 2. Multi-Level Rollback Plan
- **Database rollback**: Both migrations have clean down() functions
- **API fallback**: Graceful degradation if settings invalid/missing at either level
- **Frontend fallback**: Hide permission UI if backend doesn't support either level
- **Cache invalidation**: Clear all permission-related cache on rollback
- **Progressive rollout**: Can rollback community OR board level independently

## Future Extensibility

### 1. Enhanced Permission Types
```typescript
interface CommunitySettings {
  permissions?: {
    allowedRoles?: string[];
    allowedUsers?: string[];     // Individual user overrides
    requireMembership?: boolean; // Require active community membership
    guestAccess?: boolean;       // Allow non-members limited access
  };
  features?: {
    enableNotifications?: boolean;
    enableIntegrations?: boolean;
    customBranding?: boolean;
  };
  branding?: {
    customTheme?: string;
    logoOverride?: string;
    customCSS?: string;
  };
  moderation?: {
    globalModerationLevel?: 'strict' | 'moderate' | 'permissive';
    requireApproval?: boolean;
    autoModerationEnabled?: boolean;
  };
}

interface BoardSettings {
  permissions?: {
    allowedRoles?: string[];
    allowedUsers?: string[];     // Individual user overrides
    postingRoles?: string[];     // Separate read vs write permissions
    moderatorRoles?: string[];   // Board-specific moderation
    requireInvite?: boolean;     // Invitation-only boards
  };
  moderation?: {
    autoModerationLevel?: 'strict' | 'moderate' | 'permissive';
    requireApproval?: boolean;
    wordFilter?: string[];
    pinRoles?: string[];         // Who can pin posts
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
    description?: string;
  };
  scheduling?: {
    activeHours?: { start: string; end: string };
    timezone?: string;
    maintenanceMode?: boolean;
  };
}
```

### 2. Advanced Features Roadmap
- **Time-based restrictions**: Schedule access windows for communities/boards
- **Invitation systems**: Generate invite links for both levels
- **Cross-community access**: Multi-community collaboration frameworks
- **Role inheritance**: Complex parent-child permission relationships
- **Custom permission engines**: Plugin-specific permission computation
- **Access analytics**: Track and analyze permission usage patterns
- **Automated role assignment**: Rule-based role granting systems

## Testing Strategy

### 1. Unit Tests
- Community access validation logic
- Board access validation logic (with community prerequisite)
- Hierarchical permission checking
- Settings schema validation at both levels
- Migration up/down operations for both tables
- Role validation and caching logic

### 2. Integration Tests
- Community-level API endpoint access control
- Board-level API endpoint access control (with community context)
- User role changes impact on both levels
- Cross-community access prevention
- Permission inheritance and override scenarios
- Cache invalidation on permission changes

### 3. End-to-End Tests
- Admin restricts community access → user denied plugin access
- Admin restricts board access → user denied board access but can access other boards
- Role-based visibility across the entire permission hierarchy
- Permission changes take effect immediately at both levels
- Admin override functionality at all levels

## Deployment Checklist

### 1. Pre-deployment
- [ ] Community settings migration tested in staging
- [ ] Board settings migration tested in staging
- [ ] Role validation service deployed and tested
- [ ] Multi-level cache warming strategy implemented
- [ ] Monitoring/alerting configured for both permission levels
- [ ] Access denied pages created and tested

### 2. Deployment
- [ ] Run community settings migration
- [ ] Run board settings migration  
- [ ] Deploy enhanced API changes (community + board)
- [ ] Deploy frontend updates with access control
- [ ] Verify cache invalidation at both levels
- [ ] Test permission hierarchy in production

### 3. Post-deployment
- [ ] Verify existing communities accessible (no breaking changes)
- [ ] Verify existing boards accessible (no breaking changes)
- [ ] Test community permission creation/editing
- [ ] Test board permission creation/editing
- [ ] Monitor performance metrics for permission checks
- [ ] Check error rates/logs for access denied scenarios
- [ ] Validate admin override functionality

---

## Summary

This enhanced roadmap provides a comprehensive path to implementing **multi-level role-based permissions** that work hierarchically:

1. **Community Level**: Controls who can access the plugin at all
2. **Board Level**: Controls who can access specific boards (within community access)
3. **Content Level**: Future expansion for post/comment-level permissions

### Key Benefits:
- **Hierarchical Security**: Community restrictions apply before board restrictions
- **Administrative Control**: Granular control at multiple levels
- **Performance Optimized**: Efficient caching and validation strategies
- **Future-Proof**: JSON settings allow unlimited expansion
- **Backward Compatible**: Existing communities and boards work unchanged
- **Admin Friendly**: Clear UI for managing permissions at both levels

### Technical Highlights:
- **Dual migration approach**: Separate migrations for community and board settings
- **Middleware chaining**: `withCommunityAccess` → `withBoardAccess` → content access
- **Smart caching**: Multi-level caching with appropriate TTLs
- **Error granularity**: Specific error codes for different access denial reasons
- **Progressive enhancement**: Features can be enabled incrementally

The JSON-based settings storage provides maximum flexibility for future enhancements while the hierarchical role-based access control integrates seamlessly with Common Ground's existing permission system at multiple levels. 
import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { query } from '@/lib/db';
import { BoardSettings } from '@/types/settings';

interface BoardsRouteParams {
  params: {
    communityId: string;
  };
}

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

async function getCommunityBoardsHandler(req: AuthenticatedRequest, context: BoardsRouteParams) {
  const params = await context.params;
  const communityId = params.communityId;
  const requestingUserId = req.user?.sub; // For logging or future checks
  const requestingUserCommunityId = req.user?.cid; // User's own community from token

  if (!communityId) {
    return NextResponse.json({ error: 'Community ID is required' }, { status: 400 });
  }

  // Security check: Ensure the user is requesting boards for their own community
  // or if you want to allow fetching boards of other communities by admins/publicly (adjust logic here)
  if (communityId !== requestingUserCommunityId) {
    console.warn(`User ${requestingUserId} from community ${requestingUserCommunityId} attempted to fetch boards for community ${communityId}`);
    // Depending on policy, you might allow this for admins, or block entirely.
    // For now, let's restrict to user's own community for non-admins.
    // If req.user.adm is true, you could bypass this check.
    if (!req.user?.adm) { // Example: only allow if admin or it's their own community
        return NextResponse.json({ error: 'Forbidden: You can only fetch boards for your own community.' }, { status: 403 });
    }
  }

  try {
    const result = await query(
      'SELECT id, community_id, name, description, settings, created_at, updated_at FROM boards WHERE community_id = $1 ORDER BY name ASC',
      [communityId]
    );

    const boards: ApiBoard[] = result.rows.map(row => ({
      ...row,
      settings: typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings
    }));
    
    return NextResponse.json(boards);

  } catch (error) {
    console.error(`[API] Error fetching boards for community ${communityId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch boards' }, { status: 500 });
  }
}

// All authenticated users can attempt to fetch boards, the handler itself checks for community membership/admin status.
export const GET = withAuth(getCommunityBoardsHandler, false); 

// POST handler for creating new boards (admin only)
async function createBoardHandler(req: AuthenticatedRequest, context: BoardsRouteParams) {
  const params = await context.params;
  const communityId = params.communityId;
  const requestingUserId = req.user?.sub;
  const requestingUserCommunityId = req.user?.cid;

  if (!communityId) {
    return NextResponse.json({ error: 'Community ID is required' }, { status: 400 });
  }

  // Security check: Only allow creating boards in user's own community
  if (communityId !== requestingUserCommunityId) {
    return NextResponse.json({ error: 'Forbidden: You can only create boards in your own community.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, description, settings = {} } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Board name is required' }, { status: 400 });
    }

    // Validate settings if provided
    if (settings && Object.keys(settings).length > 0) {
      // Basic validation - could be enhanced with a proper schema validator
      if (settings.permissions?.allowedRoles && !Array.isArray(settings.permissions.allowedRoles)) {
        return NextResponse.json({ error: 'allowedRoles must be an array' }, { status: 400 });
      }
    }

    // Check if board name already exists in this community
    const existingBoard = await query(
      'SELECT id FROM boards WHERE community_id = $1 AND LOWER(name) = LOWER($2)',
      [communityId, name.trim()]
    );

    if (existingBoard.rows.length > 0) {
      return NextResponse.json({ error: 'A board with this name already exists' }, { status: 409 });
    }

    // Create the board with settings
    const result = await query(
      'INSERT INTO boards (community_id, name, description, settings) VALUES ($1, $2, $3, $4) RETURNING *',
      [communityId, name.trim(), description?.trim() || null, JSON.stringify(settings)]
    );

    const newBoard = result.rows[0];
    console.log(`[API] Board created: ${newBoard.name} (ID: ${newBoard.id}) in community ${communityId} by user ${requestingUserId}`);

    // Parse settings for response
    const boardResponse = {
      ...newBoard,
      settings: typeof newBoard.settings === 'string' ? JSON.parse(newBoard.settings) : newBoard.settings
    };

    return NextResponse.json(boardResponse, { status: 201 });

  } catch (error) {
    console.error(`[API] Error creating board for community ${communityId}:`, error);
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create board' }, { status: 500 });
  }
}

export const POST = withAuth(createBoardHandler, true); // true = admin only 
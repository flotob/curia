import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest, RouteContext } from '@/lib/withAuth';
import { query } from '@/lib/db';

export interface ShareableBoardInfo {
  board_id: number;
  board_name: string;
  board_description: string | null;
  board_settings: Record<string, unknown>;
  created_at: string;
  partnership_id: number;
  target_community_id: string;
  target_community_name: string;
  target_community_logo_url: string | null;
  partnership_status: string;
  is_already_shared: boolean;
}

export interface ShareableBoardsResponse {
  boards: {
    id: number;
    name: string;
    description: string | null;
    settings: Record<string, unknown>;
    created_at: string;
    can_be_shared: boolean;
    is_role_gated: boolean;
  }[];
  partnerships: {
    id: number;
    target_community_id: string;
    target_community_name: string;
    target_community_logo_url: string | null;
    status: string;
  }[];
}

// GET /api/communities/[communityId]/shareable-boards - List boards that can be shared with partner communities
async function getShareableBoardsHandler(req: AuthenticatedRequest, context: RouteContext) {
  const params = await context.params;
  const { communityId } = params;
  const requestingUserId = req.user?.sub;
  const requestingUserCommunityId = req.user?.cid;

  if (!communityId) {
    return NextResponse.json({ error: 'Community ID is required' }, { status: 400 });
  }

  if (!requestingUserId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 401 });
  }

  // Security check: Only allow fetching shareable boards for user's own community
  if (communityId !== requestingUserCommunityId) {
    return NextResponse.json({ error: 'Forbidden: You can only fetch shareable boards for your own community.' }, { status: 403 });
  }

  try {
    // Fetch all boards in this community
    const boardsResult = await query(
      'SELECT id, name, description, settings, created_at FROM boards WHERE community_id = $1 ORDER BY name ASC',
      [communityId]
    );

    // Fetch accepted partnerships where this community can share boards
    const partnershipsResult = await query(`
      SELECT 
        cp.id,
        cp.target_community_id,
        tc.name as target_community_name,
        tc.logo_url as target_community_logo_url,
        cp.status
      FROM community_partnerships cp
      JOIN communities tc ON cp.target_community_id = tc.id
      WHERE cp.source_community_id = $1 AND cp.status = 'accepted'
      
      UNION
      
      SELECT 
        cp.id,
        cp.source_community_id as target_community_id,
        sc.name as target_community_name,
        sc.logo_url as target_community_logo_url,
        cp.status
      FROM community_partnerships cp
      JOIN communities sc ON cp.source_community_id = sc.id
      WHERE cp.target_community_id = $1 AND cp.status = 'accepted'
      
      ORDER BY target_community_name ASC
    `, [communityId]);

    // Process boards and check shareability
    const boards = boardsResult.rows.map(board => {
      const settings = typeof board.settings === 'string' ? JSON.parse(board.settings) : board.settings;
      
      // Check if board is role-gated (has specific role restrictions)
      const isRoleGated = settings.permissions?.allowedRoles && 
                         Array.isArray(settings.permissions.allowedRoles) && 
                         settings.permissions.allowedRoles.length > 0 &&
                         !settings.permissions.isPublic;

      // Boards can be shared if they are not role-gated
      // Lock-gated boards are fine since locks work across communities
      const canBeShared = !isRoleGated;

      return {
        id: board.id,
        name: board.name,
        description: board.description,
        settings,
        created_at: board.created_at,
        can_be_shared: canBeShared,
        is_role_gated: isRoleGated
      };
    });

    // Process partnerships
    const partnerships = partnershipsResult.rows.map(partnership => ({
      id: partnership.id,
      target_community_id: partnership.target_community_id,
      target_community_name: partnership.target_community_name,
      target_community_logo_url: partnership.target_community_logo_url,
      status: partnership.status
    }));

    const response: ShareableBoardsResponse = {
      boards,
      partnerships
    };

    console.log(`[API GET /api/communities/${communityId}/shareable-boards] User ${requestingUserId} requested shareable boards: ${boards.length} boards, ${partnerships.length} partnerships`);

    return NextResponse.json(response);

  } catch (error) {
    console.error(`[API] Error fetching shareable boards for community ${communityId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch shareable boards' }, { status: 500 });
  }
}

export const GET = withAuth(getShareableBoardsHandler, true); // Admin only 
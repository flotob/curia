import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest, RouteContext } from '@/lib/withAuth';
import { query } from '@/lib/db';
import { canUserAccessBoard } from '@/lib/boardPermissions';

export interface ApiImportedBoard {
  id: number;
  source_board_id: number;
  source_community_id: string;
  importing_community_id: string;
  imported_by_user_id: string;
  imported_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields from boards table
  board_name: string;
  board_description: string | null;
  board_settings: Record<string, unknown>;
  // Joined fields from communities table
  source_community_name: string;
  source_community_logo_url: string | null;
  // Joined fields from users table
  imported_by_user_name: string | null;
  // Computed fields
  user_can_access?: boolean;
  user_can_post?: boolean;
}

// Legacy alias for backward compatibility
export type ApiSharedBoard = ApiImportedBoard;

// GET /api/communities/[communityId]/shared-boards - List shared boards accessible to this community
async function getSharedBoardsHandler(req: AuthenticatedRequest, context: RouteContext) {
  const params = await context.params;
  const { communityId } = params;
  const requestingUserId = req.user?.sub;
  const requestingUserCommunityId = req.user?.cid;
  const userRoles = req.user?.roles || [];
  const isAdmin = req.user?.adm || false;

  if (!communityId) {
    return NextResponse.json({ error: 'Community ID is required' }, { status: 400 });
  }

  // Security check: Ensure the user is requesting boards for their own community
  if (communityId !== requestingUserCommunityId) {
    console.warn(`User ${requestingUserId} from community ${requestingUserCommunityId} attempted to fetch shared boards for community ${communityId}`);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden: You can only fetch shared boards for your own community.' }, { status: 403 });
    }
  }

  try {
    // Fetch imported boards where this community is the importer (receiving boards from partners)
    const result = await query(`
      SELECT 
        ib.*,
        b.name as board_name,
        b.description as board_description,
        b.settings as board_settings,
        sc.name as source_community_name,
        sc.logo_url as source_community_logo_url,
        u.name as imported_by_user_name
      FROM imported_boards ib
      JOIN boards b ON ib.source_board_id = b.id
      JOIN communities sc ON ib.source_community_id = sc.id
      LEFT JOIN users u ON ib.imported_by_user_id = u.user_id
      WHERE ib.importing_community_id = $1 
        AND ib.is_active = true
      ORDER BY ib.imported_at DESC
    `, [communityId]);

    const importedBoards: ApiImportedBoard[] = result.rows.map(row => ({
      id: row.id,
      source_board_id: row.source_board_id,
      source_community_id: row.source_community_id,
      importing_community_id: row.importing_community_id,
      imported_by_user_id: row.imported_by_user_id,
      imported_at: row.imported_at,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
      board_name: row.board_name,
      board_description: row.board_description,
      board_settings: typeof row.board_settings === 'string' ? JSON.parse(row.board_settings) : row.board_settings,
      source_community_name: row.source_community_name,
      source_community_logo_url: row.source_community_logo_url,
      imported_by_user_name: row.imported_by_user_name
    }));

    // SECURITY: Filter imported boards based on user permissions
    // Note: For imported boards, we need to check if the board settings allow the current user's roles
    // even though they're from a different community
    const accessibleImportedBoards = importedBoards.filter(importedBoard => {
      // Check if user can access this imported board based on the original board's settings
      return canUserAccessBoard(userRoles, importedBoard.board_settings, isAdmin);
    });

    // Add permission flags
    const importedBoardsWithPermissions = accessibleImportedBoards.map(importedBoard => ({
      ...importedBoard,
      user_can_access: true, // All returned boards are accessible
      user_can_post: canUserAccessBoard(userRoles, importedBoard.board_settings, isAdmin) // Same logic for now
    }));

    console.log(`[API GET /api/communities/${communityId}/shared-boards] User ${requestingUserId} can access ${importedBoardsWithPermissions.length}/${importedBoards.length} imported boards`);

    return NextResponse.json(importedBoardsWithPermissions);

  } catch (error) {
    console.error(`[API] Error fetching shared boards for community ${communityId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch shared boards' }, { status: 500 });
  }
}

export const GET = withAuth(getSharedBoardsHandler, false); 
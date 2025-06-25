import { NextResponse } from 'next/server';
import { AuthenticatedRequest, withAuth, RouteContext } from '@/lib/withAuth';
import { query } from '@/lib/db';
import { resolveBoard } from '@/lib/boardPermissions';
import { ApiBoard } from '../route';

// GET /api/communities/[communityId]/boards/[boardId] - Get single board (handles both owned and shared boards)
async function getBoardHandler(req: AuthenticatedRequest, context: RouteContext) {
  const params = await context.params;
  const { communityId, boardId } = params;
  const requestingUserId = req.user?.sub;
  const requestingUserCommunityId = req.user?.cid;

  if (!communityId || !boardId) {
    return NextResponse.json({ error: 'Community ID and Board ID are required' }, { status: 400 });
  }

  // Security check: Ensure the user is requesting board for their own community
  if (communityId !== requestingUserCommunityId) {
    return NextResponse.json({ error: 'Forbidden: You can only fetch boards for your own community.' }, { status: 403 });
  }

  try {
    const boardIdNum = parseInt(boardId, 10);
    if (isNaN(boardIdNum)) {
      return NextResponse.json({ error: 'Invalid board ID' }, { status: 400 });
    }

    // Use resolveBoard function which handles both owned and shared boards
    const board = await resolveBoard(boardIdNum, communityId);

    if (!board) {
      return NextResponse.json({ error: 'Board not found or not accessible' }, { status: 404 });
    }

    // Convert to ApiBoard format, including shared board fields
    const boardResponse: ApiBoard = {
      id: board.id,
      community_id: board.community_id,
      name: board.name,
      description: board.description,
      settings: board.settings,
      created_at: board.created_at,
      updated_at: board.updated_at,
      user_can_access: true, // If resolveBoard returned it, user can access it
      user_can_post: true,   // Same logic for now
      // Pass through shared board context
      is_imported: board.is_imported,
      source_community_id: board.source_community_id,
      source_community_name: board.source_community_name
    };

    console.log(`[API GET /api/communities/${communityId}/boards/${boardId}] User ${requestingUserId} accessed board: ${board.name} (owned: ${!board.is_imported})`);

    return NextResponse.json({ board: boardResponse });

  } catch (error) {
    console.error(`[API] Error fetching board ${boardId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch board' }, { status: 500 });
  }
}

// PATCH /api/communities/[communityId]/boards/[boardId] - Update board settings (Admin only)
async function updateBoardHandler(req: AuthenticatedRequest, context: RouteContext) {
  const params = await context.params;
  const { communityId, boardId } = params;
  const requestingUserId = req.user?.sub;
  const requestingUserCommunityId = req.user?.cid;

  if (!communityId || !boardId) {
    return NextResponse.json({ error: 'Community ID and Board ID are required' }, { status: 400 });
  }

  // Security check: Only allow updating boards in user's own community
  if (communityId !== requestingUserCommunityId) {
    return NextResponse.json({ error: 'Forbidden: You can only update boards in your own community.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, description, settings = {} } = body;

    // Validate settings if provided
    if (settings && Object.keys(settings).length > 0) {
      // Basic validation - could be enhanced with a proper schema validator
      if (settings.permissions?.allowedRoles && !Array.isArray(settings.permissions.allowedRoles)) {
        return NextResponse.json({ error: 'allowedRoles must be an array' }, { status: 400 });
      }

      // Validate lock gating configuration
      if (settings.permissions?.locks) {
        const locks = settings.permissions.locks;
        
        if (!Array.isArray(locks.lockIds)) {
          return NextResponse.json({ error: 'locks.lockIds must be an array' }, { status: 400 });
        }
        
        if (!locks.lockIds.every((id: unknown) => typeof id === 'number')) {
          return NextResponse.json({ error: 'All lock IDs must be numbers' }, { status: 400 });
        }
        
        if (locks.fulfillment && !['any', 'all'].includes(locks.fulfillment)) {
          return NextResponse.json({ error: 'locks.fulfillment must be "any" or "all"' }, { status: 400 });
        }
        
        if (locks.verificationDuration && (typeof locks.verificationDuration !== 'number' || locks.verificationDuration <= 0)) {
          return NextResponse.json({ error: 'locks.verificationDuration must be a positive number' }, { status: 400 });
        }
      }

      // TODO: Add role validation here - validate that all role IDs exist in the community
      // This would require fetching from Common Ground or caching community roles
    }

    // Update board with new settings
    const result = await query(
      'UPDATE boards SET name = COALESCE($1, name), description = COALESCE($2, description), settings = $3, updated_at = NOW() WHERE id = $4 AND community_id = $5 RETURNING *',
      [name?.trim() || null, description?.trim() || null, JSON.stringify(settings), boardId, communityId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    const updatedBoard = result.rows[0];
    console.log(`[API] Board updated: ${updatedBoard.name} (ID: ${updatedBoard.id}) by user ${requestingUserId}`);

    // Parse settings for response
    const boardResponse: ApiBoard = {
      ...updatedBoard,
      settings: typeof updatedBoard.settings === 'string' ? JSON.parse(updatedBoard.settings) : updatedBoard.settings
    };

    return NextResponse.json(boardResponse);

  } catch (error) {
    console.error(`[API] Error updating board ${boardId}:`, error);
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update board' }, { status: 500 });
  }
}

// DELETE /api/communities/[communityId]/boards/[boardId] - Delete board (Admin only)
async function deleteBoardHandler(req: AuthenticatedRequest, context: RouteContext) {
  const params = await context.params;
  const { communityId, boardId } = params;
  const requestingUserId = req.user?.sub;
  const requestingUserCommunityId = req.user?.cid;

  if (!communityId || !boardId) {
    return NextResponse.json({ error: 'Community ID and Board ID are required' }, { status: 400 });
  }

  // Security check: Only allow deleting boards in user's own community
  if (communityId !== requestingUserCommunityId) {
    return NextResponse.json({ error: 'Forbidden: You can only delete boards in your own community.' }, { status: 403 });
  }

  try {
    const result = await query(
      'DELETE FROM boards WHERE id = $1 AND community_id = $2 RETURNING name',
      [boardId, communityId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    const deletedBoard = result.rows[0];
    console.log(`[API] Board deleted: ${deletedBoard.name} (ID: ${boardId}) by user ${requestingUserId}`);

    return NextResponse.json({ message: 'Board deleted successfully' });

  } catch (error) {
    console.error(`[API] Error deleting board ${boardId}:`, error);
    return NextResponse.json({ error: 'Failed to delete board' }, { status: 500 });
  }
}

export const GET = withAuth(getBoardHandler, false); // Any authenticated user
export const PATCH = withAuth(updateBoardHandler, true); // Admin only
export const DELETE = withAuth(deleteBoardHandler, true); // Admin only
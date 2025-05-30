import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { query } from '@/lib/db';
import { BoardSettings } from '@/types/settings';
import { ApiBoard } from '../route';

interface BoardRouteParams {
  params: {
    communityId: string;
    boardId: string;
  };
}

// PATCH /api/communities/[communityId]/boards/[boardId] - Update board settings (Admin only)
async function updateBoardHandler(req: AuthenticatedRequest, context: BoardRouteParams) {
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

export const PATCH = withAuth(updateBoardHandler, true); // Admin only

// DELETE /api/communities/[communityId]/boards/[boardId] - Delete board (Admin only)
async function deleteBoardHandler(req: AuthenticatedRequest, context: BoardRouteParams) {
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
    // First check if the board exists and belongs to the community
    const boardResult = await query(
      'SELECT id, name FROM boards WHERE id = $1 AND community_id = $2',
      [boardId, communityId]
    );

    if (boardResult.rows.length === 0) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    const board = boardResult.rows[0];

    // Check if board has posts
    const postsResult = await query(
      'SELECT COUNT(*) as post_count FROM posts WHERE board_id = $1',
      [boardId]
    );

    const postCount = parseInt(postsResult.rows[0].post_count, 10);

    // Safety check: Prevent deletion of boards with posts unless forced
    const force = req.nextUrl.searchParams.get('force') === 'true';
    
    if (postCount > 0 && !force) {
      return NextResponse.json({ 
        error: 'Cannot delete board with existing posts',
        details: {
          postCount,
          boardName: board.name,
          suggestion: 'Move posts to another board first, or use force=true to delete all posts'
        }
      }, { status: 409 });
    }

    // If forced deletion with posts, delete posts first (CASCADE should handle this, but let's be explicit)
    if (postCount > 0 && force) {
      console.log(`[API] Force deleting ${postCount} posts from board ${board.name} (ID: ${boardId})`);
      
      // Delete comments first (they reference posts)
      await query('DELETE FROM comments WHERE post_id IN (SELECT id FROM posts WHERE board_id = $1)', [boardId]);
      
      // Delete votes (they reference posts)
      await query('DELETE FROM votes WHERE post_id IN (SELECT id FROM posts WHERE board_id = $1)', [boardId]);
      
      // Delete posts
      await query('DELETE FROM posts WHERE board_id = $1', [boardId]);
    }

    // Delete the board
    await query('DELETE FROM boards WHERE id = $1 AND community_id = $2', [boardId, communityId]);

    console.log(`[API] Board deleted: ${board.name} (ID: ${boardId}) in community ${communityId} by admin ${requestingUserId}${force ? ' (forced)' : ''}`);

    return NextResponse.json({ 
      message: 'Board deleted successfully',
      boardId: parseInt(boardId),
      boardName: board.name,
      deletedPosts: postCount > 0 ? postCount : 0
    });

  } catch (error) {
    console.error(`[API] Error deleting board ${boardId}:`, error);
    return NextResponse.json({ error: 'Failed to delete board' }, { status: 500 });
  }
}

export const DELETE = withAuth(deleteBoardHandler, true); // Admin only 
import { NextResponse } from 'next/server';
import { AuthenticatedRequest, withAuth, RouteContext } from '@/lib/withAuth';
import { query } from '@/lib/db';

// DELETE /api/communities/[communityId]/shared-boards/[sharedBoardId] - Remove board sharing (Admin only)
async function deleteSharedBoardHandler(req: AuthenticatedRequest, context: RouteContext) {
  const params = await context.params;
  const { communityId, sharedBoardId } = params;
  const requestingUserId = req.user?.sub;
  const requestingUserCommunityId = req.user?.cid;

  if (!communityId || !sharedBoardId) {
    return NextResponse.json({ error: 'Community ID and Shared Board ID are required' }, { status: 400 });
  }

  if (!requestingUserId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 401 });
  }

  // Security check: Only allow removing shared boards from user's own community
  if (communityId !== requestingUserCommunityId) {
    return NextResponse.json({ error: 'Forbidden: You can only remove shared boards from your own community.' }, { status: 403 });
  }

  try {
    // First, fetch the shared board to get details for logging and real-time events
    const sharedBoardResult = await query(`
      SELECT 
        sb.*,
        b.name as board_name,
        tc.name as target_community_name
      FROM shared_boards sb
      JOIN boards b ON sb.board_id = b.id
      JOIN communities tc ON sb.target_community_id = tc.id
      WHERE sb.id = $1 AND sb.source_community_id = $2
    `, [sharedBoardId, communityId]);

    if (sharedBoardResult.rows.length === 0) {
      return NextResponse.json({ error: 'Shared board not found or does not belong to your community' }, { status: 404 });
    }

    const sharedBoard = sharedBoardResult.rows[0];

    // Delete the shared board entry
    const deleteResult = await query(
      'DELETE FROM shared_boards WHERE id = $1 AND source_community_id = $2 RETURNING id',
      [sharedBoardId, communityId]
    );

    if (deleteResult.rows.length === 0) {
      return NextResponse.json({ error: 'Failed to remove shared board' }, { status: 500 });
    }

    console.log(`[API] Shared board removed: "${sharedBoard.board_name}" (ID: ${sharedBoard.board_id}) from ${communityId} to ${sharedBoard.target_community_id} by user ${requestingUserId}`);

    // 🚀 EMIT REAL-TIME EVENT: Board sharing removed notification to target community
    const emitter = process.customEventEmitter;
    if (emitter && typeof emitter.emit === 'function') {
      emitter.emit('broadcastEvent', {
        room: `community:${sharedBoard.target_community_id}`,
        eventName: 'sharedBoardRemoved',
        payload: {
          type: 'unshared',
          sharedBoardId: parseInt(sharedBoardId),
          boardId: sharedBoard.board_id,
          boardName: sharedBoard.board_name,
          sourceCommunityId: communityId,
          actor_name: requestingUserId,
          communityId: sharedBoard.target_community_id
        }
      });
      console.log(`[Shared Board Events] Emitted sharedBoardRemoved to target community ${sharedBoard.target_community_id}`);
    } else {
      console.warn('[Shared Board Events] customEventEmitter not available for shared board removal notification');
    }

    return NextResponse.json({ 
      message: 'Shared board removed successfully',
      removedSharedBoardId: parseInt(sharedBoardId),
      boardName: sharedBoard.board_name,
      targetCommunity: sharedBoard.target_community_name
    });

  } catch (error) {
    console.error(`[API] Error removing shared board ${sharedBoardId}:`, error);
    return NextResponse.json({ error: 'Failed to remove shared board' }, { status: 500 });
  }
}

export const DELETE = withAuth(deleteSharedBoardHandler, true); // Admin only 
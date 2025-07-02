import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest, RouteContext } from '@/lib/withAuth';
import { query } from '@/lib/db';

// DELETE /api/communities/[communityId]/imported-boards/[importedBoardId] - Undo board import (admin only)
async function undoImportBoardHandler(req: AuthenticatedRequest, context: RouteContext) {
  const params = await context.params;
  const { communityId, importedBoardId } = params;
  const requestingUserId = req.user?.sub;
  const requestingUserCommunityId = req.user?.cid;

  if (!communityId || !importedBoardId) {
    return NextResponse.json({ error: 'Community ID and Imported Board ID are required' }, { status: 400 });
  }

  if (!requestingUserId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 401 });
  }

  // Security check: Only allow undoing imports from user's own community
  if (communityId !== requestingUserCommunityId) {
    return NextResponse.json({ error: 'Forbidden: You can only undo imports from your own community.' }, { status: 403 });
  }

  try {
    // First, fetch the imported board to get details for logging and validation
    const importedBoardResult = await query(`
      SELECT 
        ib.*,
        b.name as board_name,
        sc.name as source_community_name
      FROM imported_boards ib
      JOIN boards b ON ib.source_board_id = b.id
      JOIN communities sc ON ib.source_community_id = sc.id
      WHERE ib.id = $1 AND ib.importing_community_id = $2 AND ib.is_active = true
    `, [importedBoardId, communityId]);

    if (importedBoardResult.rows.length === 0) {
      return NextResponse.json({ error: 'Imported board not found or already removed' }, { status: 404 });
    }

    const importedBoard = importedBoardResult.rows[0];

    // Soft delete the imported board by setting is_active = false
    const updateResult = await query(
      'UPDATE imported_boards SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND importing_community_id = $2 RETURNING id',
      [importedBoardId, communityId]
    );

    if (updateResult.rows.length === 0) {
      return NextResponse.json({ error: 'Failed to undo board import' }, { status: 500 });
    }

    console.log(`[API] Board import undone: "${importedBoard.board_name}" (ID: ${importedBoard.source_board_id}) from ${importedBoard.source_community_id} to ${communityId} by user ${requestingUserId}`);

    // 🚀 EMIT REAL-TIME EVENT: Board import undone notification
    const emitter = process.customEventEmitter;
    if (emitter && typeof emitter.emit === 'function') {
      emitter.emit('broadcastEvent', {
        room: `community:${communityId}`,
        eventName: 'boardImportUndone',
        payload: {
          type: 'undo_import',
          importedBoardId: parseInt(importedBoardId),
          sourceBoardId: importedBoard.source_board_id,
          boardName: importedBoard.board_name,
          sourceCommunityId: importedBoard.source_community_id,
          sourceCommunityName: importedBoard.source_community_name,
          actor_name: requestingUserId,
          communityId: communityId
        }
      });
      console.log(`[Import Board Events] Emitted boardImportUndone to community ${communityId}`);
    } else {
      console.warn('[Import Board Events] customEventEmitter not available for board import undo notification');
    }

    return NextResponse.json({ 
      message: 'Board import undone successfully',
      undoneImportId: parseInt(importedBoardId),
      boardName: importedBoard.board_name,
      sourceCommunity: importedBoard.source_community_name
    });

  } catch (error) {
    console.error(`[API] Error undoing board import ${importedBoardId}:`, error);
    return NextResponse.json({ error: 'Failed to undo board import' }, { status: 500 });
  }
}

export const DELETE = withAuth(undoImportBoardHandler, true); // Admin only
import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest, RouteContext } from '@/lib/withAuth';
import { query } from '@/lib/db';
import { SettingsUtils } from '@/types/settings';

export interface ImportBoardRequest {
  sourceBoardId: number;
  sourceCommunityId: string;
}

export interface ImportBoardResponse {
  id: number;
  source_board_id: number;
  source_community_id: string;
  importing_community_id: string;
  imported_by_user_id: string;
  imported_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  board_name: string;
  board_description: string | null;
  board_settings: Record<string, unknown>;
  source_community_name: string;
  source_community_logo_url: string | null;
  imported_by_user_name: string | null;
}

// POST /api/communities/[communityId]/import-board - Import a board from partner community (admin only)
async function importBoardHandler(req: AuthenticatedRequest, context: RouteContext) {
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

  // Security check: Only allow importing boards to user's own community
  if (communityId !== requestingUserCommunityId) {
    return NextResponse.json({ error: 'Forbidden: You can only import boards to your own community.' }, { status: 403 });
  }

  try {
    const body: ImportBoardRequest = await req.json();
    const { sourceBoardId, sourceCommunityId } = body;

    // Validate required fields
    if (!sourceBoardId || typeof sourceBoardId !== 'number') {
      return NextResponse.json({ error: 'Valid source board ID is required' }, { status: 400 });
    }

    if (!sourceCommunityId || !sourceCommunityId.trim()) {
      return NextResponse.json({ error: 'Source community ID is required' }, { status: 400 });
    }

    // Prevent importing from own community
    if (sourceCommunityId === communityId) {
      return NextResponse.json({ error: 'Cannot import board from own community' }, { status: 400 });
    }

    // Verify the source board exists and is not role-gated
    const boardResult = await query(
      'SELECT id, name, community_id, settings, description FROM boards WHERE id = $1 AND community_id = $2',
      [sourceBoardId, sourceCommunityId]
    );

    if (boardResult.rows.length === 0) {
      return NextResponse.json({ error: 'Source board not found' }, { status: 404 });
    }

    const sourceBoard = boardResult.rows[0];
    const boardSettings = typeof sourceBoard.settings === 'string' 
      ? JSON.parse(sourceBoard.settings) 
      : sourceBoard.settings;

    // Check if the board is role-gated (not allowed for import)
    if (SettingsUtils.hasPermissionRestrictions(boardSettings)) {
      return NextResponse.json({ error: 'Cannot import role-gated boards' }, { status: 403 });
    }

    // Verify partnership exists and allows board sharing
    const partnershipResult = await query(`
      SELECT id, status, source_to_target_permissions, target_to_source_permissions
      FROM community_partnerships 
      WHERE ((source_community_id = $1 AND target_community_id = $2) 
             OR (source_community_id = $2 AND target_community_id = $1))
        AND status = 'accepted'
    `, [communityId, sourceCommunityId]);

    if (partnershipResult.rows.length === 0) {
      return NextResponse.json({ error: 'No accepted partnership found between these communities' }, { status: 404 });
    }

    const partnership = partnershipResult.rows[0];
    
    // Check if the source community allows board sharing to the importing community
    let allowsBoardSharing = false;
    if (partnership.source_community_id === sourceCommunityId) {
      // Source community is the partnership source, check source_to_target_permissions
      const permissions = partnership.source_to_target_permissions || {};
      allowsBoardSharing = permissions.allowBoardSharing === true;
    } else {
      // Source community is the partnership target, check target_to_source_permissions  
      const permissions = partnership.target_to_source_permissions || {};
      allowsBoardSharing = permissions.allowBoardSharing === true;
    }

    if (!allowsBoardSharing) {
      return NextResponse.json({ error: 'Source community has not enabled board sharing for this partnership' }, { status: 403 });
    }

    // Check if this board is already imported
    const existingImport = await query(
      'SELECT id FROM imported_boards WHERE source_board_id = $1 AND importing_community_id = $2 AND is_active = true',
      [sourceBoardId, communityId]
    );

    if (existingImport.rows.length > 0) {
      return NextResponse.json({ error: 'Board is already imported by this community' }, { status: 409 });
    }

    // Verify importing community exists
    const targetCommunityResult = await query(
      'SELECT id, name FROM communities WHERE id = $1',
      [communityId]
    );

    if (targetCommunityResult.rows.length === 0) {
      return NextResponse.json({ error: 'Importing community not found' }, { status: 404 });
    }

    // Create the imported board entry
    const result = await query(`
      INSERT INTO imported_boards (
        source_board_id, source_community_id, importing_community_id, 
        imported_by_user_id, is_active
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      sourceBoardId,
      sourceCommunityId,
      communityId,
      requestingUserId,
      true
    ]);

    const importedBoard = result.rows[0];

    // Fetch the complete imported board with joined data for response
    const completeImportedBoardResult = await query(`
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
      WHERE ib.id = $1
    `, [importedBoard.id]);

    const completeImportedBoard = completeImportedBoardResult.rows[0];

    const importedBoardResponse: ImportBoardResponse = {
      id: completeImportedBoard.id,
      source_board_id: completeImportedBoard.source_board_id,
      source_community_id: completeImportedBoard.source_community_id,
      importing_community_id: completeImportedBoard.importing_community_id,
      imported_by_user_id: completeImportedBoard.imported_by_user_id,
      imported_at: completeImportedBoard.imported_at,
      is_active: completeImportedBoard.is_active,
      created_at: completeImportedBoard.created_at,
      updated_at: completeImportedBoard.updated_at,
      board_name: completeImportedBoard.board_name,
      board_description: completeImportedBoard.board_description,
      board_settings: typeof completeImportedBoard.board_settings === 'string' 
        ? JSON.parse(completeImportedBoard.board_settings) 
        : completeImportedBoard.board_settings,
      source_community_name: completeImportedBoard.source_community_name,
      source_community_logo_url: completeImportedBoard.source_community_logo_url,
      imported_by_user_name: completeImportedBoard.imported_by_user_name
    };

    console.log(`[API] Board imported: "${sourceBoard.name}" (ID: ${sourceBoardId}) from ${sourceCommunityId} to ${communityId} by user ${requestingUserId}`);

    // 🚀 EMIT REAL-TIME EVENT: Board imported notification to importing community
    const emitter = process.customEventEmitter;
    if (emitter && typeof emitter.emit === 'function') {
      emitter.emit('broadcastEvent', {
        room: `community:${communityId}`,
        eventName: 'boardImported',
        payload: {
          type: 'import',
          importedBoard: importedBoardResponse,
          actor_name: requestingUserId,
          communityId: communityId
        }
      });
      console.log(`[Import Board Events] Emitted boardImported to importing community ${communityId}`);
    } else {
      console.warn('[Import Board Events] customEventEmitter not available for board import notification');
    }

    return NextResponse.json(importedBoardResponse, { status: 201 });

  } catch (error) {
    console.error(`[API] Error importing board for community ${communityId}:`, error);
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to import board' }, { status: 500 });
  }
}

export const POST = withAuth(importBoardHandler, true); // Admin only 
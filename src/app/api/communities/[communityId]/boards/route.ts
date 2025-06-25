// This route is temporarily disabled due to TypeScript interface issues with withAuth
// Need to investigate the correct Next.js App Router + withAuth pattern

import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest, RouteContext } from '@/lib/withAuth';
import { query } from '@/lib/db';
import { BoardSettings } from '@/types/settings';
import { filterAccessibleBoards, canUserAccessBoard } from '@/lib/boardPermissions';

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

async function getCommunityBoardsHandler(req: AuthenticatedRequest, context: RouteContext) {
  const params = await context.params;
  const { communityId } = params;
  const requestingUserId = req.user?.sub; // For logging or future checks
  const requestingUserCommunityId = req.user?.cid; // User's own community from token
  const userRoles = req.user?.roles; // Get user roles from JWT
  const isAdmin = req.user?.adm || false; // Get admin status from JWT

  if (!communityId) {
    return NextResponse.json({ error: 'Community ID is required' }, { status: 400 });
  }

  // Security check: Ensure the user is requesting boards for their own community
  if (communityId !== requestingUserCommunityId) {
    console.warn(`User ${requestingUserId} from community ${requestingUserCommunityId} attempted to fetch boards for community ${communityId}`);
    if (!isAdmin) { // Only allow if admin or it's their own community
        return NextResponse.json({ error: 'Forbidden: You can only fetch boards for your own community.' }, { status: 403 });
    }
  }

  try {
    // Get only OWNED boards for this community (imported boards handled by separate shared boards API)
    const result = await query(`
      SELECT id, community_id, name, description, settings, created_at, updated_at
      FROM boards 
      WHERE community_id = $1
      ORDER BY name ASC
    `, [communityId]);
    
    const allBoards: ApiBoard[] = result.rows.map(row => ({
      id: row.id,
      community_id: row.community_id,
      name: row.name,
      description: row.description,
      settings: typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));
    
    // SECURITY: Filter boards based on user permissions
    const accessibleBoards = filterAccessibleBoards(allBoards, userRoles, isAdmin);
    
    // Add access permission flags for each board
    const boardsWithPermissions = accessibleBoards.map(board => ({
      ...board,
      user_can_access: true, // All returned boards are accessible
      user_can_post: canUserAccessBoard(userRoles, board.settings, isAdmin) // Same logic for now, could be different in future
    }));
    
    console.log(`[API GET /api/communities/${communityId}/boards] User ${requestingUserId} can access ${boardsWithPermissions.length}/${allBoards.length} boards`);
    
    return NextResponse.json(boardsWithPermissions);

  } catch (error) {
    console.error(`[API] Error fetching boards for community ${communityId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch boards' }, { status: 500 });
  }
}

// POST handler for creating new boards (admin only)
async function createBoardHandler(req: AuthenticatedRequest, context: RouteContext) {
  const params = await context.params;
  const { communityId } = params;
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

    // Emit socket event for new board creation
    const emitter = process.customEventEmitter;
    console.log('[API POST /api/communities/.../boards] Attempting to use process.customEventEmitter. Emitter available:', !!emitter);
    if (emitter && typeof emitter.emit === 'function') {
      emitter.emit('broadcastEvent', {
        room: `community:${communityId}`,
        eventName: 'newBoard',
        payload: { 
          board: boardResponse, 
          author_user_id: requestingUserId,
          // Add community context for cross-community broadcasting
          communityId: communityId,
          communityShortId: req.user?.communityShortId,
          pluginId: req.user?.pluginId
        }
      });
      console.log('[API POST /api/communities/.../boards] Successfully emitted newBoard event.');
    } else {
      console.error('[API POST /api/communities/.../boards] ERROR: process.customEventEmitter not available.');
    }

    return NextResponse.json(boardResponse, { status: 201 });

  } catch (error) {
    console.error(`[API] Error creating board for community ${communityId}:`, error);
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create board' }, { status: 500 });
  }
}

export const GET = withAuth(getCommunityBoardsHandler, false);
export const POST = withAuth(createBoardHandler, true); // true = admin only 
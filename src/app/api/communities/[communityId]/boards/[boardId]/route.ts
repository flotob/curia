/*
// This route is temporarily disabled due to TypeScript interface issues with withAuth
// Need to investigate the correct Next.js App Router + withAuth pattern

import { NextResponse } from 'next/server';
import { AuthenticatedRequest, withAuth } from '@/lib/withAuth';
import { query } from '@/lib/db';
import { ApiBoard } from '../route';

interface BoardRouteParams {
  params: {
    communityId: string;
    boardId: string;
  };
}

// PATCH /api/communities/[communityId]/boards/[boardId] - Update board settings (Admin only)
async function updateBoardHandler(req: AuthenticatedRequest, context: BoardRouteParams) {
  const { communityId, boardId } = context.params;
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

// DELETE function was here but commented out due to TypeScript issues

*/ 

// Placeholder exports to satisfy Next.js App Router
import { NextResponse } from 'next/server';

export async function PATCH() {
  return NextResponse.json({ error: 'Route temporarily disabled' }, { status: 503 });
}

export async function DELETE() {
  return NextResponse.json({ error: 'Route temporarily disabled' }, { status: 503 });
}
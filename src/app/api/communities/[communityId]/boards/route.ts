import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { query } from '@/lib/db';

interface BoardsRouteParams {
  params: {
    communityId: string;
  };
}

export interface ApiBoard {
  id: number;
  name: string;
  description: string | null;
  // Add other fields like post_count if you implement it later
}

async function getCommunityBoardsHandler(req: AuthenticatedRequest, context: BoardsRouteParams) {
  const communityId = context.params.communityId;
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
      'SELECT id, name, description FROM boards WHERE community_id = $1 ORDER BY name ASC',
      [communityId]
    );

    const boards: ApiBoard[] = result.rows;
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
  const communityId = context.params.communityId;
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
    const { name, description } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Board name is required' }, { status: 400 });
    }

    // Check if board name already exists in this community
    const existingBoard = await query(
      'SELECT id FROM boards WHERE community_id = $1 AND LOWER(name) = LOWER($2)',
      [communityId, name.trim()]
    );

    if (existingBoard.rows.length > 0) {
      return NextResponse.json({ error: 'A board with this name already exists' }, { status: 409 });
    }

    // Create the board
    const result = await query(
      'INSERT INTO boards (community_id, name, description) VALUES ($1, $2, $3) RETURNING *',
      [communityId, name.trim(), description?.trim() || null]
    );

    const newBoard = result.rows[0];
    console.log(`[API] Board created: ${newBoard.name} (ID: ${newBoard.id}) in community ${communityId} by user ${requestingUserId}`);

    return NextResponse.json(newBoard, { status: 201 });

  } catch (error) {
    console.error(`[API] Error creating board for community ${communityId}:`, error);
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create board' }, { status: 500 });
  }
}

export const POST = withAuth(createBoardHandler, true); // true = admin only 
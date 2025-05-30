import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest, RouteContext } from '@/lib/withAuth';
import { query } from '@/lib/db';

// PATCH handler for moving posts between boards (admin only)
async function movePostHandler(req: AuthenticatedRequest, context: RouteContext) {
  const params = await context.params;
  const postId = parseInt(params.postId, 10);
  const requestingUserId = req.user?.sub;
  const requestingUserCommunityId = req.user?.cid;

  if (isNaN(postId)) {
    return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { boardId } = body;

    if (!boardId || isNaN(parseInt(boardId))) {
      return NextResponse.json({ error: 'Valid board ID is required' }, { status: 400 });
    }

    // First, verify the post exists and get its current board info
    const postResult = await query(
      `SELECT p.id, p.board_id, b.community_id as current_community_id
       FROM posts p
       JOIN boards b ON p.board_id = b.id
       WHERE p.id = $1`,
      [postId]
    );

    if (postResult.rows.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const post = postResult.rows[0];

    // Verify the post belongs to the admin's community
    if (post.current_community_id !== requestingUserCommunityId) {
      return NextResponse.json({ error: 'You can only move posts within your own community' }, { status: 403 });
    }

    // Verify the target board exists and belongs to the same community
    const targetBoardResult = await query(
      'SELECT id, community_id FROM boards WHERE id = $1',
      [parseInt(boardId)]
    );

    if (targetBoardResult.rows.length === 0) {
      return NextResponse.json({ error: 'Target board not found' }, { status: 404 });
    }

    const targetBoard = targetBoardResult.rows[0];

    if (targetBoard.community_id !== requestingUserCommunityId) {
      return NextResponse.json({ error: 'Target board must be in your community' }, { status: 403 });
    }

    // Check if post is already in the target board
    if (post.board_id === parseInt(boardId)) {
      return NextResponse.json({ error: 'Post is already in the selected board' }, { status: 400 });
    }

    // Move the post to the new board
    await query(
      'UPDATE posts SET board_id = $1, updated_at = NOW() WHERE id = $2',
      [parseInt(boardId), postId]
    );

    console.log(`[API] Post ${postId} moved to board ${boardId} by admin ${requestingUserId}`);

    return NextResponse.json({ 
      message: 'Post moved successfully',
      postId,
      newBoardId: parseInt(boardId)
    });

  } catch (error) {
    console.error(`[API] Error moving post ${postId}:`, error);
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to move post' }, { status: 500 });
  }
}

export const PATCH = withAuth(movePostHandler, true); // true = admin only 
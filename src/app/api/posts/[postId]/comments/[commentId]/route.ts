import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest, RouteContext } from '@/lib/withAuth';
import { query } from '@/lib/db';

async function deleteCommentHandler(req: AuthenticatedRequest, context: RouteContext) {
  const params = await context.params;
  const commentId = parseInt(params.commentId, 10);
  if (isNaN(commentId)) {
    return NextResponse.json({ error: 'Invalid comment ID' }, { status: 400 });
  }

  try {
    await query('DELETE FROM comments WHERE id = $1', [commentId]);
    return NextResponse.json({ message: 'Comment deleted' });
  } catch (error) {
    console.error(`[API] Error deleting comment ${commentId}:`, error);
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }
}

export const DELETE = withAuth(deleteCommentHandler, true);

import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { query } from '@/lib/db';

interface VoteParams {
  params: {
    postId: string;
  };
}

// POST to upvote a post (protected)
async function addVoteHandler(req: AuthenticatedRequest, context: VoteParams) {
  const user = req.user;
  const postId = parseInt(context.params.postId, 10);

  if (!user || !user.sub) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (isNaN(postId)) {
    return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
  }

  // TODO: Implement actual vote insert and post.upvote_count increment
  // Ensure atomicity (transaction)
  // Handle unique constraint violation (already voted)
  console.log(`[API] POST /api/posts/${postId}/votes called by user:`, user.sub);
  return NextResponse.json({ message: `POST /api/posts/${postId}/votes - Not Implemented` }, { status: 501 });
}

// DELETE to remove an upvote (protected)
async function removeVoteHandler(req: AuthenticatedRequest, context: VoteParams) {
  const user = req.user;
  const postId = parseInt(context.params.postId, 10);

  if (!user || !user.sub) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (isNaN(postId)) {
    return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
  }

  // TODO: Implement actual vote delete and post.upvote_count decrement
  // Ensure atomicity (transaction)
  console.log(`[API] DELETE /api/posts/${postId}/votes called by user:`, user.sub);
  return NextResponse.json({ message: `DELETE /api/posts/${postId}/votes - Not Implemented` }, { status: 501 });
}

export const POST = withAuth(addVoteHandler, false);
export const DELETE = withAuth(removeVoteHandler, false); 
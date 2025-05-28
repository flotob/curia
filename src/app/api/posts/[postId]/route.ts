import { NextResponse, NextRequest } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { query } from '@/lib/db';

interface SinglePostParams {
  params: {
    postId: string;
  };
}

// GET a single post by ID (now protected)
async function getSinglePostHandler(req: AuthenticatedRequest, context: SinglePostParams) {
  const postId = parseInt(context.params.postId, 10);
  const userId = req.user?.sub;

  if (isNaN(postId)) {
    return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
  }

  // TODO: Implement fetching a single post by ID
  // - Join with users for author info
  // - If userId is available, calculate userHasUpvoted
  console.log(`[API] GET /api/posts/${postId} called`, userId ? `by user ${userId}` : 'by unauthenticated user (should be blocked by withAuth)');
  return NextResponse.json({ message: `GET /api/posts/${postId} - Not Implemented` }, { status: 501 });
}

export const GET = withAuth(getSinglePostHandler, false);

// Future: Add PUT/DELETE handlers here for post management if needed, protected by withAuth 
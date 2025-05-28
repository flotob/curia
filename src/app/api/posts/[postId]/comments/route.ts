import { NextResponse, NextRequest } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { query } from '@/lib/db';

interface CommentRouteParams {
  params: {
    postId: string;
  };
}

// GET comments for a post (publicly accessible)
export async function GET(req: NextRequest, context: CommentRouteParams) {
  const postId = parseInt(context.params.postId, 10);
  if (isNaN(postId)) {
    return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
  }

  // TODO: Implement fetching comments for postId
  // - Join with users for author info
  // - Handle threading (parent_comment_id)
  // - Order by created_at
  console.log(`[API] GET /api/posts/${postId}/comments called`);
  return NextResponse.json({ message: `GET /api/posts/${postId}/comments - Not Implemented` }, { status: 501 });
}

// POST a new comment (protected)
async function createCommentHandler(req: AuthenticatedRequest, context: CommentRouteParams) {
  const user = req.user;
  const postId = parseInt(context.params.postId, 10);

  if (!user || !user.sub) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (isNaN(postId)) {
    return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { content, parent_comment_id } = body;

    if (!content) {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 });
    }

    // TODO: Implement actual comment insert
    // TODO: Increment post.comment_count
    // Ensure atomicity (transaction)
    console.log(`[API] POST /api/posts/${postId}/comments called by user:`, user.sub, 'with body:', body);
    return NextResponse.json({ message: `POST /api/posts/${postId}/comments - Not Implemented`, received: body }, { status: 501 });

  } catch (error) {
    console.error('[API] Error creating comment:', error);
    if (error instanceof SyntaxError) { // from req.json()
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}

export const POST = withAuth(createCommentHandler, false); 
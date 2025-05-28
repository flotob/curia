import { NextResponse, NextRequest } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { query } from '@/lib/db';

// GET all posts (now protected to get user context for userHasUpvoted)
async function getAllPostsHandler(req: AuthenticatedRequest) {
  const userId = req.user?.sub; // User ID will be available if authenticated

  // TODO: Implement fetching posts
  // - Join with users for author info
  // - If userId is available, calculate userHasUpvoted for each post.
  // - Sort by upvote_count DESC, then created_at DESC
  // - Implement pagination
  console.log('[API] GET /api/posts called', userId ? `by user ${userId}` : 'by unauthenticated user (should be blocked by withAuth if no token)');
  return NextResponse.json({ message: 'GET /api/posts - Not Implemented' }, { status: 501 });
}
export const GET = withAuth(getAllPostsHandler, false); // Protect with withAuth, not admin-only

// POST a new post (protected by withAuth)
async function createPostHandler(req: AuthenticatedRequest) {
  const user = req.user; // From withAuth
  if (!user || !user.sub) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { title, content, tags } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    // TODO: Implement actual database insert
    // const result = await query(
    //   'INSERT INTO posts (author_user_id, title, content, tags) VALUES ($1, $2, $3, $4) RETURNING *',
    //   [user.sub, title, content, tags || []]
    // );
    // const newPost = result.rows[0];
    
    console.log('[API] POST /api/posts called by user:', user.sub, 'with body:', body);
    return NextResponse.json({ message: 'POST /api/posts - Not Implemented', received: body }, { status: 501 }); // Replace with newPost

  } catch (error) {
    console.error('[API] Error creating post:', error);
    if (error instanceof SyntaxError) { // from req.json()
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}

export const POST = withAuth(createPostHandler, false); // false = any authenticated user can post (for now) 
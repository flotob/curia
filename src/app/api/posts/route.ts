import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { query } from '@/lib/db';

// Interface for the structure of a post when returned by the API
export interface ApiPost {
  id: number;
  author_user_id: string;
  title: string;
  content: string;
  tags: string[] | null;
  upvote_count: number;
  comment_count: number;
  created_at: string; // ISO string format
  updated_at: string; // ISO string format
  author_name: string | null; // Joined from users table
  author_profile_picture_url: string | null; // Joined from users table
  user_has_upvoted: boolean; // Calculated based on current user
}

// GET all posts (now protected to get user context for userHasUpvoted)
async function getAllPostsHandler(req: AuthenticatedRequest) {
  const currentUserId = req.user?.sub; 
  const currentCommunityId = req.user?.cid; // Get communityId from JWT
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const offset = (page - 1) * limit;

  // If no community context, we cannot fetch relevant posts.
  // This could happen if a token doesn't have cid, or if the route is somehow hit unauthenticated (though withAuth should prevent that).
  if (!currentCommunityId) {
    console.warn('[API GET /api/posts] Attempted to fetch posts without a community ID in token.');
    return NextResponse.json({ posts: [], pagination: { currentPage: 1, totalPages: 0, totalPosts: 0, limit } }, { status: 200 }); // Return empty for no community
  }

  try {
    let postsQueryText = `
      SELECT
        p.id, p.author_user_id, p.title, p.content, p.tags,
        p.upvote_count, p.comment_count, p.created_at, p.updated_at,
        u.name AS author_name, u.profile_picture_url AS author_profile_picture_url
        ${currentUserId ? ", CASE WHEN v.user_id IS NOT NULL THEN TRUE ELSE FALSE END AS user_has_upvoted" : ""}
      FROM posts p
      JOIN users u ON p.author_user_id = u.user_id
      JOIN boards b ON p.board_id = b.id
      ${currentUserId ? "LEFT JOIN votes v ON p.id = v.post_id AND v.user_id = $1" : ""}
      WHERE b.community_id = $${currentUserId ? 2 : 1} 
      ORDER BY p.upvote_count DESC, p.created_at DESC 
      LIMIT $${currentUserId ? 3 : 2} OFFSET $${currentUserId ? 4 : 3};
    `;

    const queryParams: any[] = [];
    if (currentUserId) queryParams.push(currentUserId);
    queryParams.push(currentCommunityId);
    queryParams.push(limit);
    queryParams.push(offset);

    const result = await query(postsQueryText, queryParams);
    const posts: ApiPost[] = result.rows.map(row => ({
      ...row,
      user_has_upvoted: row.user_has_upvoted === undefined ? false : row.user_has_upvoted,
    }));

    // Get total count for pagination metadata, specific to the community
    const totalPostsResult = await query(
      `SELECT COUNT(p.id) FROM posts p
       JOIN boards b ON p.board_id = b.id
       WHERE b.community_id = $1`,
      [currentCommunityId]
    );
    const totalPosts = parseInt(totalPostsResult.rows[0].count, 10);

    return NextResponse.json({
      posts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalPosts / limit),
        totalPosts,
        limit,
      },
    });

  } catch (error) {
    console.error('[API] Error fetching posts:', error);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}
export const GET = withAuth(getAllPostsHandler, false); // Protect with withAuth, not admin-only

// POST a new post (protected by withAuth)
async function createPostHandler(req: AuthenticatedRequest) {
  const user = req.user;
  if (!user || !user.sub || !user.cid) { // Also check for user.cid (communityId)
    return NextResponse.json({ error: 'Authentication required, or community ID missing in token' }, { status: 401 });
  }
  const currentCommunityId = user.cid;

  try {
    const body = await req.json();
    const { title, content, tags } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    // Find the default board ID for the user's current community
    const defaultBoardName = 'General Discussion';
    let boardId: number | null = null;
    try {
      const boardResult = await query(
        'SELECT id FROM boards WHERE community_id = $1 AND name = $2 LIMIT 1',
        [currentCommunityId, defaultBoardName]
      );
      if (boardResult.rows.length > 0) {
        boardId = boardResult.rows[0].id;
      } else {
        // This case should ideally not happen if /api/auth/session correctly creates the default board.
        // However, as a fallback, try to create it here too, or log a critical error.
        console.warn(`[/api/posts] Default board '${defaultBoardName}' not found for community ${currentCommunityId}. Attempting to create.`);
        const newBoardResult = await query(
          `INSERT INTO boards (community_id, name, description, updated_at)
           VALUES ($1, $2, $3, NOW()) RETURNING id;`,
          [currentCommunityId, defaultBoardName, 'Main discussion board for the community.']
        );
        if (newBoardResult.rows.length > 0) {
            boardId = newBoardResult.rows[0].id;
            console.log(`[/api/posts] Created default board ${boardId} for community ${currentCommunityId} as fallback.`);
        } else {
            throw new Error(`Failed to find or create default board for community ${currentCommunityId}`);
        }
      }
    } catch (dbError) {
      console.error(`[/api/posts] Error finding/creating default board for community ${currentCommunityId}:`, dbError);
      return NextResponse.json({ error: 'Database error finding board' }, { status: 500 });
    }

    if (!boardId) {
        // Should be caught by the error above, but as a safeguard.
        return NextResponse.json({ error: 'Could not determine board for post' }, { status: 500 });
    }
    
    const result = await query(
      'INSERT INTO posts (author_user_id, title, content, tags, board_id, upvote_count, comment_count) VALUES ($1, $2, $3, $4, $5, 0, 0) RETURNING *',
      [user.sub, title, content, tags || [], boardId]
    );
    const newPost = result.rows[0];
        
    console.log('[API] POST /api/posts called by user:', user.sub, 'with body:', body);
    // To return the full ApiPost structure, we'd need to re-query or construct it here.
    // For now, just returning the created post from DB.
    return NextResponse.json(newPost, { status: 201 }); 

  } catch (error) {
    console.error('[API] Error creating post:', error);
    if (error instanceof SyntaxError) { // from req.json()
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}

export const POST = withAuth(createPostHandler, false); // false = any authenticated user can post (for now) 
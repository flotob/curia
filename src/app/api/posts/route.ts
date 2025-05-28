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
  const currentUserId = req.user?.sub; // User ID from JWT, if authenticated
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const offset = (page - 1) * limit;

  try {
    // Base query to fetch posts and join with author details
    let postsQuery = `
      SELECT
        p.id,
        p.author_user_id,
        p.title,
        p.content,
        p.tags,
        p.upvote_count,
        p.comment_count,
        p.created_at,
        p.updated_at,
        u.name AS author_name,
        u.profile_picture_url AS author_profile_picture_url
      FROM posts p
      JOIN users u ON p.author_user_id = u.user_id
    `;

    // If the user is authenticated, we need to join with the votes table
    // to determine if the current user has upvoted each post.
    // We use a LEFT JOIN because we want all posts, even if the current user hasn't voted.
    if (currentUserId) {
      postsQuery = `
        SELECT
          p.id,
          p.author_user_id,
          p.title,
          p.content,
          p.tags,
          p.upvote_count,
          p.comment_count,
          p.created_at,
          p.updated_at,
          u.name AS author_name,
          u.profile_picture_url AS author_profile_picture_url,
          CASE WHEN v.user_id IS NOT NULL THEN TRUE ELSE FALSE END AS user_has_upvoted
        FROM posts p
        JOIN users u ON p.author_user_id = u.user_id
        LEFT JOIN votes v ON p.id = v.post_id AND v.user_id = $1
      `; // $1 will be currentUserId
    }

    postsQuery += `
      ORDER BY p.upvote_count DESC, p.created_at DESC
      LIMIT $${currentUserId ? 2 : 1} OFFSET $${currentUserId ? 3 : 2};
    `;

    const queryParams = currentUserId ? [currentUserId, limit, offset] : [limit, offset];

    const result = await query(postsQuery, queryParams);
    const posts: ApiPost[] = result.rows.map(row => ({
      ...row,
      // Ensure user_has_upvoted is explicitly false if currentUserId was not available for the query
      // (though the CASE WHEN should handle it, this is a fallback)
      user_has_upvoted: row.user_has_upvoted === undefined ? false : row.user_has_upvoted,
    }));

    // Get total count for pagination metadata
    const totalPostsResult = await query('SELECT COUNT(*) FROM posts');
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
    
    const result = await query(
      'INSERT INTO posts (author_user_id, title, content, tags, upvote_count, comment_count) VALUES ($1, $2, $3, $4, 0, 0) RETURNING *',
      [user.sub, title, content, tags || []] // Ensure tags is an array, default to empty if null/undefined
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
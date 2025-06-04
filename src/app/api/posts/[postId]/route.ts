import { /* NextRequest, */ NextResponse } from 'next/server';
import { AuthenticatedRequest, withAuth, RouteContext } from '@/lib/withAuth';
import { query } from '@/lib/db';
import { canUserAccessBoard } from '@/lib/boardPermissions';
import { ApiPost } from '@/app/api/posts/route';

// GET a single post by ID with board access control and enhanced data
async function getSinglePostHandler(req: AuthenticatedRequest, context: RouteContext) {
  const params = await context.params;
  const postId = parseInt(params.postId, 10);
  const userId = req.user?.sub;
  const userRoles = req.user?.roles;
  const isAdmin = req.user?.adm || false;
  const userCommunityId = req.user?.cid;

  if (isNaN(postId)) {
    return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
  }

  try {
    console.log(`[API] GET /api/posts/${postId} called by user ${userId}`);

    // Get post with all related data in a single query
    const result = await query(`
      SELECT 
        p.id,
        p.author_user_id,
        p.title,
        p.content,
        p.tags,
        p.settings,
        p.upvote_count,
        p.comment_count,
        p.created_at,
        p.updated_at,
        p.board_id,
        b.name as board_name,
        b.settings as board_settings,
        b.community_id,
        u.name as author_name,
        u.profile_picture_url as author_profile_picture_url,
        CASE WHEN v.user_id IS NOT NULL THEN true ELSE false END as user_has_upvoted
      FROM posts p
      JOIN boards b ON p.board_id = b.id  
      JOIN users u ON p.author_user_id = u.user_id
      LEFT JOIN votes v ON p.id = v.post_id AND v.user_id = $2
      WHERE p.id = $1
    `, [postId, userId || null]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const postData = result.rows[0];
    
    // Verify post belongs to user's community
    if (postData.community_id !== userCommunityId) {
      console.warn(`[API GET /api/posts/${postId}] User ${userId} from community ${userCommunityId} attempted to access post from community ${postData.community_id}`);
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Parse board settings
    const boardSettings = typeof postData.board_settings === 'string' 
      ? JSON.parse(postData.board_settings) 
      : postData.board_settings;
    
    // Check board access permissions
    if (!canUserAccessBoard(userRoles, boardSettings, isAdmin)) {
      console.warn(`[API GET /api/posts/${postId}] User ${userId} attempted to access post from restricted board ${postData.board_id}`);
      return NextResponse.json({ error: 'You do not have permission to view this post' }, { status: 403 });
    }

    // Format the response as ApiPost
    const post: ApiPost = {
      id: postData.id,
      author_user_id: postData.author_user_id,
      title: postData.title,
      content: postData.content,
      tags: postData.tags,
      settings: typeof postData.settings === 'string' ? JSON.parse(postData.settings) : (postData.settings || {}),
      upvote_count: postData.upvote_count,
      comment_count: postData.comment_count,
      created_at: postData.created_at,
      updated_at: postData.updated_at,
      author_name: postData.author_name,
      author_profile_picture_url: postData.author_profile_picture_url,
      user_has_upvoted: postData.user_has_upvoted,
      board_id: postData.board_id,
      board_name: postData.board_name
    };

    console.log(`[API] Successfully retrieved post ${postId} for user ${userId}`);
    return NextResponse.json(post);

  } catch (error) {
    console.error(`[API] Error fetching post ${postId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 });
  }
}

export const GET = withAuth(getSinglePostHandler, false);

// DELETE a post (admin only)
async function deletePostHandler(req: AuthenticatedRequest, context: RouteContext) {
  const params = await context.params;
  const postId = parseInt(params.postId, 10);
  
  if (isNaN(postId)) {
    return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
  }

  try {
    await query('DELETE FROM posts WHERE id = $1', [postId]);
    return NextResponse.json({ message: 'Post deleted' });
  } catch (error) {
    console.error(`[API] Error deleting post ${postId}:`, error);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}

export const DELETE = withAuth(deletePostHandler, true);

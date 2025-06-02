import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest, RouteContext } from '@/lib/withAuth';
import { query, getClient } from '@/lib/db';
import { canUserAccessBoard } from '@/lib/boardPermissions';

// Interface for the structure of a comment when returned by the API
export interface ApiComment {
  id: number;
  post_id: number;
  author_user_id: string;
  parent_comment_id: number | null;
  content: string;
  created_at: string; // ISO string format
  updated_at: string; // ISO string format
  author_name: string | null;
  author_profile_picture_url: string | null;
}

// GET comments for a post (now protected and permission-checked)
async function getCommentsHandler(req: AuthenticatedRequest, context: RouteContext) {
  const params = await context.params;
  const postId = parseInt(params.postId, 10);
  const userRoles = req.user?.roles;
  const isAdmin = req.user?.adm || false;
  const userId = req.user?.sub;
  const userCommunityId = req.user?.cid;

  if (isNaN(postId)) {
    return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
  }

  try {
    // SECURITY: First, check if user can access the board where this post belongs
    const postBoardResult = await query(
      `SELECT p.board_id, b.settings, b.community_id 
       FROM posts p 
       JOIN boards b ON p.board_id = b.id 
       WHERE p.id = $1`,
      [postId]
    );

    if (postBoardResult.rows.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const { board_id, settings, community_id } = postBoardResult.rows[0];
    
    // Verify post belongs to user's community
    if (community_id !== userCommunityId) {
      console.warn(`[API GET /api/posts/${postId}/comments] User ${userId} from community ${userCommunityId} attempted to access post from community ${community_id}`);
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const boardSettings = typeof settings === 'string' ? JSON.parse(settings) : settings;
    
    // Check board access permissions
    if (!canUserAccessBoard(userRoles, boardSettings, isAdmin)) {
      console.warn(`[API GET /api/posts/${postId}/comments] User ${userId} attempted to access comments from restricted board ${board_id}`);
      return NextResponse.json({ error: 'You do not have permission to view this post' }, { status: 403 });
    }

    // User has permission, fetch comments
    const result = await query(
      `SELECT 
        c.id,
        c.post_id,
        c.author_user_id,
        c.parent_comment_id,
        c.content,
        c.created_at,
        c.updated_at,
        u.name AS author_name,
        u.profile_picture_url AS author_profile_picture_url
      FROM comments c
      JOIN users u ON c.author_user_id = u.user_id
      WHERE c.post_id = $1
      ORDER BY c.created_at ASC`,
      [postId]
    );

    const comments: ApiComment[] = result.rows;
    return NextResponse.json(comments);

  } catch (error) {
    console.error(`[API] Error fetching comments for post ${postId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

// POST a new comment (protected and permission-checked)
async function createCommentHandler(req: AuthenticatedRequest, context: RouteContext) {
  const user = req.user;
  const params = await context.params;
  const postId = parseInt(params.postId, 10);
  const userRoles = user?.roles;
  const isAdmin = user?.adm || false;
  const userCommunityId = user?.cid;

  if (!user || !user.sub) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (isNaN(postId)) {
    return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
  }

  try {
    // SECURITY: First, check if user can access the board where this post belongs
    const postBoardResult = await query(
      `SELECT p.board_id, p.title as post_title, b.settings, b.community_id, b.name as board_name
       FROM posts p 
       JOIN boards b ON p.board_id = b.id 
       WHERE p.id = $1`,
      [postId]
    );

    if (postBoardResult.rows.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const { board_id, post_title, settings, community_id, board_name } = postBoardResult.rows[0];
    
    // Verify post belongs to user's community
    if (community_id !== userCommunityId) {
      console.warn(`[API POST /api/posts/${postId}/comments] User ${user.sub} from community ${userCommunityId} attempted to comment on post from community ${community_id}`);
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const boardSettings = typeof settings === 'string' ? JSON.parse(settings) : settings;
    
    // Check board access permissions
    if (!canUserAccessBoard(userRoles, boardSettings, isAdmin)) {
      console.warn(`[API POST /api/posts/${postId}/comments] User ${user.sub} attempted to comment on restricted board ${board_id}`);
      return NextResponse.json({ error: 'You do not have permission to comment on this post' }, { status: 403 });
    }

    const body = await req.json();
    const { content, parent_comment_id } = body;

    if (!content || String(content).trim() === '') {
      return NextResponse.json({ error: 'Comment content cannot be empty' }, { status: 400 });
    }

    // Start transaction
    const dbClient = await getClient(); // Assumes getClient is exported from @/lib/db for transactions
    try {
      await dbClient.query('BEGIN');
      
      const result = await dbClient.query(
        'INSERT INTO comments (post_id, author_user_id, parent_comment_id, content) VALUES ($1, $2, $3, $4) RETURNING *',
        [postId, user.sub, parent_comment_id || null, content]
      );
      const newComment = result.rows[0];

      // Increment comment_count on the posts table
      await dbClient.query(
        'UPDATE posts SET comment_count = comment_count + 1 WHERE id = $1',
        [postId]
      );

      await dbClient.query('COMMIT');
      
      // Refetch the full comment with author details to return
      const fullCommentResult = await dbClient.query(
        `SELECT c.*, u.name AS author_name, u.profile_picture_url AS author_profile_picture_url 
         FROM comments c JOIN users u ON c.author_user_id = u.user_id WHERE c.id = $1`,
        [newComment.id]
      );

      const commentWithAuthor = fullCommentResult.rows[0];

      const emitter = process.customEventEmitter;
      console.log('[API /api/posts/.../comments POST] Attempting to use process.customEventEmitter. Emitter available:', !!emitter);
      if (emitter && typeof emitter.emit === 'function') {
        emitter.emit('broadcastEvent', {
          room: `board:${board_id}`,
          eventName: 'newComment',
          payload: {
            postId: postId,
            post_title: post_title,
            board_id: board_id,
            board_name: board_name,
            comment: {
              id: commentWithAuthor.id,
              post_id: commentWithAuthor.post_id,
              author_user_id: commentWithAuthor.author_user_id,
              author_name: commentWithAuthor.author_name,
              author_profile_picture_url: commentWithAuthor.author_profile_picture_url,
              content: commentWithAuthor.content,
              created_at: commentWithAuthor.created_at,
              parent_comment_id: commentWithAuthor.parent_comment_id,
              board_id: board_id,
              post_title: post_title,
              board_name: board_name
            }
          }
        });
        console.log('[API /api/posts/.../comments POST] Successfully emitted event on process.customEventEmitter for new comment with correct structure.');
      } else {
        console.error('[API /api/posts/.../comments POST] ERROR: process.customEventEmitter not available.');
      }

      return NextResponse.json(commentWithAuthor, { status: 201 });

    } catch (txError) {
      await dbClient.query('ROLLBACK');
      throw txError; // Re-throw to be caught by outer catch
    } finally {
      dbClient.release();
    }

  } catch (error) {
    console.error(`[API] Error creating comment for post ${postId} by user ${user?.sub}:`, error);
    if (error instanceof SyntaxError) { 
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}

export const GET = withAuth(getCommentsHandler, false);
export const POST = withAuth(createCommentHandler, false); 
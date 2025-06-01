import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { query } from '@/lib/db';
import { getAccessibleBoardIds } from '@/lib/boardPermissions';
import { socketEvents } from '@/lib/socket';

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
  board_id: number; // Board ID
  board_name: string; // Board name from boards table
}

// Cursor data interface for parsing
interface CursorData {
  upvoteCount: number;
  createdAt: string;
  postId: number;
}

// Generate cursor from post data
function generateCursor(post: ApiPost): string {
  // Ensure we use ISO format for the date that PostgreSQL can understand
  const isoDate = new Date(post.created_at).toISOString();
  return `${post.upvote_count}_${isoDate}_${post.id}`;
}

// Parse cursor string into structured data
function parseCursor(cursor: string): CursorData | null {
  if (!cursor) return null;
  
  try {
    const parts = cursor.split('_');
    if (parts.length !== 3) {
      console.warn('[API] Invalid cursor format - expected 3 parts:', cursor);
      return null;
    }
    
    const [upvoteCount, createdAt, postId] = parts;
    
    // Validate that createdAt is a valid ISO date
    const date = new Date(createdAt);
    if (isNaN(date.getTime())) {
      console.warn('[API] Invalid date in cursor:', createdAt);
      return null;
    }
    
    return {
      upvoteCount: parseInt(upvoteCount, 10),
      createdAt: createdAt, // Keep as ISO string for PostgreSQL
      postId: parseInt(postId, 10)
    };
  } catch (error) {
    console.warn('[API] Invalid cursor format:', cursor, error);
    return null;
  }
}

// Build WHERE clause for cursor-based pagination
function buildCursorWhere(cursor: string | null, baseWhere: string, currentParamIndex: number): { where: string; params: (string | number)[] } {
  if (!cursor) return { where: baseWhere, params: [] };
  
  const cursorData = parseCursor(cursor);
  if (!cursorData) return { where: baseWhere, params: [] };
  
  const cursorWhere = `${baseWhere} AND (
    p.upvote_count < $${currentParamIndex} OR 
    (p.upvote_count = $${currentParamIndex} AND p.created_at < $${currentParamIndex + 1}) OR
    (p.upvote_count = $${currentParamIndex} AND p.created_at = $${currentParamIndex + 1} AND p.id < $${currentParamIndex + 2})
  )`;
  
  return {
    where: cursorWhere,
    params: [cursorData.upvoteCount, cursorData.createdAt, cursorData.postId]
  };
}

// GET all posts (now with cursor-based pagination)
async function getAllPostsHandler(req: AuthenticatedRequest) {
  const currentUserId = req.user?.sub; 
  const currentCommunityId = req.user?.cid; // Get communityId from JWT
  const userRoles = req.user?.roles; // Get user roles from JWT
  const isAdmin = req.user?.adm || false; // Get admin status from JWT
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get('cursor'); // Replace page param with cursor
  const limit = parseInt(searchParams.get('limit') || '20', 10); // Increase default for infinite scroll
  const boardId = searchParams.get('boardId'); // Board filtering

  // If no community context, we cannot fetch relevant posts.
  if (!currentCommunityId) {
    console.warn('[API GET /api/posts] Attempted to fetch posts without a community ID in token.');
    return NextResponse.json({ 
      posts: [], 
      pagination: { nextCursor: null, hasMore: false, limit } 
    }, { status: 200 });
  }

  try {
    // SECURITY: Get accessible boards based on user permissions
    const boardsResult = await query(
      'SELECT id, settings FROM boards WHERE community_id = $1',
      [currentCommunityId]
    );
    
    const allBoards = boardsResult.rows.map(row => ({
      ...row,
      settings: typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings
    }));
    
    // Filter boards based on user permissions
    const accessibleBoardIds = getAccessibleBoardIds(allBoards, userRoles, isAdmin);
    
    // If user has no accessible boards, return empty result
    if (accessibleBoardIds.length === 0) {
      console.warn(`[API GET /api/posts] User ${currentUserId} has no accessible boards in community ${currentCommunityId}`);
      return NextResponse.json({ 
        posts: [], 
        pagination: { nextCursor: null, hasMore: false, limit } 
      }, { status: 200 });
    }
    
    // If boardId is specified, verify user can access that specific board
    if (boardId) {
      const requestedBoardId = parseInt(boardId, 10);
      if (!accessibleBoardIds.includes(requestedBoardId)) {
        console.warn(`[API GET /api/posts] User ${currentUserId} attempted to access restricted board ${requestedBoardId}`);
        return NextResponse.json({ 
          posts: [], 
          pagination: { nextCursor: null, hasMore: false, limit } 
        }, { status: 200 });
      }
    }
    // Build base query parameters
    const baseParams: (string | number)[] = [];
    if (currentUserId) baseParams.push(currentUserId);
    baseParams.push(currentCommunityId);
    
    // Build base WHERE clause - filter by community and accessible boards
    let baseWhere = `WHERE b.community_id = $${currentUserId ? '2' : '1'}`;
    
    // SECURITY: Only include posts from boards user can access
    if (boardId) {
      // If specific board requested, we already verified access above
      baseWhere += ` AND p.board_id = $${baseParams.length + 1}`;
      baseParams.push(parseInt(boardId, 10));
    } else {
      // Filter to only accessible boards
      const boardIdPlaceholders = accessibleBoardIds.map((_, index) => `$${baseParams.length + index + 1}`).join(', ');
      baseWhere += ` AND p.board_id IN (${boardIdPlaceholders})`;
      baseParams.push(...accessibleBoardIds);
    }

    // Build cursor-based WHERE clause
    const { where: whereClause, params: cursorParams } = buildCursorWhere(
      cursor, 
      baseWhere, 
      baseParams.length + 1
    );

    // Combine all parameters
    const allParams = [...baseParams, ...cursorParams];

    const postsQueryText = `
      SELECT
        p.id, p.author_user_id, p.title, p.content, p.tags,
        p.upvote_count, p.comment_count, p.created_at, p.updated_at,
        u.name AS author_name, u.profile_picture_url AS author_profile_picture_url,
        b.id AS board_id, b.name AS board_name
        ${currentUserId ? ", CASE WHEN v.user_id IS NOT NULL THEN TRUE ELSE FALSE END AS user_has_upvoted" : ""}
      FROM posts p
      JOIN users u ON p.author_user_id = u.user_id
      JOIN boards b ON p.board_id = b.id
      ${currentUserId ? "LEFT JOIN votes v ON p.id = v.post_id AND v.user_id = $1" : ""}
      ${whereClause}
      ORDER BY p.upvote_count DESC, p.created_at DESC, p.id DESC
      LIMIT $${allParams.length + 1};
    `;

    allParams.push(limit);

    const result = await query(postsQueryText, allParams);
    const posts: ApiPost[] = result.rows.map(row => ({
      ...row,
      user_has_upvoted: row.user_has_upvoted === undefined ? false : row.user_has_upvoted,
    }));

    // Generate next cursor from last post (if we have a full page)
    const nextCursor = posts.length === limit && posts.length > 0 
      ? generateCursor(posts[posts.length - 1])
      : null;

    return NextResponse.json({
      posts,
      pagination: {
        nextCursor,
        hasMore: posts.length === limit,
        limit,
      },
    });

  } catch (error) {
    console.error('[API] Error fetching posts:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
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
  const userRoles = user.roles;
  const isAdmin = user.adm || false;

  try {
    const body = await req.json();
    const { title, content, tags, boardId } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    if (!boardId) {
      return NextResponse.json({ error: 'Board selection is required' }, { status: 400 });
    }

    // Verify the board exists and belongs to the user's community
    const boardResult = await query(
      'SELECT id, settings FROM boards WHERE id = $1 AND community_id = $2',
      [parseInt(boardId), currentCommunityId]
    );

    if (boardResult.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid board or board does not belong to your community' }, { status: 400 });
    }

    const board = boardResult.rows[0];
    const boardSettings = typeof board.settings === 'string' ? JSON.parse(board.settings) : board.settings;
    
    // SECURITY: Verify user can access this board before allowing post creation
    const { canUserAccessBoard } = await import('@/lib/boardPermissions');
    if (!canUserAccessBoard(userRoles, boardSettings, isAdmin)) {
      console.warn(`[API POST /api/posts] User ${user.sub} attempted to post in restricted board ${boardId}`);
      return NextResponse.json({ error: 'You do not have permission to post in this board' }, { status: 403 });
    }

    const validBoardId = board.id;
    
    const result = await query(
      'INSERT INTO posts (author_user_id, title, content, tags, board_id, upvote_count, comment_count) VALUES ($1, $2, $3, $4, $5, 0, 0) RETURNING *',
      [user.sub, title, content, tags || [], validBoardId]
    );
    const newPost: ApiPost = {
      ...result.rows[0],
      author_name: user.name || null, // Get from JWT
      author_profile_picture_url: user.picture || null, // Get from JWT
      user_has_upvoted: false, // New post, so user cannot have upvoted yet
      board_name: '' // This would require another query or joining in the INSERT, for now empty
    };

    // 🚀 REAL-TIME: Broadcast new post to board room
    socketEvents.broadcastNewPost(validBoardId, {
      id: newPost.id,
      title: newPost.title,
      author_user_id: newPost.author_user_id,
      author_name: newPost.author_name,
      author_profile_picture_url: newPost.author_profile_picture_url,
      created_at: newPost.created_at,
      upvote_count: newPost.upvote_count,
      comment_count: newPost.comment_count,
      board_id: validBoardId
    });
        
    console.log('[API] POST /api/posts called by user:', user.sub, 'with body:', body);
    return NextResponse.json(newPost, { status: 201 }); 

  } catch (error) {
    console.error('[API] Error creating post:', error);
    if (error instanceof SyntaxError) { // from req.json()
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export const POST = withAuth(createPostHandler, false); // false = any authenticated user can post (for now) 
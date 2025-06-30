import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { query } from '@/lib/db';
import { ValidationService } from '@/lib/services/ValidationService';

interface BookmarkData {
  id: string;
  postId: number;
  userId: string;
  createdAt: string;
  post?: {
    id: number;
    title: string;
    boardId: number;
    boardName?: string;
  };
}

// GET /api/users/[userId]/bookmarks - Get user's bookmarks
export const GET = withAuth(async (req: AuthenticatedRequest, context: { params: Promise<{ userId: string }> }) => {
  try {
    const { userId } = await context.params;
    const currentUserId = req.user?.sub;

    // Validate user can access these bookmarks (only own bookmarks)
    if (userId !== currentUserId) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot access other users\' bookmarks' },
        { status: 403 }
      );
    }

    // Get bookmarks with post information
    const bookmarks = await query(`
      SELECT 
        b.id,
        b.post_id as "postId",
        b.user_id as "userId",
        b.created_at as "createdAt",
        p.id as "postId",
        p.title as "postTitle",
        p.board_id as "postBoardId",
        board.name as "postBoardName"
      FROM bookmarks b
      LEFT JOIN posts p ON b.post_id = p.id
      LEFT JOIN boards board ON p.board_id = board.id
      WHERE b.user_id = $1
      ORDER BY b.created_at DESC
    `, [userId]);

    // Transform the results
    const formattedBookmarks: BookmarkData[] = bookmarks.rows.map(row => ({
      id: row.id,
      postId: row.postId,
      userId: row.userId,
      createdAt: row.createdAt,
      post: row.postTitle ? {
        id: row.postId,
        title: row.postTitle,
        boardId: row.postBoardId,
        boardName: row.postBoardName
      } : undefined
    }));

    return NextResponse.json({
      bookmarks: formattedBookmarks,
      total: formattedBookmarks.length
    });

  } catch (error) {
    console.error('[Bookmarks API] Error fetching bookmarks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookmarks' },
      { status: 500 }
    );
  }
});

// POST /api/users/[userId]/bookmarks - Create a new bookmark
export const POST = withAuth(async (req: AuthenticatedRequest, context: { params: Promise<{ userId: string }> }) => {
  try {
    const { userId } = await context.params;
    const currentUserId = req.user?.sub;

    // Validate user can create bookmarks for this user (only own bookmarks)
    if (userId !== currentUserId) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot create bookmarks for other users' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { postId } = body;

    // Validate request
    if (!ValidationService.isValidInteger(postId)) {
      return NextResponse.json(
        { error: 'Invalid post ID' },
        { status: 400 }
      );
    }

    // Check if post exists
    const postCheck = await query('SELECT id FROM posts WHERE id = $1', [postId]);
    if (postCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Check if bookmark already exists
    const existingBookmark = await query(
      'SELECT id FROM bookmarks WHERE user_id = $1 AND post_id = $2',
      [userId, postId]
    );

    if (existingBookmark.rows.length > 0) {
      return NextResponse.json(
        { error: 'Post already bookmarked' },
        { status: 409 }
      );
    }

    // Create bookmark
    const result = await query(
      'INSERT INTO bookmarks (user_id, post_id) VALUES ($1, $2) RETURNING id, user_id as "userId", post_id as "postId", created_at as "createdAt"',
      [userId, postId]
    );

    const newBookmark = result.rows[0];

    return NextResponse.json(newBookmark, { status: 201 });

  } catch (error) {
    console.error('[Bookmarks API] Error creating bookmark:', error);
    return NextResponse.json(
      { error: 'Failed to create bookmark' },
      { status: 500 }
    );
  }
});
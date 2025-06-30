import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest, RouteContext } from '@/lib/withAuth';
import { query } from '@/lib/db';

// DELETE /api/users/[userId]/bookmarks/[bookmarkId] - Delete a bookmark
export const DELETE = withAuth(async (
  req: AuthenticatedRequest, 
  context: RouteContext
) => {
  try {
    const params = await context.params;
    const userId = params.userId;
    const bookmarkId = params.bookmarkId;
    const currentUserId = req.user?.sub;

    // Validate user can delete this bookmark (only own bookmarks)
    if (userId !== currentUserId) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot delete other users\' bookmarks' },
        { status: 403 }
      );
    }

    // Check if bookmark exists and belongs to the user
    const existingBookmark = await query(
      'SELECT id FROM bookmarks WHERE id = $1 AND user_id = $2',
      [bookmarkId, userId]
    );

    if (existingBookmark.rows.length === 0) {
      return NextResponse.json(
        { error: 'Bookmark not found' },
        { status: 404 }
      );
    }

    // Delete the bookmark
    await query('DELETE FROM bookmarks WHERE id = $1 AND user_id = $2', [bookmarkId, userId]);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[Bookmarks API] Error deleting bookmark:', error);
    return NextResponse.json(
      { error: 'Failed to delete bookmark' },
      { status: 500 }
    );
  }
});
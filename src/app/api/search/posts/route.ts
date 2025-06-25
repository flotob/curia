import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { query } from '@/lib/db';
import { getAccessibleBoardIds, getAccessibleBoards } from '@/lib/boardPermissions';
import { ApiPost } from '@/app/api/posts/route';

// GET similar posts based on a query (now properly authenticated and community-scoped)
async function searchPostsHandler(req: AuthenticatedRequest) {
  const searchParams = req.nextUrl.searchParams;
  const searchQuery = searchParams.get('q');
  const boardId = searchParams.get('boardId'); // Optional board filtering
  
  const currentUserId = req.user?.sub;
  const currentCommunityId = req.user?.cid; // Get communityId from JWT
  const userRoles = req.user?.roles; // Get user roles from JWT
  const isAdmin = req.user?.adm || false; // Get admin status from JWT

  if (!searchQuery || searchQuery.trim().length < 3) {
    return NextResponse.json({ error: 'Search query must be at least 3 characters long' }, { status: 400 });
  }

  // SECURITY: Ensure user has community context
  if (!currentCommunityId) {
    console.warn('[API GET /api/search/posts] Attempted to search without a community ID in token.');
    return NextResponse.json({ error: 'Community context required' }, { status: 403 });
  }

  const searchTerm = `%${searchQuery.trim()}%`;
  const limit = 5; // Max number of suggestions to return

  try {
    // SECURITY: Get accessible boards based on user permissions (owned + imported)
    const allBoards = await getAccessibleBoards(currentCommunityId);
    
    // Filter boards based on user permissions
    const accessibleBoardIds = getAccessibleBoardIds(allBoards, userRoles, isAdmin);
    
    // If user has no accessible boards, return empty result
    if (accessibleBoardIds.length === 0) {
      console.warn(`[API GET /api/search/posts] User ${currentUserId} has no accessible boards in community ${currentCommunityId}`);
      return NextResponse.json([]);
    }

    // Build query with community and board access filtering
    let whereClause = `WHERE b.community_id = $1 AND (p.title ILIKE $2 OR p.content ILIKE $2)`;
    const queryParams: (string | number)[] = [currentCommunityId, searchTerm];
    
    // SECURITY: Filter to only accessible boards
    if (boardId) {
      // If specific board requested, verify user can access it
      const requestedBoardId = parseInt(boardId, 10);
      if (!accessibleBoardIds.includes(requestedBoardId)) {
        console.warn(`[API GET /api/search/posts] User ${currentUserId} attempted to search restricted board ${requestedBoardId}`);
        return NextResponse.json([]);
      }
      whereClause += ` AND p.board_id = $${queryParams.length + 1}`;
      queryParams.push(requestedBoardId);
    } else {
      // Filter to only accessible boards
      const boardIdPlaceholders = accessibleBoardIds.map((_, index) => `$${queryParams.length + index + 1}`).join(', ');
      whereClause += ` AND p.board_id IN (${boardIdPlaceholders})`;
      queryParams.push(...accessibleBoardIds);
    }

    const result = await query(
      `SELECT 
        p.id,
        p.author_user_id,
        p.title,
        p.content,
        p.tags,
        p.settings,
        p.lock_id,
        p.upvote_count,
        p.comment_count,
        p.created_at,
        p.updated_at,
        p.board_id,
        b.name AS board_name,
        u.name AS author_name,
        u.profile_picture_url AS author_profile_picture_url,
        false AS user_has_upvoted -- Search results don't need user-specific vote status for suggestions
      FROM posts p
      JOIN users u ON p.author_user_id = u.user_id
      JOIN boards b ON p.board_id = b.id
      ${whereClause}
      ORDER BY p.upvote_count DESC, p.created_at DESC
      LIMIT $${queryParams.length + 1}`,
      [...queryParams, limit]
    );

    const suggestedPosts: Partial<ApiPost>[] = result.rows.map(row => ({
      ...row,
      settings: typeof row.settings === 'string' ? JSON.parse(row.settings) : (row.settings || {}),
      // Add missing fields to match ApiPost interface
      share_access_count: 0,
      share_count: 0,
      last_shared_at: undefined,
      most_recent_access_at: undefined,
    }));

    console.log(`[API GET /api/search/posts] User ${currentUserId} found ${suggestedPosts.length} results for "${searchQuery}" in community ${currentCommunityId}`);
    return NextResponse.json(suggestedPosts);

  } catch (error) {
    console.error('[API] Error searching posts:', error);
    return NextResponse.json({ error: 'Failed to search posts' }, { status: 500 });
  }
}

export const GET = withAuth(searchPostsHandler); 
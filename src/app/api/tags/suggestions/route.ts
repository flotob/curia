import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { query } from '@/lib/db';
import { getAccessibleBoardIds, getAccessibleBoards } from '@/lib/boardPermissions';

// Interface for tag suggestion response
interface TagSuggestion {
  tag: string;
  usage_count: number;
  board_count?: number; // Number of boards using this tag
}

// GET tag suggestions for autocomplete (authenticated and community-scoped)
async function getTagSuggestionsHandler(req: AuthenticatedRequest) {
  const searchParams = req.nextUrl.searchParams;
  const searchQuery = searchParams.get('q'); // Optional search filter
  const boardId = searchParams.get('boardId'); // Optional board filtering
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50); // Cap at 50
  
  const currentUserId = req.user?.sub;
  const currentCommunityId = req.user?.cid;
  const userRoles = req.user?.roles;
  const isAdmin = req.user?.adm || false;

  // SECURITY: Ensure user has community context
  if (!currentCommunityId) {
    console.warn('[API GET /api/tags/suggestions] Attempted to get suggestions without community ID.');
    return NextResponse.json({ error: 'Community context required' }, { status: 403 });
  }

  try {
    // SECURITY: Get accessible boards based on user permissions (owned + imported)
    const allBoards = await getAccessibleBoards(currentCommunityId);
    
    // Filter boards based on user permissions
    const accessibleBoardIds = getAccessibleBoardIds(allBoards, userRoles, isAdmin);
    
    // If user has no accessible boards, return empty result
    if (accessibleBoardIds.length === 0) {
      console.warn(`[API GET /api/tags/suggestions] User ${currentUserId} has no accessible boards in community ${currentCommunityId}`);
      return NextResponse.json([]);
    }

    // Build query parameters
    const queryParams: (string | number)[] = [];
    let whereClause = 'WHERE 1=1';
    
    // SECURITY: Filter to only accessible boards
    if (boardId) {
      // Board-specific suggestions (when viewing a specific board)
      const requestedBoardId = parseInt(boardId, 10);
      if (!accessibleBoardIds.includes(requestedBoardId)) {
        console.warn(`[API GET /api/tags/suggestions] User ${currentUserId} attempted to get suggestions for restricted board ${requestedBoardId}`);
        return NextResponse.json([]);
      }
      whereClause += ` AND p.board_id = $${queryParams.length + 1}`;
      queryParams.push(requestedBoardId);
    } else {
      // Global suggestions (homepage) - filter to only accessible boards
      const boardIdPlaceholders = accessibleBoardIds.map((_, index) => `$${queryParams.length + index + 1}`).join(', ');
      whereClause += ` AND p.board_id IN (${boardIdPlaceholders})`;
      queryParams.push(...accessibleBoardIds);
    }

    // Add search filter if provided
    let searchFilter = '';
    if (searchQuery && searchQuery.trim().length > 0) {
      searchFilter = ` AND tag ILIKE $${queryParams.length + 1}`;
      queryParams.push(`%${searchQuery.trim()}%`);
    }

    // Build the query - unnest tags array and count usage
    const sqlQuery = `
      WITH tag_stats AS (
        SELECT 
          unnest(p.tags) as tag,
          COUNT(*) as usage_count,
          COUNT(DISTINCT p.board_id) as board_count
        FROM posts p
        JOIN boards b ON p.board_id = b.id
        ${whereClause}
        AND p.tags IS NOT NULL 
        AND array_length(p.tags, 1) > 0
        GROUP BY unnest(p.tags)
      )
      SELECT 
        tag,
        usage_count,
        board_count
      FROM tag_stats 
      WHERE tag IS NOT NULL AND trim(tag) != ''
      ${searchFilter}
      ORDER BY usage_count DESC, tag ASC
      LIMIT $${queryParams.length + 1}
    `;

    queryParams.push(limit);

    const result = await query(sqlQuery, queryParams);
    
    const suggestions: TagSuggestion[] = result.rows.map(row => ({
      tag: row.tag,
      usage_count: parseInt(row.usage_count, 10),
      board_count: parseInt(row.board_count, 10)
    }));

    const scopeDescription = boardId ? `board ${boardId}` : 'all accessible boards';
    const searchDescription = searchQuery ? ` matching "${searchQuery}"` : '';
    
    console.log(`[API GET /api/tags/suggestions] User ${currentUserId} found ${suggestions.length} tag suggestions from ${scopeDescription}${searchDescription}`);
    return NextResponse.json(suggestions);

  } catch (error) {
    console.error('[API] Error fetching tag suggestions:', error);
    return NextResponse.json({ error: 'Failed to fetch tag suggestions' }, { status: 500 });
  }
}

export const GET = withAuth(getTagSuggestionsHandler); 
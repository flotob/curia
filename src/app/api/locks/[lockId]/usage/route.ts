import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest, RouteContext } from '@/lib/withAuth';
import { query } from '@/lib/db';
import { getAccessibleBoardIds } from '@/lib/boardPermissions';

interface PostUsageData {
  id: number;
  title: string;
  board_id: number;
  board_name: string;
  author_name: string | null;
  created_at: string;
  upvote_count: number;
  comment_count: number;
}

interface BoardUsageData {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
}

interface LockUsageResponse {
  success: boolean;
  data: {
    posts: PostUsageData[];
    boards: BoardUsageData[];
    totalPostsUsingLock: number;
    totalBoardsUsingLock: number;
  };
}

// GET /api/locks/[lockId]/usage - Get lock usage data
async function getLockUsageHandler(req: AuthenticatedRequest, context: RouteContext) {
  const params = await context.params;
  const lockId = parseInt(params.lockId, 10);
  const currentUserId = req.user?.sub;
  const currentCommunityId = req.user?.cid;
  const isAdmin = req.user?.adm || false;
  
  if (isNaN(lockId)) {
    return NextResponse.json({ error: 'Invalid lock ID' }, { status: 400 });
  }
  
  if (!currentCommunityId || !currentUserId) {
    return NextResponse.json({ error: 'Authentication and community context required' }, { status: 401 });
  }
  
  try {
    console.log(`[API GET /api/locks/${lockId}/usage] User ${currentUserId} requesting usage data`);
    
    // First verify the lock exists and belongs to the user's community
    const lockCheck = await query('SELECT community_id FROM locks WHERE id = $1', [lockId]);
    
    if (lockCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Lock not found' }, { status: 404 });
    }
    
    if (lockCheck.rows[0].community_id !== currentCommunityId) {
      return NextResponse.json({ error: 'Lock not found' }, { status: 404 });
    }
    
    // Get all boards in the community and filter by access permissions
    const allBoardsResult = await query(`
      SELECT id, settings FROM boards WHERE community_id = $1
    `, [currentCommunityId]);
    
    // For user roles, we'll use a simple approach - admin check is sufficient for now
    const accessibleBoardIds = getAccessibleBoardIds(
      allBoardsResult.rows.map(b => ({ id: b.id, settings: b.settings })),
      [], // userRoles - simplified for now, can be enhanced later
      isAdmin
    );
    
    if (accessibleBoardIds.length === 0) {
      // User can't access any boards, return empty usage
      const response: LockUsageResponse = {
        success: true,
        data: {
          posts: [],
          boards: [],
          totalPostsUsingLock: 0,
          totalBoardsUsingLock: 0
        }
      };
      return NextResponse.json(response);
    }
    
    // Get all posts using this lock (filtered by accessible boards)
    let allPostsResult;
    if (accessibleBoardIds.length > 0) {
      const boardPlaceholders = accessibleBoardIds.map((_, i) => `$${i + 2}`).join(',');
      allPostsResult = await query(`
        SELECT p.id, p.title, p.board_id, b.name as board_name, 
               u.name as author_name, p.created_at, p.upvote_count, p.comment_count
        FROM posts p 
        JOIN boards b ON p.board_id = b.id 
        LEFT JOIN users u ON p.author_user_id = u.user_id 
        WHERE p.lock_id = $1 AND p.board_id IN (${boardPlaceholders})
        ORDER BY p.created_at DESC
      `, [lockId, ...accessibleBoardIds]);
    } else {
      allPostsResult = { rows: [] };
    }
    
    // Get boards using this lock (filtered by accessible boards)
    let boardsUsingLockResult;
    if (accessibleBoardIds.length > 0) {
      const boardPlaceholders = accessibleBoardIds.map((_, i) => `$${i + 2}`).join(',');
      boardsUsingLockResult = await query(`
        SELECT b.id, b.name, b.description, b.created_at
        FROM boards b 
        WHERE b.settings->'permissions'->'locks'->'lockIds' @> $1::jsonb 
        AND b.id IN (${boardPlaceholders})
        ORDER BY b.created_at DESC
      `, [JSON.stringify(lockId), ...accessibleBoardIds]);
    } else {
      boardsUsingLockResult = { rows: [] };
    }
    
    const allPosts: PostUsageData[] = allPostsResult.rows;
    const allBoards: BoardUsageData[] = boardsUsingLockResult.rows;
    
    // Return latest 5 posts and all accessible boards
    const response: LockUsageResponse = {
      success: true,
      data: {
        posts: allPosts.slice(0, 5), // Latest 5 only
        boards: allBoards, // All accessible boards
        totalPostsUsingLock: allPosts.length,
        totalBoardsUsingLock: allBoards.length
      }
    };
    
    console.log(`[API GET /api/locks/${lockId}/usage] Returning ${response.data.posts.length} posts (of ${response.data.totalPostsUsingLock}) and ${response.data.boards.length} boards`);
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error(`[API GET /api/locks/${lockId}/usage] Error fetching usage:`, error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch lock usage' 
    }, { status: 500 });
  }
}

export const GET = withAuth(getLockUsageHandler, false); 
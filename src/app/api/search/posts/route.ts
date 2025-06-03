import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ApiPost } from '@/app/api/posts/route'; // Import ApiPost to type the response

// GET similar posts based on a query (publicly accessible)
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const searchQuery = searchParams.get('q');
  const boardId = searchParams.get('boardId'); // Optional board filtering

  if (!searchQuery || searchQuery.trim().length < 3) { // Require a minimum query length
    return NextResponse.json({ error: 'Search query must be at least 3 characters long' }, { status: 400 });
  }

  const searchTerm = `%${searchQuery.trim()}%`;
  const limit = 5; // Max number of suggestions to return

  try {
    // Build dynamic query with optional board filtering
    let whereClause = `WHERE (p.title ILIKE $1 OR p.content ILIKE $1)`;
    const queryParams: (string | number)[] = [searchTerm];
    
    if (boardId) {
      whereClause += ` AND p.board_id = $${queryParams.length + 1}`;
      queryParams.push(parseInt(boardId, 10));
    }

    const result = await query(
      `SELECT 
        p.id,
        p.author_user_id,
        p.title,
        p.content,
        p.tags,
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

    const suggestedPosts: Partial<ApiPost>[] = result.rows; // Use Partial as user_has_upvoted might be different

    return NextResponse.json(suggestedPosts);

  } catch (error) {
    console.error('[API] Error searching posts:', error);
    return NextResponse.json({ error: 'Failed to search posts' }, { status: 500 });
  }
} 
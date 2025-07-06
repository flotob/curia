import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isBoardRSSEligible, generateRSSXML } from '@/lib/rss';
import { ApiBoard } from '@/app/api/communities/[communityId]/boards/route';
import { ApiPost } from '@/app/api/posts/route';

/**
 * RSS Feed API endpoint
 * GET /api/boards/[boardId]/rss
 * 
 * Generates RSS XML for a board if it's publicly accessible
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { boardId: string } }
) {
  try {
    const boardId = parseInt(params.boardId, 10);
    
    if (isNaN(boardId)) {
      return NextResponse.json(
        { error: 'Invalid board ID' },
        { status: 400 }
      );
    }

    // Fetch board and community information
    const boardResult = await query(`
      SELECT 
        b.id, b.name, b.description, b.settings, b.community_id,
        b.created_at, b.updated_at,
        c.name as community_name, c.community_short_id, c.plugin_id, c.settings as community_settings
      FROM boards b
      JOIN communities c ON b.community_id = c.id
      WHERE b.id = $1
    `, [boardId]);

    if (boardResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Board not found' },
        { status: 404 }
      );
    }

    const boardData = boardResult.rows[0];
    
    // Parse JSON settings
    const board: ApiBoard = {
      id: boardData.id,
      name: boardData.name,
      description: boardData.description,
      settings: typeof boardData.settings === 'string' 
        ? JSON.parse(boardData.settings) 
        : boardData.settings,
      community_id: boardData.community_id,
      created_at: boardData.created_at,
      updated_at: boardData.updated_at
    };

    const community = {
      id: boardData.community_id,
      name: boardData.community_name,
      community_short_id: boardData.community_short_id,
      plugin_id: boardData.plugin_id,
      settings: typeof boardData.community_settings === 'string' 
        ? JSON.parse(boardData.community_settings) 
        : boardData.community_settings
    };

    // Check if board is RSS-eligible
    if (!isBoardRSSEligible(board, community)) {
      return NextResponse.json(
        { error: 'This board is private and does not provide RSS feeds' },
        { status: 403 }
      );
    }

    // Fetch recent posts from the board (limit to 50 most recent)
    const postsResult = await query(`
      SELECT 
        p.id, p.title, p.content, p.author_user_id, p.board_id,
        p.created_at, p.updated_at,
        u.name as author_name
      FROM posts p
      JOIN users u ON p.author_user_id = u.user_id
      WHERE p.board_id = $1
      ORDER BY p.created_at DESC
      LIMIT 50
    `, [boardId]);

    const posts: ApiPost[] = postsResult.rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      author_user_id: row.author_user_id,
      author_name: row.author_name,
      board_id: row.board_id,
      board_name: board.name,
      created_at: row.created_at,
      updated_at: row.updated_at,
      upvote_count: 0, // Not needed for RSS
      comment_count: 0, // Not needed for RSS
      user_has_upvoted: false, // Not needed for RSS
      tags: [], // Could be added later if needed
      settings: {} // Not needed for RSS
    }));

    // Generate RSS XML
    const rssXML = await generateRSSXML(board, community, posts);

    // Return RSS XML with proper content type
    return new NextResponse(rssXML, {
      status: 200,
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });

  } catch (error) {
    console.error('[RSS API] Error generating RSS feed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
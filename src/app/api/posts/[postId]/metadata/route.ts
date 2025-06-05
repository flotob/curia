import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export interface PostMetadata {
  id: number;
  title: string;
  content: string;
  author_name: string;
  board_name: string;
  created_at: string;
  upvote_count: number;
  comment_count: number;
  tags: string[];
}

interface RouteContext {
  params: Promise<Record<string, string>>;
}

// Public endpoint for fetching post metadata (for social sharing crawlers)
export async function GET(req: NextRequest, context: RouteContext) {
  const params = await context.params;
  const postId = parseInt(params.postId, 10);

  if (isNaN(postId)) {
    return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
  }

  try {
    console.log(`[API] GET /api/posts/${postId}/metadata - Public metadata request`);

    // Get basic post metadata without requiring authentication
    const result = await query(`
      SELECT 
        p.id,
        p.title,
        p.content,
        p.upvote_count,
        p.comment_count,
        p.created_at,
        p.tags,
        b.name as board_name,
        u.name as author_name
      FROM posts p
      JOIN boards b ON p.board_id = b.id  
      JOIN users u ON p.author_user_id = u.user_id
      WHERE p.id = $1
    `, [postId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const postData = result.rows[0];
    
    // Format the response as PostMetadata
    const metadata: PostMetadata = {
      id: postData.id,
      title: postData.title,
      content: postData.content,
      author_name: postData.author_name || 'Anonymous',
      board_name: postData.board_name,
      created_at: postData.created_at,
      upvote_count: postData.upvote_count,
      comment_count: postData.comment_count,
      tags: postData.tags || []
    };

    console.log(`[API] Successfully retrieved metadata for post ${postId}`);
    return NextResponse.json(metadata);

  } catch (error) {
    console.error(`[API] Error fetching post metadata ${postId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch post metadata' }, { status: 500 });
  }
} 
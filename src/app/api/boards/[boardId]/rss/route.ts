import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isBoardRSSEligible, generateRSSXML, convertMarkdownToHTML, escapeXML } from '@/lib/rss';
import { ApiBoard } from '@/app/api/communities/[communityId]/boards/route';
import { ApiPost } from '@/app/api/posts/route';
import { buildLegacyExternalShareUrl } from '@/utils/urlBuilder';
import { 
  generateBulkSemanticUrls, 
  type BulkUrlParams, 
  type BulkUrlContext 
} from '@/lib/backend-url-builder';

/**
 * Generate RSS XML with semantic URLs (server-side only)
 * This handles semantic URL generation with fallback to legacy URLs
 */
async function generateSemanticRSSXML(
  board: ApiBoard,
  community: { 
    id: string; 
    name: string; 
    community_short_id: string; 
    plugin_id: string; 
  },
  posts: ApiPost[]
): Promise<string> {
  const pluginBaseUrl = process.env.NEXT_PUBLIC_PLUGIN_BASE_URL || '';
  const boardUrl = `${pluginBaseUrl}/?boardId=${board.id}`;
  const currentDate = new Date().toUTCString();

  try {
    // Prepare bulk URL generation context
    const bulkContext: BulkUrlContext = {
      communityShortId: community.community_short_id,
      pluginId: community.plugin_id,
      baseUrl: pluginBaseUrl
    };

    // Prepare posts for bulk URL generation
    const bulkParams: BulkUrlParams[] = posts.map(post => ({
      postId: post.id,
      boardId: post.board_id,
      postTitle: post.title,
      boardName: board.name,
      shareSource: 'rss_feed'
    }));

    console.log(`[RSS API] Generating semantic URLs for ${posts.length} posts using backend URL builder`);
    
    // Generate semantic URLs in bulk
    const urlResults = await generateBulkSemanticUrls(bulkParams, bulkContext);
    
    // Create a map of post ID to URL for quick lookup
    const urlMap = new Map<number, string>();
    let semanticUrlCount = 0;
    
    for (const result of urlResults) {
      if (result.url) {
        urlMap.set(result.postId, result.url);
        semanticUrlCount++;
      } else {
        console.warn(`[RSS API] Failed to generate semantic URL for post ${result.postId}: ${result.error}`);
      }
    }

    console.log(`[RSS API] Generated ${semanticUrlCount}/${posts.length} semantic URLs successfully`);

    // Generate RSS items for posts
    const rssItems = posts.map((post) => {
      try {
        // Get semantic URL or fallback to legacy URL
        let postUrl = urlMap.get(post.id);
        if (!postUrl) {
          console.warn(`[RSS API] No semantic URL for post ${post.id}, falling back to legacy URL`);
          postUrl = buildLegacyExternalShareUrl(
            post.id,
            post.board_id,
            community.community_short_id,
            community.plugin_id
          );
        }

        // Convert markdown content to HTML
        const htmlContent = convertMarkdownToHTML(post.content);

        // Escape HTML for XML
        const escapedTitle = escapeXML(post.title);
        const pubDate = new Date(post.created_at).toUTCString();

        return `
    <item>
      <title>${escapedTitle}</title>
      <description><![CDATA[${htmlContent}]]></description>
      <link>${postUrl}</link>
      <guid>${postUrl}</guid>
      <pubDate>${pubDate}</pubDate>
    </item>`;
      } catch (error) {
        console.error(`[RSS API] Failed to generate RSS item for post ${post.id}:`, error);
        return ''; // Skip failed posts
      }
    });

    // Filter out empty items
    const validRssItems = rssItems.filter(item => item.trim() !== '');

    const rssXML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXML(board.name)} - ${escapeXML(community.name)}</title>
    <description>${escapeXML(board.description || `Posts from ${board.name} board`)}</description>
    <link>${boardUrl}</link>
    <lastBuildDate>${currentDate}</lastBuildDate>
    <generator>CommonGround RSS Generator v2.0 (Semantic URLs)</generator>
    <language>en-us</language>${validRssItems.join('')}
  </channel>
</rss>`;

    return rssXML;

  } catch (error) {
    console.error('[RSS API] Error in semantic URL generation, falling back to legacy RSS generation:', error);
    
    // Fallback to the standard RSS generation function
    return generateRSSXML(board, { 
      ...community, 
      settings: {} 
    }, posts);
  }
}

/**
 * RSS Feed API endpoint
 * GET /api/boards/[boardId]/rss
 * 
 * Generates RSS XML for a board if it's publicly accessible
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const resolvedParams = await params;
    const boardId = parseInt(resolvedParams.boardId, 10);
    
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
    
    // Parse JSON settings - handle null/undefined cases
    const parseBoardSettings = (settings: any) => {
      if (!settings) return {};
      if (typeof settings === 'string') {
        try {
          return JSON.parse(settings);
        } catch (e) {
          console.warn('[RSS API] Failed to parse board settings JSON:', e);
          return {};
        }
      }
      return settings;
    };

    const parseCommunitySettings = (settings: any) => {
      if (!settings) return {};
      if (typeof settings === 'string') {
        try {
          return JSON.parse(settings);
        } catch (e) {
          console.warn('[RSS API] Failed to parse community settings JSON:', e);
          return {};
        }
      }
      return settings;
    };

    const board: ApiBoard = {
      id: boardData.id,
      name: boardData.name,
      description: boardData.description,
      settings: parseBoardSettings(boardData.settings),
      community_id: boardData.community_id,
      created_at: boardData.created_at,
      updated_at: boardData.updated_at
    };

    const community = {
      id: boardData.community_id,
      name: boardData.community_name,
      community_short_id: boardData.community_short_id,
      plugin_id: boardData.plugin_id,
      settings: parseCommunitySettings(boardData.community_settings)
    };

    // Check if board is RSS-eligible
    const isEligible = isBoardRSSEligible(board, community);
    
    if (!isEligible) {
      // Add debugging info
      console.log('[RSS API] Board RSS eligibility check failed:', {
        boardId: board.id,
        boardName: board.name,
        communityId: community.id,
        communityName: community.name,
        boardSettings: board.settings,
        communitySettings: community.settings,
        boardRoles: board.settings?.permissions?.allowedRoles,
        communityRoles: community.settings?.permissions?.allowedRoles
      });
      
      return NextResponse.json(
        { error: 'This board is private and does not provide RSS feeds' },
        { status: 403 }
      );
    }
    
    console.log('[RSS API] Board is RSS-eligible:', {
      boardId: board.id,
      boardName: board.name,
      communityName: community.name
    });

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
      author_profile_picture_url: null, // Not needed for RSS
      board_id: row.board_id,
      board_name: board.name,
      created_at: row.created_at,
      updated_at: row.updated_at,
      upvote_count: 0, // Not needed for RSS
      comment_count: 0, // Not needed for RSS
      user_has_upvoted: false, // Not needed for RSS
      tags: [], // Could be added later if needed
      settings: {}, // Not needed for RSS
      share_access_count: 0, // Not needed for RSS
      share_count: 0, // Not needed for RSS
    }));

    // Generate RSS XML with semantic URLs (server-side implementation)
    const rssXML = await generateSemanticRSSXML(board, community, posts);

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
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isBoardRSSEligible, convertMarkdownToHTML, escapeXML } from '@/lib/rss';
import { ApiBoard } from '@/app/api/communities/[communityId]/boards/route';
import { ApiPost } from '@/app/api/posts/route';
import { buildLegacyExternalShareUrl } from '@/utils/urlBuilder';
import { 
  generateBulkSemanticUrls, 
  type BulkUrlParams, 
  type BulkUrlContext 
} from '@/lib/backend-url-builder';

/**
 * Community data interface for RSS eligibility checking
 */
interface RSSCommunity {
  id: string;
  name: string;
  community_short_id: string;
  plugin_id: string;
  settings?: {
    permissions?: {
      allowedRoles?: string[];
    };
  };
}

/**
 * Check if a community is eligible for RSS feeds
 * A community is RSS-eligible if it's not role-gated (public community)
 */
function isCommunityRSSEligible(community: RSSCommunity): boolean {
  const communityRoles = community.settings?.permissions?.allowedRoles;
  const communityGated = (communityRoles?.length ?? 0) > 0;
  
  console.log('[Community RSS] Community gating check:', {
    communityId: community.id,
    communityName: community.name,
    allowedRoles: communityRoles,
    isGated: communityGated
  });
  
  if (communityGated) {
    console.log('[Community RSS] Community rejected: Community is role-gated');
    return false;
  }

  console.log('[Community RSS] Community approved: Publicly accessible');
  return true;
}

/**
 * Generate RSS XML for community home feed with semantic URLs
 */
async function generateCommunityRSSXML(
  community: RSSCommunity,
  posts: (ApiPost & { board_name: string })[]
): Promise<string> {
  const pluginBaseUrl = process.env.NEXT_PUBLIC_PLUGIN_BASE_URL || '';
  const communityUrl = `${pluginBaseUrl}/?communityId=${community.id}`;
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
      boardName: post.board_name,
      shareSource: 'community_rss_feed'
    }));

    console.log(`[Community RSS API] Generating semantic URLs for ${posts.length} posts using backend URL builder`);
    
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
        console.warn(`[Community RSS API] Failed to generate semantic URL for post ${result.postId}: ${result.error}`);
      }
    }

    console.log(`[Community RSS API] Generated ${semanticUrlCount}/${posts.length} semantic URLs successfully`);

    // Generate RSS items for posts
    const rssItems = posts.map((post) => {
      try {
        // Get semantic URL or fallback to legacy URL
        let postUrl = urlMap.get(post.id);
        if (!postUrl) {
          console.warn(`[Community RSS API] No semantic URL for post ${post.id}, falling back to legacy URL`);
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
        const escapedBoardName = escapeXML(post.board_name);
        const rawBoardName = post.board_name || 'Unknown Board'; // Raw board name for CDATA content
        const pubDate = new Date(post.created_at).toUTCString();

        // Ensure CDATA content is safe - remove any potential CDATA terminators
        const safeBoardName = rawBoardName.replace(/\]\]>/g, ']]&gt;');
        const safeHtmlContent = htmlContent.replace(/\]\]>/g, ']]&gt;');

        return `
    <item>
      <title>${escapedTitle}</title>
      <description><![CDATA[<p><strong>Posted in: ${safeBoardName}</strong></p>${safeHtmlContent}]]></description>
      <link>${postUrl}</link>
      <guid>${postUrl}</guid>
      <pubDate>${pubDate}</pubDate>
      <category>${escapedBoardName}</category>
    </item>`;
      } catch (error) {
        console.error(`[Community RSS API] Failed to generate RSS item for post ${post.id}:`, error);
        return ''; // Skip failed posts
      }
    });

    // Filter out empty items
    const validRssItems = rssItems.filter(item => item.trim() !== '');

    const rssXML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXML(community.name)} - Recent Discussions</title>
    <description>Latest posts from all boards in ${escapeXML(community.name)}</description>
    <link>${communityUrl}</link>
    <lastBuildDate>${currentDate}</lastBuildDate>
    <generator>CommonGround RSS Generator v2.0 (Community Feed)</generator>
    <language>en-us</language>${validRssItems.join('')}
  </channel>
</rss>`;

    return rssXML;

  } catch (error) {
    console.error('[Community RSS API] Error in semantic URL generation, falling back to legacy RSS generation:', error);
    
    // Fallback to legacy URL generation for all posts
    const rssItems = posts.map((post) => {
      try {
        const postUrl = buildLegacyExternalShareUrl(
          post.id,
          post.board_id,
          community.community_short_id,
          community.plugin_id
        );

        const htmlContent = convertMarkdownToHTML(post.content);
        const escapedTitle = escapeXML(post.title);
        const escapedBoardName = escapeXML(post.board_name);
        const rawBoardName = post.board_name || 'Unknown Board'; // Raw board name for CDATA content
        const pubDate = new Date(post.created_at).toUTCString();

        // Ensure CDATA content is safe - remove any potential CDATA terminators
        const safeBoardName = rawBoardName.replace(/\]\]>/g, ']]&gt;');
        const safeHtmlContent = htmlContent.replace(/\]\]>/g, ']]&gt;');

        return `
    <item>
      <title>${escapedTitle}</title>
      <description><![CDATA[<p><strong>Posted in: ${safeBoardName}</strong></p>${safeHtmlContent}]]></description>
      <link>${postUrl}</link>
      <guid>${postUrl}</guid>
      <pubDate>${pubDate}</pubDate>
      <category>${escapedBoardName}</category>
    </item>`;
      } catch (error) {
        console.error(`[Community RSS API] Failed to generate fallback RSS item for post ${post.id}:`, error);
        return '';
      }
    });

    const validRssItems = rssItems.filter(item => item.trim() !== '');

    const rssXML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXML(community.name)} - Recent Discussions</title>
    <description>Latest posts from all boards in ${escapeXML(community.name)}</description>
    <link>${communityUrl}</link>
    <lastBuildDate>${currentDate}</lastBuildDate>
    <generator>CommonGround RSS Generator v2.0 (Community Feed Fallback)</generator>
    <language>en-us</language>${validRssItems.join('')}
  </channel>
</rss>`;

    return rssXML;
  }
}

/**
 * Community RSS Feed API endpoint
 * GET /api/communities/[communityId]/rss
 * 
 * Generates RSS XML for a community's home feed (all public boards) if the community is publicly accessible
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ communityId: string }> }
) {
  try {
    const resolvedParams = await params;
    const communityId = resolvedParams.communityId;
    
    if (!communityId) {
      return NextResponse.json(
        { error: 'Invalid community ID' },
        { status: 400 }
      );
    }

    console.log(`[Community RSS API] Processing RSS request for community: ${communityId}`);

    // Fetch community information
    const communityResult = await query(`
      SELECT 
        id, name, community_short_id, plugin_id, settings
      FROM communities 
      WHERE id = $1
    `, [communityId]);

    if (communityResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      );
    }

    // Parse community settings
    const communityData = communityResult.rows[0];
    const parseCommunitySettings = (settings: any) => {
      if (!settings) return {};
      if (typeof settings === 'string') {
        try {
          return JSON.parse(settings);
        } catch {
          return {};
        }
      }
      return settings;
    };

    const community: RSSCommunity = {
      id: communityData.id,
      name: communityData.name,
      community_short_id: communityData.community_short_id,
      plugin_id: communityData.plugin_id,
      settings: parseCommunitySettings(communityData.settings)
    };

    // Check if community is RSS-eligible
    const isEligible = isCommunityRSSEligible(community);
    
    if (!isEligible) {
      console.log('[Community RSS API] Community RSS access denied:', {
        communityId: community.id,
        communityName: community.name,
        reason: 'Community is role-gated'
      });
      
      return NextResponse.json(
        { error: 'This community is private and does not provide RSS feeds' },
        { status: 403 }
      );
    }

    // Get all public boards in the community
    const boardsResult = await query(`
      SELECT id, name, settings 
      FROM boards 
      WHERE community_id = $1
      ORDER BY name ASC
    `, [communityId]);

    // Filter to only include public boards
    const publicBoards: ApiBoard[] = [];
    
    for (const boardRow of boardsResult.rows) {
      const board: ApiBoard = {
        id: boardRow.id,
        name: boardRow.name,
        description: null,
        settings: typeof boardRow.settings === 'string' 
          ? JSON.parse(boardRow.settings || '{}') 
          : (boardRow.settings || {}),
        community_id: communityId,
        created_at: '',
        updated_at: ''
      };

      // Check if this board is publicly readable
      if (isBoardRSSEligible(board, community)) {
        publicBoards.push(board);
      }
    }

    console.log(`[Community RSS API] Found ${publicBoards.length} public boards out of ${boardsResult.rows.length} total boards`);

    if (publicBoards.length === 0) {
      console.log('[Community RSS API] No public boards found in community');
      
      // Return empty RSS feed
      const emptyRssXML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXML(community.name)} - Recent Discussions</title>
    <description>Latest posts from all boards in ${escapeXML(community.name)}</description>
    <link>${process.env.NEXT_PUBLIC_PLUGIN_BASE_URL}/?communityId=${communityId}</link>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <generator>CommonGround RSS Generator v2.0 (Community Feed)</generator>
    <language>en-us</language>
  </channel>
</rss>`;

      return new NextResponse(emptyRssXML, {
        status: 200,
        headers: {
          'Content-Type': 'application/rss+xml; charset=utf-8',
          'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        },
      });
    }

    // Get recent posts from all public boards
    const boardIds = publicBoards.map(board => board.id);
    const placeholders = boardIds.map((_, index) => `$${index + 1}`).join(',');
    
    const postsResult = await query(`
      SELECT 
        p.id, p.title, p.content, p.author_user_id, p.board_id, 
        p.created_at, p.updated_at,
        u.name as author_name,
        b.name as board_name
      FROM posts p
      JOIN users u ON p.author_user_id = u.user_id
      JOIN boards b ON p.board_id = b.id
      WHERE p.board_id IN (${placeholders})
      ORDER BY p.created_at DESC
      LIMIT 50
    `, boardIds);

    console.log(`[Community RSS API] Found ${postsResult.rows.length} recent posts from public boards`);

    // Map to posts with board name  
    const posts: (ApiPost & { board_name: string })[] = postsResult.rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      author_user_id: row.author_user_id,
      author_name: row.author_name,
      author_profile_picture_url: null,
      board_id: row.board_id,
      board_name: row.board_name,
      created_at: row.created_at,
      updated_at: row.updated_at,
      upvote_count: 0,
      comment_count: 0,
      user_has_upvoted: false,
      tags: [],
      settings: {},
      has_lock: false,
      has_tags: false,
      share_access_count: 0,
      share_count: 0,
      last_shared_at: null,
      most_recent_access_at: null
    } as unknown as ApiPost & { board_name: string }));

    // Generate RSS XML with semantic URLs
    const rssXML = await generateCommunityRSSXML(community, posts);

    console.log(`[Community RSS API] Successfully generated RSS feed for community ${communityId} with ${posts.length} posts`);

    // Return RSS XML with proper content type
    return new NextResponse(rssXML, {
      status: 200,
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      },
    });

  } catch (error) {
    console.error('[Community RSS API] Error generating community RSS feed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
import { ApiBoard } from '@/app/api/communities/[communityId]/boards/route';
import { ApiPost } from '@/app/api/posts/route';
import { buildExternalShareUrl } from '@/utils/urlBuilder';

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
 * Checks if a board is eligible for RSS feeds
 * A board is RSS-eligible if:
 * 1. Community is NOT role-gated (public community)
 * 2. Board is NOT role-gated (no allowedRoles in board settings)
 * 3. Board can be read publicly (write locks are OK, read locks are not)
 */
export function isBoardRSSEligible(board: ApiBoard, community: RSSCommunity): boolean {
  // Check community privacy
  const communityGated = (community.settings?.permissions?.allowedRoles?.length ?? 0) > 0;
  if (communityGated) {
    return false;
  }

  // Check board privacy
  const boardGated = (board.settings?.permissions?.allowedRoles?.length ?? 0) > 0;
  if (boardGated) {
    return false;
  }

  // Board is RSS-eligible if it's publicly readable
  // Note: Write locks (for posting) are OK, read locks (for viewing) are not
  return true;
}

/**
 * Converts markdown content to HTML for RSS feeds
 * Handles internal links by converting them to external URLs
 */
export function convertMarkdownToHTML(
  content: string,
  communityShortId: string,
  pluginId: string
): string {
  // Simple but robust markdown to HTML conversion
  let html = content;

  // Convert headers
  html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');

  // Convert bold and italic
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Convert code blocks
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Convert links with proper typing
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match: string, text: string, url: string) => {
    // Convert internal links to external URLs
         if (url.startsWith('/')) {
       const baseUrl = 'NEXT_PUBLIC_PLUGIN_BASE_URL' in (typeof globalThis !== 'undefined' ? globalThis : {}) 
         ? (globalThis as any).NEXT_PUBLIC_PLUGIN_BASE_URL 
         : '';
       const externalUrl = `${baseUrl}${url}`;
       return `<a href="${externalUrl}" target="_blank" rel="noopener noreferrer">${text}</a>`;
     }
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`;
  });

     // Convert lists
   html = html.replace(/^\* (.+)$/gm, '<li>$1</li>');
   html = html.replace(/(<li>[\s\S]*<\/li>)/g, '<ul>$1</ul>');

  // Convert line breaks to paragraphs
  const paragraphs = html.split(/\n\s*\n/);
  html = paragraphs
    .filter(p => p.trim().length > 0)
    .map(p => p.replace(/\n/g, '<br>'))
    .map(p => p.trim().startsWith('<') ? p : `<p>${p}</p>`)
    .join('\n');

  // Clean up any empty paragraphs
  html = html.replace(/<p><\/p>/g, '');

  return html;
}

/**
 * Generates RSS XML for a board
 */
export async function generateRSSXML(
  board: ApiBoard,
  community: RSSCommunity,
  posts: ApiPost[]
): Promise<string> {
  const pluginBaseUrl = process.env.NEXT_PUBLIC_PLUGIN_BASE_URL || '';
  const boardUrl = `${pluginBaseUrl}/?boardId=${board.id}`;
  const currentDate = new Date().toUTCString();

  // Generate RSS items for posts
  const rssItems = await Promise.all(
    posts.map(async (post) => {
      try {
        // Generate external URL for the post
        const postUrl = await buildExternalShareUrl(
          post.id,
          post.board_id,
          community.community_short_id,
          community.plugin_id,
          post.title,
          board.name
        );

        // Convert markdown content to HTML
        const htmlContent = convertMarkdownToHTML(
          post.content,
          community.community_short_id,
          community.plugin_id
        );

        // Escape HTML for XML
        const escapedTitle = escapeXML(post.title);
        const escapedContent = escapeXML(htmlContent);
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
        console.error(`[RSS] Failed to generate RSS item for post ${post.id}:`, error);
        return ''; // Skip failed posts
      }
    })
  );

  // Filter out empty items
  const validRssItems = rssItems.filter(item => item.trim() !== '');

  const rssXML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXML(board.name)} - ${escapeXML(community.name)}</title>
    <description>${escapeXML(board.description || `Posts from ${board.name} board`)}</description>
    <link>${boardUrl}</link>
    <lastBuildDate>${currentDate}</lastBuildDate>
    <generator>CommonGround RSS Generator</generator>
    <language>en-us</language>${validRssItems.join('')}
  </channel>
</rss>`;

  return rssXML;
}

/**
 * Escapes XML special characters
 */
function escapeXML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Gets RSS feed URL for a board
 */
export function getRSSFeedUrl(boardId: number): string {
  const baseUrl = process.env.NEXT_PUBLIC_PLUGIN_BASE_URL || '';
  return `${baseUrl}/api/boards/${boardId}/rss`;
}
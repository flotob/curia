import { SemanticUrlService } from '../semantic-urls';

/**
 * Direct Semantic URL Generator for Telegram Notifications
 * 
 * Generates semantic URLs by calling SemanticUrlService directly,
 * avoiding HTTP calls that fail in server context. Uses the new
 * createOrUpdate() method that automatically handles community
 * short ID migration for backward compatibility.
 * 
 * This replaces the HTTP-based buildExternalShareUrl approach
 * for server-side URL generation.
 */

/**
 * Generate semantic URL directly via database calls (no HTTP)
 * 
 * @param postId - The ID of the post
 * @param boardId - The ID of the board the post belongs to
 * @param postTitle - The post title for semantic URL generation
 * @param boardName - The board name for semantic URL generation
 * @param communityShortId - The community short ID for URL construction
 * @param pluginId - The plugin ID for URL construction
 * @returns Promise resolving to semantic URL or legacy URL as fallback
 */
export async function generateSemanticUrlDirect(
  postId: number,
  boardId: number,
  postTitle: string,
  boardName: string,
  communityShortId: string,
  pluginId: string
): Promise<string> {
  try {
    console.log(`[DirectURLGenerator] Creating/updating semantic URL for post ${postId} with community ${communityShortId}`);
    
    // 🆕 Use createOrUpdate instead of manual checking + create
    const semanticUrl = await SemanticUrlService.createOrUpdate({
      postId,
      postTitle,
      boardId,
      boardName,
      communityShortId, // 🆕 Current community short ID - may trigger bulk migration
      pluginId,
      shareSource: 'telegram_notification'
    });
    
    // Build full URL directly
    const baseUrl = process.env.NEXT_PUBLIC_PLUGIN_BASE_URL || '';
    const fullUrl = SemanticUrlService.buildFullUrl(semanticUrl, baseUrl);
    
    // Check if this was a migration for logging
    const wasMigration = semanticUrl.communityShortIdHistory.length > 1;
    const migrationInfo = wasMigration 
      ? ` (migrated from: ${semanticUrl.communityShortIdHistory.slice(0, -1).join(', ')})`
      : '';
    
    console.log(`[DirectURLGenerator] Semantic URL ready for post ${postId}: ${fullUrl}${migrationInfo}`);
    return fullUrl;
    
  } catch (error) {
    console.warn(`[DirectURLGenerator] Semantic URL failed for post ${postId}, using legacy:`, error);
    return generateLegacyUrlDirect(postId, boardId, communityShortId, pluginId);
  }
}

/**
 * Generate legacy URL directly without HTTP calls
 * 
 * @param postId - The ID of the post
 * @param boardId - The ID of the board the post belongs to
 * @param communityShortId - The community short ID for URL construction
 * @param pluginId - The plugin ID for URL construction
 * @returns Legacy URL with community context
 */
export function generateLegacyUrlDirect(
  postId: number,
  boardId: number,
  communityShortId?: string,
  pluginId?: string
): string {
  const baseUrl = process.env.NEXT_PUBLIC_PLUGIN_BASE_URL || '';
  
  if (!baseUrl) {
    console.warn('[DirectURLGenerator] NEXT_PUBLIC_PLUGIN_BASE_URL not configured, using relative URL');
    return `/board/${boardId}/post/${postId}`;
  }
  
  // Build legacy URL with community context
  const params = new URLSearchParams();
  
  // Add share token for tracking
  const timestamp = Date.now();
  const shareToken = `${postId}-${boardId}-${timestamp}`;
  params.set('token', shareToken);
  
  // Add community context if available
  if (communityShortId) {
    params.set('communityShortId', communityShortId);
  }
  
  if (pluginId) {
    params.set('pluginId', pluginId);
  }
  
  const url = `${baseUrl}/board/${boardId}/post/${postId}?${params.toString()}`;
  console.log(`[DirectURLGenerator] Generated legacy URL: ${url}`);
  return url;
}

/**
 * Simplified URL generator for cases where we don't have full context
 * 
 * @param postId - The ID of the post
 * @param boardId - The ID of the board the post belongs to
 * @returns Basic URL with minimal context
 */
export function generateSimpleUrlDirect(postId: number, boardId: number): string {
  const baseUrl = process.env.NEXT_PUBLIC_PLUGIN_BASE_URL || '';
  
  if (!baseUrl) {
    return `/board/${boardId}/post/${postId}`;
  }
  
  return `${baseUrl}/board/${boardId}/post/${postId}`;
} 
import { generateSemanticUrlDirect, generateLegacyUrlDirect, generateSimpleUrlDirect } from './directUrlGenerator';

/**
 * Generate shareable URLs for Telegram notifications
 * Uses direct database calls instead of HTTP to avoid server-side URL parsing issues
 */
export async function generateTelegramShareUrl(
  postId: number,
  boardId: number,
  postTitle?: string,
  boardName?: string,
  communityShortId?: string,
  pluginId?: string
): Promise<string> {
  // If we have full context, try semantic URL generation
  if (postTitle && boardName && communityShortId && pluginId) {
    try {
      const shareUrl = await generateSemanticUrlDirect(
        postId,
        boardId,
        postTitle,
        boardName,
        communityShortId,
        pluginId
      );
      
      console.log(`[TelegramShareURL] Generated semantic URL for post ${postId}: ${shareUrl}`);
      return shareUrl;
      
    } catch (error) {
      console.warn(`[TelegramShareURL] Semantic URL generation failed for post ${postId}:`, error);
      // Fall through to legacy generation
    }
  }
  
  // If we have community context but not full context, use legacy with context
  if (communityShortId || pluginId) {
    try {
      const legacyUrl = generateLegacyUrlDirect(postId, boardId, communityShortId, pluginId);
      console.log(`[TelegramShareURL] Generated legacy URL with context for post ${postId}: ${legacyUrl}`);
      return legacyUrl;
      
    } catch (error) {
      console.warn(`[TelegramShareURL] Legacy URL generation failed for post ${postId}:`, error);
      // Fall through to simple generation
    }
  }
  
  // Final fallback: simple URL without community context
  const simpleUrl = generateSimpleUrlDirect(postId, boardId);
  console.log(`[TelegramShareURL] Generated simple URL for post ${postId}: ${simpleUrl}`);
  return simpleUrl;
} 
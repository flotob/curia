/**
 * URL Builder Utilities - Enhanced with Board and Comment Support
 * 
 * This module provides utilities for building URLs across the application.
 * It handles both internal navigation and external sharing with semantic URLs.
 */

/**
 * Response from /api/links API endpoint
 */
export interface CreateSemanticUrlResponse {
  id: number;
  url: string;
  slug: string;
  share_token: string;
  expiresAt?: string;
  isExisting: boolean;
}

/**
 * Preserves Common Ground theme parameters when building URLs
 * @param baseUrl - The base URL to enhance
 * @param additionalParams - Additional parameters to include
 * @returns URL with CG params preserved
 */
export function preserveCgParams(baseUrl: string, additionalParams: Record<string, string> = {}): string {
  if (typeof window === 'undefined') {
    return baseUrl;
  }
  
  const url = new URL(baseUrl, window.location.origin);
  const searchParams = new URLSearchParams(window.location.search);
  
  // Add Common Ground params
  searchParams.forEach((value, key) => {
    if (key.startsWith('cg_')) {
      url.searchParams.set(key, value);
    }
  });
  
  // Add additional params
  Object.entries(additionalParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  
  return url.pathname + (url.search ? url.search : '');
}

/**
 * Builds a URL to a specific post detail page
 * @param postId - The ID of the post
 * @param boardId - The ID of the board the post belongs to
 * @param preserveParams - Whether to preserve current URL parameters (default: true)
 * @returns Complete URL string for the post detail page
 */
export function buildPostUrl(postId: number, boardId: number, preserveParams: boolean = true): string {
  const baseUrl = `/board/${boardId}/post/${postId}`;
  
  if (!preserveParams || typeof window === 'undefined') {
    return baseUrl;
  }
  
  // Preserve Common Ground params (cg_theme, cg_bg_color, etc.)
  const searchParams = new URLSearchParams(window.location.search);
  const cgParams = new URLSearchParams();
  
  searchParams.forEach((value, key) => {
    if (key.startsWith('cg_')) {
      cgParams.set(key, value);
    }
  });
  
  return cgParams.toString() ? `${baseUrl}?${cgParams.toString()}` : baseUrl;
}

/**
 * Builds a URL to a specific board page
 * @param boardId - The ID of the board
 * @param preserveParams - Whether to preserve current URL parameters (default: true)
 * @returns Complete URL string for the board page
 */
export function buildBoardUrl(boardId: number, preserveParams: boolean = true): string {
  const baseUrl = `/`;
  
  if (!preserveParams || typeof window === 'undefined') {
    return `${baseUrl}?boardId=${boardId}`;
  }
  
  // Preserve Common Ground params and set boardId
  const searchParams = new URLSearchParams(window.location.search);
  searchParams.set('boardId', boardId.toString());
  
  return `${baseUrl}?${searchParams.toString()}`;
}

/**
 * Builds a URL to a specific comment within a post
 * @param postId - The ID of the post
 * @param boardId - The ID of the board the post belongs to
 * @param commentId - The ID of the comment to highlight
 * @param preserveParams - Whether to preserve current URL parameters (default: true)
 * @returns Complete URL string for the comment
 */
export function buildCommentUrl(postId: number, boardId: number, commentId: number, preserveParams: boolean = true): string {
  const baseUrl = `/board/${boardId}/post/${postId}`;
  
  const params = new URLSearchParams();
  
  // Preserve existing params if requested
  if (preserveParams && typeof window !== 'undefined') {
    const currentParams = new URLSearchParams(window.location.search);
    currentParams.forEach((value, key) => {
      if (key.startsWith('cg_')) {
        params.set(key, value);
      }
    });
  }
  
  // Add comment highlight parameter
  params.set('highlight', commentId.toString());
  
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Builds an external shareable URL for posts using semantic URLs when possible
 * Falls back to legacy URLs during transition or when semantic URL generation fails
 * @param postId - The ID of the post
 * @param boardId - The ID of the board the post belongs to
 * @param communityShortId - The community short ID for URL construction
 * @param pluginId - The plugin ID for URL construction
 * @param postTitle - The post title for semantic URL generation
 * @param boardName - The board name for semantic URL generation
 * @param commentId - Optional comment ID to highlight
 * @param useSemanticUrl - Whether to attempt semantic URL generation (default: true)
 * @returns Promise resolving to external URL
 */
export async function buildExternalShareUrl(
  postId: number, 
  boardId: number, 
  communityShortId?: string, 
  pluginId?: string,
  postTitle?: string,
  boardName?: string,
  commentId?: number,
  useSemanticUrl: boolean = true
): Promise<string> {
  const pluginBaseUrl = process.env.NEXT_PUBLIC_PLUGIN_BASE_URL;
  
  if (!pluginBaseUrl) {
    console.warn('NEXT_PUBLIC_PLUGIN_BASE_URL not configured, falling back to internal URL');
    return commentId 
      ? buildCommentUrl(postId, boardId, commentId, false)
      : buildPostUrl(postId, boardId, false);
  }
  
  // Try to generate semantic URL if all data available and enabled
  if (useSemanticUrl && communityShortId && pluginId && postTitle && boardName) {
    try {
      console.log(`[buildExternalShareUrl] Attempting to create semantic URL for post ${postId}${commentId ? ` comment ${commentId}` : ''}`);
      
      // Import authFetchJson dynamically to avoid issues in SSR/build
      const { authFetchJson } = await import('@/utils/authFetch');
      
      const requestBody: any = {
        postId,
        postTitle,
        boardId,
        boardName,
        shareSource: 'direct_share',
        communityShortId,
        pluginId
      };
      
      // Add comment context if provided
      if (commentId) {
        requestBody.commentId = commentId;
      }
      
      const result = await authFetchJson<CreateSemanticUrlResponse>('/api/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      console.log(`[buildExternalShareUrl] Successfully created semantic URL: ${result.url}`);
      return result.url;
      
    } catch (error) {
      console.warn('[buildExternalShareUrl] Failed to create semantic URL, falling back to legacy:', error);
    }
  }
  
  // Fallback to legacy URL generation
  console.log(`[buildExternalShareUrl] Using legacy URL for post ${postId}${commentId ? ` comment ${commentId}` : ''}`);
  return buildLegacyExternalShareUrl(postId, boardId, communityShortId, pluginId, commentId);
}

/**
 * Builds an external shareable URL for boards
 * @param boardId - The ID of the board
 * @param communityShortId - The community short ID for URL construction
 * @param pluginId - The plugin ID for URL construction
 * @param boardName - The board name for semantic URL generation
 * @param useSemanticUrl - Whether to attempt semantic URL generation (default: true)
 * @returns Promise resolving to external URL
 */
export async function buildExternalBoardUrl(
  boardId: number,
  communityShortId?: string,
  pluginId?: string,
  boardName?: string,
  useSemanticUrl: boolean = true
): Promise<string> {
  const pluginBaseUrl = process.env.NEXT_PUBLIC_PLUGIN_BASE_URL;
  
  if (!pluginBaseUrl) {
    console.warn('NEXT_PUBLIC_PLUGIN_BASE_URL not configured, falling back to internal URL');
    return buildBoardUrl(boardId, false);
  }
  
  // Try to generate semantic URL if all data available and enabled
  if (useSemanticUrl && communityShortId && pluginId && boardName) {
    try {
      console.log(`[buildExternalBoardUrl] Attempting to create semantic URL for board ${boardId}`);
      
      // Import authFetchJson dynamically to avoid issues in SSR/build
      const { authFetchJson } = await import('@/utils/authFetch');
      
      const result = await authFetchJson<CreateSemanticUrlResponse>('/api/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          boardId,
          boardName,
          shareSource: 'direct_share',
          communityShortId,
          pluginId,
          type: 'board' // Indicate this is a board-only link
        }),
      });
      
      console.log(`[buildExternalBoardUrl] Successfully created semantic URL: ${result.url}`);
      return result.url;
      
    } catch (error) {
      console.warn('[buildExternalBoardUrl] Failed to create semantic URL, falling back to legacy:', error);
    }
  }
  
  // Fallback to legacy URL generation
  console.log(`[buildExternalBoardUrl] Using legacy URL for board ${boardId}`);
  return buildLegacyExternalBoardUrl(boardId, communityShortId, pluginId);
}

/**
 * Legacy external share URL builder for posts (preserved for fallback)
 * @param postId - The ID of the post
 * @param boardId - The ID of the board the post belongs to
 * @param communityShortId - The community short ID for URL construction
 * @param pluginId - The plugin ID for URL construction
 * @param commentId - Optional comment ID to highlight
 * @returns External URL pointing to post page with share context
 */
export function buildLegacyExternalShareUrl(
  postId: number, 
  boardId: number, 
  communityShortId?: string, 
  pluginId?: string,
  commentId?: number
): string {
  const pluginBaseUrl = process.env.NEXT_PUBLIC_PLUGIN_BASE_URL;
  
  if (!pluginBaseUrl) {
    console.warn('NEXT_PUBLIC_PLUGIN_BASE_URL not configured, falling back to internal URL');
    return commentId 
      ? buildCommentUrl(postId, boardId, commentId, false)
      : buildPostUrl(postId, boardId, false);
  }
  
  // Remove trailing slash if present
  const baseUrl = pluginBaseUrl.replace(/\/$/, '');
  
  // Generate a unique token for this share attempt
  const shareToken = generateShareToken(postId, boardId);
  
  // Build post page URL with share context parameters
  const params = new URLSearchParams({
    token: shareToken,
  });
  
  // Add community and plugin context if available (for human user redirects)
  if (communityShortId) {
    params.set('communityShortId', communityShortId);
  }
  if (pluginId) {
    params.set('pluginId', pluginId);
  }
  if (commentId) {
    params.set('highlight', commentId.toString());
  }
  
  // Direct to post page - crawlers see meta tags, humans get redirected
  return `${baseUrl}/board/${boardId}/post/${postId}?${params.toString()}`;
}

/**
 * Legacy external board URL builder (for fallback)
 * @param boardId - The ID of the board
 * @param communityShortId - The community short ID for URL construction
 * @param pluginId - The plugin ID for URL construction
 * @returns External URL pointing to board with share context
 */
export function buildLegacyExternalBoardUrl(
  boardId: number,
  communityShortId?: string,
  pluginId?: string
): string {
  const pluginBaseUrl = process.env.NEXT_PUBLIC_PLUGIN_BASE_URL;
  
  if (!pluginBaseUrl) {
    console.warn('NEXT_PUBLIC_PLUGIN_BASE_URL not configured, falling back to internal URL');
    return buildBoardUrl(boardId, false);
  }
  
  // Remove trailing slash if present
  const baseUrl = pluginBaseUrl.replace(/\/$/, '');
  
  // Generate a unique token for this share attempt
  const shareToken = generateShareToken(boardId, 0); // Use 0 for post ID in board-only links
  
  // Build board URL with share context parameters
  const params = new URLSearchParams({
    token: shareToken,
    boardId: boardId.toString(),
  });
  
  // Add community and plugin context if available
  if (communityShortId) {
    params.set('communityShortId', communityShortId);
  }
  if (pluginId) {
    params.set('pluginId', pluginId);
  }
  
  // Direct to root with board context - humans get redirected to board view
  return `${baseUrl}/?${params.toString()}`;
}

/**
 * Generates a unique share token for tracking shared URLs
 * @param postId - The ID of the post (use 0 for board-only links)
 * @param boardId - The ID of the board
 * @returns A unique token string
 */
function generateShareToken(postId: number, boardId: number): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  const data = `${postId}-${boardId}-${timestamp}`;
  
  // Simple encoding (in production, you might want something more sophisticated)
  return btoa(data).replace(/[+/=]/g, '') + random;
} 
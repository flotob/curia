/**
 * Generate URLs for Telegram notifications
 */

export function generatePostUrl(postId: number, boardId: number): string {
  const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || '';
  
  if (!baseUrl) {
    console.warn('[TelegramURLGenerator] No base URL found in environment variables');
    return `Post ID: ${postId}`; // Fallback to just showing post ID
  }
  
  // Remove trailing slash if present
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  return `${cleanBaseUrl}/board/${boardId}/post/${postId}`;
}

export function generateBoardUrl(boardId: number): string {
  const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || '';
  
  if (!baseUrl) {
    console.warn('[TelegramURLGenerator] No base URL found in environment variables');
    return `Board ID: ${boardId}`;
  }
  
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  return `${cleanBaseUrl}/board/${boardId}`;
}

export function generateCommunityUrl(communityId: string): string {
  const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || '';
  
  if (!baseUrl) {
    console.warn('[TelegramURLGenerator] No base URL found in environment variables');
    return 'Community';
  }
  
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  return `${cleanBaseUrl}/c/${communityId}`;
} 
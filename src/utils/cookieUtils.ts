/**
 * Cookie utilities for handling shared content detection in iframe context
 * Used to detect when users arrive via external share links
 * Enhanced to support comments and board-only links
 */

/**
 * Shared post data structure stored in cookies
 */
export interface SharedPostData {
  postId: string;
  boardId: string;
  commentId?: string; // Optional comment to highlight
  token: string;
  timestamp: number;
  source?: string; // Optional source indicator
}

/**
 * Shared board data structure for board-only links
 */
export interface SharedBoardData {
  boardId: string;
  token: string;
  timestamp: number;
  source?: string;
}

/**
 * Gets a cookie value by name
 * @param name - The cookie name
 * @returns The cookie value or null if not found
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }
  
  const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Sets a cookie with proper cross-origin settings
 * @param name - Cookie name
 * @param value - Cookie value
 * @param maxAge - Maximum age in seconds (default: 7 days)
 */
export function setCookie(name: string, value: string, maxAge: number = 60 * 60 * 24 * 7): void {
  if (typeof document === 'undefined') {
    return;
  }
  
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; SameSite=None; Secure; max-age=${maxAge}`;
}

/**
 * Checks if the current session is from a shared link
 * @returns Object with sharing info if detected, null otherwise
 */
export function getSharedContentInfo(): { isShared: boolean; postData?: SharedPostData; boardData?: SharedBoardData } {
  console.log('[cookieUtils] Checking for shared content...');
  
  // Log all available cookies for debugging
  console.log('[cookieUtils] All cookies:', document.cookie);
  
  // Check for post-specific shared content first
  const sharedPostDataStr = getCookie('shared_post_data');
  
  if (sharedPostDataStr) {
    console.log('[cookieUtils] Found shared_post_data cookie:', sharedPostDataStr);
    
    try {
      const postData: SharedPostData = JSON.parse(sharedPostDataStr);
      
      // Check if the data is not too old (7 days max)
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
      const isValid = (Date.now() - postData.timestamp) < maxAge;
      
      if (!isValid) {
        console.log('[cookieUtils] Shared post content token expired');
        clearSharedContentCookies();
        return { isShared: false };
      }
      
      console.log('[cookieUtils] ✔ Shared post content detected and valid:', postData);
      return { isShared: true, postData };
      
    } catch (error) {
      console.error('[cookieUtils] Failed to parse shared post data:', error);
      clearSharedContentCookies();
    }
  }
  
  // Check for board-only shared content
  const sharedBoardDataStr = getCookie('shared_board_data');
  
  if (sharedBoardDataStr) {
    console.log('[cookieUtils] Found shared_board_data cookie:', sharedBoardDataStr);
    
    try {
      const boardData: SharedBoardData = JSON.parse(sharedBoardDataStr);
      
      // Check if the data is not too old (7 days max)
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
      const isValid = (Date.now() - boardData.timestamp) < maxAge;
      
      if (!isValid) {
        console.log('[cookieUtils] Shared board content token expired');
        clearSharedContentCookies();
        return { isShared: false };
      }
      
      console.log('[cookieUtils] ✔ Shared board content detected and valid:', boardData);
      return { isShared: true, boardData };
      
    } catch (error) {
      console.error('[cookieUtils] Failed to parse shared board data:', error);
      clearSharedContentCookies();
    }
  }
  
  console.log('[cookieUtils] No shared content detected');
  return { isShared: false };
}

/**
 * Sets cookies for post-based shared content (with optional comment)
 * @param postId - Post ID
 * @param boardId - Board ID
 * @param token - Share token
 * @param commentId - Optional comment ID to highlight
 */
export function setSharedPostCookies(postId: string, boardId: string, token: string, commentId?: string): void {
  const sharedContentToken = `${postId}-${boardId}-${Date.now()}`;
  const postData: SharedPostData = { 
    postId, 
    boardId, 
    token, 
    timestamp: Date.now(),
    ...(commentId && { commentId })
  };

  setCookie('shared_content_token', sharedContentToken);
  setCookie('shared_post_data', JSON.stringify(postData));
  
  console.log(`[cookieUtils] Set shared post cookies for post ${postId}${commentId ? ` comment ${commentId}` : ''}`);
}

/**
 * Sets cookies for board-only shared content
 * @param boardId - Board ID
 * @param token - Share token
 */
export function setSharedBoardCookies(boardId: string, token: string): void {
  const sharedContentToken = `board-${boardId}-${Date.now()}`;
  const boardData: SharedBoardData = { 
    boardId, 
    token, 
    timestamp: Date.now(),
    source: 'board_share'
  };

  setCookie('shared_content_token', sharedContentToken);
  setCookie('shared_board_data', JSON.stringify(boardData));
  
  console.log(`[cookieUtils] Set shared board cookies for board ${boardId}`);
}

/**
 * Clears all shared content cookies (cleanup after processing)
 */
export function clearSharedContentCookies(): void {
  if (typeof document === 'undefined') {
    return;
  }
  
  // Clear all shared content cookies by setting them to expire in the past
  document.cookie = 'shared_content_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=None; Secure';
  document.cookie = 'shared_post_data=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=None; Secure';
  document.cookie = 'shared_board_data=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=None; Secure';
  
  console.log('[cookieUtils] Cleared all shared content cookies');
}

/**
 * Logs cookie detection results for debugging across browsers
 */
export function logCookieDebugInfo(): void {
  console.table([
    { browser: 'Chromium/Edge', expectation: 'cookie should be present' },
    { browser: 'Safari/iOS', expectation: 'cookie usually blocked by ITP' },
    { browser: 'Firefox (strict/private)', expectation: 'cookie likely blocked by ETP' },
  ]);
  
  const hasPostData = !!getCookie('shared_post_data');
  const postDataValue = getCookie('shared_post_data');
  
  console.log(`[cookieUtils] Cookie detection results:`, {
    shared_post_data: hasPostData,
    shared_post_data_value: postDataValue,
    all_cookies: document.cookie,
    userAgent: navigator.userAgent,
    location: window.location.href,
  });
} 
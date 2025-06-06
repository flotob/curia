/**
 * Utility functions for managing Telegram setup banner localStorage state
 */

export const TelegramBannerUtils = {
  /**
   * Check if the banner has been dismissed for a specific community
   */
  isDismissed: (communityId: string): boolean => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(`telegram-banner-dismissed-${communityId}`) === 'true';
  },

  /**
   * Dismiss the banner for a specific community
   */
  dismiss: (communityId: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`telegram-banner-dismissed-${communityId}`, 'true');
  },

  /**
   * Reset the banner state for a specific community (for testing or admin actions)
   */
  reset: (communityId: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(`telegram-banner-dismissed-${communityId}`);
  },

  /**
   * Check if the banner should be shown based on admin status, groups, and dismissal
   */
  shouldShow: (
    isAdmin: boolean, 
    hasConnectedGroups: boolean, 
    communityId: string
  ): boolean => {
    return isAdmin && !hasConnectedGroups && !TelegramBannerUtils.isDismissed(communityId);
  },

  /**
   * Get all dismissed communities (for admin debugging)
   */
  getAllDismissed: (): string[] => {
    if (typeof window === 'undefined') return [];
    
    const dismissed: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('telegram-banner-dismissed-')) {
        const communityId = key.replace('telegram-banner-dismissed-', '');
        if (localStorage.getItem(key) === 'true') {
          dismissed.push(communityId);
        }
      }
    }
    return dismissed;
  },

  /**
   * Clear all dismissed banner states (for testing)
   */
  clearAll: (): void => {
    if (typeof window === 'undefined') return;
    
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('telegram-banner-dismissed-')) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }
}; 
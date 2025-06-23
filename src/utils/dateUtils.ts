/**
 * Utility functions for formatting date/time information related to user visits
 */

/**
 * Formats the time since a user's last visit in a human-readable way
 * @param previousVisit ISO timestamp string of user's last visit, or null for first-time users
 * @returns Human-readable string describing when the user last visited
 */
export function formatTimeSinceLastVisit(previousVisit: string | null): string {
  if (!previousVisit) {
    return "Welcome! This is your first visit.";
  }
  
  const lastVisit = new Date(previousVisit);
  const now = new Date();
  const diffMs = now.getTime() - lastVisit.getTime();
  
  // Convert to various time units
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  
  // Return appropriate format based on time difference
  if (diffMonths > 0) {
    return `Last visit: ${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
  }
  if (diffWeeks > 0) {
    return `Last visit: ${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`;
  }
  if (diffDays > 0) {
    return `Last visit: ${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }
  if (diffHours > 0) {
    return `Last visit: ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  }
  if (diffMinutes > 5) {
    return `Last visit: ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  }
  
  return "Last visit: Just a moment ago";
}

/**
 * Gets a shorter, more compact version for UI display
 * @param previousVisit ISO timestamp string of user's last visit, or null for first-time users
 * @returns Short string like "3d ago" or "First visit"
 */
export function formatTimeSinceLastVisitShort(previousVisit: string | null): string {
  if (!previousVisit) {
    return "First visit";
  }
  
  const lastVisit = new Date(previousVisit);
  const now = new Date();
  const diffMs = now.getTime() - lastVisit.getTime();
  
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  
  if (diffMonths > 0) return `${diffMonths}mo ago`;
  if (diffWeeks > 0) return `${diffWeeks}w ago`;
  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMinutes > 5) return `${diffMinutes}m ago`;
  
  return "Just now";
}

/**
 * Checks if a user is considered "new" (first visit) vs "returning"
 * @param previousVisit ISO timestamp string of user's last visit, or null for first-time users
 * @returns true if this is a first-time user, false if returning user
 */
export function isFirstTimeUser(previousVisit: string | null): boolean {
  return previousVisit === null;
}

/**
 * Checks if a user is returning after a significant absence (more than 7 days)
 * @param previousVisit ISO timestamp string of user's last visit, or null for first-time users
 * @returns true if user hasn't visited in over 7 days
 */
export function isLongTimeReturning(previousVisit: string | null): boolean {
  if (!previousVisit) return false;
  
  const lastVisit = new Date(previousVisit);
  const now = new Date();
  const diffMs = now.getTime() - lastVisit.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  return diffDays >= 7;
}

/**
 * Gets a welcome message based on the user's visit pattern
 * @param previousVisit ISO timestamp string of user's last visit, or null for first-time users
 * @param userName Optional user name for personalization
 * @returns Personalized welcome message
 */
export function getWelcomeMessage(previousVisit: string | null, userName?: string | null): string {
  const name = userName ? ` ${userName}` : '';
  
  if (isFirstTimeUser(previousVisit)) {
    return `🎉 Welcome to the community${name}!`;
  }
  
  if (isLongTimeReturning(previousVisit)) {
    return `👋 Welcome back${name}! ${formatTimeSinceLastVisit(previousVisit)}`;
  }
  
  return `👋 Welcome back${name}! ${formatTimeSinceLastVisit(previousVisit)}`;
} 
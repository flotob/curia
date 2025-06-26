// Utility for fetching all friends from Common Ground with pagination
// Used by both useFriends hook and AuthContext session sync

interface Friend {
  id: string;
  name: string;
  image?: string;
}

interface CgInstanceWithFriends {
  getUserFriends(limit: number, offset: number): Promise<{
    data?: {
      friends?: Array<{
        id: string;
        name: string;
        imageUrl?: string;
      }>;
    };
  }>;
}

/**
 * Fetches ALL friends from Common Ground using pagination
 * Handles the complete friend list, not just the first 100
 */
export async function fetchAllFriendsFromCgLib(
  cgInstance: CgInstanceWithFriends
): Promise<Friend[]> {
  const allFriends: Friend[] = [];
  let offset = 0;
  const limit = 100; // Keep reasonable page size
  let hasMore = true;
  let pageCount = 0;

  console.log('[friendsSync] Starting paginated fetch of all friends from CG lib...');

  while (hasMore) {
    try {
      pageCount++;
      console.log(`[friendsSync] Fetching page ${pageCount} (offset: ${offset}, limit: ${limit})`);
      
      const response = await cgInstance.getUserFriends(limit, offset);
      
      // Handle different possible response structures
      const friendsData = response?.data?.friends || response?.data || response || [];
      
      if (!Array.isArray(friendsData)) {
        throw new Error('Invalid response from CG lib - expected array of friends');
      }

      const friends = friendsData.map((friend: { id: string; name: string; imageUrl?: string }) => ({
        id: friend.id,
        name: friend.name,
        image: friend.imageUrl // Map imageUrl to image for consistency
      }));

      allFriends.push(...friends);
      
      // Check if we got fewer results than requested (indicates last page)
      hasMore = friends.length === limit;
      offset += limit;
      
      console.log(`[friendsSync] Page ${pageCount} complete: ${friends.length} friends (total: ${allFriends.length})`);
      
      // Add small delay between requests to be respectful to Common Ground API
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
    } catch (error) {
      console.error(`[friendsSync] Error fetching page ${pageCount} at offset ${offset}:`, error);
      
      // Don't throw immediately - try to continue with partial data if possible
      if (allFriends.length === 0) {
        // If we haven't gotten any friends yet, throw the error
        throw error;
      } else {
        // If we have some friends, log warning and break the loop
        console.warn(`[friendsSync] Stopping pagination due to error after fetching ${allFriends.length} friends`);
        break;
      }
    }
  }

  console.log(`[friendsSync] Completed paginated fetch: ${allFriends.length} total friends across ${pageCount} pages`);
  return allFriends;
} 
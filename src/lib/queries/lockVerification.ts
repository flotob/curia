import { query } from '@/lib/db';

/**
 * Get verified lock IDs for a user
 * Replaces duplicate pre-verification queries across voting, commenting, and reaction endpoints
 * This is security-critical code - always check verification_status='verified' and expires_at > NOW()
 */
export async function getUserVerifiedLocks(userId: string, lockIds: number[]): Promise<Set<number>> {
  if (lockIds.length === 0) return new Set<number>();
  
  try {
    const placeholders = lockIds.map((_, index) => `$${index + 2}`).join(', ');
    const result = await query(`
      SELECT lock_id FROM pre_verifications 
      WHERE user_id = $1 AND lock_id IN (${placeholders})
        AND verification_status = 'verified' AND expires_at > NOW()
    `, [userId, ...lockIds]);
    
    return new Set(result.rows.map((row: { lock_id: number }) => row.lock_id));
  } catch (error) {
    console.error('[getUserVerifiedLocks] Error fetching verified locks for user:', userId, error);
    // Return empty set on error for security - no access by default
    return new Set<number>();
  }
}

/**
 * Check if user has access based on lock verification and fulfillment mode
 * @param userId - User ID to check
 * @param lockIds - Array of lock IDs that are required
 * @param fulfillmentMode - 'any' (user needs at least 1 lock) or 'all' (user needs all locks)
 * @returns Promise<boolean> indicating if user has access
 */
export async function checkUserLockAccess(
  userId: string, 
  lockIds: number[], 
  fulfillmentMode: 'any' | 'all' = 'all'
): Promise<boolean> {
  if (lockIds.length === 0) return true; // No locks required = access granted
  
  try {
    const verifiedLockIds = await getUserVerifiedLocks(userId, lockIds);
    const verifiedCount = verifiedLockIds.size;
    const requiredCount = lockIds.length;
    
    // Apply fulfillment logic
    const hasAccess = fulfillmentMode === 'any'
      ? verifiedCount >= 1
      : verifiedCount >= requiredCount;
      
    console.log(`[checkUserLockAccess] User ${userId}: ${verifiedCount}/${requiredCount} locks verified (${fulfillmentMode} mode) = ${hasAccess ? 'GRANTED' : 'DENIED'}`);
    
    return hasAccess;
  } catch (error) {
    console.error('[checkUserLockAccess] Error checking lock access for user:', userId, error);
    // Return false on error for security - no access by default
    return false;
  }
}

/**
 * Get verification details for user and locks (for API responses)
 * @param userId - User ID to check
 * @param lockIds - Array of lock IDs to check
 * @returns Promise with verification details including counts and verified lock IDs
 */
export async function getUserLockVerificationDetails(userId: string, lockIds: number[]) {
  if (lockIds.length === 0) {
    return {
      verifiedLockIds: new Set<number>(),
      verifiedCount: 0,
      requiredCount: 0,
      hasAnyAccess: true,
      hasAllAccess: true
    };
  }
  
  try {
    const verifiedLockIds = await getUserVerifiedLocks(userId, lockIds);
    const verifiedCount = verifiedLockIds.size;
    const requiredCount = lockIds.length;
    
    return {
      verifiedLockIds,
      verifiedCount,
      requiredCount,
      hasAnyAccess: verifiedCount >= 1,
      hasAllAccess: verifiedCount >= requiredCount
    };
  } catch (error) {
    console.error('[getUserLockVerificationDetails] Error getting verification details:', error);
    return {
      verifiedLockIds: new Set<number>(),
      verifiedCount: 0,
      requiredCount: lockIds.length,
      hasAnyAccess: false,
      hasAllAccess: false
    };
  }
}

/**
 * Batch check lock verification for multiple users (for admin/moderation tools)
 * @param userIds - Array of user IDs to check
 * @param lockIds - Array of lock IDs to check
 * @returns Promise<Map<string, Set<number>>> mapping user IDs to their verified lock IDs
 */
export async function getBatchUserVerifiedLocks(userIds: string[], lockIds: number[]): Promise<Map<string, Set<number>>> {
  if (userIds.length === 0 || lockIds.length === 0) return new Map();
  
  try {
    const userPlaceholders = userIds.map((_, i) => `$${i + 1}`).join(',');
    const lockPlaceholders = lockIds.map((_, i) => `$${userIds.length + i + 1}`).join(',');
    
    const result = await query(`
      SELECT user_id, lock_id FROM pre_verifications 
      WHERE user_id IN (${userPlaceholders})
        AND lock_id IN (${lockPlaceholders})
        AND verification_status = 'verified' 
        AND expires_at > NOW()
    `, [...userIds, ...lockIds]);
    
    const verificationMap = new Map<string, Set<number>>();
    
    // Initialize empty sets for all users
    userIds.forEach(userId => {
      verificationMap.set(userId, new Set<number>());
    });
    
    // Populate verified locks
    result.rows.forEach((row: { user_id: string; lock_id: number }) => {
      const userLocks = verificationMap.get(row.user_id);
      if (userLocks) {
        userLocks.add(row.lock_id);
      }
    });
    
    return verificationMap;
  } catch (error) {
    console.error('[getBatchUserVerifiedLocks] Error fetching batch verified locks:', error);
    // Return empty sets for all users on error
    const fallbackMap = new Map<string, Set<number>>();
    userIds.forEach(userId => {
      fallbackMap.set(userId, new Set<number>());
    });
    return fallbackMap;
  }
}
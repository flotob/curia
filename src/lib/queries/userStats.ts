import { query } from '@/lib/db';

export interface UserStats {
  posts_count: number;
  comments_count: number;
  joined_date: string;
}

/**
 * Get user statistics (posts, comments, join date) for a single user
 * Replaces duplicate queries across multiple endpoints
 */
export async function getUserStats(userId: string): Promise<UserStats> {
  try {
    const [postsResult, commentsResult, joinDateResult] = await Promise.all([
      query('SELECT COUNT(*) as count FROM posts WHERE author_user_id = $1', [userId]),
      query('SELECT COUNT(*) as count FROM comments WHERE author_user_id = $1', [userId]),
      query('SELECT MIN(created_at) as joined_date FROM user_communities WHERE user_id = $1', [userId])
    ]);

    return {
      posts_count: parseInt(postsResult.rows[0]?.count || '0'),
      comments_count: parseInt(commentsResult.rows[0]?.count || '0'),
      joined_date: joinDateResult.rows[0]?.joined_date || new Date().toISOString()
    };
  } catch (error) {
    console.error('[getUserStats] Error fetching user stats for user:', userId, error);
    // Return safe defaults on error
    return {
      posts_count: 0,
      comments_count: 0,
      joined_date: new Date().toISOString()
    };
  }
}

/**
 * Get user statistics for multiple users in a single batch query
 * Eliminates N+1 query problems in search results and user lists
 */
export async function getBatchUserStats(userIds: string[]): Promise<Map<string, UserStats>> {
  if (userIds.length === 0) return new Map();
  
  try {
    const placeholders = userIds.map((_, i) => `$${i + 1}`).join(',');
    const result = await query(`
      SELECT 
        u.user_id,
        COALESCE(p.post_count, 0) as posts_count,
        COALESCE(c.comment_count, 0) as comments_count,
        COALESCE(uc.joined_date, NOW()) as joined_date
      FROM (SELECT unnest(ARRAY[${placeholders}]) as user_id) u
      LEFT JOIN (
        SELECT author_user_id, COUNT(*) as post_count 
        FROM posts 
        WHERE author_user_id = ANY($${userIds.length + 1})
        GROUP BY author_user_id
      ) p ON u.user_id = p.author_user_id
      LEFT JOIN (
        SELECT author_user_id, COUNT(*) as comment_count 
        FROM comments 
        WHERE author_user_id = ANY($${userIds.length + 1})
        GROUP BY author_user_id
      ) c ON u.user_id = c.author_user_id
      LEFT JOIN (
        SELECT user_id, MIN(created_at) as joined_date 
        FROM user_communities 
        WHERE user_id = ANY($${userIds.length + 1})
        GROUP BY user_id
      ) uc ON u.user_id = uc.user_id
    `, [...userIds, `{${userIds.join(',')}}`]);
    
    const statsMap = new Map<string, UserStats>();
    result.rows.forEach((row: { user_id: string; posts_count: string | number; comments_count: string | number; joined_date: string }) => {
      statsMap.set(row.user_id, {
        posts_count: parseInt(String(row.posts_count || '0')),
        comments_count: parseInt(String(row.comments_count || '0')),
        joined_date: row.joined_date || new Date().toISOString()
      });
    });
    
    // Ensure all requested users have entries (with defaults for missing users)
    userIds.forEach(userId => {
      if (!statsMap.has(userId)) {
        statsMap.set(userId, {
          posts_count: 0,
          comments_count: 0,
          joined_date: new Date().toISOString()
        });
      }
    });
    
    return statsMap;
  } catch (error) {
    console.error('[getBatchUserStats] Error fetching batch user stats:', error);
    // Return map with safe defaults for all users
    const fallbackMap = new Map<string, UserStats>();
    userIds.forEach(userId => {
      fallbackMap.set(userId, {
        posts_count: 0,
        comments_count: 0,
        joined_date: new Date().toISOString()
      });
    });
    return fallbackMap;
  }
}

/**
 * Get combined user stats using optimized single query
 * More efficient than individual queries for the /me endpoint
 */
export async function getUserStatsOptimized(userId: string): Promise<UserStats> {
  try {
    const result = await query(`
      SELECT 
        (SELECT COUNT(*) FROM posts WHERE author_user_id = $1) as post_count,
        (SELECT COUNT(*) FROM comments WHERE author_user_id = $1) as comment_count,
        (SELECT MIN(created_at) FROM user_communities WHERE user_id = $1) as joined_date
    `, [userId]);
    
    const row = result.rows[0];
    return {
      posts_count: parseInt(row?.post_count || '0'),
      comments_count: parseInt(row?.comment_count || '0'),
      joined_date: row?.joined_date || new Date().toISOString()
    };
  } catch (error) {
    console.error('[getUserStatsOptimized] Error fetching optimized user stats:', userId, error);
    return {
      posts_count: 0,
      comments_count: 0,
      joined_date: new Date().toISOString()
    };
  }
}
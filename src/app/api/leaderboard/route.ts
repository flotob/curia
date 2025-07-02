import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';

export interface LeaderboardUser {
  user_id: string;
  name: string;
  profile_picture_url?: string;
  score: number;
  rank: number;
  change_from_last_week?: number;
  additional_stats?: Record<string, number>;
}

export interface LeaderboardCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  users: LeaderboardUser[];
  metric_name: string;
  period: 'all_time' | 'this_month' | 'this_week';
}

export interface LeaderboardResponse {
  categories: LeaderboardCategory[];
  community_id: string;
  community_name: string;
  updated_at: string;
  current_user_rankings?: Record<string, { rank: number; score: number }>;
}

async function handler(req: AuthenticatedRequest) {
  const userId = req.user?.sub;
  const communityId = req.user?.cid;

  if (!userId || !communityId) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url!);
    const period = (searchParams.get('period') || 'this_month') as 'all_time' | 'this_month' | 'this_week';

    // Calculate date filters based on period
    let dateFilter = '';
    let commentDateFilter = '';
    let reactionDateFilter = '';
    let lockDateFilter = '';
    let verificationDateFilter = '';
    
    if (period === 'this_week') {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      dateFilter = `AND p.created_at >= '${weekAgo}'`;
      commentDateFilter = `AND c.created_at >= '${weekAgo}'`;
      reactionDateFilter = `AND r.created_at >= '${weekAgo}'`;
      lockDateFilter = `AND l.created_at >= '${weekAgo}'`;
      verificationDateFilter = `AND pv.created_at >= '${weekAgo}'`;
    } else if (period === 'this_month') {
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      dateFilter = `AND p.created_at >= '${monthAgo}'`;
      commentDateFilter = `AND c.created_at >= '${monthAgo}'`;
      reactionDateFilter = `AND r.created_at >= '${monthAgo}'`;
      lockDateFilter = `AND l.created_at >= '${monthAgo}'`;
      verificationDateFilter = `AND pv.created_at >= '${monthAgo}'`;
    }

    console.log(`[Leaderboard API] Fetching ${period} leaderboard for community ${communityId}`);

    // Get community info
    const communityResult = await query(
      'SELECT name FROM communities WHERE id = $1',
      [communityId]
    );
    
    const communityName = communityResult.rows[0]?.name || 'Community';

    // Parallel queries for all leaderboard categories
    const [
      topPostCreators,
      topCommenters,
      topUpvoteReceivers,
      topLockCreators,
      topLockVerifiers,
      topReactors,
      topOverallActive
    ] = await Promise.all([
      // Top Post Creators
      query(`
        SELECT 
          u.user_id,
          u.name,
          u.profile_picture_url,
          COUNT(p.id) as score,
          ROW_NUMBER() OVER (ORDER BY COUNT(p.id) DESC, u.name) as rank
        FROM users u
        INNER JOIN posts p ON u.user_id = p.author_user_id
        INNER JOIN boards b ON p.board_id = b.id
        WHERE b.community_id = $1 ${dateFilter}
        GROUP BY u.user_id, u.name, u.profile_picture_url
        HAVING COUNT(p.id) > 0
        ORDER BY score DESC, u.name
        LIMIT 50
      `, [communityId]),

      // Top Commenters
      query(`
        SELECT 
          u.user_id,
          u.name,
          u.profile_picture_url,
          COUNT(c.id) as score,
          ROW_NUMBER() OVER (ORDER BY COUNT(c.id) DESC, u.name) as rank
        FROM users u
        INNER JOIN comments c ON u.user_id = c.author_user_id
        INNER JOIN posts p ON c.post_id = p.id
        INNER JOIN boards b ON p.board_id = b.id
        WHERE b.community_id = $1 ${commentDateFilter}
        GROUP BY u.user_id, u.name, u.profile_picture_url
        HAVING COUNT(c.id) > 0
        ORDER BY score DESC, u.name
        LIMIT 50
      `, [communityId]),

      // Top Upvote Receivers (users whose posts got the most upvotes)
      query(`
        SELECT 
          u.user_id,
          u.name,
          u.profile_picture_url,
          COALESCE(SUM(p.upvote_count), 0) as score,
          ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(p.upvote_count), 0) DESC, u.name) as rank
        FROM users u
        INNER JOIN posts p ON u.user_id = p.author_user_id
        INNER JOIN boards b ON p.board_id = b.id
        WHERE b.community_id = $1 ${dateFilter}
        GROUP BY u.user_id, u.name, u.profile_picture_url
        HAVING COALESCE(SUM(p.upvote_count), 0) > 0
        ORDER BY score DESC, u.name
        LIMIT 50
      `, [communityId]),

      // Top Lock Creators
      query(`
        SELECT 
          u.user_id,
          u.name,
          u.profile_picture_url,
          COUNT(l.id) as score,
          ROW_NUMBER() OVER (ORDER BY COUNT(l.id) DESC, u.name) as rank
        FROM users u
        INNER JOIN locks l ON u.user_id = l.creator_user_id
        WHERE l.community_id = $1 ${lockDateFilter}
        GROUP BY u.user_id, u.name, u.profile_picture_url
        HAVING COUNT(l.id) > 0
        ORDER BY score DESC, u.name
        LIMIT 50
      `, [communityId]),

      // Top Lock Verifiers (users who completed the most successful verifications)
      query(`
        SELECT 
          u.user_id,
          u.name,
          u.profile_picture_url,
          COUNT(DISTINCT pv.id) as score,
          ROW_NUMBER() OVER (ORDER BY COUNT(DISTINCT pv.id) DESC, u.name) as rank
        FROM users u
        INNER JOIN pre_verifications pv ON u.user_id = pv.user_id
        INNER JOIN locks l ON pv.lock_id = l.id
        WHERE l.community_id = $1 
          AND pv.verification_status = 'verified' 
          ${verificationDateFilter}
        GROUP BY u.user_id, u.name, u.profile_picture_url
        HAVING COUNT(DISTINCT pv.id) > 0
        ORDER BY score DESC, u.name
        LIMIT 50
      `, [communityId]),

      // Top Reactors (users who gave the most reactions)
      query(`
        SELECT 
          u.user_id,
          u.name,
          u.profile_picture_url,
          COUNT(r.id) as score,
          ROW_NUMBER() OVER (ORDER BY COUNT(r.id) DESC, u.name) as rank
        FROM users u
        INNER JOIN reactions r ON u.user_id = r.user_id
        LEFT JOIN posts p ON r.post_id = p.id
        LEFT JOIN boards pb ON p.board_id = pb.id
        LEFT JOIN comments c ON r.comment_id = c.id
        LEFT JOIN posts cp ON c.post_id = cp.id
        LEFT JOIN boards cb ON cp.board_id = cb.id
        LEFT JOIN locks l ON r.lock_id = l.id
        WHERE (pb.community_id = $1 OR cb.community_id = $1 OR l.community_id = $1)
          ${reactionDateFilter}
        GROUP BY u.user_id, u.name, u.profile_picture_url
        HAVING COUNT(r.id) > 0
        ORDER BY score DESC, u.name
        LIMIT 50
      `, [communityId]),

      // Top Overall Active (posts + comments combined)
      query(`
        SELECT 
          u.user_id,
          u.name,
          u.profile_picture_url,
          (COALESCE(post_count, 0) + COALESCE(comment_count, 0)) as score,
          ROW_NUMBER() OVER (ORDER BY (COALESCE(post_count, 0) + COALESCE(comment_count, 0)) DESC, u.name) as rank,
          COALESCE(post_count, 0) as post_count,
          COALESCE(comment_count, 0) as comment_count
        FROM users u
        LEFT JOIN (
          SELECT 
            p.author_user_id,
            COUNT(p.id) as post_count
          FROM posts p
          INNER JOIN boards b ON p.board_id = b.id
          WHERE b.community_id = $1 ${dateFilter}
          GROUP BY p.author_user_id
        ) posts_data ON u.user_id = posts_data.author_user_id
        LEFT JOIN (
          SELECT 
            c.author_user_id,
            COUNT(c.id) as comment_count
          FROM comments c
          INNER JOIN posts p ON c.post_id = p.id
          INNER JOIN boards b ON p.board_id = b.id
          WHERE b.community_id = $1 ${commentDateFilter}
          GROUP BY c.author_user_id
        ) comments_data ON u.user_id = comments_data.author_user_id
        WHERE (COALESCE(post_count, 0) + COALESCE(comment_count, 0)) > 0
        ORDER BY score DESC, u.name
        LIMIT 50
      `, [communityId])
    ]);

    // Helper function to process leaderboard data
    const processLeaderboardData = (data: { user_id: string; name: string; profile_picture_url?: string; score: string; post_count?: string; comment_count?: string }[]): LeaderboardUser[] => {
      return data.map((row, index) => ({
        user_id: row.user_id,
        name: row.name,
        profile_picture_url: row.profile_picture_url,
        score: parseInt(row.score || '0'),
        rank: index + 1, // Use actual ranking
        additional_stats: row.post_count !== undefined ? {
          posts: parseInt(row.post_count || '0'),
          comments: parseInt(row.comment_count || '0')
        } : undefined
      }));
    };

    // Build categories
    const categories: LeaderboardCategory[] = [
      {
        id: 'post_creators',
        name: 'Post Masters',
        description: 'Most posts created',
        icon: 'file-text',
        users: processLeaderboardData(topPostCreators.rows),
        metric_name: 'posts',
        period
      },
      {
        id: 'commenters',
        name: 'Conversation Champions',
        description: 'Most comments made',
        icon: 'message-square',
        users: processLeaderboardData(topCommenters.rows),
        metric_name: 'comments',
        period
      },
      {
        id: 'upvote_receivers',
        name: 'Quality Contributors',
        description: 'Most upvotes received',
        icon: 'trending-up',
        users: processLeaderboardData(topUpvoteReceivers.rows),
        metric_name: 'upvotes',
        period
      },
      {
        id: 'lock_creators',
        name: 'Lock Architects',
        description: 'Most locks created',
        icon: 'lock',
        users: processLeaderboardData(topLockCreators.rows),
        metric_name: 'locks',
        period
      },
      {
        id: 'lock_verifiers',
        name: 'Verification Heroes',
        description: 'Most locks verified',
        icon: 'check-circle',
        users: processLeaderboardData(topLockVerifiers.rows),
        metric_name: 'verifications',
        period
      },
      {
        id: 'reactors',
        name: 'Reaction Champions',
        description: 'Most reactions given',
        icon: 'heart',
        users: processLeaderboardData(topReactors.rows),
        metric_name: 'reactions',
        period
      },
      {
        id: 'overall_active',
        name: 'Super Contributors',
        description: 'Most overall activity',
        icon: 'zap',
        users: processLeaderboardData(topOverallActive.rows),
        metric_name: 'activities',
        period
      }
    ];

    // Get current user rankings
    const currentUserRankings: Record<string, { rank: number; score: number }> = {};
    
    categories.forEach(category => {
      const userRank = category.users.findIndex(user => user.user_id === userId);
      if (userRank !== -1) {
        currentUserRankings[category.id] = {
          rank: userRank + 1,
          score: category.users[userRank].score
        };
      }
    });

    const response: LeaderboardResponse = {
      categories: categories.filter(cat => cat.users.length > 0), // Only show categories with data
      community_id: communityId,
      community_name: communityName,
      updated_at: new Date().toISOString(),
      current_user_rankings: Object.keys(currentUserRankings).length > 0 ? currentUserRankings : undefined
    };

    console.log(`[Leaderboard API] Returning ${categories.length} categories for community ${communityId}`);
    
    return NextResponse.json(response);

  } catch (error) {
    console.error('[Leaderboard API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard data' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handler);
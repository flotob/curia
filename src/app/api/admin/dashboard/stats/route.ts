import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';

export interface DashboardStats {
  // User Statistics
  totalUsers: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  activeUsersThisWeek: number;
  
  // Content Statistics
  totalPosts: number;
  postsThisWeek: number;
  postsThisMonth: number;
  totalComments: number;
  commentsThisWeek: number;
  commentsThisMonth: number;
  
  // Board Statistics
  totalBoards: number;
  
  // Engagement Statistics
  averagePostsPerUser: number;
  averageCommentsPerPost: number;
  
  // Growth Data for Charts
  userGrowthData: Array<{
    date: string;
    users: number;
    newUsers: number;
  }>;
  
  postActivityData: Array<{
    date: string;
    posts: number;
    comments: number;
  }>;
  
  topBoards: Array<{
    id: number;
    name: string;
    postCount: number;
    commentCount: number;
  }>;
}

async function handler(req: AuthenticatedRequest) {
  const userId = req.user?.sub;
  const isAdmin = req.user?.adm || req.user?.sub === process.env.NEXT_PUBLIC_SUPERADMIN_ID;

  console.log(`[Dashboard Stats API] Request from user ${userId}, isAdmin: ${isAdmin}`);

  if (!isAdmin) {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    );
  }

  try {
    // Get current date boundaries
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Parallel queries for better performance
    const [
      totalUsersResult,
      newUsersWeekResult,
      newUsersMonthResult,
      activeUsersWeekResult,
      totalPostsResult,
      postsWeekResult,
      postsMonthResult,
      totalCommentsResult,
      commentsWeekResult,
      commentsMonthResult,
      totalBoardsResult,
      userGrowthResult,
      postActivityResult,
      topBoardsResult
    ] = await Promise.all([
      // Total users
      query('SELECT COUNT(*) as count FROM users'),
      
      // New users this week (based on first community visit)
      query('SELECT COUNT(DISTINCT user_id) as count FROM user_communities WHERE first_visited_at >= $1', [oneWeekAgo.toISOString()]),
      
      // New users this month (based on first community visit)
      query('SELECT COUNT(DISTINCT user_id) as count FROM user_communities WHERE first_visited_at >= $1', [oneMonthAgo.toISOString()]),
      
      // Active users this week (users who posted or commented)
      query(`
        SELECT COUNT(DISTINCT user_id) as count FROM (
          SELECT author_user_id as user_id FROM posts WHERE created_at >= $1
          UNION
          SELECT author_user_id as user_id FROM comments WHERE created_at >= $1
        ) active_users
      `, [oneWeekAgo.toISOString()]),
      
      // Total posts
      query('SELECT COUNT(*) as count FROM posts'),
      
      // Posts this week
      query('SELECT COUNT(*) as count FROM posts WHERE created_at >= $1', [oneWeekAgo.toISOString()]),
      
      // Posts this month
      query('SELECT COUNT(*) as count FROM posts WHERE created_at >= $1', [oneMonthAgo.toISOString()]),
      
      // Total comments
      query('SELECT COUNT(*) as count FROM comments'),
      
      // Comments this week
      query('SELECT COUNT(*) as count FROM comments WHERE created_at >= $1', [oneWeekAgo.toISOString()]),
      
      // Comments this month
      query('SELECT COUNT(*) as count FROM comments WHERE created_at >= $1', [oneMonthAgo.toISOString()]),
      
      // Total boards
      query('SELECT COUNT(*) as count FROM boards'),
      
      // User growth data (last 30 days) - based on community visits
      query(`
        WITH date_series AS (
          SELECT generate_series(
            CURRENT_DATE - INTERVAL '29 days',
            CURRENT_DATE,
            INTERVAL '1 day'
          )::date as date
        ),
        daily_users AS (
          SELECT 
            DATE(first_visited_at) as date,
            COUNT(DISTINCT user_id) as new_users
          FROM user_communities 
          WHERE first_visited_at >= CURRENT_DATE - INTERVAL '29 days'
          GROUP BY DATE(first_visited_at)
        ),
        cumulative_users AS (
          SELECT 
            ds.date,
            COALESCE(du.new_users, 0) as new_users,
            (SELECT COUNT(DISTINCT user_id) FROM user_communities WHERE DATE(first_visited_at) <= ds.date) as total_users
          FROM date_series ds
          LEFT JOIN daily_users du ON ds.date = du.date
        )
        SELECT 
          date,
          total_users as users,
          new_users
        FROM cumulative_users
        ORDER BY date
      `),
      
      // Post activity data (last 30 days)
      query(`
        WITH date_series AS (
          SELECT generate_series(
            CURRENT_DATE - INTERVAL '29 days',
            CURRENT_DATE,
            INTERVAL '1 day'
          )::date as date
        ),
        daily_posts AS (
          SELECT 
            DATE(created_at) as date,
            COUNT(*) as posts
          FROM posts 
          WHERE created_at >= CURRENT_DATE - INTERVAL '29 days'
          GROUP BY DATE(created_at)
        ),
        daily_comments AS (
          SELECT 
            DATE(created_at) as date,
            COUNT(*) as comments
          FROM comments 
          WHERE created_at >= CURRENT_DATE - INTERVAL '29 days'
          GROUP BY DATE(created_at)
        )
        SELECT 
          ds.date,
          COALESCE(dp.posts, 0) as posts,
          COALESCE(dc.comments, 0) as comments
        FROM date_series ds
        LEFT JOIN daily_posts dp ON ds.date = dp.date
        LEFT JOIN daily_comments dc ON ds.date = dc.date
        ORDER BY date
      `),
      
      // Top boards by activity
      query(`
        SELECT 
          b.id,
          b.name,
          COUNT(DISTINCT p.id) as post_count,
          COUNT(DISTINCT c.id) as comment_count
        FROM boards b
        LEFT JOIN posts p ON b.id = p.board_id
        LEFT JOIN comments c ON p.id = c.post_id
        GROUP BY b.id, b.name
        ORDER BY (COUNT(DISTINCT p.id) + COUNT(DISTINCT c.id)) DESC
        LIMIT 10
      `)
    ]);

    // Calculate derived statistics
    const totalUsers = parseInt(totalUsersResult.rows[0]?.count || '0');
    const totalPosts = parseInt(totalPostsResult.rows[0]?.count || '0');
    const totalComments = parseInt(totalCommentsResult.rows[0]?.count || '0');

    const averagePostsPerUser = totalUsers > 0 ? totalPosts / totalUsers : 0;
    const averageCommentsPerPost = totalPosts > 0 ? totalComments / totalPosts : 0;

    // Format growth data
    const userGrowthData = userGrowthResult.rows.map(row => ({
      date: row.date,
      users: parseInt(row.users || '0'),
      newUsers: parseInt(row.new_users || '0')
    }));

    const postActivityData = postActivityResult.rows.map(row => ({
      date: row.date,
      posts: parseInt(row.posts || '0'),
      comments: parseInt(row.comments || '0')
    }));

    const topBoards = topBoardsResult.rows.map(row => ({
      id: parseInt(row.id),
      name: row.name,
      postCount: parseInt(row.post_count || '0'),
      commentCount: parseInt(row.comment_count || '0')
    }));

    const stats: DashboardStats = {
      // User Statistics
      totalUsers,
      newUsersThisWeek: parseInt(newUsersWeekResult.rows[0]?.count || '0'),
      newUsersThisMonth: parseInt(newUsersMonthResult.rows[0]?.count || '0'),
      activeUsersThisWeek: parseInt(activeUsersWeekResult.rows[0]?.count || '0'),
      
      // Content Statistics
      totalPosts,
      postsThisWeek: parseInt(postsWeekResult.rows[0]?.count || '0'),
      postsThisMonth: parseInt(postsMonthResult.rows[0]?.count || '0'),
      totalComments,
      commentsThisWeek: parseInt(commentsWeekResult.rows[0]?.count || '0'),
      commentsThisMonth: parseInt(commentsMonthResult.rows[0]?.count || '0'),
      
      // Board Statistics
      totalBoards: parseInt(totalBoardsResult.rows[0]?.count || '0'),
      
      // Engagement Statistics
      averagePostsPerUser: Math.round(averagePostsPerUser * 100) / 100,
      averageCommentsPerPost: Math.round(averageCommentsPerPost * 100) / 100,
      
      // Growth Data
      userGrowthData,
      postActivityData,
      topBoards
    };

    console.log(`[Dashboard Stats API] Returning stats for ${totalUsers} users, ${totalPosts} posts`);
    
    return NextResponse.json(stats);

  } catch (error) {
    console.error('[Dashboard Stats API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handler, true); // Admin only
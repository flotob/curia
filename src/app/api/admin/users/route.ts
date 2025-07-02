import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { getBatchUserStats, UserStats } from '@/lib/queries/userStats';

export interface AdminUser {
  user_id: string;
  name: string;
  profile_picture_url: string | null;
  created_at: string;
  last_active: string | null;
  stats: UserStats;
  roles?: string[];
  isAdmin?: boolean;
}

export interface AdminUsersResponse {
  users: AdminUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

async function handler(req: AuthenticatedRequest) {
  const userId = req.user?.sub;
  const isAdmin = req.user?.adm || req.user?.sub === process.env.NEXT_PUBLIC_SUPERADMIN_ID;

  console.log(`[Admin Users API] Request from user ${userId}, isAdmin: ${isAdmin}`);

  if (!isAdmin) {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    );
  }

  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100); // Max 100 per page
    const search = url.searchParams.get('search') || '';
    const sortBy = url.searchParams.get('sortBy') || 'created_at';
    const sortOrder = url.searchParams.get('sortOrder') || 'desc';

    const offset = (page - 1) * limit;

    // Build search condition
    let searchCondition = '';
    const searchParams: string[] = [];
    let paramIndex = 1;

    if (search) {
      searchCondition = `WHERE (u.name ILIKE $${paramIndex} OR u.user_id ILIKE $${paramIndex})`;
      searchParams.push(`%${search}%`);
      paramIndex++;
    }

    // Validate sort parameters
    const validSortFields = ['created_at', 'name', 'last_active'];
    const validSortOrders = ['asc', 'desc'];
    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = validSortOrders.includes(sortOrder.toLowerCase()) ? sortOrder.toLowerCase() : 'desc';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM users u 
      ${searchCondition}
    `;
    const countResult = await query(countQuery, searchParams);
    const total = parseInt(countResult.rows[0]?.total || '0');

    // Get users with pagination
    const usersQuery = `
      SELECT 
        u.user_id,
        u.name,
        u.profile_picture_url,
        u.updated_at,
        u.settings->>'roles' as roles,
        uc.first_visited_at as created_at,
        (
          SELECT MAX(activity_time) FROM (
            SELECT MAX(created_at) as activity_time FROM posts WHERE author_user_id = u.user_id
            UNION ALL
            SELECT MAX(created_at) as activity_time FROM comments WHERE author_user_id = u.user_id
          ) activities
        ) as last_active
      FROM users u
      LEFT JOIN user_communities uc ON u.user_id = uc.user_id
      ${searchCondition}
      ORDER BY ${safeSortBy === 'created_at' ? 'uc.first_visited_at' : `u.${safeSortBy}`} ${safeSortOrder.toUpperCase()}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const usersParams = [...searchParams, limit, offset];
    const usersResult = await query(usersQuery, usersParams);

    // Get user IDs for batch stats lookup
    const userIds = usersResult.rows.map(row => row.user_id);
    const userStatsMap = await getBatchUserStats(userIds);

    // Format users with stats
    const users: AdminUser[] = usersResult.rows.map(row => {
      const userStats = userStatsMap.get(row.user_id) || {
        posts_count: 0,
        comments_count: 0,
        joined_date: row.created_at
      };

      // Parse roles from JSON string if it exists
      let roles: string[] = [];
      if (row.roles) {
        try {
          roles = Array.isArray(row.roles) ? row.roles : JSON.parse(row.roles);
        } catch {
          roles = [row.roles]; // Fallback if it's a simple string
        }
      }

      return {
        user_id: row.user_id,
        name: row.name || 'Unknown User',
        profile_picture_url: row.profile_picture_url,
        created_at: row.created_at || row.updated_at, // Fallback to updated_at if no first_visited_at
        last_active: row.last_active,
        stats: userStats,
        roles: roles,
        isAdmin: roles.includes('admin') || row.user_id === process.env.NEXT_PUBLIC_SUPERADMIN_ID
      };
    });

    // Calculate pagination
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    const response: AdminUsersResponse = {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev
      }
    };

    console.log(`[Admin Users API] Returning ${users.length} users (page ${page}/${totalPages})`);
    
    return NextResponse.json(response);

  } catch (error) {
    console.error('[Admin Users API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handler, true); // Admin only
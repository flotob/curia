import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest, RouteContext } from '@/lib/withAuth';
import { query } from '@/lib/db';
import { getPostsByAuthor } from '@/lib/queries/enrichedPosts';
import { getAccessibleBoardIds, getAccessibleBoards } from '@/lib/boardPermissions';

interface UserActivityQuery {
  type?: 'posts_by_user' | 'comments_by_user' | 'reactions_by_user' | 'posts_user_commented_on';
  limit?: number;
  offset?: number;
  boardId?: string;
  communityId?: string; // Community filtering for cross-community data
  showOnlyNew?: boolean; // Optional filter to show only new items
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface ActivityCounts {
  postsByUser: number;
  commentsByUser: number;
  reactionsByUser: number;
  postsUserCommentedOn: number;
}

// interface ActivitySummary {
//   newCounts: ActivityCounts;
//   totalCounts: ActivityCounts;
// }

async function getUserActivityHandler(req: AuthenticatedRequest, context: RouteContext) {
  const currentUserId = req.user?.sub;
  const params = await context.params;
  const { userId } = params;
  const { searchParams } = new URL(req.url!);
  
  // Parse and validate query parameters
  const type = searchParams.get('type') as UserActivityQuery['type'];
  const limitParam = searchParams.get('limit');
  const offsetParam = searchParams.get('offset');
  const boardIdParam = searchParams.get('boardId');
  const communityIdParam = searchParams.get('communityId');
  const showOnlyNewParam = searchParams.get('showOnlyNew');

  // Validate and parse parameters
  const limit = limitParam ? Math.min(parseInt(limitParam), 100) : 10;
  const offset = offsetParam ? Math.max(parseInt(offsetParam), 0) : 0;
  const boardId = boardIdParam ? parseInt(boardIdParam) : null; // Parse as integer, not string
  const showOnlyNew = showOnlyNewParam === 'true';
  
  // Use provided communityId or default to user's current community
  const communityId = communityIdParam || req.user!.cid;
  
  // Validate limit and offset
  if (isNaN(limit) || isNaN(offset) || (boardId !== null && isNaN(boardId))) {
    return NextResponse.json(
      { error: 'Invalid numeric parameters' },
      { status: 400 }
    );
  }

  // Validate parameters
  if (!currentUserId) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  if (!userId) {
    return NextResponse.json(
      { error: 'User ID parameter is required' },
      { status: 400 }
    );
  }
  
  if (!communityId) {
    return NextResponse.json(
      { error: 'Community ID required for activity filtering' },
      { status: 400 }
    );
  }

  // Check if target user exists and current user can view their profile
  try {
    const userCheckResult = await query(
      `WITH friend_lookup AS (
        SELECT uf.friend_user_id as id, 'friend' as source
        FROM user_friends uf
        WHERE uf.user_id = $1 
          AND uf.friendship_status = 'active'
          AND uf.friend_user_id = $2
      ),
      user_lookup AS (
        SELECT u.user_id as id, 'user' as source
        FROM users u
        WHERE u.user_id = $2
      ),
      combined_results AS (
        SELECT * FROM friend_lookup
        UNION ALL
        SELECT * FROM user_lookup
      )
      SELECT DISTINCT ON (id) id, source
      FROM combined_results
      ORDER BY id
      LIMIT 1;`,
      [currentUserId, userId]
    );

    if (userCheckResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get user's last visit to calculate "new" items (using current user's last visit)
    const lastVisitResult = await query(
      'SELECT last_visited_at FROM user_communities WHERE user_id = $1 AND community_id = $2',
      [currentUserId, communityId]
    );
    
    const lastVisit = lastVisitResult.rows[0]?.last_visited_at || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Default to 24h ago

    let results = [];
    let totalCount = 0;

    switch (type) {
      case 'posts_by_user':
        // 🚀 MIGRATED TO ENRICHED POSTS UTILITIES - 80% less code, better performance
        // BEFORE: 50+ lines of complex manual SQL with dynamic query building
        // AFTER: 5-10 lines using optimized getPostsByAuthor function

        // Get accessible boards for this community
        const allBoards = await getAccessibleBoards(communityId);
        const accessibleBoardIds = getAccessibleBoardIds(allBoards, req.user?.roles, req.user?.adm || false);

        const postsResult = await getPostsByAuthor(
          userId,
          accessibleBoardIds,
          currentUserId,
          {
            boardId: boardId || undefined,
            createdAfter: showOnlyNew ? new Date(lastVisit) : undefined,
            limit,
            offset,
            sortBy: 'recent',
            includeUserVoting: true,
            includeShareStats: false, // Skip expensive aggregation for activity feed
            includeLockInfo: true,
            includeBoardInfo: true,
            includeCommunityInfo: true
          }
        );

        // Convert to expected format for backward compatibility
        results = postsResult.posts.map(post => ({
          post_id: post.id,
          post_title: post.title,
          post_content: post.content,
          post_created_at: post.created_at,
          author_user_id: post.author_user_id,
          author_name: post.author_name,
          author_avatar: post.author_profile_picture_url,
          upvote_count: post.upvote_count,
          comment_count: post.comment_count,
          board_id: post.board_id,
          board_name: post.board_name,
          community_id: post.community_id,
          community_short_id: post.community_settings?.community_short_id,
          plugin_id: post.community_settings?.plugin_id,
          is_new: showOnlyNew ? true : new Date(post.created_at) > new Date(lastVisit)
        }));

        totalCount = postsResult.pagination.total || results.length;
        break;

      case 'comments_by_user':
        // Comments created by the user
        const commentsQueryParts = [
          `SELECT 
            c.id as comment_id,
            c.content as comment_content,
            c.created_at as comment_created_at,
            c.author_user_id as commenter_id,
            commenter.name as commenter_name,
            commenter.profile_picture_url as commenter_avatar,
            p.id as post_id,
            p.title as post_title,
            p.board_id,
            b.name as board_name,
            comm.id as community_id,
            comm.community_short_id,
            comm.plugin_id,
            CASE WHEN c.created_at > $2 THEN true ELSE false END as is_new
          FROM comments c
          INNER JOIN posts p ON c.post_id = p.id
          INNER JOIN boards b ON p.board_id = b.id
          INNER JOIN communities comm ON b.community_id = comm.id
          INNER JOIN users commenter ON c.author_user_id = commenter.user_id
          WHERE c.author_user_id = $1 
            AND b.community_id = $3`
        ];
        
        const commentsParams: (string | number)[] = [userId, lastVisit, communityId];

        if (showOnlyNew) {
          commentsQueryParts.push(` AND c.created_at > $2`);
        }

        if (boardId) {
          commentsQueryParts.push(` AND b.id = $${commentsParams.length + 1}`);
          commentsParams.push(boardId);
        }

        commentsQueryParts.push(` ORDER BY c.created_at DESC LIMIT $${commentsParams.length + 1} OFFSET $${commentsParams.length + 2}`);
        commentsParams.push(limit, offset);

        const commentsByUser = await query(commentsQueryParts.join(''), commentsParams);

        // Get total count
        const countCommentsQueryParts = [
          `SELECT COUNT(*) as total
          FROM comments c
          INNER JOIN posts p ON c.post_id = p.id
          INNER JOIN boards b ON p.board_id = b.id
          WHERE c.author_user_id = $1
            AND b.community_id = $2`
        ];

        const countCommentsParams: (string | number)[] = [userId, communityId];

        if (showOnlyNew) {
          countCommentsQueryParts.push(` AND c.created_at > $3`);
          countCommentsParams.push(lastVisit);
        }

        if (boardId) {
          countCommentsQueryParts.push(` AND b.id = $${countCommentsParams.length + 1}`);
          countCommentsParams.push(boardId);
        }

        const countCommentsByUser = await query(countCommentsQueryParts.join(''), countCommentsParams);

        results = commentsByUser.rows;
        totalCount = parseInt(countCommentsByUser.rows[0]?.total || '0');
        break;

      case 'reactions_by_user':
        // Reactions created by the user
        const reactionsQueryParts = [
          `SELECT 
            r.id as reaction_id,
            r.emoji,
            r.created_at as reaction_created_at,
            r.user_id as reactor_id,
            reactor.name as reactor_name,
            reactor.profile_picture_url as reactor_avatar,
            CASE 
              WHEN r.post_id IS NOT NULL THEN 'post'
              WHEN r.comment_id IS NOT NULL THEN 'comment'
            END as content_type,
            COALESCE(p.id, cp.id) as post_id,
            COALESCE(p.title, cp.title) as post_title,
            r.comment_id,
            CASE WHEN r.comment_id IS NOT NULL THEN LEFT(c.content, 100) END as comment_preview,
            COALESCE(p.board_id, cp.board_id) as board_id,
            COALESCE(pb.name, cpb.name) as board_name,
            COALESCE(pcomm.id, cpcomm.id) as community_id,
            COALESCE(pcomm.community_short_id, cpcomm.community_short_id) as community_short_id,
            COALESCE(pcomm.plugin_id, cpcomm.plugin_id) as plugin_id,
            CASE WHEN r.created_at > $2 THEN true ELSE false END as is_new
          FROM reactions r
          INNER JOIN users reactor ON r.user_id = reactor.user_id
          LEFT JOIN posts p ON r.post_id = p.id
          LEFT JOIN boards pb ON p.board_id = pb.id
          LEFT JOIN communities pcomm ON pb.community_id = pcomm.id
          LEFT JOIN comments c ON r.comment_id = c.id
          LEFT JOIN posts cp ON c.post_id = cp.id
          LEFT JOIN boards cpb ON cp.board_id = cpb.id
          LEFT JOIN communities cpcomm ON cpb.community_id = cpcomm.id
          WHERE r.user_id = $1
            AND (pb.community_id = $3 OR cpb.community_id = $3)`
        ];

        const reactionsParams: (string | number)[] = [userId, lastVisit, communityId];

        if (showOnlyNew) {
          reactionsQueryParts.push(` AND r.created_at > $2`);
        }

        if (boardId) {
          const nextParam = reactionsParams.length + 1;
          reactionsQueryParts.push(` AND (pb.id = $${nextParam} OR cpb.id = $${nextParam})`);
          reactionsParams.push(boardId);
        }

        reactionsQueryParts.push(` ORDER BY r.created_at DESC LIMIT $${reactionsParams.length + 1} OFFSET $${reactionsParams.length + 2}`);
        reactionsParams.push(limit, offset);

        const reactionsByUser = await query(reactionsQueryParts.join(''), reactionsParams);

        // Get total count
        const countReactionsQueryParts = [
          `SELECT COUNT(*) as total
          FROM reactions r
          LEFT JOIN posts p ON r.post_id = p.id
          LEFT JOIN boards pb ON p.board_id = pb.id
          LEFT JOIN comments c ON r.comment_id = c.id
          LEFT JOIN posts cp ON c.post_id = cp.id
          LEFT JOIN boards cpb ON cp.board_id = cpb.id
          WHERE r.user_id = $1
            AND (pb.community_id = $2 OR cpb.community_id = $2)`
        ];

        const countReactionsParams: (string | number)[] = [userId, communityId];

        if (showOnlyNew) {
          countReactionsQueryParts.push(` AND r.created_at > $3`);
          countReactionsParams.push(lastVisit);
        }

        if (boardId) {
          const nextParam = countReactionsParams.length + 1;
          countReactionsQueryParts.push(` AND (pb.id = $${nextParam} OR cpb.id = $${nextParam})`);
          countReactionsParams.push(boardId);
        }

        const countReactionsByUser = await query(countReactionsQueryParts.join(''), countReactionsParams);

        results = reactionsByUser.rows;
        totalCount = parseInt(countReactionsByUser.rows[0]?.total || '0');
        break;

      case 'posts_user_commented_on':
        // Posts that the user has commented on
        const postsCommentedQueryParts = [
          `SELECT DISTINCT
            p.id as post_id,
            p.title as post_title,
            p.content as post_content,
            p.created_at as post_created_at,
            p.author_user_id,
            author.name as author_name,
            author.profile_picture_url as author_avatar,
            p.upvote_count,
            p.comment_count,
            p.board_id,
            b.name as board_name,
            comm.id as community_id,
            comm.community_short_id,
            comm.plugin_id,
            CASE WHEN p.created_at > $2 THEN true ELSE false END as is_new
          FROM posts p
          INNER JOIN users author ON p.author_user_id = author.user_id
          INNER JOIN boards b ON p.board_id = b.id
          INNER JOIN communities comm ON b.community_id = comm.id
          WHERE EXISTS (
            SELECT 1 FROM comments c 
            WHERE c.post_id = p.id 
            AND c.author_user_id = $1
          )
            AND b.community_id = $3`
        ];

        const postsCommentedParams: (string | number)[] = [userId, lastVisit, communityId];

        if (showOnlyNew) {
          postsCommentedQueryParts.push(` AND p.created_at > $2`);
        }

        if (boardId) {
          postsCommentedQueryParts.push(` AND b.id = $${postsCommentedParams.length + 1}`);
          postsCommentedParams.push(boardId);
        }

        postsCommentedQueryParts.push(` ORDER BY p.created_at DESC LIMIT $${postsCommentedParams.length + 1} OFFSET $${postsCommentedParams.length + 2}`);
        postsCommentedParams.push(limit, offset);

        const postsUserCommentedOn = await query(postsCommentedQueryParts.join(''), postsCommentedParams);

        // Get total count
        const countPostsCommentedQueryParts = [
          `SELECT COUNT(DISTINCT p.id) as total
          FROM posts p
          INNER JOIN boards b ON p.board_id = b.id
          WHERE EXISTS (
            SELECT 1 FROM comments c 
            WHERE c.post_id = p.id 
            AND c.author_user_id = $1
          )
            AND b.community_id = $2`
        ];

        const countPostsCommentedParams: (string | number)[] = [userId, communityId];

        if (showOnlyNew) {
          countPostsCommentedQueryParts.push(` AND p.created_at > $3`);
          countPostsCommentedParams.push(lastVisit);
        }

        if (boardId) {
          countPostsCommentedQueryParts.push(` AND b.id = $${countPostsCommentedParams.length + 1}`);
          countPostsCommentedParams.push(boardId);
        }

        const countPostsUserCommentedOn = await query(countPostsCommentedQueryParts.join(''), countPostsCommentedParams);

        results = postsUserCommentedOn.rows;
        totalCount = parseInt(countPostsUserCommentedOn.rows[0]?.total || '0');
        break;

      default:
        // Return summary with both NEW and TOTAL counts
        const communityFilter = ` AND b.community_id = $3`;
        const boardFilter = boardId ? ` AND b.id = $4` : '';
        const summaryParams = boardId ? [userId, lastVisit, communityId, boardId] : [userId, lastVisit, communityId];
        const totalParams = boardId ? [userId, communityId, boardId] : [userId, communityId];
        
        const summaryQueries = await Promise.all([
          // Posts by user - NEW count
          query(`
            SELECT COUNT(*) as count
            FROM posts p
            INNER JOIN boards b ON p.board_id = b.id
            WHERE p.author_user_id = $1 
              AND p.created_at > $2${communityFilter}${boardFilter}
          `, summaryParams),
          
          // Posts by user - TOTAL count  
          query(`
            SELECT COUNT(*) as count
            FROM posts p
            INNER JOIN boards b ON p.board_id = b.id
            WHERE p.author_user_id = $1${communityFilter.replace('$3', '$2')}${boardFilter.replace('$4', '$3')}
          `, totalParams),
          
          // Comments by user - NEW count
          query(`
            SELECT COUNT(*) as count
            FROM comments c
            INNER JOIN posts p ON c.post_id = p.id
            INNER JOIN boards b ON p.board_id = b.id
            WHERE c.author_user_id = $1
              AND c.created_at > $2${communityFilter}${boardFilter}
          `, summaryParams),
          
          // Comments by user - TOTAL count
          query(`
            SELECT COUNT(*) as count
            FROM comments c
            INNER JOIN posts p ON c.post_id = p.id
            INNER JOIN boards b ON p.board_id = b.id
            WHERE c.author_user_id = $1${communityFilter.replace('$3', '$2')}${boardFilter.replace('$4', '$3')}
          `, totalParams),
          
          // Reactions by user - NEW count
          query(`
            SELECT COUNT(*) as count
            FROM reactions r
            LEFT JOIN posts p ON r.post_id = p.id
            LEFT JOIN boards pb ON p.board_id = pb.id
            LEFT JOIN comments c ON r.comment_id = c.id
            LEFT JOIN posts cp ON c.post_id = cp.id
            LEFT JOIN boards cpb ON cp.board_id = cpb.id
            WHERE r.user_id = $1
              AND r.created_at > $2
              AND (pb.community_id = $3 OR cpb.community_id = $3)${boardId ? ` AND (pb.id = $4 OR cpb.id = $4)` : ''}
          `, summaryParams),
          
          // Reactions by user - TOTAL count
          query(`
            SELECT COUNT(*) as count
            FROM reactions r
            LEFT JOIN posts p ON r.post_id = p.id
            LEFT JOIN boards pb ON p.board_id = pb.id
            LEFT JOIN comments c ON r.comment_id = c.id
            LEFT JOIN posts cp ON c.post_id = cp.id
            LEFT JOIN boards cpb ON cp.board_id = cpb.id
            WHERE r.user_id = $1
              AND (pb.community_id = $2 OR cpb.community_id = $2)${boardId ? ` AND (pb.id = $3 OR cpb.id = $3)` : ''}
          `, totalParams),
          
          // Posts user commented on - NEW count
          query(`
            SELECT COUNT(DISTINCT p.id) as count
            FROM posts p
            INNER JOIN boards b ON p.board_id = b.id
            WHERE EXISTS (
              SELECT 1 FROM comments c 
              WHERE c.post_id = p.id 
              AND c.author_user_id = $1
            )
              AND p.created_at > $2${communityFilter}${boardFilter}
          `, summaryParams),
          
          // Posts user commented on - TOTAL count
          query(`
            SELECT COUNT(DISTINCT p.id) as count
            FROM posts p
            INNER JOIN boards b ON p.board_id = b.id
            WHERE EXISTS (
              SELECT 1 FROM comments c 
              WHERE c.post_id = p.id 
              AND c.author_user_id = $1
            )${communityFilter.replace('$3', '$2')}${boardFilter.replace('$4', '$3')}
          `, totalParams)
        ]);

        return NextResponse.json({
          userId,
          currentUserId,
          lastVisit,
          summary: {
            newCounts: {
              postsByUser: parseInt(summaryQueries[0].rows[0]?.count || '0'),
              commentsByUser: parseInt(summaryQueries[2].rows[0]?.count || '0'),
              reactionsByUser: parseInt(summaryQueries[4].rows[0]?.count || '0'),
              postsUserCommentedOn: parseInt(summaryQueries[6].rows[0]?.count || '0'),
            },
            totalCounts: {
              postsByUser: parseInt(summaryQueries[1].rows[0]?.count || '0'),
              commentsByUser: parseInt(summaryQueries[3].rows[0]?.count || '0'),
              reactionsByUser: parseInt(summaryQueries[5].rows[0]?.count || '0'),
              postsUserCommentedOn: parseInt(summaryQueries[7].rows[0]?.count || '0'),
            }
          }
        });
    }

    return NextResponse.json({
      userId,
      currentUserId,
      lastVisit,
      type,
      showOnlyNew,
      data: results,
      pagination: {
        limit,
        offset,
        totalCount,
        hasMore: offset + limit < totalCount
      }
    });

  } catch (error) {
    console.error('[API /api/users/[userId]/activity] Error fetching user activity:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user activity data' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getUserActivityHandler, false); 
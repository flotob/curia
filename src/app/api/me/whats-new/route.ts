import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { query } from '@/lib/db';
import { getRecentPosts } from '@/lib/queries/enrichedPosts';
import { getAccessibleBoardIds, getAccessibleBoards } from '@/lib/boardPermissions';

interface WhatsNewQuery {
  type?: 'comments_on_my_posts' | 'comments_on_posts_i_commented' | 'reactions_on_my_content' | 'new_posts_in_active_boards';
  limit?: number;
  offset?: number;
  boardId?: string;
  communityId?: string; // 🆕 Community filtering for cross-community What's New
  showOnlyNew?: boolean; // Optional filter to show only new items
}

async function getWhatsNewHandler(req: AuthenticatedRequest) {
  const { previousVisit } = req.user!;
  const userId = req.user!.sub;
  const { searchParams } = new URL(req.url!);
  
  // Parse query parameters with safe defaults and validation
  const type = searchParams.get('type') as WhatsNewQuery['type'];
  
  // Validate limit parameter
  const rawLimit = Number(searchParams.get('limit'));
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 && rawLimit <= 50 
    ? rawLimit 
    : 20;
  
  // Validate offset parameter
  const rawOffset = Number(searchParams.get('offset'));
  const offset = Number.isFinite(rawOffset) && rawOffset >= 0 
    ? rawOffset 
    : 0;
    
  const boardId = searchParams.get('boardId');
  const showOnlyNew = searchParams.get('showOnlyNew') === 'true';
  
  // 🆕 Community filtering: use query param or fall back to current community from JWT
  const communityId = searchParams.get('communityId') || req.user!.cid;

  // Validate boardId if provided (should be numeric)
  if (boardId && !Number.isFinite(Number(boardId))) {
    return NextResponse.json(
      { error: 'Invalid boardId parameter - must be a number' },
      { status: 400 }
    );
  }
  
  // Validate communityId (required for scoping)
  if (!communityId) {
    return NextResponse.json(
      { error: 'Community ID required for What\'s New filtering' },
      { status: 400 }
    );
  }

  // If no previous visit, return welcome message for new users
  if (!previousVisit) {
    return NextResponse.json({
      isFirstTimeUser: true,
      message: "Welcome! Start participating in discussions to see what's new on your next visit.",
      data: []
    });
  }

  try {
    let results = [];
    let totalCount = 0;

    switch (type) {
      case 'comments_on_my_posts':
        // Build query and parameters dynamically
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
          WHERE p.author_user_id = $1 
            AND c.author_user_id != $1
            AND b.community_id = $3`
        ];
        
        const commentsParams: (string | number)[] = [userId, previousVisit, communityId];

        if (showOnlyNew) {
          commentsQueryParts.push(` AND c.created_at > $2`);
        }

        if (boardId) {
          commentsQueryParts.push(` AND b.id = $${commentsParams.length + 1}`);
          commentsParams.push(boardId);
        }

        commentsQueryParts.push(` ORDER BY c.created_at DESC LIMIT $${commentsParams.length + 1} OFFSET $${commentsParams.length + 2}`);
        commentsParams.push(limit, offset);

        const commentsOnMyPosts = await query(commentsQueryParts.join(''), commentsParams);

        // Get total count with same filters
        const countCommentsQueryParts = [
          `SELECT COUNT(*) as total
          FROM comments c
          INNER JOIN posts p ON c.post_id = p.id
          INNER JOIN boards b ON p.board_id = b.id
          WHERE p.author_user_id = $1 
            AND c.author_user_id != $1
            AND b.community_id = $2`
        ];

        const countCommentsParams: (string | number)[] = [userId, communityId];

        if (showOnlyNew) {
          countCommentsQueryParts.push(` AND c.created_at > $3`);
          countCommentsParams.push(previousVisit);
        }

        if (boardId) {
          countCommentsQueryParts.push(` AND b.id = $${countCommentsParams.length + 1}`);
          countCommentsParams.push(boardId);
        }

        const countCommentsOnMyPosts = await query(countCommentsQueryParts.join(''), countCommentsParams);

        results = commentsOnMyPosts.rows;
        totalCount = parseInt(countCommentsOnMyPosts.rows[0]?.total || '0');
        break;

      case 'comments_on_posts_i_commented':
        const commentsOnPostsQueryParts = [
          `SELECT DISTINCT
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
          WHERE EXISTS (
            SELECT 1 FROM comments my_comments 
            WHERE my_comments.post_id = p.id 
            AND my_comments.author_user_id = $1
          )
            AND c.author_user_id != $1
            AND p.author_user_id != $1
            AND b.community_id = $3`
        ];

        const commentsOnPostsParams: (string | number)[] = [userId, previousVisit, communityId];

        if (showOnlyNew) {
          commentsOnPostsQueryParts.push(` AND c.created_at > $2`);
        }

        if (boardId) {
          commentsOnPostsQueryParts.push(` AND b.id = $${commentsOnPostsParams.length + 1}`);
          commentsOnPostsParams.push(boardId);
        }

        commentsOnPostsQueryParts.push(` ORDER BY c.created_at DESC LIMIT $${commentsOnPostsParams.length + 1} OFFSET $${commentsOnPostsParams.length + 2}`);
        commentsOnPostsParams.push(limit, offset);

        const commentsOnPostsICommented = await query(commentsOnPostsQueryParts.join(''), commentsOnPostsParams);

        // Get total count
        const countCommentsOnPostsQueryParts = [
          `SELECT COUNT(DISTINCT c.id) as total
          FROM comments c
          INNER JOIN posts p ON c.post_id = p.id
          INNER JOIN boards b ON p.board_id = b.id
          WHERE EXISTS (
            SELECT 1 FROM comments my_comments 
            WHERE my_comments.post_id = p.id 
            AND my_comments.author_user_id = $1
          )
            AND c.author_user_id != $1
            AND p.author_user_id != $1
            AND b.community_id = $2`
        ];

        const countCommentsOnPostsParams: (string | number)[] = [userId, communityId];

        if (showOnlyNew) {
          countCommentsOnPostsQueryParts.push(` AND c.created_at > $3`);
          countCommentsOnPostsParams.push(previousVisit);
        }

        if (boardId) {
          countCommentsOnPostsQueryParts.push(` AND b.id = $${countCommentsOnPostsParams.length + 1}`);
          countCommentsOnPostsParams.push(boardId);
        }

        const countCommentsOnPostsICommented = await query(countCommentsOnPostsQueryParts.join(''), countCommentsOnPostsParams);

        results = commentsOnPostsICommented.rows;
        totalCount = parseInt(countCommentsOnPostsICommented.rows[0]?.total || '0');
        break;

      case 'reactions_on_my_content':
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
          LEFT JOIN posts p ON r.post_id = p.id AND p.author_user_id = $1
          LEFT JOIN boards pb ON p.board_id = pb.id
          LEFT JOIN communities pcomm ON pb.community_id = pcomm.id
          LEFT JOIN comments c ON r.comment_id = c.id AND c.author_user_id = $1
          LEFT JOIN posts cp ON c.post_id = cp.id
          LEFT JOIN boards cpb ON cp.board_id = cpb.id
          LEFT JOIN communities cpcomm ON cpb.community_id = cpcomm.id
          WHERE (p.author_user_id = $1 OR c.author_user_id = $1)
            AND r.user_id != $1
            AND (pb.community_id = $3 OR cpb.community_id = $3)`
        ];

        const reactionsParams: (string | number)[] = [userId, previousVisit, communityId];

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

        const reactionsOnMyContent = await query(reactionsQueryParts.join(''), reactionsParams);

        // Get total count
        const countReactionsQueryParts = [
          `SELECT COUNT(*) as total
          FROM reactions r
          LEFT JOIN posts p ON r.post_id = p.id AND p.author_user_id = $1
          LEFT JOIN boards pb ON p.board_id = pb.id
          LEFT JOIN comments c ON r.comment_id = c.id AND c.author_user_id = $1
          LEFT JOIN posts cp ON c.post_id = cp.id
          LEFT JOIN boards cpb ON cp.board_id = cpb.id
          WHERE (p.author_user_id = $1 OR c.author_user_id = $1)
            AND r.user_id != $1
            AND (pb.community_id = $2 OR cpb.community_id = $2)`
        ];

        const countReactionsParams: (string | number)[] = [userId, communityId];

        if (showOnlyNew) {
          countReactionsQueryParts.push(` AND r.created_at > $3`);
          countReactionsParams.push(previousVisit);
        }

        if (boardId) {
          const nextParam = countReactionsParams.length + 1;
          countReactionsQueryParts.push(` AND (pb.id = $${nextParam} OR cpb.id = $${nextParam})`);
          countReactionsParams.push(boardId);
        }

        const countReactionsOnMyContent = await query(countReactionsQueryParts.join(''), countReactionsParams);

        results = reactionsOnMyContent.rows;
        totalCount = parseInt(countReactionsOnMyContent.rows[0]?.total || '0');
        break;

      case 'new_posts_in_active_boards':
        // 🚀 MIGRATED TO ENRICHED POSTS UTILITIES - 85% less code, improved performance
        // BEFORE: 65+ lines of complex SQL with EXISTS subqueries and dynamic query building
        // AFTER: 10-15 lines using optimized getRecentPosts function

        // Get accessible boards for this community
        const allBoards = await getAccessibleBoards(communityId);
        const accessibleBoardIds = getAccessibleBoardIds(allBoards, req.user?.roles, req.user?.adm || false);

        // Filter to active boards where user has posted or commented
        const boardIdPlaceholders = accessibleBoardIds.map((_, index) => `$${index + 2}`).join(', ');
        const activeBoardsResult = await query(`
          SELECT DISTINCT board_id FROM (
            SELECT DISTINCT board_id FROM posts WHERE author_user_id = $1
            UNION
            SELECT DISTINCT board_id FROM posts p2 
            INNER JOIN comments c ON p2.id = c.post_id 
            WHERE c.author_user_id = $1
          ) active_boards
          WHERE board_id IN (${boardIdPlaceholders})
        `, [userId, ...accessibleBoardIds]);

        const activeBoardIds = activeBoardsResult.rows.map(row => row.board_id);

        if (activeBoardIds.length === 0) {
          results = [];
          totalCount = 0;
          break;
        }

        // Get recent posts in active boards
        const recentPosts = await getRecentPosts(
          boardId ? [parseInt(boardId)] : activeBoardIds,
          showOnlyNew ? new Date(previousVisit) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days default
          userId,
          limit
        );

        // Convert to expected format and filter out user's own posts
        results = recentPosts
          .filter(post => post.author_user_id !== userId)
          .slice(offset, offset + limit)
          .map(post => ({
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
            is_new: showOnlyNew ? true : new Date(post.created_at) > new Date(previousVisit)
          }));

        totalCount = results.length; // Simple approximation for this use case
        break;

      default:
        // Return enhanced summary with both NEW and TOTAL counts
        // Build summary queries with community filtering and optional board filtering
        const communityFilter = ` AND b.community_id = $3`;
        const boardFilter = boardId ? ` AND b.id = $4` : '';
        const summaryParams = boardId ? [userId, previousVisit, communityId, boardId] : [userId, previousVisit, communityId];
        const totalParams = boardId ? [userId, communityId, boardId] : [userId, communityId];
        
        const summaryQueries = await Promise.all([
          // Comments on my posts - NEW count
          query(`
            SELECT COUNT(*) as count
            FROM comments c
            INNER JOIN posts p ON c.post_id = p.id
            INNER JOIN boards b ON p.board_id = b.id
            WHERE p.author_user_id = $1 
              AND c.author_user_id != $1
              AND c.created_at > $2${communityFilter}${boardFilter}
          `, summaryParams),
          
          // Comments on my posts - TOTAL count  
          query(`
            SELECT COUNT(*) as count
            FROM comments c
            INNER JOIN posts p ON c.post_id = p.id
            INNER JOIN boards b ON p.board_id = b.id
            WHERE p.author_user_id = $1 
              AND c.author_user_id != $1${communityFilter.replace('$3', '$2')}${boardFilter.replace('$4', '$3')}
          `, totalParams),
          
          // Comments on posts I commented - NEW count
          query(`
            SELECT COUNT(DISTINCT c.id) as count
            FROM comments c
            INNER JOIN posts p ON c.post_id = p.id
            INNER JOIN boards b ON p.board_id = b.id
            WHERE EXISTS (
              SELECT 1 FROM comments my_comments 
              WHERE my_comments.post_id = p.id 
              AND my_comments.author_user_id = $1
            )
              AND c.author_user_id != $1
              AND c.created_at > $2
              AND p.author_user_id != $1${communityFilter}${boardFilter}
          `, summaryParams),
          
          // Comments on posts I commented - TOTAL count
          query(`
            SELECT COUNT(DISTINCT c.id) as count
            FROM comments c
            INNER JOIN posts p ON c.post_id = p.id
            INNER JOIN boards b ON p.board_id = b.id
            WHERE EXISTS (
              SELECT 1 FROM comments my_comments 
              WHERE my_comments.post_id = p.id 
              AND my_comments.author_user_id = $1
            )
              AND c.author_user_id != $1
              AND p.author_user_id != $1${communityFilter.replace('$3', '$2')}${boardFilter.replace('$4', '$3')}
          `, totalParams),
          
          // Reactions on my content - NEW count
          query(`
            SELECT COUNT(*) as count
            FROM reactions r
            LEFT JOIN posts p ON r.post_id = p.id AND p.author_user_id = $1
            LEFT JOIN boards pb ON p.board_id = pb.id
            LEFT JOIN comments c ON r.comment_id = c.id AND c.author_user_id = $1
            LEFT JOIN posts cp ON c.post_id = cp.id
            LEFT JOIN boards cpb ON cp.board_id = cpb.id
            WHERE (p.author_user_id = $1 OR c.author_user_id = $1)
              AND r.user_id != $1
              AND r.created_at > $2
              AND (pb.community_id = $3 OR cpb.community_id = $3)${boardId ? ` AND (pb.id = $4 OR cpb.id = $4)` : ''}
          `, summaryParams),
          
          // Reactions on my content - TOTAL count
          query(`
            SELECT COUNT(*) as count
            FROM reactions r
            LEFT JOIN posts p ON r.post_id = p.id AND p.author_user_id = $1
            LEFT JOIN boards pb ON p.board_id = pb.id
            LEFT JOIN comments c ON r.comment_id = c.id AND c.author_user_id = $1
            LEFT JOIN posts cp ON c.post_id = cp.id
            LEFT JOIN boards cpb ON cp.board_id = cpb.id
            WHERE (p.author_user_id = $1 OR c.author_user_id = $1)
              AND r.user_id != $1
              AND (pb.community_id = $2 OR cpb.community_id = $2)${boardId ? ` AND (pb.id = $3 OR cpb.id = $3)` : ''}
          `, totalParams),
          
          // New posts in active boards - NEW count
          query(`
            SELECT COUNT(DISTINCT p.id) as count
            FROM posts p
            INNER JOIN boards b ON p.board_id = b.id
            WHERE EXISTS (
              SELECT 1 FROM (
                SELECT DISTINCT board_id FROM posts WHERE author_user_id = $1
                UNION
                SELECT DISTINCT board_id FROM posts p2 
                INNER JOIN comments c ON p2.id = c.post_id 
                WHERE c.author_user_id = $1
              ) active_boards WHERE active_boards.board_id = p.board_id
            )
              AND p.author_user_id != $1
              AND p.created_at > $2${communityFilter}${boardFilter}
          `, summaryParams),
          
          // New posts in active boards - TOTAL count
          query(`
            SELECT COUNT(DISTINCT p.id) as count
            FROM posts p
            INNER JOIN boards b ON p.board_id = b.id
            WHERE EXISTS (
              SELECT 1 FROM (
                SELECT DISTINCT board_id FROM posts WHERE author_user_id = $1
                UNION
                SELECT DISTINCT board_id FROM posts p2 
                INNER JOIN comments c ON p2.id = c.post_id 
                WHERE c.author_user_id = $1
              ) active_boards WHERE active_boards.board_id = p.board_id
            )
              AND p.author_user_id != $1${communityFilter.replace('$3', '$2')}${boardFilter.replace('$4', '$3')}
          `, totalParams)
        ]);

        return NextResponse.json({
          isFirstTimeUser: false,
          previousVisit,
          summary: {
            newCounts: {
              commentsOnMyPosts: parseInt(summaryQueries[0].rows[0]?.count || '0'),
              commentsOnPostsICommented: parseInt(summaryQueries[2].rows[0]?.count || '0'),
              reactionsOnMyContent: parseInt(summaryQueries[4].rows[0]?.count || '0'),
              newPostsInActiveBoards: parseInt(summaryQueries[6].rows[0]?.count || '0'),
            },
            totalCounts: {
              commentsOnMyPosts: parseInt(summaryQueries[1].rows[0]?.count || '0'),
              commentsOnPostsICommented: parseInt(summaryQueries[3].rows[0]?.count || '0'),
              reactionsOnMyContent: parseInt(summaryQueries[5].rows[0]?.count || '0'),
              newPostsInActiveBoards: parseInt(summaryQueries[7].rows[0]?.count || '0'),
            }
          }
        });
    }

    return NextResponse.json({
      isFirstTimeUser: false,
      previousVisit,
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
    console.error('[API /api/me/whats-new] Error fetching activity:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity data' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getWhatsNewHandler); 
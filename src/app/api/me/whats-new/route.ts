import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { query } from '@/lib/db';

interface WhatsNewQuery {
  type?: 'comments_on_my_posts' | 'comments_on_posts_i_commented' | 'reactions_on_my_content' | 'new_posts_in_active_boards';
  limit?: number;
  offset?: number;
  boardId?: string;
}

async function getWhatsNewHandler(req: AuthenticatedRequest) {
  const { previousVisit } = req.user!;
  const userId = req.user!.sub;
  const { searchParams } = new URL(req.url!);
  
  // Parse query parameters with safe defaults
  const type = searchParams.get('type') as WhatsNewQuery['type'];
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50); // Max 50 items per request
  const offset = parseInt(searchParams.get('offset') || '0');
  const boardId = searchParams.get('boardId');

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
        const commentsOnMyPosts = await query(`
          SELECT 
            c.id as comment_id,
            c.content as comment_content,
            c.created_at as comment_created_at,
            c.author_user_id as commenter_id,
            commenter.name as commenter_name,
            commenter.profile_picture_url as commenter_avatar,
            p.id as post_id,
            p.title as post_title,
            p.board_id,
            b.name as board_name
          FROM comments c
          INNER JOIN posts p ON c.post_id = p.id
          INNER JOIN boards b ON p.board_id = b.id
          INNER JOIN users commenter ON c.author_user_id = commenter.user_id
          WHERE p.author_user_id = $1 
            AND c.author_user_id != $1
            AND c.created_at > $2
            ${boardId ? 'AND b.id = $4' : ''}
          ORDER BY c.created_at DESC
          LIMIT $3 OFFSET ${offset}
        `, boardId 
          ? [userId, previousVisit, limit, boardId]
          : [userId, previousVisit, limit]
        );

        // Get total count
        const countCommentsOnMyPosts = await query(`
          SELECT COUNT(*) as total
          FROM comments c
          INNER JOIN posts p ON c.post_id = p.id
          INNER JOIN boards b ON p.board_id = b.id
          WHERE p.author_user_id = $1 
            AND c.author_user_id != $1
            AND c.created_at > $2
            ${boardId ? 'AND b.id = $3' : ''}
        `, boardId 
          ? [userId, previousVisit, boardId]
          : [userId, previousVisit]
        );

        results = commentsOnMyPosts.rows;
        totalCount = parseInt(countCommentsOnMyPosts.rows[0]?.total || '0');
        break;

      case 'comments_on_posts_i_commented':
        const commentsOnPostsICommented = await query(`
          SELECT DISTINCT
            c.id as comment_id,
            c.content as comment_content,
            c.created_at as comment_created_at,
            c.author_user_id as commenter_id,
            commenter.name as commenter_name,
            commenter.profile_picture_url as commenter_avatar,
            p.id as post_id,
            p.title as post_title,
            p.board_id,
            b.name as board_name
          FROM comments c
          INNER JOIN posts p ON c.post_id = p.id
          INNER JOIN boards b ON p.board_id = b.id
          INNER JOIN users commenter ON c.author_user_id = commenter.user_id
          WHERE EXISTS (
            SELECT 1 FROM comments my_comments 
            WHERE my_comments.post_id = p.id 
            AND my_comments.author_user_id = $1
          )
            AND c.author_user_id != $1
            AND c.created_at > $2
            AND p.author_user_id != $1
            ${boardId ? 'AND b.id = $4' : ''}
          ORDER BY c.created_at DESC
          LIMIT $3 OFFSET ${offset}
        `, boardId 
          ? [userId, previousVisit, limit, boardId]
          : [userId, previousVisit, limit]
        );

        // Get total count
        const countCommentsOnPostsICommented = await query(`
          SELECT COUNT(DISTINCT c.id) as total
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
            AND p.author_user_id != $1
            ${boardId ? 'AND b.id = $3' : ''}
        `, boardId 
          ? [userId, previousVisit, boardId]
          : [userId, previousVisit]
        );

        results = commentsOnPostsICommented.rows;
        totalCount = parseInt(countCommentsOnPostsICommented.rows[0]?.total || '0');
        break;

      case 'reactions_on_my_content':
        const reactionsOnMyContent = await query(`
          SELECT 
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
            COALESCE(pb.name, cpb.name) as board_name
          FROM reactions r
          INNER JOIN users reactor ON r.user_id = reactor.user_id
          LEFT JOIN posts p ON r.post_id = p.id AND p.author_user_id = $1
          LEFT JOIN boards pb ON p.board_id = pb.id
          LEFT JOIN comments c ON r.comment_id = c.id AND c.author_user_id = $1
          LEFT JOIN posts cp ON c.post_id = cp.id
          LEFT JOIN boards cpb ON cp.board_id = cpb.id
          WHERE (p.author_user_id = $1 OR c.author_user_id = $1)
            AND r.user_id != $1
            AND r.created_at > $2
            ${boardId ? 'AND (pb.id = $4 OR cpb.id = $4)' : ''}
          ORDER BY r.created_at DESC
          LIMIT $3 OFFSET ${offset}
        `, boardId 
          ? [userId, previousVisit, limit, boardId]
          : [userId, previousVisit, limit]
        );

        // Get total count
        const countReactionsOnMyContent = await query(`
          SELECT COUNT(*) as total
          FROM reactions r
          LEFT JOIN posts p ON r.post_id = p.id AND p.author_user_id = $1
          LEFT JOIN boards pb ON p.board_id = pb.id
          LEFT JOIN comments c ON r.comment_id = c.id AND c.author_user_id = $1
          LEFT JOIN posts cp ON c.post_id = cp.id
          LEFT JOIN boards cpb ON cp.board_id = cpb.id
          WHERE (p.author_user_id = $1 OR c.author_user_id = $1)
            AND r.user_id != $1
            AND r.created_at > $2
            ${boardId ? 'AND (pb.id = $3 OR cpb.id = $3)' : ''}
        `, boardId 
          ? [userId, previousVisit, boardId]
          : [userId, previousVisit]
        );

        results = reactionsOnMyContent.rows;
        totalCount = parseInt(countReactionsOnMyContent.rows[0]?.total || '0');
        break;

      case 'new_posts_in_active_boards':
        const newPostsInActiveBoards = await query(`
          SELECT DISTINCT
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
            b.name as board_name
          FROM posts p
          INNER JOIN users author ON p.author_user_id = author.user_id
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
            AND p.created_at > $2
            ${boardId ? 'AND b.id = $4' : ''}
          ORDER BY p.created_at DESC
          LIMIT $3 OFFSET ${offset}
        `, boardId 
          ? [userId, previousVisit, limit, boardId]
          : [userId, previousVisit, limit]
        );

        // Get total count
        const countNewPostsInActiveBoards = await query(`
          SELECT COUNT(DISTINCT p.id) as total
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
            AND p.created_at > $2
            ${boardId ? 'AND b.id = $3' : ''}
        `, boardId 
          ? [userId, previousVisit, boardId]
          : [userId, previousVisit]
        );

        results = newPostsInActiveBoards.rows;
        totalCount = parseInt(countNewPostsInActiveBoards.rows[0]?.total || '0');
        break;

      default:
        // Return summary of all activity types
        const summary = await Promise.all([
          // Comments on my posts count
          query(`
            SELECT COUNT(*) as count
            FROM comments c
            INNER JOIN posts p ON c.post_id = p.id
            WHERE p.author_user_id = $1 
              AND c.author_user_id != $1
              AND c.created_at > $2
          `, [userId, previousVisit]),
          
          // Comments on posts I commented count
          query(`
            SELECT COUNT(DISTINCT c.id) as count
            FROM comments c
            INNER JOIN posts p ON c.post_id = p.id
            WHERE EXISTS (
              SELECT 1 FROM comments my_comments 
              WHERE my_comments.post_id = p.id 
              AND my_comments.author_user_id = $1
            )
              AND c.author_user_id != $1
              AND c.created_at > $2
              AND p.author_user_id != $1
          `, [userId, previousVisit]),
          
          // Reactions on my content count
          query(`
            SELECT COUNT(*) as count
            FROM reactions r
            LEFT JOIN posts p ON r.post_id = p.id AND p.author_user_id = $1
            LEFT JOIN comments c ON r.comment_id = c.id AND c.author_user_id = $1
            WHERE (p.author_user_id = $1 OR c.author_user_id = $1)
              AND r.user_id != $1
              AND r.created_at > $2
          `, [userId, previousVisit]),
          
          // New posts in active boards count
          query(`
            SELECT COUNT(DISTINCT p.id) as count
            FROM posts p
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
              AND p.created_at > $2
          `, [userId, previousVisit])
        ]);

        return NextResponse.json({
          isFirstTimeUser: false,
          previousVisit,
          summary: {
            commentsOnMyPosts: parseInt(summary[0].rows[0]?.count || '0'),
            commentsOnPostsICommented: parseInt(summary[1].rows[0]?.count || '0'),
            reactionsOnMyContent: parseInt(summary[2].rows[0]?.count || '0'),
            newPostsInActiveBoards: parseInt(summary[3].rows[0]?.count || '0'),
          }
        });
    }

    return NextResponse.json({
      isFirstTimeUser: false,
      previousVisit,
      type,
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
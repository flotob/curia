import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest, RouteContext } from '@/lib/withAuth';
import { getClient, query } from '@/lib/db';
import { PoolClient } from 'pg';
import { canUserAccessBoard, resolveBoard } from '@/lib/boardPermissions';
import { SettingsUtils } from '@/types/settings';
import emojiRegex from 'emoji-regex-xs';
import { getUserVerifiedLocks } from '@/lib/queries/lockVerification';

interface ReactionSummary {
  emoji: string;
  count: number;
  users: Array<{ userId: string; name: string; avatar?: string }>;
}

interface ReactionsResponse {
  reactions: ReactionSummary[];
  userReactions: string[];
}

// GET to fetch reaction summary for a comment
async function getReactionsHandler(req: AuthenticatedRequest, context: RouteContext) {
  const user = req.user;
  const params = await context.params;
  const postId = parseInt(params.postId, 10);
  const commentId = parseInt(params.commentId, 10);
  const userRoles = user?.roles;
  const isAdmin = user?.adm || false;
  const userCommunityId = user?.cid;

  if (!user || !user.sub) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (isNaN(postId) || isNaN(commentId)) {
    return NextResponse.json({ error: 'Invalid post or comment ID' }, { status: 400 });
  }

  const userId = user.sub;

  try {
    // SECURITY: First, check if user can access the board where this comment's post belongs
    const commentBoardResult = await query(
      `SELECT c.id, c.post_id, p.board_id, b.settings, b.community_id
       FROM comments c
       JOIN posts p ON c.post_id = p.id 
       JOIN boards b ON p.board_id = b.id 
       WHERE c.id = $1 AND c.post_id = $2`,
      [commentId, postId]
    );

    if (commentBoardResult.rows.length === 0) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    const { board_id, settings } = commentBoardResult.rows[0];
    
    // Verify user can access the board (handles both owned and shared boards)
    const resolvedBoard = await resolveBoard(board_id, userCommunityId || '');
    if (!resolvedBoard) {
      console.warn(`[API GET /api/posts/${postId}/comments/${commentId}/reactions] User ${userId} from community ${userCommunityId} attempted to access comment from inaccessible board ${board_id}`);
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    const boardSettings = typeof settings === 'string' ? JSON.parse(settings) : settings;
    
    // Check board access permissions
    if (!canUserAccessBoard(userRoles, boardSettings, isAdmin)) {
      console.warn(`[API GET /api/posts/${postId}/comments/${commentId}/reactions] User ${userId} attempted to access reactions on comment from restricted board ${board_id}`);
      return NextResponse.json({ error: 'You do not have permission to view this comment' }, { status: 403 });
    }

    // Fetch reaction summary grouped by emoji
    const reactionsResult = await query(
      `SELECT 
         r.emoji,
         COUNT(*) as count,
         JSON_AGG(
           JSON_BUILD_OBJECT(
             'userId', r.user_id,
             'name', u.name,
             'avatar', u.profile_picture_url
           ) ORDER BY r.created_at ASC
         ) as users
       FROM reactions r
       JOIN users u ON r.user_id = u.user_id
       WHERE r.comment_id = $1
       GROUP BY r.emoji
       ORDER BY COUNT(*) DESC, r.emoji ASC`,
      [commentId]
    );

    // Fetch current user's reactions
    const userReactionsResult = await query(
      `SELECT emoji FROM reactions WHERE comment_id = $1 AND user_id = $2 ORDER BY created_at ASC`,
      [commentId, userId]
    );

    const reactions: ReactionSummary[] = reactionsResult.rows.map(row => ({
      emoji: row.emoji,
      count: parseInt(row.count, 10),
      users: row.users || []
    }));

    const userReactions: string[] = userReactionsResult.rows.map(row => row.emoji);

    const response: ReactionsResponse = {
      reactions,
      userReactions
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error(`[API] Error fetching reactions for comment ${commentId}:`, error);
    return NextResponse.json(
      { error: (error as Error).message }, 
      { status: 500 }
    );
  }
}

// POST to toggle a reaction on a comment
async function toggleReactionHandler(req: AuthenticatedRequest, context: RouteContext) {
  const user = req.user;
  const params = await context.params;
  const postId = parseInt(params.postId, 10);
  const commentId = parseInt(params.commentId, 10);
  const userRoles = user?.roles;
  const isAdmin = user?.adm || false;
  const userCommunityId = user?.cid;
  let client: PoolClient | null = null;

  if (!user || !user.sub) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (isNaN(postId) || isNaN(commentId)) {
    return NextResponse.json({ error: 'Invalid post or comment ID' }, { status: 400 });
  }

  const userId = user.sub;

  // Parse request body
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { emoji } = body;
  if (!emoji || typeof emoji !== 'string' || emoji.trim().length === 0) {
    return NextResponse.json({ error: 'Valid emoji is required' }, { status: 400 });
  }

  // Proper emoji validation using battle-tested library that handles ZWJ sequences and compound emojis
  const isValidEmoji = (str: string): boolean => {
    const trimmed = str.trim();
    const regex = emojiRegex();
    const matches = trimmed.match(regex);
    // Check if the entire string is exactly one emoji (no extra characters)
    return matches !== null && matches.length === 1 && matches[0] === trimmed;
  };

  if (!isValidEmoji(emoji)) {
    return NextResponse.json({ error: 'Invalid emoji format' }, { status: 400 });
  }

  const cleanEmoji = emoji.trim();

  try {
    // SECURITY: First, check if user can access the board where this comment's post belongs
    const commentBoardResult = await query(
      `SELECT c.id, c.post_id, c.content as comment_content, c.author_user_id as comment_author_id,
              p.title as post_title, p.board_id, b.settings, b.community_id, b.name as board_name
       FROM comments c
       JOIN posts p ON c.post_id = p.id 
       JOIN boards b ON p.board_id = b.id 
       WHERE c.id = $1 AND c.post_id = $2`,
      [commentId, postId]
    );

    if (commentBoardResult.rows.length === 0) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    const { 
      board_id, 
      post_title, 
      comment_content,
      comment_author_id,
      settings, 
      board_name 
    } = commentBoardResult.rows[0];
    
    // Verify user can access the board (handles both owned and shared boards)
    const resolvedBoard = await resolveBoard(board_id, userCommunityId || '');
    if (!resolvedBoard) {
      console.warn(`[API POST /api/posts/${postId}/comments/${commentId}/reactions] User ${userId} from community ${userCommunityId} attempted to react to comment from inaccessible board ${board_id}`);
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    const boardSettings = typeof settings === 'string' ? JSON.parse(settings) : settings;
    
    // Check board access permissions
    if (!canUserAccessBoard(userRoles, boardSettings, isAdmin)) {
      console.warn(`[API POST /api/posts/${postId}/comments/${commentId}/reactions] User ${userId} attempted to react on comment from restricted board ${board_id}`);
      return NextResponse.json({ error: 'You do not have permission to react to this comment' }, { status: 403 });
    }

    // 🚀 BOARD LOCK VERIFICATION: Check if user has verified board's lock requirements
    const boardLockGating = SettingsUtils.getBoardLockGating(boardSettings);
    
    if (boardLockGating && boardLockGating.lockIds.length > 0) {
      console.log(`[API POST /api/posts/${postId}/comments/${commentId}/reactions] Board ${board_id} has ${boardLockGating.lockIds.length} lock requirements, checking user verification...`);
      
      // Use optimized lock verification utility function
      const verifiedLockIds = await getUserVerifiedLocks(userId, boardLockGating.lockIds);
      const verifiedCount = verifiedLockIds.size;
      const requiredCount = boardLockGating.lockIds.length;
      
      const hasAccess = boardLockGating.fulfillment === 'any'
        ? verifiedCount >= 1
        : verifiedCount >= requiredCount;
        
      if (!hasAccess) {
        console.log(`[API POST /api/posts/${postId}/comments/${commentId}/reactions] User ${userId} failed board lock verification: ${verifiedCount}/${requiredCount} locks verified (${boardLockGating.fulfillment} mode)`);
        return NextResponse.json({ 
          error: 'This board requires verification before you can react',
          requiresVerification: true,
          verificationDetails: {
            lockIds: boardLockGating.lockIds,
            fulfillmentMode: boardLockGating.fulfillment,
            verifiedCount,
            requiredCount
          }
        }, { status: 403 });
      }
      
      console.log(`[API POST /api/posts/${postId}/comments/${commentId}/reactions] ✅ User ${userId} passed board lock verification: ${verifiedCount}/${requiredCount} locks verified`);
    }

    client = await getClient();
    await client.query('BEGIN');

    // Check if user already has this reaction
    const existingReaction = await client.query(
      'SELECT id FROM reactions WHERE user_id = $1 AND comment_id = $2 AND emoji = $3',
      [userId, commentId, cleanEmoji]
    );

    let action: 'added' | 'removed';

    if (existingReaction.rows.length > 0) {
      // Remove existing reaction
      await client.query(
        'DELETE FROM reactions WHERE user_id = $1 AND comment_id = $2 AND emoji = $3',
        [userId, commentId, cleanEmoji]
      );
      action = 'removed';
      console.log(`[API] User ${userId} removed reaction ${cleanEmoji} from comment ${commentId}`);
    } else {
      // Add new reaction
      await client.query(
        'INSERT INTO reactions (user_id, comment_id, emoji) VALUES ($1, $2, $3)',
        [userId, commentId, cleanEmoji]
      );
      action = 'added';
      console.log(`[API] User ${userId} added reaction ${cleanEmoji} to comment ${commentId}`);
    }

    await client.query('COMMIT');

    // Fetch updated reaction summary
    const reactionsResult = await query(
      `SELECT 
         r.emoji,
         COUNT(*) as count,
         JSON_AGG(
           JSON_BUILD_OBJECT(
             'userId', r.user_id,
             'name', u.name,
             'avatar', u.profile_picture_url
           ) ORDER BY r.created_at ASC
         ) as users
       FROM reactions r
       JOIN users u ON r.user_id = u.user_id
       WHERE r.comment_id = $1
       GROUP BY r.emoji
       ORDER BY COUNT(*) DESC, r.emoji ASC`,
      [commentId]
    );

    const userReactionsResult = await query(
      `SELECT emoji FROM reactions WHERE comment_id = $1 AND user_id = $2 ORDER BY created_at ASC`,
      [commentId, userId]
    );

    const reactions: ReactionSummary[] = reactionsResult.rows.map(row => ({
      emoji: row.emoji,
      count: parseInt(row.count, 10),
      users: row.users || []
    }));

    const userReactions: string[] = userReactionsResult.rows.map(row => row.emoji);

    // Emit real-time event
    const emitter = process.customEventEmitter;
    console.log(`[API /api/posts/${postId}/comments/${commentId}/reactions POST] Attempting to use process.customEventEmitter. Emitter available:`, !!emitter);
    if (emitter && typeof emitter.emit === 'function') {
      emitter.emit('broadcastEvent', {
        room: `board:${board_id}`,
        eventName: 'commentReactionUpdate',
        payload: { 
          postId,
          commentId,
          emoji: cleanEmoji,
          action,
          userId,
          reactions,
          board_id, 
          post_title, 
          board_name,
          comment_content: comment_content?.substring(0, 100) + '...',
          comment_author_id,
          // Add community context for cross-community broadcasting
          communityId: userCommunityId,
          communityShortId: user.communityShortId,
          pluginId: user.pluginId
        }
      });
      console.log(`[API /api/posts/${postId}/comments/${commentId}/reactions POST] Successfully emitted commentReactionUpdate event for ${action} ${cleanEmoji}.`);
    } else {
      console.error(`[API /api/posts/${postId}/comments/${commentId}/reactions POST] ERROR: process.customEventEmitter not available.`);
    }

    const response: ReactionsResponse & { action: string } = {
      reactions,
      userReactions,
      action
    };

    return NextResponse.json(response);

  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error(`[API] Error toggling reaction for comment ${commentId} by user ${userId}:`, error);
    return NextResponse.json(
      { error: (error as Error).message }, 
      { status: 500 }
    );
  } finally {
    if (client) client.release();
  }
}

export const GET = withAuth(getReactionsHandler, false);
export const POST = withAuth(toggleReactionHandler, false);
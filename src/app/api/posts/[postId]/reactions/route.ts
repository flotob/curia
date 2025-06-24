import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest, RouteContext } from '@/lib/withAuth';
import { getClient, query } from '@/lib/db';
import { PoolClient } from 'pg';
import { canUserAccessBoard } from '@/lib/boardPermissions';
import { SettingsUtils } from '@/types/settings';
import emojiRegex from 'emoji-regex-xs';

interface ReactionSummary {
  emoji: string;
  count: number;
  users: Array<{ userId: string; name: string; avatar?: string }>;
}

interface ReactionsResponse {
  reactions: ReactionSummary[];
  userReactions: string[];
}

// GET to fetch reaction summary for a post
async function getReactionsHandler(req: AuthenticatedRequest, context: RouteContext) {
  const user = req.user;
  const params = await context.params;
  const postId = parseInt(params.postId, 10);
  const userRoles = user?.roles;
  const isAdmin = user?.adm || false;
  const userCommunityId = user?.cid;

  if (!user || !user.sub) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (isNaN(postId)) {
    return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
  }

  const userId = user.sub;

  try {
    // SECURITY: First, check if user can access the board where this post belongs
    const postBoardResult = await query(
      `SELECT p.board_id, b.settings, b.community_id
       FROM posts p 
       JOIN boards b ON p.board_id = b.id 
       WHERE p.id = $1`,
      [postId]
    );

    if (postBoardResult.rows.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const { board_id, settings, community_id } = postBoardResult.rows[0];
    
    // Verify post belongs to user's community
    if (community_id !== userCommunityId) {
      console.warn(`[API GET /api/posts/${postId}/reactions] User ${userId} from community ${userCommunityId} attempted to access post from community ${community_id}`);
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const boardSettings = typeof settings === 'string' ? JSON.parse(settings) : settings;
    
    // Check board access permissions
    if (!canUserAccessBoard(userRoles, boardSettings, isAdmin)) {
      console.warn(`[API GET /api/posts/${postId}/reactions] User ${userId} attempted to access reactions on restricted board ${board_id}`);
      return NextResponse.json({ error: 'You do not have permission to view this post' }, { status: 403 });
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
       WHERE r.post_id = $1
       GROUP BY r.emoji
       ORDER BY COUNT(*) DESC, r.emoji ASC`,
      [postId]
    );

    // Fetch current user's reactions
    const userReactionsResult = await query(
      `SELECT emoji FROM reactions WHERE post_id = $1 AND user_id = $2 ORDER BY created_at ASC`,
      [postId, userId]
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
    console.error(`[API] Error fetching reactions for post ${postId}:`, error);
    return NextResponse.json(
      { error: (error as Error).message }, 
      { status: 500 }
    );
  }
}

// POST to toggle a reaction on a post
async function toggleReactionHandler(req: AuthenticatedRequest, context: RouteContext) {
  const user = req.user;
  const params = await context.params;
  const postId = parseInt(params.postId, 10);
  const userRoles = user?.roles;
  const isAdmin = user?.adm || false;
  const userCommunityId = user?.cid;
  let client: PoolClient | null = null;

  if (!user || !user.sub) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (isNaN(postId)) {
    return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
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
    // SECURITY: First, check if user can access the board where this post belongs
    const postBoardResult = await query(
      `SELECT p.board_id, p.title as post_title, b.settings, b.community_id, b.name as board_name
       FROM posts p 
       JOIN boards b ON p.board_id = b.id 
       WHERE p.id = $1`,
      [postId]
    );

    if (postBoardResult.rows.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const { board_id, post_title, settings, community_id, board_name } = postBoardResult.rows[0];
    
    // Verify post belongs to user's community
    if (community_id !== userCommunityId) {
      console.warn(`[API POST /api/posts/${postId}/reactions] User ${userId} from community ${userCommunityId} attempted to react to post from community ${community_id}`);
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const boardSettings = typeof settings === 'string' ? JSON.parse(settings) : settings;
    
    // Check board access permissions
    if (!canUserAccessBoard(userRoles, boardSettings, isAdmin)) {
      console.warn(`[API POST /api/posts/${postId}/reactions] User ${userId} attempted to react on restricted board ${board_id}`);
      return NextResponse.json({ error: 'You do not have permission to react to this post' }, { status: 403 });
    }

    // 🚀 BOARD LOCK VERIFICATION: Check if user has verified board's lock requirements
    const boardLockGating = SettingsUtils.getBoardLockGating(boardSettings);
    
    if (boardLockGating && boardLockGating.lockIds.length > 0) {
      console.log(`[API POST /api/posts/${postId}/reactions] Board ${board_id} has ${boardLockGating.lockIds.length} lock requirements, checking user verification...`);
      
      const lockIdPlaceholders = boardLockGating.lockIds.map((_, index) => `$${index + 2}`).join(', ');
      const verificationResult = await query(`
        SELECT lock_id FROM pre_verifications 
        WHERE user_id = $1 AND lock_id IN (${lockIdPlaceholders})
          AND verification_status = 'verified' AND expires_at > NOW()
      `, [userId, ...boardLockGating.lockIds]);
      
      const verifiedLockIds = new Set(verificationResult.rows.map(row => row.lock_id));
      const verifiedCount = verifiedLockIds.size;
      const requiredCount = boardLockGating.lockIds.length;
      
      const hasAccess = boardLockGating.fulfillment === 'any'
        ? verifiedCount >= 1
        : verifiedCount >= requiredCount;
        
      if (!hasAccess) {
        console.log(`[API POST /api/posts/${postId}/reactions] User ${userId} failed board lock verification: ${verifiedCount}/${requiredCount} locks verified (${boardLockGating.fulfillment} mode)`);
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
      
      console.log(`[API POST /api/posts/${postId}/reactions] ✅ User ${userId} passed board lock verification: ${verifiedCount}/${requiredCount} locks verified`);
    }

    client = await getClient();
    await client.query('BEGIN');

    // Check if user already has this reaction
    const existingReaction = await client.query(
      'SELECT id FROM reactions WHERE user_id = $1 AND post_id = $2 AND emoji = $3',
      [userId, postId, cleanEmoji]
    );

    let action: 'added' | 'removed';

    if (existingReaction.rows.length > 0) {
      // Remove existing reaction
      await client.query(
        'DELETE FROM reactions WHERE user_id = $1 AND post_id = $2 AND emoji = $3',
        [userId, postId, cleanEmoji]
      );
      action = 'removed';
      console.log(`[API] User ${userId} removed reaction ${cleanEmoji} from post ${postId}`);
    } else {
      // Add new reaction
      await client.query(
        'INSERT INTO reactions (user_id, post_id, emoji) VALUES ($1, $2, $3)',
        [userId, postId, cleanEmoji]
      );
      action = 'added';
      console.log(`[API] User ${userId} added reaction ${cleanEmoji} to post ${postId}`);
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
       WHERE r.post_id = $1
       GROUP BY r.emoji
       ORDER BY COUNT(*) DESC, r.emoji ASC`,
      [postId]
    );

    const userReactionsResult = await query(
      `SELECT emoji FROM reactions WHERE post_id = $1 AND user_id = $2 ORDER BY created_at ASC`,
      [postId, userId]
    );

    const reactions: ReactionSummary[] = reactionsResult.rows.map(row => ({
      emoji: row.emoji,
      count: parseInt(row.count, 10),
      users: row.users || []
    }));

    const userReactions: string[] = userReactionsResult.rows.map(row => row.emoji);

    // Emit real-time event
    const emitter = process.customEventEmitter;
    console.log(`[API /api/posts/${postId}/reactions POST] Attempting to use process.customEventEmitter. Emitter available:`, !!emitter);
    if (emitter && typeof emitter.emit === 'function') {
      emitter.emit('broadcastEvent', {
        room: `board:${board_id}`,
        eventName: 'reactionUpdate',
        payload: { 
          postId, 
          emoji: cleanEmoji,
          action,
          userId,
          reactions,
          board_id, 
          post_title, 
          board_name,
          // Add community context for cross-community broadcasting
          communityId: userCommunityId,
          communityShortId: user.communityShortId,
          pluginId: user.pluginId
        }
      });
      console.log(`[API /api/posts/${postId}/reactions POST] Successfully emitted reactionUpdate event for ${action} ${cleanEmoji}.`);
    } else {
      console.error(`[API /api/posts/${postId}/reactions POST] ERROR: process.customEventEmitter not available.`);
    }

    const response: ReactionsResponse & { action: string } = {
      reactions,
      userReactions,
      action
    };

    return NextResponse.json(response);

  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error(`[API] Error toggling reaction for post ${postId} by user ${userId}:`, error);
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
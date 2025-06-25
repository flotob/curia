import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest, RouteContext } from '@/lib/withAuth';
import { getClient, query } from '@/lib/db'; // Use getClient for transactions
import { PoolClient } from 'pg';
import { canUserAccessBoard } from '@/lib/boardPermissions';
import { SettingsUtils } from '@/types/settings';

// POST to upvote a post (protected and permission-checked)
async function addVoteHandler(req: AuthenticatedRequest, context: RouteContext) {
  const user = req.user;
  const params = await context.params;
  const postId = parseInt(params.postId, 10);
  const userRoles = user?.roles;
  const isAdmin = user?.adm || false;
  const userCommunityId = user?.cid;
  let client: PoolClient | null = null; // Declare client here to be accessible in finally block

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
      console.warn(`[API POST /api/posts/${postId}/votes] User ${userId} from community ${userCommunityId} attempted to vote on post from community ${community_id}`);
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const boardSettings = typeof settings === 'string' ? JSON.parse(settings) : settings;
    
    // Check board access permissions
    if (!canUserAccessBoard(userRoles, boardSettings, isAdmin)) {
      console.warn(`[API POST /api/posts/${postId}/votes] User ${userId} attempted to vote on restricted board ${board_id}`);
      return NextResponse.json({ error: 'You do not have permission to vote on this post' }, { status: 403 });
    }

    // 🚀 BOARD LOCK VERIFICATION: Check if user has verified board's lock requirements
    const boardLockGating = SettingsUtils.getBoardLockGating(boardSettings);
    
    if (boardLockGating && boardLockGating.lockIds.length > 0) {
      console.log(`[API POST /api/posts/${postId}/votes] Board ${board_id} has ${boardLockGating.lockIds.length} lock requirements, checking user verification...`);
      
      // Check user's verification status for required locks
      const lockIdPlaceholders = boardLockGating.lockIds.map((_, index) => `$${index + 2}`).join(', ');
      const verificationResult = await query(`
        SELECT lock_id FROM pre_verifications 
        WHERE user_id = $1 AND lock_id IN (${lockIdPlaceholders})
          AND verification_status = 'verified' AND expires_at > NOW()
      `, [userId, ...boardLockGating.lockIds]);
      
      const verifiedLockIds = new Set(verificationResult.rows.map(row => row.lock_id));
      const verifiedCount = verifiedLockIds.size;
      const requiredCount = boardLockGating.lockIds.length;
      
      // Apply fulfillment logic (ANY vs ALL)
      const hasAccess = boardLockGating.fulfillment === 'any'
        ? verifiedCount >= 1
        : verifiedCount >= requiredCount;
        
      if (!hasAccess) {
        console.log(`[API POST /api/posts/${postId}/votes] User ${userId} failed board lock verification: ${verifiedCount}/${requiredCount} locks verified (${boardLockGating.fulfillment} mode)`);
        return NextResponse.json({ 
          error: 'This board requires verification before you can vote',
          requiresVerification: true,
          verificationDetails: {
            lockIds: boardLockGating.lockIds,
            fulfillmentMode: boardLockGating.fulfillment,
            verifiedCount,
            requiredCount
          }
        }, { status: 403 });
      }
      
      console.log(`[API POST /api/posts/${postId}/votes] ✅ User ${userId} passed board lock verification: ${verifiedCount}/${requiredCount} locks verified`);
    }
    client = await getClient();
    await client.query('BEGIN');

    // Attempt to insert the vote
    let newUpvoteCount = 0;
    try {
      await client.query('INSERT INTO votes (user_id, post_id) VALUES ($1, $2)', [userId, postId]);
      // If insert successful, increment upvote_count and get the new count
      const updateResult = await client.query('UPDATE posts SET upvote_count = upvote_count + 1 WHERE id = $1 RETURNING upvote_count', [postId]);
      newUpvoteCount = updateResult.rows[0]?.upvote_count || 0;
    } catch (voteInsertError: unknown) {
      // Check if it's a unique violation error (already voted)
      if ((voteInsertError as { code?: string }).code === '23505') { // 23505 is unique_violation in PostgreSQL
        // User already voted, this is not an error for the client, effectively a NOP for adding a vote.
        // The client-side should ideally prevent calling add if already voted.
        console.log(`[API] User ${userId} already voted for post ${postId}. No action taken.`);
        // Get current count without incrementing
        const countResult = await client.query('SELECT upvote_count FROM posts WHERE id = $1', [postId]);
        newUpvoteCount = countResult.rows[0]?.upvote_count || 0;
      } else {
        throw voteInsertError; // Re-throw other errors
      }
    }
    
    await client.query('COMMIT');
    
    // 🚀 SIMPLIFIED RESPONSE: Return minimal data instead of expensive query
    const simplifiedResponse = {
      id: postId,
      upvote_count: newUpvoteCount,
      user_has_upvoted: true, // Always true after successful upvote
      // Skip expensive author data, full post object, etc.
    };

    const emitter = process.customEventEmitter;
    console.log('[API /api/posts/.../votes POST] Attempting to use process.customEventEmitter. Emitter available:', !!emitter);
    if (emitter && typeof emitter.emit === 'function') {
      emitter.emit('broadcastEvent', {
        room: `board:${board_id}`,
        eventName: 'voteUpdate',
        payload: { 
          postId, 
          newCount: newUpvoteCount, // Use the count we already have
          userIdVoted: userId, 
          board_id, 
          post_title, 
          board_name,
          // ✅ Add community context for community-scoped broadcasting
          communityId: userCommunityId,
          communityShortId: user.communityShortId,
          pluginId: user.pluginId
        }
      });
      console.log('[API /api/posts/.../votes POST] Successfully emitted event on process.customEventEmitter for vote add.');
    } else {
      console.error('[API /api/posts/.../votes POST] ERROR: process.customEventEmitter not available.');
    }

    return NextResponse.json({ post: simplifiedResponse, message: 'Vote added successfully' });

  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error(`[API] Error adding vote for post ${postId} by user ${userId}:`, error);
    return NextResponse.json(
      { error: (error as Error).message }, 
      { status: 500 }
    );
  } finally {
    if (client) client.release();
  }
}

// DELETE to remove an upvote (protected and permission-checked)
async function removeVoteHandler(req: AuthenticatedRequest, context: RouteContext) {
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
      console.warn(`[API DELETE /api/posts/${postId}/votes] User ${userId} from community ${userCommunityId} attempted to unvote on post from community ${community_id}`);
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const boardSettings = typeof settings === 'string' ? JSON.parse(settings) : settings;
    
    // Check board access permissions
    if (!canUserAccessBoard(userRoles, boardSettings, isAdmin)) {
      console.warn(`[API DELETE /api/posts/${postId}/votes] User ${userId} attempted to unvote on restricted board ${board_id}`);
      return NextResponse.json({ error: 'You do not have permission to vote on this post' }, { status: 403 });
    }

    // 🚀 BOARD LOCK VERIFICATION: Check if user has verified board's lock requirements
    const boardLockGating = SettingsUtils.getBoardLockGating(boardSettings);
    
    if (boardLockGating && boardLockGating.lockIds.length > 0) {
      console.log(`[API DELETE /api/posts/${postId}/votes] Board ${board_id} has ${boardLockGating.lockIds.length} lock requirements, checking user verification...`);
      
      // Check user's verification status for required locks
      const lockIdPlaceholders = boardLockGating.lockIds.map((_, index) => `$${index + 2}`).join(', ');
      const verificationResult = await query(`
        SELECT lock_id FROM pre_verifications 
        WHERE user_id = $1 AND lock_id IN (${lockIdPlaceholders})
          AND verification_status = 'verified' AND expires_at > NOW()
      `, [userId, ...boardLockGating.lockIds]);
      
      const verifiedLockIds = new Set(verificationResult.rows.map(row => row.lock_id));
      const verifiedCount = verifiedLockIds.size;
      const requiredCount = boardLockGating.lockIds.length;
      
      // Apply fulfillment logic (ANY vs ALL)
      const hasAccess = boardLockGating.fulfillment === 'any'
        ? verifiedCount >= 1
        : verifiedCount >= requiredCount;
        
      if (!hasAccess) {
        console.log(`[API DELETE /api/posts/${postId}/votes] User ${userId} failed board lock verification: ${verifiedCount}/${requiredCount} locks verified (${boardLockGating.fulfillment} mode)`);
        return NextResponse.json({ 
          error: 'This board requires verification before you can vote',
          requiresVerification: true,
          verificationDetails: {
            lockIds: boardLockGating.lockIds,
            fulfillmentMode: boardLockGating.fulfillment,
            verifiedCount,
            requiredCount
          }
        }, { status: 403 });
      }
      
      console.log(`[API DELETE /api/posts/${postId}/votes] ✅ User ${userId} passed board lock verification: ${verifiedCount}/${requiredCount} locks verified`);
    }
    client = await getClient();
    await client.query('BEGIN');

    let newUpvoteCount = 0;
    const deleteResult = await client.query('DELETE FROM votes WHERE user_id = $1 AND post_id = $2', [userId, postId]);

    if (deleteResult.rowCount && deleteResult.rowCount > 0) { // Check if rowCount is not null and then if > 0
      const updateResult = await client.query('UPDATE posts SET upvote_count = GREATEST(0, upvote_count - 1) WHERE id = $1 RETURNING upvote_count', [postId]);
      newUpvoteCount = updateResult.rows[0]?.upvote_count || 0;
    } else {
      // No vote was deleted (user wasn't voted), get current count
      const countResult = await client.query('SELECT upvote_count FROM posts WHERE id = $1', [postId]);
      newUpvoteCount = countResult.rows[0]?.upvote_count || 0;
    }
    
    await client.query('COMMIT');

    // 🚀 SIMPLIFIED RESPONSE: Return minimal data instead of expensive query
    const simplifiedResponse = {
      id: postId,
      upvote_count: newUpvoteCount,
      user_has_upvoted: false, // Always false after successful unvote
      // Skip expensive author data, full post object, etc.
    };

    const emitter = process.customEventEmitter;
    console.log('[API /api/posts/.../votes DELETE] Attempting to use process.customEventEmitter. Emitter available:', !!emitter);
    if (emitter && typeof emitter.emit === 'function') {
      emitter.emit('broadcastEvent', {
        room: `board:${board_id}`,
        eventName: 'voteUpdate', // Same eventName, client can deduce based on newCount and user_has_upvoted
        payload: { 
          postId, 
          newCount: newUpvoteCount, // Use the count we already have
          userIdVoted: userId, 
          board_id, 
          post_title, 
          board_name,
          // ✅ Add community context for community-scoped broadcasting
          communityId: userCommunityId,
          communityShortId: user.communityShortId,
          pluginId: user.pluginId
        }
      });
      console.log('[API /api/posts/.../votes DELETE] Successfully emitted event on process.customEventEmitter for vote remove.');
    } else {
      console.error('[API /api/posts/.../votes DELETE] ERROR: process.customEventEmitter not available.');
    }

    return NextResponse.json({ post: simplifiedResponse, message: 'Vote removed successfully' });

  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error(`[API] Error removing vote for post ${postId} by user ${userId}:`, error);
    return NextResponse.json(
      { error: (error as Error).message }, 
      { status: 500 }
    );
  } finally {
    if (client) client.release();
  }
}

export const POST = withAuth(addVoteHandler, false);
export const DELETE = withAuth(removeVoteHandler, false); 
import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest, RouteContext } from '@/lib/withAuth';
import { query } from '@/lib/db';
import { canUserAccessBoard } from '@/lib/boardPermissions';
import { LockApiResponse } from '@/types/locks';

interface ApplyLockRequest {
  lockId: number;
}

interface ApplyLockResponseData {
  postId: number;
  lockId: number;
  lockName: string;
  postTitle: string;
  appliedAt: string;
}

interface RemoveLockResponseData {
  postId: number;
  postTitle: string;
  removedAt: string;
}

// POST /api/posts/[postId]/apply-lock - Apply a lock to an existing post
async function applyLockHandler(req: AuthenticatedRequest, context: RouteContext) {
  const params = await context.params;
  const postId = parseInt(params.postId, 10);
  const currentUserId = req.user?.sub;
  const currentCommunityId = req.user?.cid;
  const userRoles = req.user?.roles;
  const isAdmin = req.user?.adm || false;
  
  if (isNaN(postId)) {
    return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
  }
  
  if (!currentCommunityId || !currentUserId) {
    return NextResponse.json({ error: 'Authentication and community context required' }, { status: 401 });
  }
  
  try {
    const body: ApplyLockRequest = await req.json();
    const { lockId } = body;
    
    if (!lockId || isNaN(lockId)) {
      return NextResponse.json({ error: 'Valid lock ID is required' }, { status: 400 });
    }
    
    // Get the post and verify permissions
    const postResult = await query(`
      SELECT p.*, b.settings as board_settings, b.community_id
      FROM posts p
      JOIN boards b ON p.board_id = b.id
      WHERE p.id = $1
    `, [postId]);
    
    if (postResult.rows.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    
    const post = postResult.rows[0];
    
    // Verify post belongs to user's community
    if (post.community_id !== currentCommunityId) {
      console.warn(`[API POST /api/posts/${postId}/apply-lock] User ${currentUserId} from community ${currentCommunityId} attempted to apply lock to post from community ${post.community_id}`);
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    
    // Check if user can access this board
    const boardSettings = typeof post.board_settings === 'string' ? JSON.parse(post.board_settings) : post.board_settings;
    if (!canUserAccessBoard(userRoles, boardSettings, isAdmin)) {
      console.warn(`[API POST /api/posts/${postId}/apply-lock] User ${currentUserId} attempted to modify post from restricted board ${post.board_id}`);
      return NextResponse.json({ error: 'You do not have permission to modify posts in this board' }, { status: 403 });
    }
    
    // Check if user owns the post or is admin
    if (post.author_user_id !== currentUserId && !isAdmin) {
      return NextResponse.json({ error: 'You can only apply locks to your own posts' }, { status: 403 });
    }
    
    // Get the lock and verify permissions
    const lockResult = await query(`
      SELECT l.*, ls.posts_using_lock
      FROM locks l
      LEFT JOIN lock_stats ls ON l.id = ls.id
      WHERE l.id = $1
    `, [lockId]);
    
    if (lockResult.rows.length === 0) {
      return NextResponse.json({ error: 'Lock not found' }, { status: 404 });
    }
    
    const lock = lockResult.rows[0];
    
    // Verify lock belongs to user's community
    if (lock.community_id !== currentCommunityId) {
      console.warn(`[API POST /api/posts/${postId}/apply-lock] User ${currentUserId} from community ${currentCommunityId} attempted to apply lock from community ${lock.community_id}`);
      return NextResponse.json({ error: 'Lock not found' }, { status: 404 });
    }
    
    // Check if user can use this lock
    const canUseLock = 
      lock.creator_user_id === currentUserId || // Owner
      lock.is_public ||                         // Public
      lock.is_template ||                       // Template
      isAdmin;                                  // Admin
    
    if (!canUseLock) {
      console.warn(`[API POST /api/posts/${postId}/apply-lock] User ${currentUserId} attempted to use private lock ${lockId}`);
      return NextResponse.json({ error: 'You do not have permission to use this lock' }, { status: 403 });
    }
    
    // Apply the lock to the post
    // This involves updating the post's settings with the lock's gating configuration
    // and setting the lock_id reference
    
    const currentSettings = typeof post.settings === 'string' ? JSON.parse(post.settings) : (post.settings || {});
    const lockGatingConfig = typeof lock.gating_config === 'string' ? JSON.parse(lock.gating_config) : lock.gating_config;
    
    // Update post settings with lock's gating configuration
    const updatedSettings = {
      ...currentSettings,
      responsePermissions: lockGatingConfig
    };
    
    // Update the post with new settings and lock reference
    await query(`
      UPDATE posts 
      SET settings = $1, lock_id = $2, updated_at = NOW()
      WHERE id = $3
    `, [JSON.stringify(updatedSettings), lockId, postId]);
    
    // Update lock usage count
    await query(`
      UPDATE locks 
      SET usage_count = usage_count + 1, updated_at = NOW()
      WHERE id = $1
    `, [lockId]);
    
    console.log(`[API POST /api/posts/${postId}/apply-lock] Lock "${lock.name}" (ID: ${lockId}) applied to post "${post.title}" (ID: ${postId}) by user ${currentUserId}`);
    
    // Emit real-time event for lock application
    const emitter = process.customEventEmitter;
    if (emitter && typeof emitter.emit === 'function') {
      emitter.emit('broadcastEvent', {
        room: `board:${post.board_id}`,
        eventName: 'postLockApplied',
        payload: {
          postId: postId,
          postTitle: post.title,
          lockId: lockId,
          lockName: lock.name,
          applied_by: currentUserId,
          community_id: currentCommunityId
        }
      });
      
      // Also emit to community room for lock usage tracking
      emitter.emit('broadcastEvent', {
        room: `community:${currentCommunityId}`,
        eventName: 'lockUsed',
        payload: {
          lockId: lockId,
          lockName: lock.name,
          postId: postId,
          used_by: currentUserId,
          community_id: currentCommunityId
        }
      });
      
      console.log('[API POST /api/posts/.../apply-lock] Successfully emitted lock application events');
    }
    
    const response: LockApiResponse<ApplyLockResponseData> = {
      success: true,
      message: `Lock "${lock.name}" successfully applied to post`,
      data: {
        postId: postId,
        lockId: lockId,
        lockName: lock.name,
        postTitle: post.title,
        appliedAt: new Date().toISOString()
      }
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error(`[API POST /api/posts/${postId}/apply-lock] Error applying lock:`, error);
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to apply lock to post' 
    }, { status: 500 });
  }
}

// DELETE /api/posts/[postId]/apply-lock - Remove lock from post (revert to no gating)
async function removeLockHandler(req: AuthenticatedRequest, context: RouteContext) {
  const params = await context.params;
  const postId = parseInt(params.postId, 10);
  const currentUserId = req.user?.sub;
  const currentCommunityId = req.user?.cid;
  const userRoles = req.user?.roles;
  const isAdmin = req.user?.adm || false;
  
  if (isNaN(postId)) {
    return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
  }
  
  if (!currentCommunityId || !currentUserId) {
    return NextResponse.json({ error: 'Authentication and community context required' }, { status: 401 });
  }
  
  try {
    // Get the post and verify permissions
    const postResult = await query(`
      SELECT p.*, b.settings as board_settings, b.community_id, l.name as lock_name
      FROM posts p
      JOIN boards b ON p.board_id = b.id
      LEFT JOIN locks l ON p.lock_id = l.id
      WHERE p.id = $1
    `, [postId]);
    
    if (postResult.rows.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    
    const post = postResult.rows[0];
    
    // Verify post belongs to user's community
    if (post.community_id !== currentCommunityId) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    
    // Check if user can access this board
    const boardSettings = typeof post.board_settings === 'string' ? JSON.parse(post.board_settings) : post.board_settings;
    if (!canUserAccessBoard(userRoles, boardSettings, isAdmin)) {
      return NextResponse.json({ error: 'You do not have permission to modify posts in this board' }, { status: 403 });
    }
    
    // Check if user owns the post or is admin
    if (post.author_user_id !== currentUserId && !isAdmin) {
      return NextResponse.json({ error: 'You can only remove locks from your own posts' }, { status: 403 });
    }
    
    // Check if post has a lock applied
    if (!post.lock_id) {
      return NextResponse.json({ error: 'Post does not have a lock applied' }, { status: 400 });
    }
    
    // Remove lock from post (clear gating and lock reference)
    const currentSettings = typeof post.settings === 'string' ? JSON.parse(post.settings) : (post.settings || {});
    
    // Remove responsePermissions to disable gating
    const updatedSettings = { ...currentSettings };
    delete updatedSettings.responsePermissions;
    
    // Update the post
    await query(`
      UPDATE posts 
      SET settings = $1, lock_id = NULL, updated_at = NOW()
      WHERE id = $2
    `, [JSON.stringify(updatedSettings), postId]);
    
    // Update lock usage count (decrement)
    if (post.lock_id) {
      await query(`
        UPDATE locks 
        SET usage_count = GREATEST(usage_count - 1, 0), updated_at = NOW()
        WHERE id = $1
      `, [post.lock_id]);
    }
    
    console.log(`[API DELETE /api/posts/${postId}/apply-lock] Lock removed from post "${post.title}" (ID: ${postId}) by user ${currentUserId}`);
    
    // Emit real-time event for lock removal
    const emitter = process.customEventEmitter;
    if (emitter && typeof emitter.emit === 'function') {
      emitter.emit('broadcastEvent', {
        room: `board:${post.board_id}`,
        eventName: 'postLockRemoved',
        payload: {
          postId: postId,
          postTitle: post.title,
          lockName: post.lock_name,
          removed_by: currentUserId,
          community_id: currentCommunityId
        }
      });
      
      console.log('[API DELETE /api/posts/.../apply-lock] Successfully emitted lock removal event');
    }
    
    const response: LockApiResponse<RemoveLockResponseData> = {
      success: true,
      message: 'Lock successfully removed from post',
      data: {
        postId: postId,
        postTitle: post.title,
        removedAt: new Date().toISOString()
      }
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error(`[API DELETE /api/posts/${postId}/apply-lock] Error removing lock:`, error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to remove lock from post' 
    }, { status: 500 });
  }
}

export const POST = withAuth(applyLockHandler, false);
export const DELETE = withAuth(removeLockHandler, false); 
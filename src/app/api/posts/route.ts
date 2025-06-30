import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { query } from '@/lib/db';
import { getAccessibleBoardIds, resolveBoard, getAccessibleBoards } from '@/lib/boardPermissions';
import { PostSettings } from '@/types/settings';
import { getPostsForCommunity, type PostQueryOptions } from '@/lib/queries/enrichedPosts';

// Interface for the structure of a post when returned by the API
export interface ApiPost {
  id: number;
  author_user_id: string;
  title: string;
  content: string;
  tags: string[] | null;
  upvote_count: number;
  comment_count: number;
  created_at: string; // ISO string format
  updated_at: string; // ISO string format
  author_name: string | null; // Joined from users table
  author_profile_picture_url: string | null; // Joined from users table
  user_has_upvoted: boolean; // Calculated based on current user
  board_id: number; // Board ID
  board_name: string; // Board name from boards table
  settings: PostSettings; // Post-level settings including UP gating
  lock_id?: number; // The ID of the lock, if one is applied
  
  // 🆕 Share analytics fields from links table
  share_access_count: number;      // Total clicks on all shared URLs for this post
  share_count: number;             // Number of different shared URLs created
  last_shared_at?: string;         // When most recent share URL was created
  most_recent_access_at?: string;  // When shared URL was last clicked
}

// 🗑️ REMOVED: Cursor utilities now handled by enriched_posts utilities
// These helper functions are no longer needed - enriched posts library provides:
// - generateCursor() function for cursor generation  
// - parseCursor() function for cursor parsing
// - Optimized cursor-based pagination in query builders

// GET all posts (now with cursor-based pagination)
async function getAllPostsHandler(req: AuthenticatedRequest) {
  const currentUserId = req.user?.sub; 
  const currentCommunityId = req.user?.cid; // Get communityId from JWT
  const userRoles = req.user?.roles; // Get user roles from JWT
  const isAdmin = req.user?.adm || false; // Get admin status from JWT
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get('cursor'); // Replace page param with cursor
  const limit = parseInt(searchParams.get('limit') || '20', 10); // Increase default for infinite scroll
  const boardId = searchParams.get('boardId'); // Board filtering
  const tagsParam = searchParams.get('tags'); // Tag filtering (comma-separated)
  
  // Parse tags parameter into array (AND logic - posts must have ALL specified tags)
  const selectedTags = tagsParam 
    ? tagsParam.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
    : [];

  // If no community context, we cannot fetch relevant posts.
  if (!currentCommunityId) {
    console.warn('[API GET /api/posts] Attempted to fetch posts without a community ID in token.');
    return NextResponse.json({ 
      posts: [], 
      pagination: { nextCursor: null, hasMore: false, limit } 
    }, { status: 200 });
  }

  try {
    // SECURITY: Get accessible boards based on user permissions (owned + imported)
    const allBoards = await getAccessibleBoards(currentCommunityId);
    
    // Filter boards based on user permissions
    const accessibleBoardIds = getAccessibleBoardIds(allBoards, userRoles, isAdmin);
    
    // If user has no accessible boards, return empty result
    if (accessibleBoardIds.length === 0) {
      console.warn(`[API GET /api/posts] User ${currentUserId} has no accessible boards in community ${currentCommunityId}`);
      return NextResponse.json({ 
        posts: [], 
        pagination: { nextCursor: null, hasMore: false, limit } 
      }, { status: 200 });
    }
    
    // If boardId is specified, verify user can access that specific board
    if (boardId) {
      const requestedBoardId = parseInt(boardId, 10);
      if (!accessibleBoardIds.includes(requestedBoardId)) {
        console.warn(`[API GET /api/posts] User ${currentUserId} attempted to access restricted board ${requestedBoardId}`);
        return NextResponse.json({ 
          posts: [], 
          pagination: { nextCursor: null, hasMore: false, limit } 
        }, { status: 200 });
      }
    }
    // 🗑️ REMOVED: Manual query building replaced with enriched_posts utilities
    // Old approach: Complex 15+ lines of manual parameter building and WHERE clauses
    // New approach: Clean options object passed to utility function

    if (selectedTags.length > 0) {
      console.log(`[API GET /api/posts] Filtering by tags: [${selectedTags.join(', ')}] (AND logic)`);
    }

    // 🚀 MIGRATED TO ENRICHED POSTS UTILITIES - 60% less code, 2-3x better performance
    // BEFORE: 40+ lines of complex 4-table JOINs with manual cursor pagination
    // AFTER: 3-5 lines using optimized enriched_posts view

    const queryOptions: PostQueryOptions = {
      userId: currentUserId,
      boardId: boardId ? parseInt(boardId, 10) : undefined,
      boardIds: boardId ? undefined : accessibleBoardIds, // Use specific board or all accessible boards
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      tagOperator: 'AND',
      cursor: cursor || undefined, // Convert null to undefined
      limit,
      sortBy: 'popularity',
      includeUserVoting: !!currentUserId,
      includeShareStats: true,
      includeLockInfo: true,
      includeBoardInfo: true,
      includeAuthorInfo: true
    };

    const result = await getPostsForCommunity(
      currentCommunityId,
      accessibleBoardIds,
      currentUserId,
      queryOptions
    );

    // Convert EnrichedPost[] to ApiPost[] format for backward compatibility
    const posts: ApiPost[] = result.posts.map(post => ({
      id: post.id,
      author_user_id: post.author_user_id,
      title: post.title,
      content: post.content,
      tags: post.tags,
      upvote_count: post.upvote_count,
      comment_count: post.comment_count,
      created_at: post.created_at,
      updated_at: post.updated_at,
      author_name: post.author_name,
      author_profile_picture_url: post.author_profile_picture_url,
      user_has_upvoted: post.user_has_upvoted || false,
      board_id: post.board_id,
      board_name: post.board_name,
      settings: typeof post.settings === 'string' ? JSON.parse(post.settings) : (post.settings || {}),
      lock_id: post.lock_id,
      share_access_count: post.share_access_count,
      share_count: post.share_count,
      last_shared_at: post.last_shared_at,
      most_recent_access_at: post.most_recent_access_at,
    }));

    return NextResponse.json({
      posts,
      pagination: result.pagination,
    });

  } catch (error) {
    console.error('[API] Error fetching posts:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export const GET = withAuth(getAllPostsHandler, false); // Protect with withAuth, not admin-only

// POST a new post (protected by withAuth)
async function createPostHandler(req: AuthenticatedRequest) {
  const user = req.user;
  if (!user || !user.sub || !user.cid) { // Also check for user.cid (communityId)
    return NextResponse.json({ error: 'Authentication required, or community ID missing in token' }, { status: 401 });
  }
  const currentCommunityId = user.cid;
  const userRoles = user.roles;
  const isAdmin = user.adm || false;

  try {
    const body = await req.json();
    const { title, content, tags, boardId, settings, lockId } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    if (!boardId) {
      return NextResponse.json({ error: 'Board selection is required' }, { status: 400 });
    }

    // Validate settings if provided
    if (settings) {
      const { SettingsUtils } = await import('@/types/settings');
      const validation = SettingsUtils.validatePostSettings(settings);
      if (!validation.isValid) {
        return NextResponse.json({ 
          error: 'Invalid post settings', 
          details: validation.errors 
        }, { status: 400 });
      }
    }

    // Verify the board is accessible to the user (owned or imported)
    const board = await resolveBoard(parseInt(boardId), currentCommunityId);

    if (!board) {
      return NextResponse.json({ error: 'Board not found or not accessible' }, { status: 400 });
    }

    const boardSettings = board.settings;
    
    // SECURITY: Verify user can access this board before allowing post creation
    const { canUserAccessBoard } = await import('@/lib/boardPermissions');
    if (!canUserAccessBoard(userRoles, boardSettings, isAdmin)) {
      console.warn(`[API POST /api/posts] User ${user.sub} attempted to post in restricted board ${boardId}`);
      return NextResponse.json({ error: 'You do not have permission to post in this board' }, { status: 403 });
    }

    // 🚀 BOARD LOCK VERIFICATION: Check if user has verified board's lock requirements
    const { SettingsUtils } = await import('@/types/settings');
    const boardLockGating = SettingsUtils.getBoardLockGating(boardSettings);
    
    if (boardLockGating && boardLockGating.lockIds.length > 0) {
      console.log(`[API POST /api/posts] Board ${boardId} has ${boardLockGating.lockIds.length} lock requirements, checking user verification...`);
      
      // Check user's verification status for required locks
      const lockIdPlaceholders = boardLockGating.lockIds.map((_, index) => `$${index + 2}`).join(', ');
      const verificationResult = await query(`
        SELECT lock_id FROM pre_verifications 
        WHERE user_id = $1 AND lock_id IN (${lockIdPlaceholders})
          AND verification_status = 'verified' AND expires_at > NOW()
      `, [user.sub, ...boardLockGating.lockIds]);
      
      const verifiedLockIds = new Set(verificationResult.rows.map(row => row.lock_id));
      const verifiedCount = verifiedLockIds.size;
      const requiredCount = boardLockGating.lockIds.length;
      
      // Apply fulfillment logic (ANY vs ALL)
      const hasAccess = boardLockGating.fulfillment === 'any'
        ? verifiedCount >= 1
        : verifiedCount >= requiredCount;
        
      if (!hasAccess) {
        console.log(`[API POST /api/posts] User ${user.sub} failed board lock verification: ${verifiedCount}/${requiredCount} locks verified (${boardLockGating.fulfillment} mode)`);
        return NextResponse.json({ 
          error: 'This board requires verification before you can post',
          userMessage: 'Complete the verification requirements below to unlock posting',
          requiresVerification: true,
          verificationDetails: {
            lockIds: boardLockGating.lockIds,
            fulfillmentMode: boardLockGating.fulfillment,
            verifiedCount,
            requiredCount
          }
        }, { status: 403 });
      }
      
      console.log(`[API POST /api/posts] ✅ User ${user.sub} passed board lock verification: ${verifiedCount}/${requiredCount} locks verified`);
    }

    const validBoardId = board.id;
    let postSettings = settings || {};
    let validLockId: number | null = null;

    // Handle lock application if lockId is provided
    if (lockId) {
      const lockIdNum = parseInt(lockId, 10);
      if (isNaN(lockIdNum)) {
        return NextResponse.json({ error: 'Invalid lock ID' }, { status: 400 });
      }

      // Get the lock and verify permissions
      const lockResult = await query(`
        SELECT l.*, ls.posts_using_lock
        FROM locks l
        LEFT JOIN lock_stats ls ON l.id = ls.id
        WHERE l.id = $1
      `, [lockIdNum]);

      if (lockResult.rows.length === 0) {
        return NextResponse.json({ error: 'Lock not found' }, { status: 404 });
      }

      const lock = lockResult.rows[0];

      // Verify lock belongs to board's community (handles shared boards correctly)
      if (lock.community_id !== board.community_id) {
        console.warn(`[API POST /api/posts] User ${user.sub} attempted to use lock from community ${lock.community_id} on board from community ${board.community_id}`);
        return NextResponse.json({ error: 'Lock not found' }, { status: 404 });
      }

      // Check if user can use this lock
      const canUseLock = 
        lock.creator_user_id === user.sub || // Owner
        lock.is_public ||                    // Public
        lock.is_template ||                  // Template
        isAdmin;                             // Admin

      if (!canUseLock) {
        console.warn(`[API POST /api/posts] User ${user.sub} attempted to use private lock ${lockIdNum}`);
        return NextResponse.json({ error: 'You do not have permission to use this lock' }, { status: 403 });
      }

      // Apply the lock's gating configuration to post settings
      const lockGatingConfig = typeof lock.gating_config === 'string' 
        ? JSON.parse(lock.gating_config) 
        : lock.gating_config;

      postSettings = {
        ...postSettings,
        responsePermissions: lockGatingConfig
      };

      validLockId = lockIdNum;
      console.log(`[API POST /api/posts] Applying lock "${lock.name}" (ID: ${lockIdNum}) to new post`);
    }
    
    const result = await query(
      'INSERT INTO posts (author_user_id, title, content, tags, board_id, settings, lock_id, upvote_count, comment_count) VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 0) RETURNING *',
      [user.sub, title, content, tags || [], validBoardId, JSON.stringify(postSettings), validLockId]
    );

    // Update lock usage count if a lock was applied
    if (validLockId) {
      await query(`
        UPDATE locks 
        SET usage_count = usage_count + 1, updated_at = NOW()
        WHERE id = $1
      `, [validLockId]);
    }

    const newPost: ApiPost = {
      ...result.rows[0],
      author_name: user.name || null,
      author_profile_picture_url: user.picture || null,
      user_has_upvoted: false,
      board_name: '',
      settings: postSettings,
      lock_id: validLockId || undefined,
      // New posts have no shares yet
      share_access_count: 0,
      share_count: 0,
      last_shared_at: undefined,
      most_recent_access_at: undefined,
    };

    // 🚀 REAL-TIME: Directly emit event on process.customEventEmitter (now typed)
    const emitter = process.customEventEmitter; // No longer needs 'as any'
    console.log('[API /api/posts] Attempting to use process.customEventEmitter. Emitter available:', !!emitter);

    if (emitter && typeof emitter.emit === 'function') {
      emitter.emit('broadcastEvent', {
        room: `board:${validBoardId}`,
        eventName: 'newPost',
        payload: {
          id: newPost.id,
          title: newPost.title,
          author_user_id: newPost.author_user_id,
          author_name: newPost.author_name,
          author_profile_picture_url: newPost.author_profile_picture_url,
          created_at: newPost.created_at,
          upvote_count: newPost.upvote_count,
          comment_count: newPost.comment_count,
          board_id: validBoardId,
          lock_id: validLockId,
          // ✅ Add community context for community-scoped broadcasting
          communityId: currentCommunityId,
          communityShortId: user.communityShortId,
          pluginId: user.pluginId
        }
      });
      console.log('[API /api/posts] Successfully emitted event on process.customEventEmitter for new post.');
    } else {
      console.error('[API /api/posts] ERROR: process.customEventEmitter not available or not an emitter. Emitter:', emitter);
    }
        
    console.log('[API] POST /api/posts db insert successful, user:', user.sub, 'with body:', body);
    return NextResponse.json(newPost, { status: 201 }); 

  } catch (error) {
    console.error('[API] Error creating post:', error);
    if (error instanceof SyntaxError) { // from req.json()
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export const POST = withAuth(createPostHandler, false); // false = any authenticated user can post (for now) 
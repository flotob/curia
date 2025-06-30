import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest, RouteContext } from '@/lib/withAuth';
import { query, getClient } from '@/lib/db';
import { canUserAccessBoard, resolveBoard } from '@/lib/boardPermissions';

// Force Node.js runtime to avoid Edge Runtime restrictions
export const runtime = 'nodejs';

// Import shared verification infrastructure
import { verifyPostGatingRequirements } from '@/lib/verification';
import { SettingsUtils, PostSettings } from '@/types/settings';
import { verifyEthereumGatingRequirements } from '@/lib/ethereum/verification';
import { EthereumGatingRequirements, UPGatingRequirements, GatingCategory } from '@/types/gating';

// Interface for the structure of a comment when returned by the API
export interface ApiComment {
  id: number;
  post_id: number;
  author_user_id: string;
  parent_comment_id: number | null;
  content: string;
  created_at: string; // ISO string format
  updated_at: string; // ISO string format
  author_name: string | null;
  author_profile_picture_url: string | null;
}

// GET comments for a post (now protected and permission-checked)
async function getCommentsHandler(req: AuthenticatedRequest, context: RouteContext) {
  const params = await context.params;
  const postId = parseInt(params.postId, 10);
  const userRoles = req.user?.roles;
  const isAdmin = req.user?.adm || false;
  const userId = req.user?.sub;
  const userCommunityId = req.user?.cid;

  if (isNaN(postId)) {
    return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
  }

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

    const { board_id, settings } = postBoardResult.rows[0];
    
    // Verify user can access the board (handles both owned and shared boards)
    const resolvedBoard = await resolveBoard(board_id, userCommunityId || '');
    if (!resolvedBoard) {
      console.warn(`[API GET /api/posts/${postId}/comments] User ${userId} from community ${userCommunityId} attempted to access post from inaccessible board ${board_id}`);
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const boardSettings = typeof settings === 'string' ? JSON.parse(settings) : settings;
    
    // Check board access permissions
    if (!canUserAccessBoard(userRoles, boardSettings, isAdmin)) {
      console.warn(`[API GET /api/posts/${postId}/comments] User ${userId} attempted to access comments from restricted board ${board_id}`);
      return NextResponse.json({ error: 'You do not have permission to view this post' }, { status: 403 });
    }

    // User has permission, fetch comments
    const result = await query(
      `SELECT 
        c.id,
        c.post_id,
        c.author_user_id,
        c.parent_comment_id,
        c.content,
        c.created_at,
        c.updated_at,
        u.name AS author_name,
        u.profile_picture_url AS author_profile_picture_url
      FROM comments c
      JOIN users u ON c.author_user_id = u.user_id
      WHERE c.post_id = $1
      ORDER BY c.created_at ASC`,
      [postId]
    );

    const comments: ApiComment[] = result.rows;
    return NextResponse.json(comments);

  } catch (error) {
    console.error(`[API] Error fetching comments for post ${postId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

// POST a new comment (protected and permission-checked + gating verification)
async function createCommentHandler(req: AuthenticatedRequest, context: RouteContext) {
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

  try {
    // SECURITY: First, check if user can access the board where this post belongs and get post settings + lock data
    const postBoardResult = await query(
      `SELECT p.board_id, p.title as post_title, p.settings as post_settings, p.lock_id,
              b.settings as board_settings, b.community_id, b.name as board_name,
              l.gating_config as lock_gating_config
       FROM posts p 
       JOIN boards b ON p.board_id = b.id 
       LEFT JOIN locks l ON p.lock_id = l.id
       WHERE p.id = $1`,
      [postId]
    );

    if (postBoardResult.rows.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const { 
      board_id, 
      post_title, 
      post_settings, 
      lock_id,
      lock_gating_config,
      board_settings, 
      board_name 
    } = postBoardResult.rows[0];
    
    // Verify user can access the board (handles both owned and shared boards)
    const resolvedBoard = await resolveBoard(board_id, userCommunityId || '');
    if (!resolvedBoard) {
      console.warn(`[API POST /api/posts/${postId}/comments] User ${user.sub} from community ${userCommunityId} attempted to comment on post from inaccessible board ${board_id}`);
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const boardSettings = typeof board_settings === 'string' ? JSON.parse(board_settings) : board_settings;
    
    // Check board access permissions
    if (!canUserAccessBoard(userRoles, boardSettings, isAdmin)) {
      console.warn(`[API POST /api/posts/${postId}/comments] User ${user.sub} attempted to comment on restricted board ${board_id}`);
      return NextResponse.json({ error: 'You do not have permission to comment on this post' }, { status: 403 });
    }

    // 🚀 BOARD LOCK VERIFICATION: Check if user has verified board's lock requirements
    const { SettingsUtils } = await import('@/types/settings');
    const boardLockGating = SettingsUtils.getBoardLockGating(boardSettings);
    
    if (boardLockGating && boardLockGating.lockIds.length > 0) {
      console.log(`[API POST /api/posts/${postId}/comments] Board ${board_id} has ${boardLockGating.lockIds.length} lock requirements, checking user verification...`);
      
      // Check user's verification status for required locks
      const lockIdPlaceholders = boardLockGating.lockIds.map((_, index) => `$${index + 2}`).join(', ');
      const boardVerificationResult = await query(`
        SELECT lock_id FROM pre_verifications 
        WHERE user_id = $1 AND lock_id IN (${lockIdPlaceholders})
          AND verification_status = 'verified' AND expires_at > NOW()
      `, [user.sub, ...boardLockGating.lockIds]);
      
      const verifiedLockIds = new Set(boardVerificationResult.rows.map(row => row.lock_id));
      const verifiedCount = verifiedLockIds.size;
      const requiredCount = boardLockGating.lockIds.length;
      
      // Apply fulfillment logic (ANY vs ALL)
      const hasAccess = boardLockGating.fulfillment === 'any'
        ? verifiedCount >= 1
        : verifiedCount >= requiredCount;
        
      if (!hasAccess) {
        console.log(`[API POST /api/posts/${postId}/comments] User ${user.sub} failed board lock verification: ${verifiedCount}/${requiredCount} locks verified (${boardLockGating.fulfillment} mode)`);
        return NextResponse.json({ 
          error: 'This board requires verification before you can comment',
          userMessage: 'Complete the verification requirements below to unlock commenting',
          requiresVerification: true,
          verificationDetails: {
            lockIds: boardLockGating.lockIds,
            fulfillmentMode: boardLockGating.fulfillment,
            verifiedCount,
            requiredCount,
            context: 'board'
          }
        }, { status: 403 });
      }
      
      console.log(`[API POST /api/posts/${postId}/comments] ✅ User ${user.sub} passed board lock verification: ${verifiedCount}/${requiredCount} locks verified`);
    }

    const body = await req.json();
    const { content, parent_comment_id }: { 
      content: string;
      parent_comment_id?: number;
    } = body;

    if (!content || String(content).trim() === '') {
      return NextResponse.json({ error: 'Comment content cannot be empty' }, { status: 400 });
    }

    // Parse post settings and check for gating (legacy OR lock-based)
    const postSettings: PostSettings = typeof post_settings === 'string' 
      ? JSON.parse(post_settings) 
      : (post_settings || {});

    // Check if post has any gating (legacy OR lock-based)
    const hasLegacyGating = SettingsUtils.hasAnyGating(postSettings);
    const hasLockGating = !!lock_id && !!lock_gating_config;

    // ⭐ PRE-VERIFICATION SLOT-BASED GATING ⭐
    if (hasLegacyGating || hasLockGating) {
      console.log(`[API POST /api/posts/${postId}/comments] Post has gating enabled (${hasLockGating ? 'lock-based' : 'legacy'}), checking pre-verifications...`);
      
      // Determine which gating configuration to use
      let gatingCategories: GatingCategory[];
      let requireAll: boolean;
      
      if (hasLockGating) {
        // Use lock-based gating configuration
        const lockGatingConfig = typeof lock_gating_config === 'string' 
          ? JSON.parse(lock_gating_config) 
          : lock_gating_config;
        
        gatingCategories = lockGatingConfig.categories || [];
        // Backward compatibility: handle both requireAll and requireAny fields
        if (lockGatingConfig.requireAll !== undefined) {
          requireAll = lockGatingConfig.requireAll;
        } else if (lockGatingConfig.requireAny !== undefined) {
          requireAll = !lockGatingConfig.requireAny; // requireAny: false means requireAll: true
        } else {
          requireAll = false; // Default to requireAny behavior for backward compatibility
        }
        
        console.log(`[API POST /api/posts/${postId}/comments] Using lock-based gating, lock_id: ${lock_id}`);
      } else {
        // Use legacy post settings gating
        gatingCategories = SettingsUtils.getGatingCategories(postSettings);
        requireAll = postSettings.responsePermissions?.requireAll || false;
        
        console.log(`[API POST /api/posts/${postId}/comments] Using legacy gating`);
      }

      const enabledCategories = gatingCategories.filter((cat: GatingCategory) => cat.enabled);

      if (enabledCategories.length === 0) {
        console.log(`[API POST /api/posts/${postId}/comments] No enabled gating categories found`);
        // No enabled categories, allow comment
      } else {
        // Check for valid pre-verifications for the specific lock
        let verificationResult;
        if (hasLockGating && lock_id) {
          // Use lock-based verification (converted posts have both legacy + lock)
          verificationResult = await query(
            `SELECT category_type, verification_status, expires_at 
             FROM pre_verifications 
             WHERE user_id = $1 AND lock_id = $2 AND expires_at > NOW() AND verification_status = 'verified'`,
            [user.sub, lock_id]
          );
        } else {
          // No lock-based gating - no verifications available
          verificationResult = { rows: [] };
        }

        const verifiedCategories = new Set(verificationResult.rows.map(row => row.category_type));
        const verifiedCount = verifiedCategories.size;
        const totalRequired = enabledCategories.length;

        console.log(`[API POST /api/posts/${postId}/comments] Found ${verifiedCount} verified categories out of ${totalRequired} required (requireAll: ${requireAll})`);

        let canComment = false;
        let errorMessage = '';

        if (requireAll) {
          // Need all categories verified
          const unverifiedCategories = enabledCategories
            .filter((cat: GatingCategory) => !verifiedCategories.has(cat.type))
            .map((cat: GatingCategory) => cat.type);
          
          canComment = unverifiedCategories.length === 0;
          
          if (!canComment) {
            errorMessage = `All verification requirements must be met. Missing: ${unverifiedCategories.join(', ')}. Please complete verification before commenting.`;
          }
        } else {
          // Need at least one category verified
          canComment = verifiedCount > 0;
          
          if (!canComment) {
            const availableCategories = enabledCategories.map((cat: GatingCategory) => cat.type).join(', ');
            errorMessage = `At least one verification requirement must be met. Available options: ${availableCategories}. Please complete verification before commenting.`;
          }
        }

        if (!canComment) {
          console.log(`[API POST /api/posts/${postId}/comments] Verification requirements not met: ${errorMessage}`);
          return NextResponse.json({ 
            error: errorMessage,
            requiresVerification: true,
            availableCategories: enabledCategories.map((cat: GatingCategory) => cat.type),
            requireAll
          }, { status: 403 });
        }

        console.log(`[API POST /api/posts/${postId}/comments] Pre-verification check passed - user can comment`);
      }
    }

    // Start transaction for comment creation
    const dbClient = await getClient();
    try {
      await dbClient.query('BEGIN');
      
      const result = await dbClient.query(
        'INSERT INTO comments (post_id, author_user_id, parent_comment_id, content) VALUES ($1, $2, $3, $4) RETURNING *',
        [postId, user.sub, parent_comment_id || null, content]
      );
      const newComment = result.rows[0];

      // Increment comment_count on the posts table
      await dbClient.query(
        'UPDATE posts SET comment_count = comment_count + 1 WHERE id = $1',
        [postId]
      );

      await dbClient.query('COMMIT');
      
      // Refetch the full comment with author details to return
      const fullCommentResult = await dbClient.query(
        `SELECT c.*, u.name AS author_name, u.profile_picture_url AS author_profile_picture_url 
         FROM comments c JOIN users u ON c.author_user_id = u.user_id WHERE c.id = $1`,
        [newComment.id]
      );

      const commentWithAuthor = fullCommentResult.rows[0];

      const emitter = process.customEventEmitter;
      console.log('[API /api/posts/.../comments POST] Attempting to use process.customEventEmitter. Emitter available:', !!emitter);
      if (emitter && typeof emitter.emit === 'function') {
        emitter.emit('broadcastEvent', {
          room: `board:${board_id}`,
          eventName: 'newComment',
          payload: {
            postId: postId,
            post_title: post_title,
            board_id: board_id,
            board_name: board_name,
            // Add community context for cross-community broadcasting
            communityId: userCommunityId,
            communityShortId: user.communityShortId,
            pluginId: user.pluginId,
            comment: {
              id: commentWithAuthor.id,
              post_id: commentWithAuthor.post_id,
              author_user_id: commentWithAuthor.author_user_id,
              author_name: commentWithAuthor.author_name,
              author_profile_picture_url: commentWithAuthor.author_profile_picture_url,
              content: commentWithAuthor.content,
              created_at: commentWithAuthor.created_at,
              parent_comment_id: commentWithAuthor.parent_comment_id,
              board_id: board_id,
              post_title: post_title,
              board_name: board_name
            }
          }
        });
        console.log('[API /api/posts/.../comments POST] Successfully emitted event on process.customEventEmitter for new comment with correct structure.');
      } else {
        console.error('[API /api/posts/.../comments POST] ERROR: process.customEventEmitter not available.');
      }

      return NextResponse.json(commentWithAuthor, { status: 201 });

    } catch (txError) {
      await dbClient.query('ROLLBACK');
      throw txError; // Re-throw to be caught by outer catch
    } finally {
      dbClient.release();
    }

  } catch (error) {
    console.error(`[API] Error creating comment for post ${postId} by user ${user?.sub}:`, error);
    if (error instanceof SyntaxError) { 
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}

export const GET = withAuth(getCommentsHandler, false);
export const POST = withAuth(createCommentHandler, false); 
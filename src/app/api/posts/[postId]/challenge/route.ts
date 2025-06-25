import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest, RouteContext } from '@/lib/withAuth';
import { query } from '@/lib/db';
import { canUserAccessBoard, resolveBoard } from '@/lib/boardPermissions';

// Import our verification library
import { ChallengeUtils, NonceStore } from '@/lib/verification';
import { SettingsUtils, PostSettings } from '@/types/settings';

// Initialize nonce store
NonceStore.initialize();

// POST - Generate a new challenge for UP verification
async function generateChallengeHandler(req: AuthenticatedRequest, context: RouteContext) {
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
    const body = await req.json();
    const { upAddress }: { upAddress: string } = body;

    if (!upAddress) {
      return NextResponse.json({ error: 'Universal Profile address required' }, { status: 400 });
    }

    // Basic address format validation
    if (!/^0x[a-fA-F0-9]{40}$/.test(upAddress)) {
      return NextResponse.json({ error: 'Invalid Universal Profile address format' }, { status: 400 });
    }

    // Verify post exists and get its settings
    const postResult = await query(
      `SELECT p.id, p.title, p.settings as post_settings, p.board_id, p.lock_id,
              b.settings as board_settings, b.community_id,
              l.gating_config as lock_gating_config
       FROM posts p 
       JOIN boards b ON p.board_id = b.id 
       LEFT JOIN locks l ON p.lock_id = l.id
       WHERE p.id = $1`,
      [postId]
    );

    if (postResult.rows.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const { 
      post_settings, 
      board_settings, 
      board_id,
      lock_id,
      lock_gating_config
    } = postResult.rows[0];

    // Verify user can access the board (handles both owned and shared boards)
    const resolvedBoard = await resolveBoard(board_id, userCommunityId || '');
    if (!resolvedBoard) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Check board access permissions
    const boardSettings = typeof board_settings === 'string' ? JSON.parse(board_settings) : board_settings;
    if (!canUserAccessBoard(userRoles, boardSettings, isAdmin)) {
      return NextResponse.json({ error: 'You do not have permission to access this post' }, { status: 403 });
    }

    // Parse post settings
    const postSettings: PostSettings = typeof post_settings === 'string' 
      ? JSON.parse(post_settings) 
      : (post_settings || {});

    // Check if post has any gating (legacy OR lock-based)
    const hasLegacyGating = SettingsUtils.hasAnyGating(postSettings);
    const hasLockGating = !!lock_id && !!lock_gating_config;

    if (!hasLegacyGating && !hasLockGating) {
      return NextResponse.json({ error: 'This post does not have gating enabled' }, { status: 400 });
    }

    // Check for UP gating requirements (legacy OR lock-based)
    let hasUpRequirements = false;

    if (hasLockGating) {
      // Check lock-based gating configuration
      const lockConfig = typeof lock_gating_config === 'string' 
        ? JSON.parse(lock_gating_config) 
        : lock_gating_config;
      
      // Check if lock has universal_profile category
      hasUpRequirements = lockConfig?.categories?.some((cat: { type: string; enabled?: boolean }) => 
        cat.type === 'universal_profile' && cat.enabled !== false
      ) || false;
    } else {
      // Check legacy gating configuration
      hasUpRequirements = SettingsUtils.hasUPGating(postSettings) || 
                          SettingsUtils.getGatingCategories(postSettings).some(cat => cat.type === 'universal_profile' && cat.enabled);
    }
    
    if (!hasUpRequirements) {
      return NextResponse.json({ error: 'This post does not have Universal Profile gating enabled' }, { status: 400 });
    }

    // Generate challenge
    const challenge = ChallengeUtils.generateChallenge(postId, upAddress);
    
    // Store nonce for later validation
    NonceStore.storeNonce(challenge.nonce, upAddress, postId);

    console.log(`[API POST /api/posts/${postId}/challenge] Generated challenge for UP ${upAddress}, nonce: ${challenge.nonce}`);

    // Return challenge (without signature, user will sign it)
    return NextResponse.json({
      challenge,
      message: ChallengeUtils.createSigningMessage(challenge)
    });

  } catch (error) {
    console.error(`[API] Error generating challenge for post ${postId}:`, error);
    if (error instanceof SyntaxError) { 
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to generate challenge' }, { status: 500 });
  }
}

export const POST = withAuth(generateChallengeHandler, false); 
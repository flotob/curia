import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest, RouteContext } from '@/lib/withAuth';
import { query } from '@/lib/db';
import { canUserAccessBoard } from '@/lib/boardPermissions';

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
      `SELECT p.id, p.title, p.settings as post_settings, p.board_id,
              b.settings as board_settings, b.community_id
       FROM posts p 
       JOIN boards b ON p.board_id = b.id 
       WHERE p.id = $1`,
      [postId]
    );

    if (postResult.rows.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const { 
      post_settings, 
      board_settings, 
      community_id 
    } = postResult.rows[0];

    // Verify post belongs to user's community
    if (community_id !== userCommunityId) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Check board access permissions
    const boardSettings = typeof board_settings === 'string' ? JSON.parse(board_settings) : board_settings;
    if (!canUserAccessBoard(userRoles, boardSettings, isAdmin)) {
      return NextResponse.json({ error: 'You do not have permission to access this post' }, { status: 403 });
    }

    // Parse post settings and check if gating is enabled
    const postSettings: PostSettings = typeof post_settings === 'string' 
      ? JSON.parse(post_settings) 
      : (post_settings || {});

    if (!SettingsUtils.hasUPGating(postSettings)) {
      return NextResponse.json({ error: 'This post does not have gating enabled' }, { status: 400 });
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
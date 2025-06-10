import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest, RouteContext } from '@/lib/withAuth';
import { query } from '@/lib/db';
import { canUserAccessBoard } from '@/lib/boardPermissions';
import { SettingsUtils, PostSettings } from '@/types/settings';

// POST - Generate a new challenge for Ethereum verification
async function generateEthereumChallengeHandler(req: AuthenticatedRequest, context: RouteContext) {
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
    const { ethAddress }: { ethAddress: string } = body;

    if (!ethAddress) {
      return NextResponse.json({ error: 'Ethereum address required' }, { status: 400 });
    }

    // Basic address format validation
    if (!/^0x[a-fA-F0-9]{40}$/.test(ethAddress)) {
      return NextResponse.json({ error: 'Invalid Ethereum address format' }, { status: 400 });
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

    // Check for any form of gating (legacy UP or multi-category)
    if (!SettingsUtils.hasAnyGating(postSettings)) {
      return NextResponse.json({ error: 'This post does not have gating enabled' }, { status: 400 });
    }

    // For Ethereum challenge generation, ensure the post has Ethereum gating requirements
    const hasEthereumRequirements = SettingsUtils.hasEthereumGating(postSettings) || 
                                    SettingsUtils.getGatingCategories(postSettings).some(cat => cat.type === 'ethereum_profile' && cat.enabled);
    
    if (!hasEthereumRequirements) {
      return NextResponse.json({ error: 'This post does not have Ethereum Profile gating enabled' }, { status: 400 });
    }

    // Generate Ethereum challenge
    const challenge = generateEthereumChallenge(postId, ethAddress);
    
    // Create EIP-191 compatible message for signing
    const message = createEthereumSigningMessage(challenge);

    console.log(`[API POST /api/posts/${postId}/ethereum-challenge] Generated challenge for ETH ${ethAddress}, nonce: ${challenge.nonce}`);

    // Return challenge and message for signing
    return NextResponse.json({
      challenge,
      message
    });

  } catch (error) {
    console.error(`[API] Error generating Ethereum challenge for post ${postId}:`, error);
    if (error instanceof SyntaxError) { 
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to generate Ethereum challenge' }, { status: 500 });
  }
}

/**
 * Generate Ethereum-compatible challenge for verification
 */
function generateEthereumChallenge(postId: number, ethAddress: string) {
  const challenge = {
    type: 'ethereum_profile' as const,
    chainId: 1, // Ethereum mainnet
    address: ethAddress.toLowerCase(),
    ethAddress: ethAddress.toLowerCase(),
    postId,
    timestamp: Date.now(),
    nonce: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
  };
  
  return challenge;
}

/**
 * Create EIP-191 compatible signing message for Ethereum wallets
 */
function createEthereumSigningMessage(challenge: { postId: number; address: string; chainId: number; timestamp: number; nonce: string }): string {
  const message = `Verify access to post ${challenge.postId} on Ethereum mainnet

Address: ${challenge.address}
Chain ID: ${challenge.chainId}
Timestamp: ${challenge.timestamp}
Nonce: ${challenge.nonce}

This signature proves you control this Ethereum address and grants access to comment on this gated post.`;

  return message;
}

export const POST = withAuth(generateEthereumChallengeHandler, false); 
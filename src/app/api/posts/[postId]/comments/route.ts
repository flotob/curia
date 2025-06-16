import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest, RouteContext } from '@/lib/withAuth';
import { query, getClient } from '@/lib/db';
import { canUserAccessBoard } from '@/lib/boardPermissions';
import { ethers } from 'ethers';

// Force Node.js runtime to avoid Edge Runtime restrictions
export const runtime = 'nodejs';

// Import our verification library
import { 
  ChallengeUtils, 
  NonceStore, 
  VerificationChallenge,
  ERC1271_MAGIC_VALUE,
  verifyPostGatingRequirements
} from '@/lib/verification';
import { SettingsUtils, PostSettings } from '@/types/settings';
import { verifyEthereumGatingRequirements } from '@/lib/ethereum/verification';
import { EthereumGatingRequirements, UPGatingRequirements, GatingCategory } from '@/types/gating';

// Initialize nonce store
NonceStore.initialize();

// LUKSO mainnet RPC configuration with working fallbacks only
const LUKSO_RPC_URLS = [
  process.env.NEXT_PUBLIC_LUKSO_MAINNET_RPC_URL,
  'https://rpc.mainnet.lukso.network', // Official LUKSO - works ✅
  'https://42.rpc.thirdweb.com'         // Thirdweb by Chain ID - works ✅
  // Removed: 'https://lukso-mainnet.rpc.thirdweb.com' - fails consistently ❌
].filter(Boolean) as string[];

// LUKSO RPC URLs are used in the rawLuksoCall function

/**
 * LUKSO RPC Integration
 * 
 * Note: We use raw fetch() calls instead of ethers.js providers due to 
 * Next.js runtime compatibility issues. Ethers v5 sets HTTP headers that
 * cause "Referrer 'client' is not a valid URL" errors in serverless environments.
 * 
 * This approach maintains full functionality while being runtime-agnostic.
 */

// Raw RPC call helper - bypasses ethers.js HTTP compatibility issues
async function rawLuksoCall(method: string, params: unknown[] = []): Promise<unknown> {
  const body = {
    jsonrpc: "2.0",
    id: 1,
    method,
    params,
  };

  for (const rpcUrl of LUKSO_RPC_URLS) {
    try {
      console.log(`[rawLuksoCall] Trying ${method} on ${rpcUrl}`);
      const res = await fetch(rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const { result, error } = await res.json();
      if (error) {
        throw new Error(error.message || 'RPC error');
      }

      console.log(`[rawLuksoCall] Success: ${method} on ${rpcUrl}`);
      return result;
    } catch (error) {
      console.warn(`[rawLuksoCall] Failed ${method} on ${rpcUrl}:`, error);
    }
  }
  
  throw new Error(`All RPC endpoints failed for ${method}`);
}

// Log available RPC endpoints for debugging
console.log(`[LUKSO RPC] Available endpoints: ${LUKSO_RPC_URLS.join(', ')}`);

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

/**
 * Verify Universal Profile signature using ERC-1271
 * @deprecated - Will be moved to verification service in Phase 2
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function verifyUPSignature(
  upAddress: string, 
  challenge: VerificationChallenge
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Validate challenge format first
    const formatValidation = ChallengeUtils.validateChallengeFormat(challenge);
    if (!formatValidation.valid) {
      return { valid: false, error: formatValidation.error };
    }

    // Check if challenge is expired
    if (ChallengeUtils.isExpired(challenge)) {
      return { valid: false, error: 'Challenge has expired' };
    }

    // Verify UP address is provided in challenge
    if (!challenge.upAddress) {
      return { valid: false, error: 'No Universal Profile address provided in challenge' };
    }

    // Verify the UP address matches
    if (upAddress.toLowerCase() !== challenge.upAddress.toLowerCase()) {
      return { valid: false, error: 'UP address mismatch' };
    }

    // Verify signature exists
    if (!challenge.signature) {
      return { valid: false, error: 'No signature provided' };
    }

    // Use raw RPC calls to bypass ethers.js HTTP compatibility issues
    console.log(`[verifyUPSignature] Using raw RPC for verification`);

    // Create the message that was signed (using ethers utils which work fine)
    const message = ChallengeUtils.createSigningMessage(challenge);
    const messageHash = ethers.utils.hashMessage(message);

    console.log(`[verifyUPSignature] Verifying signature for UP: ${upAddress}`);
    console.log(`[verifyUPSignature] Message hash: ${messageHash}`);

    /**
     * Manual ABI encoding for isValidSignature(bytes32,bytes) call
     * 
     * We encode the function call manually because ethers.Contract fails in Next.js.
     * The function signature is: isValidSignature(bytes32 hash, bytes signature)
     * 
     * Call data structure:
     * - Function selector: 0x1626ba7e (first 4 bytes of keccak256("isValidSignature(bytes32,bytes)"))
     * - Parameter 1: bytes32 hash (32 bytes, padded)
     * - Parameter 2: bytes signature (dynamic length, with offset and length encoding)
     */
    const functionSelector = '0x1626ba7e'; // isValidSignature(bytes32,bytes)
    const hashParam = messageHash.slice(2).padStart(64, '0'); // Remove 0x and pad to 32 bytes
    const signatureOffset = '0000000000000000000000000000000000000000000000000000000000000040'; // Offset to signature data (64 bytes)
    const signatureLength = (challenge.signature.slice(2).length / 2).toString(16).padStart(64, '0'); // Length in bytes
    const signatureData = challenge.signature.slice(2).padEnd(Math.ceil(challenge.signature.slice(2).length / 64) * 64, '0'); // Signature data padded
    
    const callData = functionSelector + hashParam + signatureOffset + signatureLength + signatureData;

    try {
      // Call isValidSignature on the Universal Profile contract
      const result = await rawLuksoCall('eth_call', [
        {
          to: upAddress,
          data: callData
        },
        'latest'
      ]);

      console.log(`[verifyUPSignature] Raw isValidSignature result: ${result}`);

      // Check if result matches ERC-1271 magic value (0x1626ba7e)
      // A valid signature returns the magic value, invalid signatures return 0x00000000
      const expectedMagic = ERC1271_MAGIC_VALUE.toLowerCase();
      const actualResult = (result as string)?.toLowerCase().slice(0, 10); // First 4 bytes (8 hex chars + 0x)

      if (actualResult !== expectedMagic) {
        return { valid: false, error: 'Signature verification failed - invalid signature for this Universal Profile' };
      }

      return { valid: true };

    } catch (error) {
      console.error('[verifyUPSignature] Raw RPC call failed:', error);
      return { 
        valid: false, 
        error: 'Network verification failed. Please check your connection and try again.' 
      };
    }

  } catch (error) {
    console.error('[verifyUPSignature] Error verifying signature:', error);
    // Check if it's a network-related error
    if (error instanceof Error && error.message.includes('network')) {
      return { valid: false, error: 'Network connection failed. Please try again.' };
    }
    return { valid: false, error: 'Signature verification failed' };
  }
}

/**
 * Verify Ethereum signature using standard ECDSA verification
 * @deprecated - Will be moved to verification service in Phase 2
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function verifyEthereumSignature(
  challenge: VerificationChallenge
): Promise<{ valid: boolean; error?: string }> {
  try {
    console.log(`[verifyEthereumSignature] Verifying Ethereum signature for challenge type: ${challenge.type}`);

    // Validate required fields
    if (!challenge.ethAddress) {
      return { valid: false, error: 'No Ethereum address provided in challenge' };
    }

    if (!challenge.signature) {
      return { valid: false, error: 'No signature provided' };
    }

    // Check if challenge is expired
    if (ChallengeUtils.isExpired(challenge)) {
      return { valid: false, error: 'Challenge has expired' };
    }

    // Recreate the message that was signed
    const message = `Verify access to post ${challenge.postId} on Ethereum mainnet

Address: ${challenge.ethAddress}
Chain ID: ${challenge.chainId}
Timestamp: ${challenge.timestamp}
Nonce: ${challenge.nonce}

This signature proves you control this Ethereum address and grants access to comment on this gated post.`;

    // Verify the signature using ethers.js utilities
    try {
      const recoveredAddress = ethers.utils.verifyMessage(message, challenge.signature);
      
      if (recoveredAddress.toLowerCase() !== challenge.ethAddress.toLowerCase()) {
        console.log(`[verifyEthereumSignature] Address mismatch. Expected: ${challenge.ethAddress}, Recovered: ${recoveredAddress}`);
        return { valid: false, error: 'Signature verification failed - signature does not match the provided Ethereum address' };
      }

      console.log(`[verifyEthereumSignature] ✅ Ethereum signature verified successfully for ${challenge.ethAddress}`);
      return { valid: true };

    } catch (signatureError) {
      console.error('[verifyEthereumSignature] Signature verification failed:', signatureError);
      return { valid: false, error: 'Invalid signature format or signature verification failed' };
    }

  } catch (error) {
    console.error('[verifyEthereumSignature] Error verifying Ethereum signature:', error);
    return { valid: false, error: 'Ethereum signature verification failed' };
  }
}

/**
 * ⭐ Universal Profile Verification Functions
 * 
 * These functions have been moved to the shared verification module:
 * @see src/lib/verification/upVerification.ts
 * 
 * This consolidation ensures both the comments API and pre-verification API
 * use exactly the same verification logic, fixing the security bypass issue.
 * 
 * Functions now imported from shared module:
 * - verifyLyxBalance()
 * - verifyLSP7Balance()
 * - verifyLSP8Ownership()
 * - verifyFollowerRequirements()
 * - verifyTokenRequirements()
 * - verifyPostGatingRequirements()
 */

/**
 * Verify multi-category gating requirements (supports both UP and Ethereum)
 * @deprecated - Replaced with pre-verification system in Phase 1
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function verifyMultiCategoryGatingRequirements(
  challenge: VerificationChallenge,
  postSettings: PostSettings
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Get all active gating categories
    const categories = SettingsUtils.getGatingCategories(postSettings);
    
    if (categories.length === 0) {
      return { valid: true }; // No gating requirements
    }

    console.log(`[verifyMultiCategoryGatingRequirements] Checking ${categories.length} gating categories`);

    // Check requireAll vs requireAny logic
    const requireAll = postSettings.responsePermissions?.requireAll || false;
    const errors: string[] = [];
    let anyValid = false;

    for (const category of categories) {
      if (!category.enabled) {
        continue; // Skip disabled categories
      }

      let categoryResult: { valid: boolean; error?: string };

      switch (category.type) {
        case 'universal_profile': {
          // Verify Universal Profile requirements
          if (!challenge.upAddress) {
            categoryResult = { valid: false, error: 'Universal Profile address required but not provided' };
            break;
          }

          categoryResult = await verifyPostGatingRequirements(challenge.upAddress, {
            responsePermissions: {
              upGating: {
                enabled: true,
                requirements: category.requirements as UPGatingRequirements
              }
            }
          });
          break;
        }

        case 'ethereum_profile': {
          // Verify Ethereum requirements
          if (!challenge.ethAddress) {
            categoryResult = { valid: false, error: 'Ethereum address required but not provided' };
            break;
          }

          categoryResult = await verifyEthereumGatingRequirements(
            challenge.ethAddress,
            category.requirements as EthereumGatingRequirements
          );
          break;
        }

        default: {
          categoryResult = { valid: false, error: `Unsupported gating category: ${category.type}` };
          break;
        }
      }

      if (categoryResult.valid) {
        anyValid = true;
        console.log(`[verifyMultiCategoryGatingRequirements] ✅ Category ${category.type} satisfied`);
        if (requireAll) {
          // In requireAll mode, continue checking other categories
          continue;
        } else {
          // In requireAny mode, one valid category is enough
          console.log(`[verifyMultiCategoryGatingRequirements] ✅ Sufficient for requireAny mode`);
          return { valid: true };
        }
      } else {
        console.log(`[verifyMultiCategoryGatingRequirements] ❌ Category ${category.type} failed: ${categoryResult.error}`);
        errors.push(`${category.type}: ${categoryResult.error}`);
        if (requireAll) {
          // If requireAll, any failure means overall failure
          console.log(`[verifyMultiCategoryGatingRequirements] ❌ RequireAll mode failed due to ${category.type}`);
          return { valid: false, error: categoryResult.error };
        }
        // In requireAny mode, continue checking other categories
      }
    }

    if (requireAll && anyValid) {
      // All categories passed in requireAll mode
      console.log(`[verifyMultiCategoryGatingRequirements] ✅ All categories satisfied (requireAll mode)`);
      return { valid: true };
    }

    if (!requireAll && !anyValid) {
      // No categories passed in requireAny mode
      console.log(`[verifyMultiCategoryGatingRequirements] ❌ No categories satisfied (requireAny mode)`);
      return { valid: false, error: `Requirements not met: ${errors.join('; ')}` };
    }

    return { valid: true };

  } catch (error) {
    console.error('[verifyMultiCategoryGatingRequirements] Error verifying requirements:', error);
    return { valid: false, error: 'Failed to verify gating requirements' };
  }
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

    const { board_id, settings, community_id } = postBoardResult.rows[0];
    
    // Verify post belongs to user's community
    if (community_id !== userCommunityId) {
      console.warn(`[API GET /api/posts/${postId}/comments] User ${userId} from community ${userCommunityId} attempted to access post from community ${community_id}`);
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

// POST a new comment (protected and permission-checked + UP gating verification)
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
      community_id, 
      board_name 
    } = postBoardResult.rows[0];
    
    // Verify post belongs to user's community
    if (community_id !== userCommunityId) {
      console.warn(`[API POST /api/posts/${postId}/comments] User ${user.sub} from community ${userCommunityId} attempted to comment on post from community ${community_id}`);
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const boardSettings = typeof board_settings === 'string' ? JSON.parse(board_settings) : board_settings;
    
    // Check board access permissions
    if (!canUserAccessBoard(userRoles, boardSettings, isAdmin)) {
      console.warn(`[API POST /api/posts/${postId}/comments] User ${user.sub} attempted to comment on restricted board ${board_id}`);
      return NextResponse.json({ error: 'You do not have permission to comment on this post' }, { status: 403 });
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
        // Check for valid pre-verifications
        const verificationResult = await query(
          `SELECT category_type, verification_status, expires_at 
           FROM pre_verifications 
           WHERE user_id = $1 AND post_id = $2 AND expires_at > NOW() AND verification_status = 'verified'`,
          [user.sub, postId]
        );

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
            // Add community context for Telegram notifications
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
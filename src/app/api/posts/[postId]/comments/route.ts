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
  TOKEN_FUNCTION_SELECTORS,
  TokenVerificationResult
} from '@/lib/verification';
import { SettingsUtils, PostSettings, TokenRequirement, FollowerRequirement } from '@/types/settings';

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
 */
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
 * Verify LYX balance requirement using raw RPC calls
 * 
 * Uses eth_getBalance to check the Universal Profile's native LYX balance
 * against the minimum requirement set in the post's gating settings.
 */
async function verifyLyxBalance(
  upAddress: string, 
  minBalance: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Get the Universal Profile's LYX balance using raw RPC call
    const balanceHex = await rawLuksoCall('eth_getBalance', [upAddress, 'latest']);
    
    // Convert hex balance to BigNumber for precise comparison (avoids floating point issues)
    const balance = ethers.BigNumber.from(balanceHex);
    const minBalanceBN = ethers.BigNumber.from(minBalance);
    
    if (balance.lt(minBalanceBN)) {
      const balanceEth = ethers.utils.formatEther(balance);
      const minBalanceEth = ethers.utils.formatEther(minBalance);
      return { 
        valid: false, 
        error: `Insufficient LYX balance. Required: ${minBalanceEth} LYX, Current: ${balanceEth} LYX` 
      };
    }

    console.log(`[verifyLyxBalance] Balance check passed: ${ethers.utils.formatEther(balance)} LYX >= ${ethers.utils.formatEther(minBalance)} LYX`);
    return { valid: true };

  } catch (error) {
    console.error('[verifyLyxBalance] Raw RPC balance check failed:', error);
    return { 
      valid: false, 
      error: 'Unable to verify LYX balance. Please check your connection and try again.' 
    };
  }
}

/**
 * Verify LSP7 token balance requirement using raw RPC calls
 * 
 * LSP7 tokens are fungible tokens (like ERC20) with balanceOf(address) function
 */
async function verifyLSP7Balance(
  upAddress: string,
  requirement: TokenRequirement
): Promise<TokenVerificationResult> {
  try {
    console.log(`[verifyLSP7Balance] Checking LSP7 token ${requirement.contractAddress} for ${upAddress}`);

    // Manual ABI encoding for balanceOf(address) call
    const balanceOfSelector = TOKEN_FUNCTION_SELECTORS.LSP7_BALANCE_OF;
    const addressParam = upAddress.slice(2).padStart(64, '0'); // Remove 0x and pad to 32 bytes
    const callData = balanceOfSelector + addressParam;

    // Call balanceOf on the LSP7 token contract
    const balanceHex = await rawLuksoCall('eth_call', [
      {
        to: requirement.contractAddress,
        data: callData
      },
      'latest'
    ]);

    // Convert hex balance to BigNumber for comparison
    const balance = ethers.BigNumber.from(balanceHex);
    const minBalance = ethers.BigNumber.from(requirement.minAmount);

    if (balance.lt(minBalance)) {
      // Format balance for user-friendly error message
      const balanceFormatted = ethers.utils.formatUnits(balance, 18); // LSP7 typically uses 18 decimals
      const minBalanceFormatted = ethers.utils.formatUnits(minBalance, 18);
      
      return {
        valid: false,
        error: `Insufficient ${requirement.symbol || requirement.name} balance. Required: ${minBalanceFormatted}, Current: ${balanceFormatted}`,
        balance: balance.toString()
      };
    }

    console.log(`[verifyLSP7Balance] Token balance check passed: ${ethers.utils.formatUnits(balance, 18)} >= ${ethers.utils.formatUnits(minBalance, 18)}`);
    return { 
      valid: true,
      balance: balance.toString()
    };

  } catch (error) {
    console.error(`[verifyLSP7Balance] Failed to verify LSP7 token ${requirement.contractAddress}:`, error);
    return {
      valid: false,
      error: `Unable to verify ${requirement.symbol || requirement.name} balance. Please check your connection and try again.`,
    };
  }
}

/**
 * Verify LSP8 NFT ownership requirement using raw RPC calls
 * 
 * LSP8 tokens are NFTs (like ERC721) with balanceOf(address) function
 * For now, we check if user owns ANY NFT from the collection (balanceOf > 0)
 */
async function verifyLSP8Ownership(
  upAddress: string,
  requirement: TokenRequirement
): Promise<TokenVerificationResult> {
  try {
    console.log(`[verifyLSP8Ownership] Checking LSP8 NFT collection ${requirement.contractAddress} for ${upAddress}`);

    // Manual ABI encoding for balanceOf(address) call (same as LSP7)
    const balanceOfSelector = TOKEN_FUNCTION_SELECTORS.LSP8_BALANCE_OF;
    const addressParam = upAddress.slice(2).padStart(64, '0'); // Remove 0x and pad to 32 bytes
    const callData = balanceOfSelector + addressParam;

    // Call balanceOf on the LSP8 NFT contract
    const balanceHex = await rawLuksoCall('eth_call', [
      {
        to: requirement.contractAddress,
        data: callData
      },
      'latest'
    ]);

    // Convert hex balance to number (for NFTs, this is the count of tokens owned)
    const nftCount = ethers.BigNumber.from(balanceHex);
    const minRequired = ethers.BigNumber.from(requirement.minAmount || '1'); // Default to 1 NFT if not specified

    if (nftCount.lt(minRequired)) {
      return {
        valid: false,
        error: `Insufficient ${requirement.symbol || requirement.name} NFTs. Required: ${minRequired.toString()}, Current: ${nftCount.toString()}`,
        balance: nftCount.toString()
      };
    }

    console.log(`[verifyLSP8Ownership] NFT ownership check passed: owns ${nftCount.toString()} NFTs >= ${minRequired.toString()} required`);
    return {
      valid: true,
      balance: nftCount.toString()
    };

  } catch (error) {
    console.error(`[verifyLSP8Ownership] Failed to verify LSP8 NFT ${requirement.contractAddress}:`, error);
    return {
      valid: false,
      error: `Unable to verify ${requirement.symbol || requirement.name} NFT ownership. Please check your connection and try again.`,
    };
  }
}

/**
 * Verify LSP26 follower requirements using proper ethers.js ABI encoding
 */
async function verifyFollowerRequirements(
  upAddress: string,
  requirements: FollowerRequirement[]
): Promise<{ valid: boolean; error?: string }> {
  try {
    console.log(`[verifyFollowerRequirements] Checking ${requirements.length} follower requirements for ${upAddress}`);

    const LSP26_REGISTRY_ADDRESS = '0xf01103E5a9909Fc0DBe8166dA7085e0285daDDcA';
    
    // Use proper ethers.js Interface for ABI encoding
    const LSP26_ABI = [
      'function followerCount(address addr) view returns (uint256)',
      'function isFollowing(address follower, address addr) view returns (bool)'
    ];
    const iface = new ethers.utils.Interface(LSP26_ABI);

    for (const requirement of requirements) {
      let callData: string;
      let isValid = false;

      switch (requirement.type) {
        case 'minimum_followers': {
          // Call followerCount(address) on LSP26 registry using proper ABI encoding
          callData = iface.encodeFunctionData('followerCount', [upAddress]);
          
          const followerCountHex = await rawLuksoCall('eth_call', [
            {
              to: LSP26_REGISTRY_ADDRESS,
              data: callData
            },
            'latest'
          ]);

          // Decode the result using ethers
          const [followerCount] = iface.decodeFunctionResult('followerCount', followerCountHex as string);
          const followerCountNum = followerCount.toNumber();
          const requiredCount = parseInt(requirement.value, 10);
          
          isValid = followerCountNum >= requiredCount;
          
          if (!isValid) {
            return {
              valid: false,
              error: `Insufficient followers. Required: ${requiredCount}, Current: ${followerCountNum}`
            };
          }
          
          console.log(`[verifyFollowerRequirements] Follower count check passed: ${followerCountNum} >= ${requiredCount}`);
          break;
        }

        case 'followed_by': {
          // Call isFollowing(followerAddress, targetAddress) - check if requirement.value follows upAddress
          callData = iface.encodeFunctionData('isFollowing', [requirement.value, upAddress]);
          
          const isFollowedByHex = await rawLuksoCall('eth_call', [
            {
              to: LSP26_REGISTRY_ADDRESS,
              data: callData
            },
            'latest'
          ]);

          // Decode the boolean result
          const [isFollowedByResult] = iface.decodeFunctionResult('isFollowing', isFollowedByHex as string);
          isValid = Boolean(isFollowedByResult);
          
          if (!isValid) {
            return {
              valid: false,
              error: `Not followed by required profile: ${requirement.value.slice(0, 6)}...${requirement.value.slice(-4)}`
            };
          }
          
          console.log(`[verifyFollowerRequirements] Followed-by check passed: ${requirement.value} follows ${upAddress}`);
          break;
        }

        case 'following': {
          // Call isFollowing(followerAddress, targetAddress) - check if upAddress follows requirement.value
          callData = iface.encodeFunctionData('isFollowing', [upAddress, requirement.value]);
          
          const isFollowingHex = await rawLuksoCall('eth_call', [
            {
              to: LSP26_REGISTRY_ADDRESS,
              data: callData
            },
            'latest'
          ]);

          // Decode the boolean result
          const [isFollowingResult] = iface.decodeFunctionResult('isFollowing', isFollowingHex as string);
          isValid = Boolean(isFollowingResult);
          
          if (!isValid) {
            return {
              valid: false,
              error: `Not following required profile: ${requirement.value.slice(0, 6)}...${requirement.value.slice(-4)}`
            };
          }
          
          console.log(`[verifyFollowerRequirements] Following check passed: ${upAddress} follows ${requirement.value}`);
          break;
        }

        default:
          return {
            valid: false,
            error: `Unknown follower requirement type: ${requirement.type}`
          };
      }
    }

    console.log(`[verifyFollowerRequirements] All ${requirements.length} follower requirements met`);
    return { valid: true };

  } catch (error) {
    console.error('[verifyFollowerRequirements] Error verifying follower requirements:', error);
    return { 
      valid: false, 
      error: 'Failed to verify follower requirements. Please check your connection and try again.' 
    };
  }
}

/**
 * Verify token requirements for both LSP7 and LSP8 tokens
 */
async function verifyTokenRequirements(
  upAddress: string,
  requirements: TokenRequirement[]
): Promise<{ valid: boolean; error?: string }> {
  try {
    console.log(`[verifyTokenRequirements] Checking ${requirements.length} token requirements for ${upAddress}`);

    // Process all token requirements in parallel for better performance
    const verificationPromises = requirements.map(async (requirement) => {
      if (requirement.tokenType === 'LSP7') {
        return await verifyLSP7Balance(upAddress, requirement);
      } else if (requirement.tokenType === 'LSP8') {
        return await verifyLSP8Ownership(upAddress, requirement);
      } else {
        return {
          valid: false,
          error: `Unsupported token type: ${requirement.tokenType}. Only LSP7 and LSP8 are supported.`
        };
      }
    });

    const results = await Promise.all(verificationPromises);

    // Check if all requirements are met
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (!result.valid) {
        const requirement = requirements[i];
        console.log(`[verifyTokenRequirements] Token requirement failed: ${requirement.symbol || requirement.name} - ${result.error}`);
        return { valid: false, error: result.error };
      }
    }

    console.log(`[verifyTokenRequirements] All ${requirements.length} token requirements met`);
    return { valid: true };

  } catch (error) {
    console.error('[verifyTokenRequirements] Error verifying token requirements:', error);
    return { valid: false, error: 'Failed to verify token requirements' };
  }
}

/**
 * Verify all post gating requirements
 */
async function verifyPostGatingRequirements(
  upAddress: string,
  postSettings: PostSettings
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Check if gating is enabled
    if (!SettingsUtils.hasUPGating(postSettings)) {
      return { valid: true }; // No gating requirements
    }

    const requirements = SettingsUtils.getUPGatingRequirements(postSettings);
    if (!requirements) {
      return { valid: true }; // No specific requirements
    }

    // Verify LYX balance requirement
    if (requirements.minLyxBalance) {
      const lyxResult = await verifyLyxBalance(upAddress, requirements.minLyxBalance);
      if (!lyxResult.valid) {
        return lyxResult;
      }
    }

    // Verify token requirements (LSP7/LSP8)
    if (requirements.requiredTokens && requirements.requiredTokens.length > 0) {
      const tokenResult = await verifyTokenRequirements(upAddress, requirements.requiredTokens);
      if (!tokenResult.valid) {
        return tokenResult;
      }
    }

    // Verify follower requirements (LSP26)
    if (requirements.followerRequirements && requirements.followerRequirements.length > 0) {
      const followerResult = await verifyFollowerRequirements(upAddress, requirements.followerRequirements);
      if (!followerResult.valid) {
        return followerResult;
      }
    }

    return { valid: true };

  } catch (error) {
    console.error('[verifyPostGatingRequirements] Error verifying requirements:', error);
    return { valid: false, error: 'Failed to verify post requirements' };
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
    // SECURITY: First, check if user can access the board where this post belongs and get post settings
    const postBoardResult = await query(
      `SELECT p.board_id, p.title as post_title, p.settings as post_settings, 
              b.settings as board_settings, b.community_id, b.name as board_name
       FROM posts p 
       JOIN boards b ON p.board_id = b.id 
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
    const { content, parent_comment_id, challenge }: { 
      content: string;
      parent_comment_id?: number;
      challenge?: VerificationChallenge;
    } = body;

    if (!content || String(content).trim() === '') {
      return NextResponse.json({ error: 'Comment content cannot be empty' }, { status: 400 });
    }

    // Parse post settings and check for UP gating
    const postSettings: PostSettings = typeof post_settings === 'string' 
      ? JSON.parse(post_settings) 
      : (post_settings || {});

    // ⭐ UNIVERSAL PROFILE GATING VERIFICATION ⭐
    if (SettingsUtils.hasUPGating(postSettings)) {
      console.log(`[API POST /api/posts/${postId}/comments] Post has UP gating enabled, verifying challenge...`);
      
      if (!challenge) {
        return NextResponse.json({ 
          error: 'This post requires Universal Profile verification to comment. Please connect your UP and try again.' 
        }, { status: 403 });
      }

      // Verify challenge format and basic validation
      const formatValidation = ChallengeUtils.validateChallengeFormat(challenge);
      if (!formatValidation.valid) {
        return NextResponse.json({ 
          error: `Invalid challenge: ${formatValidation.error}` 
        }, { status: 400 });
      }

      // Verify challenge is for this post
      if (challenge.postId !== postId) {
        return NextResponse.json({ 
          error: 'Challenge post ID mismatch' 
        }, { status: 400 });
      }

      // Verify and consume nonce (prevents replay attacks)
      const nonceValidation = NonceStore.validateAndConsume(
        challenge.nonce, 
        challenge.upAddress, 
        postId
      );

      if (!nonceValidation.valid) {
        return NextResponse.json({ 
          error: `Challenge validation failed: ${nonceValidation.error}` 
        }, { status: 400 });
      }

      // Verify UP signature using ERC-1271
      const signatureValidation = await verifyUPSignature(challenge.upAddress, challenge);
      if (!signatureValidation.valid) {
        return NextResponse.json({ 
          error: `Signature verification failed: ${signatureValidation.error}` 
        }, { status: 401 });
      }

             // Verify post requirements (LYX balance, tokens, etc.)
       const requirementValidation = await verifyPostGatingRequirements(
         challenge.upAddress, 
         postSettings
       );

      if (!requirementValidation.valid) {
        return NextResponse.json({ 
          error: `Requirements not met: ${requirementValidation.error}` 
        }, { status: 403 });
      }

      console.log(`[API POST /api/posts/${postId}/comments] UP gating verification successful for ${challenge.upAddress}`);
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
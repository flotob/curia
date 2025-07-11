import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { ethers } from 'ethers';

/**
 * POST /api/auth/verify-signature
 * 
 * Verifies wallet signatures and creates/updates user accounts and sessions
 * Now includes backend blockchain verification like the main forum app
 */

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// ===== BLOCKCHAIN VERIFICATION FUNCTIONS =====
// Adapted from main forum app's proven verification patterns

/**
 * Verify ENS domain exists for address and matches claimed name (adapted from main forum app)
 */
async function verifyENSBlockchainState(ethAddress: string, claimedEnsName?: string): Promise<{ valid: boolean; error?: string; verifiedEnsName?: string }> {
  try {
    console.log(`[verifyENSBlockchainState] Checking ENS for ${ethAddress}, claimed: ${claimedEnsName}`);

    // ENS Registry contract address on mainnet
    const ENS_REGISTRY = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e';
    
    // Calculate reverse node hash: address.addr.reverse
    const normalizedAddress = ethAddress.toLowerCase().replace('0x', '');
    const reverseNode = namehash(`${normalizedAddress}.addr.reverse`);

    // Get resolver for the reverse record
    const resolverData = await rawEthereumCall('eth_call', [
      {
        to: ENS_REGISTRY,
        data: `0x0178b8bf${reverseNode.slice(2)}` // resolver(bytes32)
      },
      'latest'
    ]);

    const resolverAddress = `0x${(resolverData as string).slice(-40)}`;
    
    // Check if resolver is set (not zero address)
    if (resolverAddress === '0x0000000000000000000000000000000000000000') {
      return {
        valid: false,
        error: 'No ENS name found for this address'
      };
    }

    // Get the name from the resolver
    const nameData = await rawEthereumCall('eth_call', [
      {
        to: resolverAddress,
        data: `0x691f3431${reverseNode.slice(2)}` // name(bytes32)
      },
      'latest'
    ]);

    // Decode the name from ABI-encoded string
    let actualEnsName: string;
    try {
      const decoded = ethers.utils.defaultAbiCoder.decode(['string'], nameData as string);
      actualEnsName = decoded[0];
    } catch {
      return {
        valid: false,
        error: 'No ENS name found for this address'
      };
    }

    if (!actualEnsName || !actualEnsName.trim()) {
      return {
        valid: false,
        error: 'No ENS name found for this address'
      };
    }

    // 🚀 CRITICAL: Verify claimed ENS name matches actual ENS name  
    if (claimedEnsName && claimedEnsName.toLowerCase() !== actualEnsName.toLowerCase()) {
      return {
        valid: false,
        error: `ENS name mismatch: you claimed "${claimedEnsName}" but address resolves to "${actualEnsName}"`
      };
    }

    console.log(`[verifyENSBlockchainState] ✅ ENS verification passed: ${actualEnsName}`);
    return { 
      valid: true, 
      verifiedEnsName: actualEnsName 
    };

  } catch (error) {
    console.error('[verifyENSBlockchainState] Error:', error);
    return { valid: false, error: 'Failed to verify ENS requirements' };
  }
}

/**
 * Verify Universal Profile metadata exists for address (adapted from main forum app)
 */
async function verifyUPBlockchainState(upAddress: string): Promise<{ valid: boolean; error?: string; verifiedProfileData?: { name: string } }> {
  try {
    console.log(`[verifyUPBlockchainState] Checking UP metadata for ${upAddress}`);

    // Use same validation pattern as main forum app
    const profileData = await fetchUPProfileData(upAddress);
    
    if (!profileData) {
      return {
        valid: false,
        error: 'No Universal Profile metadata found for this address'
      };
    }

    // Check for actual profile metadata (not just formatted address)
    const hasValidMetadata = !!(
      profileData.name && 
      profileData.name.trim() && 
      profileData.name !== `${upAddress.slice(0, 6)}...${upAddress.slice(-4)}`
    );

    if (hasValidMetadata && profileData.name) {
      console.log(`[verifyUPBlockchainState] ✅ UP verification passed with metadata: ${profileData.name}`);
      return { 
        valid: true,
        verifiedProfileData: { name: profileData.name }
      };
    } else {
      return {
        valid: false,
        error: 'This address does not contain valid Universal Profile metadata (LSP3)'
      };
    }

  } catch (error) {
    console.error('[verifyUPBlockchainState] Error:', error);
    return { valid: false, error: 'Failed to verify Universal Profile requirements' };
  }
}

// ===== HELPER FUNCTIONS =====

/**
 * Calculate ENS namehash (adapted from main forum app)
 */
function namehash(name: string): string {
  let node = '0x0000000000000000000000000000000000000000000000000000000000000000';
  
  if (name) {
    const labels = name.split('.');
    for (let i = labels.length - 1; i >= 0; i--) {
      const labelHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(labels[i]));
      node = ethers.utils.keccak256(ethers.utils.concat([node, labelHash]));
    }
  }
  
  return node;
}

/**
 * Raw Ethereum RPC call (adapted from main forum app)
 */
async function rawEthereumCall(method: string, params: unknown[]): Promise<unknown> {
  const ETH_RPC_URLS = [
    process.env.NEXT_PUBLIC_ETHEREUM_MAINNET_RPC_URL,
    'https://eth.llamarpc.com',
    'https://rpc.ankr.com/eth'
  ].filter(Boolean) as string[];

  const body = {
    jsonrpc: "2.0",
    id: 1,
    method,
    params,
  };

  for (const rpcUrl of ETH_RPC_URLS) {
    try {
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

      return result;
    } catch (error) {
      console.warn(`[rawEthereumCall] Failed ${method} on ${rpcUrl}:`, error);
    }
  }
  
  throw new Error(`All Ethereum RPC endpoints failed for ${method}`);
}

/**
 * Fetch UP profile data using simplified version
 */
async function fetchUPProfileData(upAddress: string): Promise<{ name?: string } | null> {
  try {
    // Use the simplified UP profile fetcher from our lib
    const { getUPSocialProfile } = await import('@/lib/upProfile');
    const profile = await getUPSocialProfile(upAddress);
    
    if (profile.error) {
      return null;
    }

    return {
      name: profile.displayName
    };
  } catch (error) {
    console.error('[fetchUPProfileData] Error:', error);
    return null;
  }
}

/**
 * Validate challenge timestamp to prevent replay attacks
 */
function validateChallengeTimestamp(message: string, challenge: string): { valid: boolean; error?: string } {
  try {
    // Extract timestamp from message
    const timestampMatch = message.match(/Timestamp: ([^\n]+)/);
    if (!timestampMatch) {
      return {
        valid: false,
        error: 'No timestamp found in signed message'
      };
    }

    const timestampStr = timestampMatch[1];
    const messageTimestamp = new Date(timestampStr);
    
    // Validate timestamp format
    if (isNaN(messageTimestamp.getTime())) {
      return {
        valid: false,
        error: 'Invalid timestamp format in message'
      };
    }

    // Check timestamp is recent (within 5 minutes)
    const now = new Date();
    const timeDifferenceMs = now.getTime() - messageTimestamp.getTime();
    const maxAgeMs = 5 * 60 * 1000; // 5 minutes
    
    if (timeDifferenceMs > maxAgeMs) {
      return {
        valid: false,
        error: `Challenge expired. Message is ${Math.round(timeDifferenceMs / 1000)} seconds old (max: 300 seconds)`
      };
    }

    // Check timestamp isn't from the future (clock skew protection)
    if (timeDifferenceMs < -60000) { // 1 minute tolerance
      return {
        valid: false,
        error: 'Challenge timestamp is too far in the future'
      };
    }

    // Validate challenge format (32 hex characters)
    if (!/^[a-fA-F0-9]{32}$/.test(challenge)) {
      return {
        valid: false,
        error: 'Invalid challenge format'
      };
    }

    // Extract challenge from message and verify it matches
    const challengeMatch = message.match(/Challenge: ([^\n]+)/);
    if (!challengeMatch || challengeMatch[1] !== challenge) {
      return {
        valid: false,
        error: 'Challenge in message does not match provided challenge'
      };
    }

    console.log(`[validateChallengeTimestamp] ✅ Challenge validation passed (age: ${Math.round(timeDifferenceMs / 1000)}s)`);
    return { valid: true };

  } catch (error) {
    console.error('[validateChallengeTimestamp] Error:', error);
    return {
      valid: false,
      error: 'Challenge validation failed due to internal error'
    };
  }
}

interface VerifySignatureRequest {
  identityType: 'ens' | 'universal_profile';
  walletAddress?: string;
  ensName?: string;
  upAddress?: string;
  challenge: string;
  signature: string;
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: VerifySignatureRequest = await request.json();
    const { 
      identityType, 
      walletAddress, 
      ensName, 
      upAddress, 
      challenge, 
      signature, 
      message 
    } = body;

    // Validate required fields
    if (!challenge || !signature || !message) {
      return NextResponse.json(
        { error: 'challenge, signature, and message are required' },
        { status: 400 }
      );
    }

    // 🚀 CHALLENGE VALIDATION: Timestamp-based replay protection
    const challengeValidation = validateChallengeTimestamp(message, challenge);
    if (!challengeValidation.valid) {
      return NextResponse.json(
        { error: `Challenge validation failed: ${challengeValidation.error}` },
        { status: 400 }
      );
    }

    // Verify the signature
    const signerAddress = await verifySignature(message, signature);
    
    if (!signerAddress) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Validate that the signer matches the claimed identity
    if (identityType === 'ens' && walletAddress) {
      if (signerAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        return NextResponse.json(
          { error: 'Signature does not match wallet address' },
          { status: 401 }
        );
      }

      // 🚀 BACKEND BLOCKCHAIN VERIFICATION: Verify ENS domain actually exists and matches claim
      console.log(`[verify-signature] Verifying ENS domain exists for ${signerAddress}`);
      const ensVerification = await verifyENSBlockchainState(signerAddress, ensName);
      if (!ensVerification.valid) {
        return NextResponse.json(
          { error: `ENS verification failed: ${ensVerification.error}` },
          { status: 400 }
        );
      }
      console.log(`[verify-signature] ✅ ENS verification passed: ${ensVerification.verifiedEnsName}`);

    } else if (identityType === 'universal_profile' && upAddress) {
      if (signerAddress.toLowerCase() !== upAddress.toLowerCase()) {
        return NextResponse.json(
          { error: 'Signature does not match Universal Profile address' },
          { status: 401 }
        );
      }

      // 🚀 BACKEND BLOCKCHAIN VERIFICATION: Verify UP metadata actually exists
      console.log(`[verify-signature] Verifying UP metadata exists for ${signerAddress}`);
      const upVerification = await verifyUPBlockchainState(signerAddress);
      if (!upVerification.valid) {
        return NextResponse.json(
          { error: `Universal Profile verification failed: ${upVerification.error}` },
          { status: 400 }
        );
      }
      console.log(`[verify-signature] ✅ UP verification passed for ${signerAddress}`);
    }

    // 🚀 CRITICAL: Use verified data instead of claimed data
    let verifiedEnsName = ensName;
    let verifiedUpProfileData = undefined;
    
    // Extract verified data from blockchain verification
    if (identityType === 'ens') {
      const ensVerification = await verifyENSBlockchainState(signerAddress, ensName);
      verifiedEnsName = ensVerification.verifiedEnsName || ensName;
    } else if (identityType === 'universal_profile') {
      const upVerification = await verifyUPBlockchainState(signerAddress);
      verifiedUpProfileData = upVerification.verifiedProfileData;
    }

    // 🚀 ATOMIC TRANSACTION: Create user and session together 
    const { user, session } = await createUserAndSession({
      identityType,
      walletAddress: identityType === 'ens' ? walletAddress : undefined,
      ensName: verifiedEnsName,
      upAddress: identityType === 'universal_profile' ? upAddress : undefined,
      verifiedUpProfileData,
      signerAddress,
      signedMessage: message,
      signature
    });

    const responseData = {
      user: {
        user_id: user.user_id,
        name: user.name,
        profile_picture_url: user.profile_picture_url,
        identity_type: user.identity_type,
        wallet_address: user.wallet_address,
        ens_domain: user.ens_domain,
        up_address: user.up_address,
        is_anonymous: user.is_anonymous
      },
      token: session.session_token,
      expiresAt: session.expires_at,
      authMethod: identityType
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('[verify-signature] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Verify signature and return signer address
async function verifySignature(message: string, signature: string): Promise<string | null> {
  try {
    const signerAddress = ethers.utils.verifyMessage(message, signature);
    return signerAddress;
  } catch (error) {
    console.error('[verifySignature] Error:', error);
    return null;
  }
}

// Generate secure session token
function generateSessionToken(): string {
  const array = new Uint8Array(32);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // Fallback for Node.js environment
    const crypto = require('crypto');
    const buffer = crypto.randomBytes(32);
    for (let i = 0; i < 32; i++) {
      array[i] = buffer[i];
    }
  }
  
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// 🚀 ATOMIC TRANSACTION: Create user and session together
async function createUserAndSession(params: {
  identityType: 'ens' | 'universal_profile';
  walletAddress?: string;
  ensName?: string;
  upAddress?: string;
  verifiedUpProfileData?: { name: string };
  signerAddress: string;
  signedMessage: string;
  signature: string;
}) {
  const { 
    identityType, 
    walletAddress, 
    ensName, 
    upAddress, 
    verifiedUpProfileData,
    signerAddress,
    signedMessage,
    signature
  } = params;

  // Start database transaction
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Generate user ID and name
    let userId: string;
    let name: string;
    
    if (identityType === 'ens') {
      userId = `ens:${ensName}`;
      name = ensName || `User ${walletAddress?.slice(-6)}`;
    } else {
      userId = `up:${upAddress}`;
      name = verifiedUpProfileData?.name || `UP ${upAddress?.slice(-6)}`;
    }

    // Check if user exists
    const existingUserQuery = `SELECT * FROM users WHERE user_id = $1`;
    const existingUser = await client.query(existingUserQuery, [userId]);

    let user;
    if (existingUser.rows.length > 0) {
      // Update existing user
      const updateQuery = `
        UPDATE users SET 
          wallet_address = $2,
          ens_domain = $3,
          up_address = $4,
          last_auth_at = NOW(),
          auth_expires_at = NOW() + INTERVAL '30 days',
          updated_at = NOW()
        WHERE user_id = $1
        RETURNING *
      `;
      
      const result = await client.query(updateQuery, [
        userId,
        identityType === 'ens' ? walletAddress : null,
        identityType === 'ens' ? ensName : null,
        identityType === 'universal_profile' ? upAddress : null
      ]);
      
      user = result.rows[0];
    } else {
      // Create new user
      const insertQuery = `
        INSERT INTO users (
          user_id,
          name,
          identity_type,
          wallet_address,
          ens_domain,
          up_address,
          is_anonymous,
          auth_expires_at,
          last_auth_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, 
          NOW() + INTERVAL '30 days',
          NOW()
        )
        RETURNING *
      `;
      
      const result = await client.query(insertQuery, [
        userId,
        name,
        identityType,
        identityType === 'ens' ? walletAddress : null,
        identityType === 'ens' ? ensName : null,
        identityType === 'universal_profile' ? upAddress : null,
        false
      ]);
      
      user = result.rows[0];
    }

    // Deactivate existing sessions for this user
    await client.query(
      'UPDATE authentication_sessions SET is_active = false WHERE user_id = $1',
      [userId]
    );

    // Create new session
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const sessionQuery = `
      INSERT INTO authentication_sessions (
        user_id,
        session_token,
        identity_type,
        wallet_address,
        signed_message,
        signature,
        expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const sessionResult = await client.query(sessionQuery, [
      userId,
      sessionToken,
      identityType,
      signerAddress,
      signedMessage,
      signature,
      expiresAt
    ]);

    const session = sessionResult.rows[0];

    // Commit transaction
    await client.query('COMMIT');
    
    console.log(`[createUserAndSession] ✅ User and session created atomically: ${userId}`);
    return { user, session };

  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('[createUserAndSession] Transaction failed, rolled back:', error);
    throw error;
  } finally {
    // Release client back to pool
    client.release();
  }
} 
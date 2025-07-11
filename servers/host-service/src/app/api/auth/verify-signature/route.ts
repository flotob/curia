import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { ethers } from 'ethers';

/**
 * POST /api/auth/verify-signature
 * 
 * Verifies wallet signatures and creates/updates user accounts and sessions
 */

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

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
    } else if (identityType === 'universal_profile' && upAddress) {
      if (signerAddress.toLowerCase() !== upAddress.toLowerCase()) {
        return NextResponse.json(
          { error: 'Signature does not match Universal Profile address' },
          { status: 401 }
        );
      }
    }

    // Create or update user account
    const user = await createOrUpdateUser({
      identityType,
      walletAddress: identityType === 'ens' ? walletAddress : undefined,
      ensName,
      upAddress: identityType === 'universal_profile' ? upAddress : undefined
    });

    // Create authentication session
    const session = await createAuthSession({
      userId: user.user_id,
      identityType,
      walletAddress: signerAddress,
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

// Create or update user account
async function createOrUpdateUser(params: {
  identityType: 'ens' | 'universal_profile';
  walletAddress?: string;
  ensName?: string;
  upAddress?: string;
}) {
  const { identityType, walletAddress, ensName, upAddress } = params;

  // Generate user ID based on identity type
  let userId: string;
  let name: string;
  
  if (identityType === 'ens') {
    userId = `ens:${ensName}`;
    name = ensName || `User ${walletAddress?.slice(-6)}`;
  } else {
    userId = `up:${upAddress}`;
    name = `UP ${upAddress?.slice(-6)}`;
  }

  // Try to fetch existing user
  const existingUserQuery = `
    SELECT * FROM users WHERE user_id = $1
  `;
  const existingUser = await pool.query(existingUserQuery, [userId]);

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
    
    const result = await pool.query(updateQuery, [
      userId,
      identityType === 'ens' ? walletAddress : null,
      identityType === 'ens' ? ensName : null,
      identityType === 'universal_profile' ? upAddress : null
    ]);
    
    return result.rows[0];
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
    
    const result = await pool.query(insertQuery, [
      userId,
      name,
      identityType,
      identityType === 'ens' ? walletAddress : null,
      identityType === 'ens' ? ensName : null,
      identityType === 'universal_profile' ? upAddress : null,
      false
    ]);
    
    return result.rows[0];
  }
}

// Create authentication session
async function createAuthSession(params: {
  userId: string;
  identityType: 'ens' | 'universal_profile';
  walletAddress: string;
  signedMessage: string;
  signature: string;
}) {
  const { userId, identityType, walletAddress, signedMessage, signature } = params;

  // Deactivate existing sessions for this user
  await pool.query(
    'UPDATE authentication_sessions SET is_active = false WHERE user_id = $1',
    [userId]
  );

  // Generate session token
  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  const insertQuery = `
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

  const result = await pool.query(insertQuery, [
    userId,
    sessionToken,
    identityType,
    walletAddress,
    signedMessage,
    signature,
    expiresAt
  ]);

  return result.rows[0];
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
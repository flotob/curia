import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

/**
 * POST /api/auth/validate-session
 * 
 * Validates a session token and returns user data if valid
 */

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

interface ValidateSessionRequest {
  sessionToken: string;
  origin?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ValidateSessionRequest = await request.json();
    const { sessionToken, origin } = body;

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Session token is required' },
        { status: 400 }
      );
    }

    // Validate session in database
    const sessionQuery = `
      SELECT 
        s.id,
        s.user_id,
        s.session_token,
        s.identity_type,
        s.wallet_address,
        s.expires_at,
        s.is_active,
        u.user_id,
        u.name,
        u.profile_picture_url,
        u.identity_type as user_identity_type,
        u.wallet_address as user_wallet_address,
        u.ens_domain,
        u.up_address,
        u.is_anonymous
      FROM authentication_sessions s
      JOIN users u ON s.user_id = u.user_id
      WHERE s.session_token = $1 
        AND s.is_active = true 
        AND s.expires_at > NOW()
    `;

    const sessionResult = await pool.query(sessionQuery, [sessionToken]);

    if (sessionResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    const sessionData = sessionResult.rows[0];

    // Update last accessed time
    await pool.query(
      'UPDATE authentication_sessions SET last_accessed_at = NOW() WHERE id = $1',
      [sessionData.id]
    );

    // Generate new session token for security (optional rotation)
    const newSessionToken = generateSessionToken();
    const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await pool.query(
      'UPDATE authentication_sessions SET session_token = $1, expires_at = $2 WHERE id = $3',
      [newSessionToken, newExpiresAt, sessionData.id]
    );

    // Prepare response data
    const responseData = {
      user: {
        user_id: sessionData.user_id,
        name: sessionData.name,
        profile_picture_url: sessionData.profile_picture_url,
        identity_type: sessionData.user_identity_type,
        wallet_address: sessionData.user_wallet_address,
        ens_domain: sessionData.ens_domain,
        up_address: sessionData.up_address,
        is_anonymous: sessionData.is_anonymous
      },
      token: newSessionToken,
      expiresAt: newExpiresAt.toISOString(),
      isValid: true
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('[validate-session] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to generate secure session tokens
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
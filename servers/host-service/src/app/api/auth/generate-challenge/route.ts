import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/generate-challenge
 * 
 * Generates a cryptographic challenge for wallet signature authentication
 */

interface GenerateChallengeRequest {
  identityType: 'ens' | 'universal_profile';
  walletAddress?: string;
  ensName?: string;
  upAddress?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateChallengeRequest = await request.json();
    const { identityType, walletAddress, ensName, upAddress } = body;

    // Validate required fields based on identity type
    if (identityType === 'ens' && (!walletAddress || !ensName)) {
      return NextResponse.json(
        { error: 'walletAddress and ensName are required for ENS authentication' },
        { status: 400 }
      );
    }

    if (identityType === 'universal_profile' && !upAddress) {
      return NextResponse.json(
        { error: 'upAddress is required for Universal Profile authentication' },
        { status: 400 }
      );
    }

    // Generate a unique challenge
    const challenge = generateChallenge();
    const timestamp = new Date().toISOString();
    
    // Create the message to be signed
    const message = createSigningMessage({
      identityType,
      challenge,
      timestamp,
      walletAddress,
      ensName,
      upAddress
    });

    // Store challenge temporarily (in production, use Redis or similar)
    // For now, we'll include it in the response and verify it on signature verification
    
    const responseData = {
      challenge,
      message,
      timestamp,
      expiresIn: 300, // 5 minutes
      identityType
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('[generate-challenge] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Generate a cryptographically secure challenge
function generateChallenge(): string {
  const array = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // Fallback for Node.js environment
    const crypto = require('crypto');
    const buffer = crypto.randomBytes(16);
    for (let i = 0; i < 16; i++) {
      array[i] = buffer[i];
    }
  }
  
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Create a human-readable signing message
function createSigningMessage(params: {
  identityType: string;
  challenge: string;
  timestamp: string;
  walletAddress?: string;
  ensName?: string;
  upAddress?: string;
}): string {
  const { identityType, challenge, timestamp, walletAddress, ensName, upAddress } = params;
  
  let identityInfo = '';
  if (identityType === 'ens') {
    identityInfo = `ENS: ${ensName}\nWallet: ${walletAddress}`;
  } else if (identityType === 'universal_profile') {
    identityInfo = `Universal Profile: ${upAddress}`;
  }

  return `Welcome to Curia!

By signing this message, you're securely authenticating your identity.

${identityInfo}

Challenge: ${challenge}
Timestamp: ${timestamp}

This signature only proves your identity and doesn't grant any spending permissions.`;
} 
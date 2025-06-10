/**
 * Ethereum Signature Validation API
 * 
 * Validates Ethereum signatures for message signing verification
 * Uses viem for signature validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyMessage } from 'viem';

export async function POST(request: NextRequest) {
  try {
    const { address, message, signature, chainId }: { 
      address: string; 
      message: string; 
      signature: string;
      chainId: number;
    } = await request.json();

    if (!address || !message || !signature) {
      return NextResponse.json({ 
        error: 'Missing address, message, or signature' 
      }, { status: 400 });
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ 
        error: 'Invalid Ethereum address format' 
      }, { status: 400 });
    }

    // Validate signature format
    if (!/^0x[a-fA-F0-9]{130}$/.test(signature)) {
      return NextResponse.json({ 
        error: 'Invalid signature format' 
      }, { status: 400 });
    }

    // Validate chain ID (should be Ethereum mainnet)
    if (chainId !== 1) {
      return NextResponse.json({ 
        error: 'Invalid chain ID - must be Ethereum mainnet (1)' 
      }, { status: 400 });
    }

    console.log(`[API] Validating signature for ${address}`);

    try {
      // Use viem to verify the signature
      const isValid = await verifyMessage({
        address: address as `0x${string}`,
        message,
        signature: signature as `0x${string}`
      });

      if (isValid) {
        console.log(`[API] ✅ Signature validation passed for ${address}`);
        return NextResponse.json({ valid: true });
      } else {
        console.log(`[API] ❌ Signature validation failed for ${address}`);
        return NextResponse.json({ valid: false });
      }
    } catch (verificationError) {
      console.error('[API] Signature verification error:', verificationError);
      return NextResponse.json({ 
        valid: false,
        error: 'Signature verification failed'
      });
    }

  } catch (error) {
    console.error('[API] Signature validation error:', error);
    return NextResponse.json({
      valid: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
} 
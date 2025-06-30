/**
 * Ethereum Signature Validation API
 * 
 * Validates Ethereum signatures for message signing verification
 * Uses ethers.js for signature validation to match shared verification infrastructure
 */

import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

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
      // Use ethers.js to verify the signature (consistent with shared verification infrastructure)
      const recoveredAddress = ethers.utils.verifyMessage(message, signature);
      
      if (recoveredAddress.toLowerCase() === address.toLowerCase()) {
        console.log(`[API] ✅ Signature validation passed for ${address}`);
        return NextResponse.json({ valid: true });
      } else {
        console.log(`[API] ❌ Signature validation failed for ${address} - address mismatch`);
        console.log(`[API] Expected: ${address}, Recovered: ${recoveredAddress}`);
        return NextResponse.json({ 
          valid: false,
          error: 'Signature does not match the provided address'
        });
      }
    } catch (verificationError) {
      console.error('[API] Signature verification error:', verificationError);
      return NextResponse.json({ 
        valid: false,
        error: 'Invalid signature format or signature verification failed'
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
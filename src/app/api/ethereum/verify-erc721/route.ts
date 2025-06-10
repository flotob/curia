/**
 * ERC-721 NFT Ownership Verification API
 * 
 * Verifies ERC-721 NFT ownership for a given address
 * Uses the existing verification infrastructure
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyERC721Ownership } from '@/lib/ethereum/verification';

export async function POST(request: NextRequest) {
  try {
    const { address, contractAddress, minimumCount }: { 
      address: string; 
      contractAddress: string;
      minimumCount?: number;
    } = await request.json();

    if (!address || !contractAddress) {
      return NextResponse.json({ 
        error: 'Missing address or contractAddress' 
      }, { status: 400 });
    }

    // Validate address formats
    if (!/^0x[a-fA-F0-9]{40}$/.test(address) || !/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
      return NextResponse.json({ 
        error: 'Invalid address format' 
      }, { status: 400 });
    }

    console.log(`[API] Verifying ERC-721 ownership for ${address} on contract ${contractAddress}`);

    // Use the existing verification function
    const requirement = { 
      contractAddress, 
      minimumCount: minimumCount || 1 
    };
    const result = await verifyERC721Ownership(address, requirement);

    if (result.valid) {
      console.log(`[API] ✅ ERC-721 ownership check passed`);
      return NextResponse.json({ valid: true });
    } else {
      console.log(`[API] ❌ ERC-721 ownership check failed: ${result.error}`);
      return NextResponse.json({ 
        valid: false,
        error: result.error 
      });
    }

  } catch (error) {
    console.error('[API] ERC-721 verification error:', error);
    return NextResponse.json({
      valid: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
} 
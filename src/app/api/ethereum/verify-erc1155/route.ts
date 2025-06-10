/**
 * ERC-1155 Token Balance Verification API
 * 
 * Verifies ERC-1155 token balance for a given address and token ID
 * Uses the existing verification infrastructure
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyERC1155Balance } from '@/lib/ethereum/verification';

export async function POST(request: NextRequest) {
  try {
    const { address, contractAddress, tokenId, minimum }: { 
      address: string; 
      contractAddress: string;
      tokenId: string;
      minimum: string;
    } = await request.json();

    if (!address || !contractAddress || !tokenId || !minimum) {
      return NextResponse.json({ 
        error: 'Missing address, contractAddress, tokenId, or minimum' 
      }, { status: 400 });
    }

    // Validate address formats
    if (!/^0x[a-fA-F0-9]{40}$/.test(address) || !/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
      return NextResponse.json({ 
        error: 'Invalid address format' 
      }, { status: 400 });
    }

    console.log(`[API] Verifying ERC-1155 balance for ${address} on contract ${contractAddress}, token ID ${tokenId}`);

    // Use the existing verification function
    const requirement = { 
      contractAddress, 
      tokenId,
      minimum 
    };
    const result = await verifyERC1155Balance(address, requirement);

    if (result.valid) {
      console.log(`[API] ✅ ERC-1155 balance check passed`);
      return NextResponse.json({ valid: true });
    } else {
      console.log(`[API] ❌ ERC-1155 balance check failed: ${result.error}`);
      return NextResponse.json({ 
        valid: false,
        error: result.error 
      });
    }

  } catch (error) {
    console.error('[API] ERC-1155 verification error:', error);
    return NextResponse.json({
      valid: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
} 
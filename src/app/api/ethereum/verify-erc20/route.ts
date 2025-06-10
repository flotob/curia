/**
 * ERC-20 Token Balance Verification API
 * 
 * Verifies ERC-20 token balance for a given address
 * Uses the existing verification infrastructure
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyERC20Balance } from '@/lib/ethereum/verification';

export async function POST(request: NextRequest) {
  try {
    const { address, contractAddress, minimum }: { 
      address: string; 
      contractAddress: string;
      minimum: string;
    } = await request.json();

    if (!address || !contractAddress || !minimum) {
      return NextResponse.json({ 
        error: 'Missing address, contractAddress, or minimum' 
      }, { status: 400 });
    }

    // Validate address formats
    if (!/^0x[a-fA-F0-9]{40}$/.test(address) || !/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
      return NextResponse.json({ 
        error: 'Invalid address format' 
      }, { status: 400 });
    }

    console.log(`[API] Verifying ERC-20 balance for ${address} on contract ${contractAddress}`);

    // Use the existing verification function
    const requirement = { contractAddress, minimum };
    const result = await verifyERC20Balance(address, requirement);

    if (result.valid) {
      console.log(`[API] ✅ ERC-20 balance check passed`);
      return NextResponse.json({ valid: true });
    } else {
      console.log(`[API] ❌ ERC-20 balance check failed: ${result.error}`);
      return NextResponse.json({ 
        valid: false,
        error: result.error 
      });
    }

  } catch (error) {
    console.error('[API] ERC-20 verification error:', error);
    return NextResponse.json({
      valid: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
} 
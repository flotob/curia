/**
 * Ethereum Requirements Verification API
 * 
 * Verifies all Ethereum gating requirements for a given address
 * Uses the existing verification infrastructure from lib/ethereum/verification.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyEthereumGatingRequirements } from '@/lib/ethereum/verification';
import { EthereumGatingRequirements } from '@/types/gating';

export async function POST(request: NextRequest) {
  try {
    const { address, requirements }: { 
      address: string; 
      requirements: EthereumGatingRequirements;
    } = await request.json();

    if (!address || !requirements) {
      return NextResponse.json({ 
        error: 'Missing address or requirements' 
      }, { status: 400 });
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ 
        error: 'Invalid Ethereum address format' 
      }, { status: 400 });
    }

    console.log(`[API] Verifying Ethereum requirements for ${address}`);

    // Use the existing verification function
    const result = await verifyEthereumGatingRequirements(address, requirements);

    if (result.valid) {
      console.log(`[API] ✅ Ethereum verification passed for ${address}`);
      return NextResponse.json({
        valid: true,
        missingRequirements: [],
        errors: []
      });
    } else {
      console.log(`[API] ❌ Ethereum verification failed for ${address}: ${result.error}`);
      return NextResponse.json({
        valid: false,
        missingRequirements: [result.error || 'Verification failed'],
        errors: []
      });
    }

  } catch (error) {
    console.error('[API] Ethereum verification error:', error);
    return NextResponse.json({
      valid: false,
      missingRequirements: [],
      errors: [error instanceof Error ? error.message : 'Internal server error']
    }, { status: 500 });
  }
} 
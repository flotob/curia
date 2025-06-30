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
    const { address, requirements, fulfillment }: { 
      address: string; 
      requirements: EthereumGatingRequirements;
      fulfillment?: 'any' | 'all';
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

    // Validate fulfillment mode if provided
    if (fulfillment && !['any', 'all'].includes(fulfillment)) {
      return NextResponse.json({ 
        error: 'Invalid fulfillment mode. Must be "any" or "all"' 
      }, { status: 400 });
    }

    console.log(`[API] Verifying Ethereum requirements for ${address} (fulfillment: ${fulfillment || 'all'})`);

    // Use the existing verification function with fulfillment mode
    const result = await verifyEthereumGatingRequirements(
      address, 
      requirements, 
      fulfillment || 'all'  // Default to 'all' for backward compatibility
    );

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
/**
 * Ethereum Balance Information API
 * 
 * Returns detailed balance information for display in RichRequirementsDisplay
 * Unlike verify-requirements which only returns pass/fail, this returns actual values
 */

import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { EthereumGatingRequirements } from '@/types/gating';

// Use the same RPC configuration as verification.ts
const ETHEREUM_RPC_URLS = [
  process.env.ETHEREUM_RPC_URL || 'https://ethereum.publicnode.com',
  'https://rpc.ankr.com/eth',
  'https://eth-rpc.gateway.pokt.network'
];

let currentRPCIndex = 0;

async function rawEthereumCall(method: string, params: unknown[] = []): Promise<unknown> {
  const maxRetries = ETHEREUM_RPC_URLS.length;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const rpcUrl = ETHEREUM_RPC_URLS[(currentRPCIndex + attempt) % ETHEREUM_RPC_URLS.length];
    
    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method,
          params,
          id: Date.now()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`RPC Error: ${data.error.message || data.error}`);
      }

      currentRPCIndex = (currentRPCIndex + attempt) % ETHEREUM_RPC_URLS.length;
      return data.result;
      
    } catch {
      if (attempt === maxRetries - 1) {
        throw new Error(`All Ethereum RPC endpoints failed for ${method}`);
      }
    }
  }
}

function getEthereumProvider(): ethers.providers.JsonRpcProvider {
  const rpcUrl = ETHEREUM_RPC_URLS[currentRPCIndex];
  return new ethers.providers.JsonRpcProvider(rpcUrl);
}

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

    console.log(`[API] Fetching Ethereum balance data for ${address}`);

    const balanceData: {
      ethBalance?: string;
      tokenBalances: Record<string, {
        balance: string;
        symbol?: string;
        name?: string;
        decimals?: number;
      }>;
      ensName?: string;
      efpStats?: {
        followerCount: number;
        followingCount: number;
        followingStatus: Record<string, boolean>;
      };
    } = {
      tokenBalances: {}
    };

    // Get ETH balance
    if (requirements.minimumETHBalance) {
      try {
        const balanceHex = await rawEthereumCall('eth_getBalance', [address, 'latest']);
        const balance = ethers.BigNumber.from(balanceHex as string);
        balanceData.ethBalance = ethers.utils.formatEther(balance);
      } catch (error) {
        console.error('[API] ETH balance fetch failed:', error);
      }
    }

    // Get ERC-20 token balances
    if (requirements.requiredERC20Tokens && requirements.requiredERC20Tokens.length > 0) {
      const provider = getEthereumProvider();
      const ERC20_ABI = [
        'function balanceOf(address) view returns (uint256)',
        'function decimals() view returns (uint8)',
        'function symbol() view returns (string)',
        'function name() view returns (string)'
      ];

      for (const token of requirements.requiredERC20Tokens) {
        try {
          const contract = new ethers.Contract(token.contractAddress, ERC20_ABI, provider);
          const [balance, decimals, symbol, name] = await Promise.all([
            contract.balanceOf(address),
            token.decimals ? Promise.resolve(token.decimals) : contract.decimals().catch(() => 18),
            token.symbol ? Promise.resolve(token.symbol) : contract.symbol().catch(() => 'Unknown'),
            token.name ? Promise.resolve(token.name) : contract.name().catch(() => 'Unknown Token')
          ]);

          balanceData.tokenBalances[token.contractAddress] = {
            balance: ethers.utils.formatUnits(balance, decimals),
            symbol,
            name,
            decimals
          };
        } catch (error) {
          console.error(`[API] Token balance fetch failed for ${token.contractAddress}:`, error);
          balanceData.tokenBalances[token.contractAddress] = {
            balance: '0',
            symbol: token.symbol || 'Unknown',
            name: token.name || 'Unknown Token',
            decimals: token.decimals || 18
          };
        }
      }
    }

    // Get ENS name
    if (requirements.requiresENS) {
      try {
        const provider = getEthereumProvider();
        const ensName = await provider.lookupAddress(address);
        if (ensName) {
          balanceData.ensName = ensName;
        }
      } catch (error) {
        console.error('[API] ENS lookup failed:', error);
      }
    }

    // Get EFP stats
    if (requirements.efpRequirements && requirements.efpRequirements.length > 0) {
      try {
        const EFP_API_BASE = 'https://api.ethfollow.xyz/api/v1';
        
        // Get follower/following counts
        const statsResponse = await fetch(`${EFP_API_BASE}/users/${address}/stats`);
        if (statsResponse.ok) {
          const stats = await statsResponse.json();
          
          // Get following status for each required address
          const followingStatus: Record<string, boolean> = {};
          
          for (const efpReq of requirements.efpRequirements) {
            if (efpReq.type === 'must_follow') {
              try {
                const followResponse = await fetch(`${EFP_API_BASE}/users/${address}/following/${efpReq.value}`);
                followingStatus[`following-${efpReq.value}`] = followResponse.ok;
              } catch {
                followingStatus[`following-${efpReq.value}`] = false;
              }
            } else if (efpReq.type === 'must_be_followed_by') {
              try {
                const followedResponse = await fetch(`${EFP_API_BASE}/users/${efpReq.value}/following/${address}`);
                followingStatus[`followed_by-${efpReq.value}`] = followedResponse.ok;
              } catch {
                followingStatus[`followed_by-${efpReq.value}`] = false;
              }
            } else if (efpReq.type === 'minimum_followers') {
              followingStatus[`minimum_followers-${efpReq.value}`] = (stats.followers_count || 0) >= parseInt(efpReq.value, 10);
            }
          }

          balanceData.efpStats = {
            followerCount: stats.followers_count || 0,
            followingCount: stats.following_count || 0,
            followingStatus
          };
        }
      } catch (error) {
        console.error('[API] EFP stats fetch failed:', error);
      }
    }

    console.log(`[API] ✅ Ethereum balance data fetched for ${address}`);
    return NextResponse.json(balanceData);

  } catch (error) {
    console.error('[API] Ethereum balance fetch error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
} 
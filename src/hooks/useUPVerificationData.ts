/**
 * Custom hook for Universal Profile verification data
 * 
 * Encapsulates all wagmi hooks and LSP26 registry calls to provide
 * complete verification data for UP gating requirements.
 */

import { useState, useEffect, useMemo } from 'react';
import { useAccount, useBalance, useReadContracts, useConnect, useDisconnect } from 'wagmi';
import { erc20Abi, erc721Abi } from 'viem';
import { UPGatingRequirements, VerificationStatus } from '@/types/gating';
import { lsp26Registry } from '@/lib/lsp26';
import { ethers } from 'ethers';

export interface UseUPVerificationDataOptions {
  enabled?: boolean;
  isPreviewMode?: boolean;
}

export interface UseUPVerificationDataReturn {
  userStatus: VerificationStatus;
  isLoading: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

export const useUPVerificationData = (
  requirements: UPGatingRequirements,
  options: UseUPVerificationDataOptions = {}
): UseUPVerificationDataReturn => {
  const { enabled = true } = options;
  
  // ===== WAGMI HOOKS =====
  
  const { connect: wagmiConnect, connectors } = useConnect();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { address, isConnected, status } = useAccount();
  const { data: balance } = useBalance({ 
    address,
    query: { enabled: enabled && isConnected && !!address }
  });

  // ===== TOKEN BALANCE FETCHING =====
  
  // Standard token balance fetching (LSP7 and LSP8 collection verification)
  const { data: tokenResults, isLoading: isLoadingTokens } = useReadContracts({
    contracts: requirements.requiredTokens?.flatMap(token => [
      { 
        address: token.contractAddress as `0x${string}`, 
        abi: erc20Abi, // Works for LSP7 tokens 
        functionName: 'balanceOf', 
        args: [address!] 
      },
      { 
        address: token.contractAddress as `0x${string}`, 
        abi: erc721Abi, // Works for LSP8 collection verification
        functionName: 'balanceOf', 
        args: [address!] 
      }
    ]) ?? [],
    query: { 
      enabled: enabled && isConnected && !!address && (requirements.requiredTokens?.length ?? 0) > 0 
    }
  });

  // ===== LSP8 TOKEN ID VERIFICATION =====
  
  const [lsp8TokenIdStatus, setLsp8TokenIdStatus] = useState<Record<string, boolean>>({});
  const [isLoadingLsp8TokenIds, setIsLoadingLsp8TokenIds] = useState(false);
  const [lsp8TokenIdError, setLsp8TokenIdError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [enhancedTokenBalances, setEnhancedTokenBalances] = useState<any[]>([]);

  // Handle LSP8 specific token ID verification
  useEffect(() => {
    const verifyLsp8TokenIds = async () => {
      const lsp8TokenIdRequirements = requirements.requiredTokens?.filter(
        token => token.tokenType === 'LSP8' && token.tokenId
      ) || [];

      if (!enabled || !isConnected || !address || lsp8TokenIdRequirements.length === 0) {
        setLsp8TokenIdStatus({});
        return;
      }

      setIsLoadingLsp8TokenIds(true);
      setLsp8TokenIdError(null);

      try {
        const newStatus: Record<string, boolean> = {};

        for (const token of lsp8TokenIdRequirements) {
          const key = `${token.contractAddress}-${token.tokenId}`;
          
          try {
            console.log(`[useUPVerificationData-LSP8] ✅ Starting specific token ID verification: ${token.tokenId}`);
            
            // Use window.lukso provider for LSP8 verification
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const provider = (window as { lukso?: any }).lukso;
            if (!provider) {
              throw new Error('Universal Profile provider not available');
            }

            const ethersProvider = new (await import('ethers')).ethers.providers.Web3Provider(provider);
            const contract = new (await import('ethers')).ethers.Contract(token.contractAddress, [
              'function tokenOwnerOf(bytes32) view returns (address)'
            ], ethersProvider);

            // Convert token ID to bytes32
            const ethers = (await import('ethers')).ethers;
            const tokenIdBytes32 = ethers.utils.hexZeroPad(
              typeof token.tokenId === 'string' && token.tokenId.startsWith('0x')
                ? token.tokenId
                : ethers.BigNumber.from(token.tokenId).toHexString(),
              32
            );

            console.log(`[useUPVerificationData-LSP8] Token ID conversion: "${token.tokenId}" -> "${tokenIdBytes32}"`);
            console.log(`[useUPVerificationData-LSP8] Calling tokenOwnerOf on contract: ${token.contractAddress}`);

            const owner = await contract.tokenOwnerOf(tokenIdBytes32);
            const ownsSpecificToken = owner.toLowerCase() === address.toLowerCase();
            
            console.log(`[useUPVerificationData-LSP8] TokenOwnerOf result: owner="${owner}", user="${address}", owns=${ownsSpecificToken}`);
            
            newStatus[key] = ownsSpecificToken;

            if (ownsSpecificToken) {
              console.log(`[useUPVerificationData-LSP8] ✅ User owns specific LSP8 token ID ${token.tokenId}`);
            } else {
              console.log(`[useUPVerificationData-LSP8] ❌ User does NOT own specific LSP8 token ID ${token.tokenId}`);
            }
          } catch (error) {
            console.error(`[useUPVerificationData-LSP8] ❌ Token ID verification failed for ${token.tokenId}:`, error);
            newStatus[key] = false;
          }
        }

        console.log(`[useUPVerificationData-LSP8] 🔧 Final LSP8 status:`, newStatus);
        setLsp8TokenIdStatus(newStatus);
      } catch (error) {
        console.error('[useUPVerificationData] Error verifying LSP8 token IDs:', error);
        setLsp8TokenIdError(error instanceof Error ? error.message : 'Failed to verify LSP8 token IDs');
      } finally {
        setIsLoadingLsp8TokenIds(false);
      }
    };

    verifyLsp8TokenIds();
  }, [enabled, isConnected, address, requirements.requiredTokens]);

  // ===== ENHANCED TOKEN BALANCES =====
  
  // Merge standard token results with LSP8 token ID verification (runs after both are ready)
  useEffect(() => {
    console.log(`[useUPVerificationData] 🚨 Enhanced balances useEffect triggered`);
    console.log(`[useUPVerificationData] 🚨 tokenResults:`, tokenResults);
    console.log(`[useUPVerificationData] 🚨 lsp8TokenIdStatus:`, lsp8TokenIdStatus);
    console.log(`[useUPVerificationData] 🚨 requirements.requiredTokens:`, requirements.requiredTokens);
    
    if (!tokenResults) {
      console.log(`[useUPVerificationData] 🚨 No tokenResults, setting empty array`);
      setEnhancedTokenBalances([]);
      return;
    }

    console.log(`[useUPVerificationData] 🔧 Computing enhanced token balances...`);
    console.log(`[useUPVerificationData] 🔧 Token results length:`, tokenResults.length);
    console.log(`[useUPVerificationData] 🔧 LSP8 status:`, lsp8TokenIdStatus);
    
    const enhanced = [...tokenResults];
    
    // For LSP8 tokens with specific token IDs, override the standard collection verification
    if (requirements.requiredTokens) {
      requirements.requiredTokens.forEach((token, index) => {
        if (token.tokenType === 'LSP8' && token.tokenId) {
          const lsp8Key = `${token.contractAddress}-${token.tokenId}`;
          const ownsSpecificToken = lsp8TokenIdStatus[lsp8Key] || false;
          
          console.log(`[useUPVerificationData] 🔧 Checking LSP8 token ${token.tokenId} with key "${lsp8Key}": owns=${ownsSpecificToken}`);
          
          // Override the ERC721 result (second result in each pair) with specific token verification
          const erc721Index = index * 2 + 1;
          if (enhanced[erc721Index]) {
            const originalResult = enhanced[erc721Index];
            enhanced[erc721Index] = {
              result: ownsSpecificToken ? BigInt(1) : BigInt(0),
              status: 'success' as const
            };
            
            console.log(`[useUPVerificationData] ✅ Enhanced token balance for LSP8 ${token.tokenId}: ${originalResult.result} -> ${enhanced[erc721Index].result} (owns=${ownsSpecificToken})`);
          } else {
            console.log(`[useUPVerificationData] ⚠️ No ERC721 result found at index ${erc721Index} for token ${token.tokenId}`);
          }
        }
      });
    }
    
    console.log(`[useUPVerificationData] 🔧 Final enhanced balances:`, enhanced);
    setEnhancedTokenBalances(enhanced);
  }, [tokenResults, lsp8TokenIdStatus, requirements.requiredTokens]);

  // ===== FOLLOWER STATUS FETCHING =====
  
  const [followerStatus, setFollowerStatus] = useState<Record<string, boolean>>({});
  const [isLoadingFollowers, setIsLoadingFollowers] = useState(false);
  const [followerError, setFollowerError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFollowers = async () => {
      if (!enabled || !isConnected || !address || !requirements.followerRequirements?.length) {
        setFollowerStatus({});
        return;
      }
      
      setIsLoadingFollowers(true);
      setFollowerError(null);
      
      try {
        const newStatus: Record<string, boolean> = {};
        
        for (const req of requirements.followerRequirements) {
          const key = `${req.type}-${req.value}`;
          
          try {
            // 🎯 SELF-FOLLOW AUTO-PASS: Check if user is the required person
            if (req.value.toLowerCase() === address.toLowerCase()) {
              console.log(`[useUPVerificationData] ✅ Auto-pass: User IS the required person (${address}) for ${req.type}`);
              newStatus[key] = true;
              continue;
            }
            
            if (req.type === 'minimum_followers') {
              const count = await lsp26Registry.getFollowerCount(address);
              newStatus[key] = count >= parseInt(req.value);
            } else if (req.type === 'followed_by') {
              newStatus[key] = await lsp26Registry.isFollowing(req.value, address);
            } else if (req.type === 'following') {
              newStatus[key] = await lsp26Registry.isFollowing(address, req.value);
            }
          } catch (e) {
            console.error(`[useUPVerificationData] Failed to check follower status for ${key}:`, e);
            newStatus[key] = false;
          }
        }
        
        setFollowerStatus(newStatus);
      } catch (error) {
        console.error('[useUPVerificationData] Error fetching follower data:', error);
        setFollowerError(error instanceof Error ? error.message : 'Failed to fetch follower data');
      } finally {
        setIsLoadingFollowers(false);
      }
    };

    fetchFollowers();
  }, [enabled, isConnected, address, requirements.followerRequirements]);

  // ===== CONNECTION HANDLERS =====
  
  const connect = async () => {
    if (isConnected) {
      console.log('[useUPVerificationData] Already connected to:', address);
      return;
    }
    
    if (status === 'connecting' || status === 'reconnecting') {
      console.log('[useUPVerificationData] Connection already in progress:', status);
      return;
    }
    
    const upConnector = connectors.find(c => c.id === 'universalProfile');
    if (!upConnector) {
      throw new Error('Universal Profile connector not found');
    }
    
    try {
      console.log('[useUPVerificationData] Initiating UP connection...');
      await wagmiConnect({ connector: upConnector });
    } catch (error) {
      console.error('[useUPVerificationData] Connection failed:', error);
      throw error;
    }
  };

  const disconnect = () => {
    wagmiDisconnect();
  };

  // ===== CONSTRUCT USER STATUS =====
  
  // 🎯 BUILD BALANCES OBJECT: Convert enhanced token balances array to object structure expected by UI
  const balancesObject = useMemo(() => {
    const tokens: Record<string, {
      raw: string;
      formatted: string;
      decimals?: number;
      name?: string;
      symbol?: string;
    }> = {};

    if (enhancedTokenBalances && requirements.requiredTokens) {
      requirements.requiredTokens.forEach((req, idx) => {
        const erc20Res = enhancedTokenBalances[idx * 2];
        const erc721Res = enhancedTokenBalances[idx * 2 + 1];

        let bal: bigint = BigInt(0);
        if (req.tokenType === 'LSP7' && erc20Res?.status === 'success') {
          bal = erc20Res.result as bigint;
        } else if (req.tokenType === 'LSP8' && erc721Res?.status === 'success') {
          bal = erc721Res.result as bigint;
        }

        // 🎯 FIX: Use unique key for LSP8 tokens with specific token IDs to avoid collision
        const tokenKey = req.tokenType === 'LSP8' && req.tokenId 
          ? `${req.contractAddress}-${req.tokenId}` // Unique key for specific LSP8 tokens
          : req.contractAddress; // Standard key for LSP7 and LSP8 collection verification

        tokens[tokenKey] = {
          raw: bal.toString(),
          formatted: ethers.utils.formatUnits(bal, 18),
          decimals: 18,
          name: req.name,
          symbol: req.symbol,
        };
        
        console.log(`[useUPVerificationData] 🔧 Built token balance object for ${tokenKey}: raw=${bal.toString()}, tokenType=${req.tokenType}, tokenId=${req.tokenId || 'collection'}`);
      });
    }

    return {
      lyx: balance?.value,
      tokens
    };
  }, [enhancedTokenBalances, requirements.requiredTokens, balance?.value]);

  const userStatus: VerificationStatus = {
    connected: isConnected,
    verified: false, // Always false (determined by backend verification)
    requirements: [],
    address: address,
    upAddress: address,
    lyxBalance: balance?.value,
    tokenBalances: enhancedTokenBalances,
    followerStatus: followerStatus,
    // @ts-expect-error - Adding balances for UI compatibility
    balances: balancesObject,
  };

  // ===== LOADING & ERROR STATE =====
  
  const isLoading = isLoadingTokens || isLoadingFollowers || isLoadingLsp8TokenIds || status === 'connecting' || status === 'reconnecting';
  const error = followerError || lsp8TokenIdError;

  return {
    userStatus,
    isLoading,
    error,
    connect,
    disconnect,
  };
}; 
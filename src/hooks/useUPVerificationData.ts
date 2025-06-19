/**
 * Custom hook for Universal Profile verification data
 * 
 * Encapsulates all wagmi hooks and LSP26 registry calls to provide
 * complete verification data for UP gating requirements.
 */

import { useState, useEffect } from 'react';
import { useAccount, useBalance, useReadContracts, useConnect, useDisconnect } from 'wagmi';
import { erc20Abi, erc721Abi } from 'viem';
import { UPGatingRequirements, VerificationStatus } from '@/types/gating';
import { lsp26Registry } from '@/lib/lsp26';

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
  
  const { data: tokenResults, isLoading: isLoadingTokens } = useReadContracts({
    contracts: requirements.requiredTokens?.flatMap(token => [
      { 
        address: token.contractAddress as `0x${string}`, 
        abi: erc20Abi, 
        functionName: 'balanceOf', 
        args: [address!] 
      },
      { 
        address: token.contractAddress as `0x${string}`, 
        abi: erc721Abi, 
        functionName: 'balanceOf', 
        args: [address!] 
      }
    ]) ?? [],
    query: { 
      enabled: enabled && isConnected && !!address && (requirements.requiredTokens?.length ?? 0) > 0 
    }
  });

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
  
  const userStatus: VerificationStatus = {
    connected: isConnected,
    verified: false, // Always false (determined by backend verification)
    requirements: [],
    address: address,
    upAddress: address,
    lyxBalance: balance?.value,
    tokenBalances: tokenResults,
    followerStatus: followerStatus,
  };

  // ===== LOADING & ERROR STATE =====
  
  const isLoading = isLoadingTokens || isLoadingFollowers || status === 'connecting' || status === 'reconnecting';
  const error = followerError;

  return {
    userStatus,
    isLoading,
    error,
    connect,
    disconnect,
  };
}; 
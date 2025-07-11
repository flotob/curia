/**
 * Isolated Ethereum Profile Context
 * 
 * Provides Ethereum wallet connection and verification functionality with isolated wagmi context.
 * Each component that uses this context gets its own wagmi provider to prevent conflicts with UP verification.
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useAccount, useConnect, useDisconnect, useSignMessage, useBalance, useEnsName, useEnsAvatar } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { EthereumWagmiProvider } from '../components/ethereum/EthereumWagmiProvider';

// Interface for EFP following item
interface EFPFollowingItem {
  version?: number;
  record_type?: string;
  data?: string;
  address?: string;
  tags?: string[];
}

// Simple verification result interface for host service
interface VerificationResult {
  isValid: boolean;
  missingRequirements: string[];
  errors: string[];
}

// ===== TYPES =====

interface EthereumProfileContextType {
  // Connection state
  isConnected: boolean;
  ethAddress: string | null;
  isConnecting: boolean;
  connectionError: string | null;
  isCorrectChain: boolean; // Ethereum mainnet
  
  // Connection methods
  connect: () => Promise<void>;
  disconnect: () => void;
  switchToEthereum: () => Promise<void>;
  
  // Verification methods
  verifyETHBalance: (minBalance: string) => Promise<boolean>;
  verifyENSRequirements: (requiresENS: boolean, patterns?: string[]) => Promise<VerificationResult>;
  
  // Profile methods
  getETHBalance: () => Promise<string>;
  getENSProfile: () => Promise<{ name?: string; avatar?: string }>;
  getEFPStats: () => Promise<{ followers: number; following: number }>;
  signMessage: (message: string) => Promise<string>;
  checkEFPFollowing: (userAddress: string, targetAddress: string) => Promise<boolean>;
}

// ===== CONTEXT =====

const EthereumProfileContext = createContext<EthereumProfileContextType | null>(null);

// ===== HOOK =====

export const useEthereumProfile = (): EthereumProfileContextType => {
  const context = useContext(EthereumProfileContext);
  if (!context) {
    // Return minimal context for components that don't have the provider
    return {
      isConnected: false,
      ethAddress: null,
      isConnecting: false,
      connectionError: null,
      isCorrectChain: false,
      connect: async () => { console.log('[EthereumProfile] Not initialized'); },
      disconnect: () => { console.log('[EthereumProfile] Not initialized'); },
      switchToEthereum: async () => { console.log('[EthereumProfile] Not initialized'); },
      verifyETHBalance: async () => false,
      verifyENSRequirements: async () => ({ isValid: false, missingRequirements: [], errors: ['Not initialized'] }),
      getETHBalance: async () => '0',
      getENSProfile: async () => ({}),
      getEFPStats: async () => ({ followers: 0, following: 0 }),
      signMessage: async () => { throw new Error('Not initialized'); },
      checkEFPFollowing: async () => false,
    };
  }
  return context;
};

// ===== PROVIDER IMPLEMENTATION =====

interface EthereumProfileProviderProps {
  children: ReactNode;
  storageKey?: string;
}

const EthereumProfileProviderInternal: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Wagmi hooks - now using isolated context
  const { address, isConnected, chain } = useAccount();
  const { isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { data: balance } = useBalance({ address });
  const { data: ensName } = useEnsName({ address });
  const { data: ensAvatar } = useEnsAvatar({ name: ensName || undefined });

  // Derived state
  const ethAddress = address || null;
  const isCorrectChain = chain?.id === mainnet.id;

  // ===== CONNECTION METHODS =====

  const handleConnect = useCallback(async () => {
    // Connection is handled by RainbowKit ConnectButton
    console.log('[EthereumProfileContext] Connection is handled by RainbowKit');
  }, []);

  const handleDisconnect = useCallback(() => {
    disconnect();
    setConnectionError(null);
  }, [disconnect]);

  const switchToEthereum = useCallback(async () => {
    try {
      if (typeof window !== 'undefined' && 'ethereum' in window && window.ethereum) {
        const ethereum = window.ethereum as { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x1' }], // Ethereum mainnet
        });
      }
    } catch (error) {
      console.error('[EthereumProfileContext] Chain switch failed:', error);
      setConnectionError('Failed to switch to Ethereum mainnet');
    }
  }, []);

  // ===== PROFILE METHODS =====

  const getETHBalance = useCallback(async (): Promise<string> => {
    if (!balance) return '0';
    return balance.formatted;
  }, [balance]);

  const getENSProfile = useCallback(async (): Promise<{ name?: string; avatar?: string }> => {
    return {
      name: ensName || undefined,
      avatar: ensAvatar || undefined,
    };
  }, [ensName, ensAvatar]);

  const getEFPStats = useCallback(async (): Promise<{ followers: number; following: number }> => {
    if (!ethAddress) return { followers: 0, following: 0 };
    
    try {
      const response = await fetch(`https://api.ethfollow.xyz/api/v1/users/${ethAddress}/stats`);
      if (!response.ok) return { followers: 0, following: 0 };
      
      const data = await response.json();
      return {
        followers: data.followers_count || 0,
        following: data.following_count || 0,
      };
    } catch (error) {
      console.error('[EthereumProfileContext] EFP stats fetch failed:', error);
      return { followers: 0, following: 0 };
    }
  }, [ethAddress]);

  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (!signMessageAsync) throw new Error('Sign message not available');
    return await signMessageAsync({ message });
  }, [signMessageAsync]);

  const checkEFPFollowing = useCallback(async (userAddress: string, targetAddress: string): Promise<boolean> => {
    const CHUNK_SIZE = 1000; // Process 1000 records at a time
    let offset = 0;
    let hasMore = true;

    console.log(`[EFP API Debug] Searching if ${userAddress} follows ${targetAddress} using optimized pagination`);

    while (hasMore) {
      try {
        const response = await fetch(`https://api.ethfollow.xyz/api/v1/users/${userAddress}/following?limit=${CHUNK_SIZE}&offset=${offset}`);
        if (!response.ok) {
          console.log(`[EFP API Debug] Response not OK: ${response.status} ${response.statusText}`);
          throw new Error(`EFP API error: ${response.status}`);
        }

        const data = await response.json();
        const followingList = data.following || [];
        
        console.log(`[EFP API Debug] Chunk ${offset}-${offset + CHUNK_SIZE}: ${followingList.length} items`);
        
        // Check current chunk for the target address
        const found = followingList
          .filter((item: unknown): item is EFPFollowingItem => 
            item != null && typeof item === 'object' && ('address' in item || 'data' in item))
          .some((item: EFPFollowingItem) => {
            const itemAddress = typeof item === 'string' ? item : (item.address || item.data);
            if (!itemAddress) return false;
            
            const matches = itemAddress.toLowerCase() === targetAddress.toLowerCase();
            if (matches) {
              console.log(`[EFP API Debug] ✅ Found match in chunk ${offset}-${offset + CHUNK_SIZE}`);
            }
            return matches;
          });

        if (found) {
          return true;
        }

        // Check if we have more data
        hasMore = followingList.length === CHUNK_SIZE;
        offset += CHUNK_SIZE;

        console.log(`[EFP API Debug] Checked ${offset} records, continuing...`);
      } catch (error) {
        console.error(`[EFP API Debug] Error in chunk ${offset}:`, error);
        throw error;
      }
    }

    console.log(`[EFP API Debug] ❌ No match found after checking ${offset} records`);
    return false;
  }, []);

  // ===== VERIFICATION METHODS =====

  const verifyETHBalance = useCallback(async (minBalance: string): Promise<boolean> => {
    const currentBalance = await getETHBalance();
    return parseFloat(currentBalance) >= parseFloat(minBalance);
  }, [getETHBalance]);

  const verifyENSRequirements = useCallback(async (requiresENS: boolean): Promise<VerificationResult> => {
    const profile = await getENSProfile();
    if (requiresENS && !profile.name) {
      return { isValid: false, missingRequirements: ['ENS name required'], errors: [] };
    }
    return { isValid: true, missingRequirements: [], errors: [] };
  }, [getENSProfile]);

  // ===== CONTEXT VALUE =====

  const contextValue: EthereumProfileContextType = {
    // Connection state
    isConnected,
    ethAddress,
    isConnecting,
    connectionError,
    isCorrectChain,
    
    // Connection methods
    connect: handleConnect,
    disconnect: handleDisconnect,
    switchToEthereum,
    
    // Verification methods
    verifyETHBalance,
    verifyENSRequirements,
    
    // Profile methods
    getETHBalance,
    getENSProfile,
    getEFPStats,
    signMessage,
    checkEFPFollowing,
  };

  return (
    <EthereumProfileContext.Provider value={contextValue}>
      {children}
    </EthereumProfileContext.Provider>
  );
};

// ===== MAIN PROVIDER WITH WAGMI WRAPPER =====

export const EthereumProfileProvider: React.FC<EthereumProfileProviderProps> = ({ 
  children, 
  storageKey = 'host_service_ethereum_profile'
}) => {
  return (
    <EthereumWagmiProvider storageKey={storageKey}>
      <EthereumProfileProviderInternal>
        {children}
      </EthereumProfileProviderInternal>
    </EthereumWagmiProvider>
  );
}; 
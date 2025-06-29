/**
 * Isolated Ethereum Profile Context
 * 
 * Provides Ethereum wallet connection and verification functionality with isolated wagmi context.
 * Each component that uses this context gets its own wagmi provider to prevent conflicts with UP verification.
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useAccount, useConnect, useDisconnect, useSignMessage, useBalance, useEnsName, useEnsAvatar } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { VerificationResult } from '@/types/gating';
import { EthereumWagmiProvider } from '@/components/ethereum/EthereumWagmiProvider';

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
  verifyERC20Requirements: (requirements: ERC20Requirement[]) => Promise<VerificationResult>;
  verifyERC721Requirements: (requirements: ERC721Requirement[]) => Promise<VerificationResult>;
  verifyERC1155Requirements: (requirements: ERC1155Requirement[]) => Promise<VerificationResult>;
  verifyENSRequirements: (requiresENS: boolean, patterns?: string[]) => Promise<VerificationResult>;
  verifyEFPRequirements: (requirements: EFPRequirement[]) => Promise<VerificationResult>;
  verifyPostRequirements: (settings: PostSettings) => Promise<VerificationResult>;
  
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
      verifyERC20Requirements: async () => ({ isValid: false, missingRequirements: [], errors: ['Not initialized'] }),
      verifyERC721Requirements: async () => ({ isValid: false, missingRequirements: [], errors: ['Not initialized'] }),
      verifyERC1155Requirements: async () => ({ isValid: false, missingRequirements: [], errors: ['Not initialized'] }),
      verifyENSRequirements: async () => ({ isValid: false, missingRequirements: [], errors: ['Not initialized'] }),
      verifyEFPRequirements: async () => ({ isValid: false, missingRequirements: [], errors: ['Not initialized'] }),
      verifyPostRequirements: async () => ({ isValid: false, missingRequirements: [], errors: ['Not initialized'] }),
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
    try {
      const response = await fetch(`https://api.ethfollow.xyz/api/v1/users/${userAddress}/following`);
      if (!response.ok) return false;
      
      const data = await response.json();
      return data.following?.some((addr: string) => addr.toLowerCase() === targetAddress.toLowerCase()) || false;
    } catch (error) {
      console.error('[EthereumProfileContext] EFP following check failed:', error);
      return false;
    }
  }, []);

  // ===== VERIFICATION METHODS =====

  const verifyETHBalance = useCallback(async (minBalance: string): Promise<boolean> => {
    const currentBalance = await getETHBalance();
    return parseFloat(currentBalance) >= parseFloat(minBalance);
  }, [getETHBalance]);

  const verifyERC20Requirements = useCallback(async (): Promise<VerificationResult> => {
    // Implementation would go here
    return { isValid: false, missingRequirements: [], errors: ['Not implemented'] };
  }, []);

  const verifyERC721Requirements = useCallback(async (): Promise<VerificationResult> => {
    // Implementation would go here
    return { isValid: false, missingRequirements: [], errors: ['Not implemented'] };
  }, []);

  const verifyERC1155Requirements = useCallback(async (): Promise<VerificationResult> => {
    // Implementation would go here
    return { isValid: false, missingRequirements: [], errors: ['Not implemented'] };
  }, []);

  const verifyENSRequirements = useCallback(async (requiresENS: boolean): Promise<VerificationResult> => {
    const profile = await getENSProfile();
    if (requiresENS && !profile.name) {
      return { isValid: false, missingRequirements: ['ENS name required'], errors: [] };
    }
    return { isValid: true, missingRequirements: [], errors: [] };
  }, [getENSProfile]);

  const verifyEFPRequirements = useCallback(async (): Promise<VerificationResult> => {
    // Implementation would go here
    return { isValid: false, missingRequirements: [], errors: ['Not implemented'] };
  }, []);

  const verifyPostRequirements = useCallback(async (): Promise<VerificationResult> => {
    // Implementation would go here
    return { isValid: false, missingRequirements: [], errors: ['Not implemented'] };
  }, []);

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
    verifyERC20Requirements,
    verifyERC721Requirements,
    verifyERC1155Requirements,
    verifyENSRequirements,
    verifyEFPRequirements,
    verifyPostRequirements,
    
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
  storageKey = 'wagmi_ethereum_profile'
}) => {
  return (
    <EthereumWagmiProvider storageKey={storageKey}>
      <EthereumProfileProviderInternal>
        {children}
      </EthereumProfileProviderInternal>
    </EthereumWagmiProvider>
  );
};

// ===== TYPES FOR BACKWARDS COMPATIBILITY =====

interface ERC20Requirement {
  contractAddress: string;
  minimum: string;
  name?: string;
  symbol?: string;
  decimals?: number;
}

interface ERC721Requirement {
  contractAddress: string;
  minimumCount?: number;
  name?: string;
  symbol?: string;
}

interface ERC1155Requirement {
  contractAddress: string;
  tokenId: string;
  minimum: string;
  name?: string;
}

interface EFPRequirement {
  type: 'minimum_followers' | 'must_follow' | 'must_be_followed_by';
  value: string;
  description?: string;
}

type PostSettings = Record<string, unknown>; 
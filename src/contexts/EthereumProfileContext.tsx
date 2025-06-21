/**
 * Ethereum Profile Context
 * 
 * Provides Ethereum wallet connection and verification functionality using wagmi
 * Follows the same pattern as Universal Profile context but for Ethereum blockchain
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useAccount, useConnect, useDisconnect, useSignMessage, useBalance, useEnsName, useEnsAvatar } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { EthereumGatingRequirements, VerificationResult } from '@/types/gating';

// Use existing window.ethereum type

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
}

interface ERC20Requirement {
  contractAddress: string;
  minimum: string;
  symbol?: string;
  name?: string;
  decimals?: number;
}

interface ERC721Requirement {
  contractAddress: string;
  minimumCount?: number;
  symbol?: string;
  name?: string;
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

interface EFPFollowRecord {
  version: number;
  record_type: string;
  data: string;
  address: string;
  tags: string[];
}

interface PostSettings {
  responsePermissions?: {
    categories?: Array<{
      type: string;
      requirements: EthereumGatingRequirements;
    }>;
  };
}

// ===== CONTEXT =====

const EthereumProfileContext = createContext<EthereumProfileContextType | null>(null);

// ===== PROVIDER =====

interface EthereumProfileProviderProps {
  children: ReactNode;
}

export const EthereumProfileProvider: React.FC<EthereumProfileProviderProps> = ({ children }) => {
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Wagmi hooks
  const { address, isConnected, chain } = useAccount();
  const { isPending: isConnecting } = useConnect(); // Keep isConnecting but remove unused connect and connectors
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { data: balance } = useBalance({ address });
  const { data: ensName } = useEnsName({ address });
  const { data: ensAvatar } = useEnsAvatar({ name: ensName || undefined });

  // Derived state
  const ethAddress = address || null;
  const isCorrectChain = chain?.id === mainnet.id;

  // ===== CONNECTION METHODS =====

  // Connection is now handled by RainbowKit, so we simplify this
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

  // ===== VERIFICATION METHODS =====

  const verifyETHBalance = useCallback(async (minBalance: string): Promise<boolean> => {
    try {
      if (!balance) {
        console.warn('[EthereumProfileContext] No balance data available');
        return false;
      }
      
      const minBalanceBigInt = BigInt(minBalance);
      return balance.value >= minBalanceBigInt;
    } catch (error) {
      console.error('[EthereumProfileContext] ETH balance verification failed:', error);
      return false;
    }
  }, [balance]);

  const verifyERC20Requirements = useCallback(async (requirements: ERC20Requirement[]): Promise<VerificationResult> => {
    try {
      if (!ethAddress) {
        return { isValid: false, missingRequirements: ['Wallet not connected'], errors: [] };
      }

      const missingRequirements: string[] = [];
      
      for (const req of requirements) {
        try {
          // Call contract to check balance
          const response = await fetch('/api/ethereum/verify-erc20', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              address: ethAddress,
              contractAddress: req.contractAddress,
              minimum: req.minimum
            })
          });

          const result = await response.json();
          if (!result.valid) {
            missingRequirements.push(`Insufficient ${req.symbol || req.contractAddress} balance`);
          }
        } catch (error) {
          console.error(`[EthereumProfileContext] ERC-20 verification failed for ${req.contractAddress}:`, error);
          missingRequirements.push(`Failed to verify ${req.symbol || req.contractAddress} balance`);
        }
      }

      return {
        isValid: missingRequirements.length === 0,
        missingRequirements,
        errors: []
      };
    } catch (error) {
      console.error('[EthereumProfileContext] ERC-20 verification failed:', error);
      return { 
        isValid: false, 
        missingRequirements: ['ERC-20 verification failed'], 
        errors: [error instanceof Error ? error.message : 'Unknown error'] 
      };
    }
  }, [ethAddress]);

  const verifyERC721Requirements = useCallback(async (requirements: ERC721Requirement[]): Promise<VerificationResult> => {
    try {
      if (!ethAddress) {
        return { isValid: false, missingRequirements: ['Wallet not connected'], errors: [] };
      }

      const missingRequirements: string[] = [];
      
      for (const req of requirements) {
        try {
          const response = await fetch('/api/ethereum/verify-erc721', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              address: ethAddress,
              contractAddress: req.contractAddress,
              minimumCount: req.minimumCount || 1
            })
          });

          const result = await response.json();
          if (!result.valid) {
            missingRequirements.push(`Insufficient ${req.symbol || req.contractAddress} NFTs`);
          }
        } catch (error) {
          console.error(`[EthereumProfileContext] ERC-721 verification failed for ${req.contractAddress}:`, error);
          missingRequirements.push(`Failed to verify ${req.symbol || req.contractAddress} ownership`);
        }
      }

      return {
        isValid: missingRequirements.length === 0,
        missingRequirements,
        errors: []
      };
    } catch (error) {
      console.error('[EthereumProfileContext] ERC-721 verification failed:', error);
      return { 
        isValid: false, 
        missingRequirements: ['ERC-721 verification failed'], 
        errors: [error instanceof Error ? error.message : 'Unknown error'] 
      };
    }
  }, [ethAddress]);

  const verifyERC1155Requirements = useCallback(async (requirements: ERC1155Requirement[]): Promise<VerificationResult> => {
    try {
      if (!ethAddress) {
        return { isValid: false, missingRequirements: ['Wallet not connected'], errors: [] };
      }

      const missingRequirements: string[] = [];
      
      for (const req of requirements) {
        try {
          const response = await fetch('/api/ethereum/verify-erc1155', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              address: ethAddress,
              contractAddress: req.contractAddress,
              tokenId: req.tokenId,
              minimum: req.minimum
            })
          });

          const result = await response.json();
          if (!result.valid) {
            missingRequirements.push(`Insufficient ${req.name || `Token #${req.tokenId}`} balance`);
          }
        } catch (error) {
          console.error(`[EthereumProfileContext] ERC-1155 verification failed for ${req.contractAddress}:`, error);
          missingRequirements.push(`Failed to verify ${req.name || `Token #${req.tokenId}`} balance`);
        }
      }

      return {
        isValid: missingRequirements.length === 0,
        missingRequirements,
        errors: []
      };
    } catch (error) {
      console.error('[EthereumProfileContext] ERC-1155 verification failed:', error);
      return { 
        isValid: false, 
        missingRequirements: ['ERC-1155 verification failed'], 
        errors: [error instanceof Error ? error.message : 'Unknown error'] 
      };
    }
  }, [ethAddress]);

  const verifyENSRequirements = useCallback(async (requiresENS: boolean, patterns?: string[]): Promise<VerificationResult> => {
    try {
      if (!requiresENS) {
        return { isValid: true, missingRequirements: [], errors: [] };
      }

      if (!ensName) {
        return { 
          isValid: false, 
          missingRequirements: ['ENS name required'], 
          errors: [] 
        };
      }

      if (patterns && patterns.length > 0) {
        const matchesPattern = patterns.some(pattern => {
          if (pattern === '*') return true;
          if (pattern.startsWith('*.')) {
            const suffix = pattern.slice(1);
            return ensName.endsWith(suffix);
          }
          return ensName === pattern;
        });

        if (!matchesPattern) {
          return {
            isValid: false,
            missingRequirements: [`ENS name must match pattern: ${patterns.join(' or ')}`],
            errors: []
          };
        }
      }

      return { isValid: true, missingRequirements: [], errors: [] };
    } catch (error) {
      console.error('[EthereumProfileContext] ENS verification failed:', error);
      return { 
        isValid: false, 
        missingRequirements: ['ENS verification failed'], 
        errors: [error instanceof Error ? error.message : 'Unknown error'] 
      };
    }
  }, [ensName]);

  const verifyEFPRequirements = useCallback(async (requirements: EFPRequirement[]): Promise<VerificationResult> => {
    try {
      // Better validation for ethAddress - check for empty string too
      if (!ethAddress || ethAddress.trim() === '' || requirements.length === 0) {
        console.log('[EthereumProfileContext] Skipping EFP verification - no address or no requirements', { 
          ethAddress, 
          addressLength: ethAddress?.length, 
          requirementsLength: requirements.length 
        });
        return { isValid: true, missingRequirements: [], errors: [] };
      }

      console.log(`[EthereumProfileContext] Starting EFP verification for address: ${ethAddress}, requirements: ${requirements.length}`);

      const missingRequirements: string[] = [];
      const EFP_API_BASE = 'https://api.ethfollow.xyz/api/v1';
      
      for (const req of requirements) {
        try {
          if (req.type === 'minimum_followers') {
            // Get follower count from stats endpoint
            const statsResponse = await fetch(`${EFP_API_BASE}/users/${ethAddress}/stats`);
            if (!statsResponse.ok) {
              throw new Error('EFP stats API error');
            }
            
            const stats = await statsResponse.json();
            const followerCount = stats.followers_count || 0;
            const required = parseInt(req.value);
            
            if (followerCount < required) {
              missingRequirements.push(`Need ${required} followers, have ${followerCount}`);
            }
          } else if (req.type === 'must_follow') {
            // Check if current user follows the target address
            const followResponse = await fetch(`${EFP_API_BASE}/users/${ethAddress}/following?limit=1000000`);
            if (!followResponse.ok) {
              throw new Error(`EFP API error: ${followResponse.status}`);
            }
            
            const followData = await followResponse.json();
            const followingList = followData.following || [];
            
            // Extract addresses from EFP objects (each has an 'address' field)
            const addresses = followingList
              .filter((item: unknown): item is EFPFollowRecord => 
                item != null && typeof item === 'object' && 'address' in item)
              .map((item: EFPFollowRecord) => item.address);
            
            const isFollowing = addresses.some((addr: string) => 
              addr.toLowerCase() === req.value.toLowerCase()
            );
            
            if (!isFollowing) {
              missingRequirements.push(`Must follow ${req.value}`);
            }
          } else if (req.type === 'must_be_followed_by') {
            // Skip verification if value is empty (Issue #2)
            if (!req.value || req.value.trim() === '') {
              console.error(`[EthereumProfileContext] ❌ must_be_followed_by has empty value - this is Issue #2!`);
              missingRequirements.push(`Must be followed by ${req.description || 'unknown user'} (address not found)`);
              continue;
            }
            
            // Check if target address follows the current user
            const followedResponse = await fetch(`${EFP_API_BASE}/users/${req.value}/following?limit=1000000`);
            if (!followedResponse.ok) {
              throw new Error(`EFP API error: ${followedResponse.status}`);
            }
            
            const followedData = await followedResponse.json();
            const followingList = followedData.following || [];
            
            // Extract addresses from EFP objects (each has an 'address' field)
            const addresses = followingList
              .filter((item: unknown): item is EFPFollowRecord => 
                item != null && typeof item === 'object' && 'address' in item)
              .map((item: EFPFollowRecord) => item.address);
            
            const isFollowedBy = addresses.some((addr: string) => 
              addr.toLowerCase() === ethAddress.toLowerCase()
            );
            
            if (!isFollowedBy) {
              missingRequirements.push(`Must be followed by ${req.value}`);
            }
          }
        } catch (error) {
          console.error(`[EthereumProfileContext] EFP requirement check failed for ${req.type}:`, error);
          missingRequirements.push(`Failed to verify EFP requirement: ${req.type}`);
        }
      }

      return {
        isValid: missingRequirements.length === 0,
        missingRequirements,
        errors: []
      };
    } catch (error) {
      console.error('[EthereumProfileContext] EFP verification failed:', error);
      return { 
        isValid: false, 
        missingRequirements: ['EFP verification failed'], 
        errors: [error instanceof Error ? error.message : 'Unknown error'] 
      };
    }
  }, [ethAddress]);

  const verifyPostRequirements = useCallback(async (settings: PostSettings): Promise<VerificationResult> => {
    try {
      const categories = settings.responsePermissions?.categories || [];
      const ethereumCategories = categories.filter(cat => cat.type === 'ethereum_profile');
      
      if (ethereumCategories.length === 0) {
        return { isValid: true, missingRequirements: [], errors: [] };
      }

      const allMissingRequirements: string[] = [];
      const allErrors: string[] = [];

      for (const category of ethereumCategories) {
        const requirements = category.requirements;
        
        // Verify ETH balance
        if (requirements.minimumETHBalance) {
          const hasEnoughETH = await verifyETHBalance(requirements.minimumETHBalance);
          if (!hasEnoughETH) {
            allMissingRequirements.push('Insufficient ETH balance');
          }
        }

        // Verify ENS requirements
        if (requirements.requiresENS || requirements.ensDomainPatterns) {
          const ensResult = await verifyENSRequirements(
            requirements.requiresENS || false, 
            requirements.ensDomainPatterns
          );
          allMissingRequirements.push(...ensResult.missingRequirements);
          allErrors.push(...ensResult.errors);
        }

        // Verify token requirements
        if (requirements.requiredERC20Tokens?.length) {
          const erc20Result = await verifyERC20Requirements(requirements.requiredERC20Tokens);
          allMissingRequirements.push(...erc20Result.missingRequirements);
          allErrors.push(...erc20Result.errors);
        }

        if (requirements.requiredERC721Collections?.length) {
          const erc721Result = await verifyERC721Requirements(requirements.requiredERC721Collections);
          allMissingRequirements.push(...erc721Result.missingRequirements);
          allErrors.push(...erc721Result.errors);
        }

        if (requirements.requiredERC1155Tokens?.length) {
          const erc1155Result = await verifyERC1155Requirements(requirements.requiredERC1155Tokens);
          allMissingRequirements.push(...erc1155Result.missingRequirements);
          allErrors.push(...erc1155Result.errors);
        }

        // Verify EFP requirements
        if (requirements.efpRequirements?.length) {
          const efpResult = await verifyEFPRequirements(requirements.efpRequirements);
          allMissingRequirements.push(...efpResult.missingRequirements);
          allErrors.push(...efpResult.errors);
        }
      }

      return {
        isValid: allMissingRequirements.length === 0 && allErrors.length === 0,
        missingRequirements: allMissingRequirements,
        errors: allErrors
      };
    } catch (error) {
      console.error('[EthereumProfileContext] Post requirements verification failed:', error);
      return { 
        isValid: false, 
        missingRequirements: ['Verification failed'], 
        errors: [error instanceof Error ? error.message : 'Unknown error'] 
      };
    }
  }, [verifyETHBalance, verifyENSRequirements, verifyERC20Requirements, verifyERC721Requirements, verifyERC1155Requirements, verifyEFPRequirements]);

  // ===== UTILITY METHODS =====

  const getETHBalance = useCallback(async (): Promise<string> => {
    if (!balance) {
      throw new Error('No balance data available');
    }
    return balance.value.toString();
  }, [balance]);

  const getENSProfile = useCallback(async (): Promise<{ name?: string; avatar?: string }> => {
    return {
      name: ensName || undefined,
      avatar: ensAvatar || undefined
    };
  }, [ensName, ensAvatar]);

  const getEFPStats = useCallback(async (): Promise<{ followers: number; following: number }> => {
    if (!ethAddress) {
      return { followers: 0, following: 0 };
    }

    try {
      const response = await fetch(`https://api.ethfollow.xyz/api/v1/users/${ethAddress}/stats`);
      if (!response.ok) {
        // Log the specific error but don't throw - return default values instead
        console.warn(`[EthereumProfileContext] EFP API returned ${response.status}: ${response.statusText}. Using default values.`);
        return { followers: 0, following: 0 };
      }
      
      const data = await response.json();
      return {
        followers: data.followers_count || 0,
        following: data.following_count || 0
      };
    } catch (error) {
      // Network errors, invalid JSON, etc. - handle gracefully
      console.warn('[EthereumProfileContext] EFP API request failed (network/parsing error). Using default values.', error);
      return { followers: 0, following: 0 };
    }
  }, [ethAddress]);

  const signMessage = useCallback(async (message: string): Promise<string> => {
    try {
      const signature = await signMessageAsync({ message });
      return signature;
    } catch (error) {
      console.error('[EthereumProfileContext] Message signing failed:', error);
      throw error;
    }
  }, [signMessageAsync]);

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
    signMessage
  };

  return (
    <EthereumProfileContext.Provider value={contextValue}>
      {children}
    </EthereumProfileContext.Provider>
  );
};

// ===== HOOK =====

export const useEthereumProfile = (): EthereumProfileContextType => {
  const context = useContext(EthereumProfileContext);
  if (!context) {
    throw new Error('useEthereumProfile must be used within an EthereumProfileProvider');
  }
  return context;
};

// ===== CONDITIONAL PROVIDER =====

interface ConditionalEthereumProviderProps {
  children: ReactNode;
  enabled?: boolean;
}

export const ConditionalEthereumProvider: React.FC<ConditionalEthereumProviderProps> = ({ 
  children, 
  enabled = false 
}) => {
  if (!enabled) {
    // Return a minimal context when disabled
    const minimalContext: EthereumProfileContextType = {
      isConnected: false,
      ethAddress: null,
      isConnecting: false,
      connectionError: null,
      isCorrectChain: false,
      connect: async () => {},
      disconnect: () => {},
      switchToEthereum: async () => {},
      verifyETHBalance: async () => false,
      verifyERC20Requirements: async () => ({ isValid: false, missingRequirements: [], errors: [] }),
      verifyERC721Requirements: async () => ({ isValid: false, missingRequirements: [], errors: [] }),
      verifyERC1155Requirements: async () => ({ isValid: false, missingRequirements: [], errors: [] }),
      verifyENSRequirements: async () => ({ isValid: false, missingRequirements: [], errors: [] }),
      verifyEFPRequirements: async () => ({ isValid: false, missingRequirements: [], errors: [] }),
      verifyPostRequirements: async () => ({ isValid: false, missingRequirements: [], errors: [] }),
      getETHBalance: async () => '0',
      getENSProfile: async () => ({}),
      getEFPStats: async () => ({ followers: 0, following: 0 }),
      signMessage: async () => { throw new Error('Ethereum not enabled'); }
    };

    return (
      <EthereumProfileContext.Provider value={minimalContext}>
        {children}
      </EthereumProfileContext.Provider>
    );
  }

  return (
    <EthereumProfileProvider>
      {children}
    </EthereumProfileProvider>
  );
}; 
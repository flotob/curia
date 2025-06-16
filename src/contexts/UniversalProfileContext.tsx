'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { PostSettings, TokenRequirement, SettingsUtils, FollowerRequirement } from '@/types/settings';
import { VerificationResult } from '@/types/gating';
import { ERC725YDataKeys } from '@lukso/lsp-smart-contracts';
import { lsp26Registry } from '@/lib/lsp26';

// LUKSO network configuration
const LUKSO_MAINNET_CHAIN_ID = '0x2a'; // 42 in hex

// Token balance information
export interface TokenBalance {
  contractAddress: string;
  balance: string;
  tokenType: 'LSP7' | 'LSP8';
  name?: string;
  symbol?: string;
}

// Context interface
export interface UniversalProfileContextType {
  // Initialization state
  isInitialized: boolean;
  
  // Connection state
  isConnected: boolean;
  upAddress: string | null;
  isConnecting: boolean;
  connectionError: string | null;
  
  // Chain state
  isCorrectChain: boolean;
  
  // Connection methods
  connect: () => Promise<void>;
  disconnect: () => void;
  switchToLukso: () => Promise<void>;
  checkConnectionState: () => Promise<void>;
  
  // Verification methods
  verifyLyxBalance: (minBalance: string) => Promise<boolean>;
  verifyTokenRequirements: (requirements: TokenRequirement[]) => Promise<VerificationResult>;
  verifyPostRequirements: (settings: PostSettings) => Promise<VerificationResult>;
  
  // Balance queries
  getLyxBalance: () => Promise<string>;
  getTokenBalances: (contractAddresses: string[]) => Promise<TokenBalance[]>;
  
  // Token verification methods
  checkTokenBalance: (contractAddress: string, tokenType: 'LSP7' | 'LSP8') => Promise<{
    balance: string;
    decimals?: number;
    name?: string;
    symbol?: string;
    formattedBalance?: string;
  }>;
  getTokenMetadata: (contractAddress: string, tokenType: 'LSP7' | 'LSP8') => Promise<{
    name: string;
    symbol: string;
    decimals?: number;
  }>;
  
  // Signing methods
  signMessage: (message: string) => Promise<string>;
  
  // LSP26 Follower verification methods
  getFollowerCount: (address?: string) => Promise<number>;
  isFollowedBy: (followerAddress: string, targetAddress?: string) => Promise<boolean>;
  isFollowing: (targetAddress: string, followerAddress?: string) => Promise<boolean>;
  verifyFollowerRequirements: (requirements: FollowerRequirement[]) => Promise<VerificationResult>;
}

const UniversalProfileContext = createContext<UniversalProfileContextType | undefined>(undefined);

export const useUniversalProfile = () => {
  const context = useContext(UniversalProfileContext);
  if (context === undefined) {
    throw new Error('useUniversalProfile must be used within a UniversalProfileProvider');
  }
  return context;
};

interface UniversalProfileProviderProps {
  children: React.ReactNode;
}

export const UniversalProfileProvider: React.FC<UniversalProfileProviderProps> = ({ children }) => {
  return <InternalUniversalProfileProvider>{children}</InternalUniversalProfileProvider>;
};

const InternalUniversalProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Initialize wagmi before using hooks
  useEffect(() => {
    if (typeof window !== 'undefined' && !isInitialized) {
      try {
        // Wagmi config is already created globally, just mark as initialized
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize wagmi:', error);
      }
    }
  }, [isInitialized]);
  
  // Always provide a context - use loading state during initialization
  if (!isInitialized) {
    const loadingContext: UniversalProfileContextType = {
      isInitialized: false,
      isConnected: false,
      upAddress: null,
      isConnecting: false,
      connectionError: null,
      isCorrectChain: false,
      connect: async () => { throw new Error('Still initializing...'); },
      disconnect: () => {},
      switchToLukso: async () => {},
      checkConnectionState: async () => {},
      verifyLyxBalance: async () => false,
      verifyTokenRequirements: async () => ({ isValid: false, missingRequirements: [], errors: ['Still initializing'] }),
      verifyPostRequirements: async () => ({ isValid: false, missingRequirements: [], errors: ['Still initializing'] }),
      getLyxBalance: async () => { throw new Error('Still initializing...'); },
      getTokenBalances: async () => [],
      checkTokenBalance: async () => { throw new Error('Still initializing...'); },
      getTokenMetadata: async () => { throw new Error('Still initializing...'); },
      signMessage: async () => { throw new Error('Still initializing...'); },
      // LSP26 Follower methods
      getFollowerCount: async () => { throw new Error('Still initializing...'); },
      isFollowedBy: async () => { throw new Error('Still initializing...'); },
      isFollowing: async () => { throw new Error('Still initializing...'); },
      verifyFollowerRequirements: async () => ({ isValid: false, missingRequirements: [], errors: ['Still initializing'] })
    };
    
    return (
      <UniversalProfileContext.Provider value={loadingContext}>
        {children}
      </UniversalProfileContext.Provider>
    );
  }
  
  return <InitializedUniversalProfileProvider>{children}</InitializedUniversalProfileProvider>;
};

const InitializedUniversalProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Manual state management (replacing wagmi hooks)
  const [upAddress, setUpAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);

  const isCorrectChain = chainId === LUKSO_MAINNET_CHAIN_ID;

  // Check for existing connection on mount and expose as function
  const checkConnectionState = useCallback(async () => {
    if (!window.lukso) return;
    
    try {
      // Check if already connected
      const accounts = await window.lukso.request({ method: 'eth_accounts' });
      if (accounts && accounts.length > 0) {
        console.log('[UP Context] Connection detected:', accounts[0]);
        setUpAddress(accounts[0]);
        setIsConnected(true);
        
        // Get current chain ID
        const currentChainId = await window.lukso.request({ method: 'eth_chainId' });
        setChainId(currentChainId);
      } else {
        console.log('[UP Context] No active connection found');
        setUpAddress(null);
        setIsConnected(false);
      }
    } catch {
      console.log('[UP Context] No existing connection found');
    }
  }, []);

  // Check connection on mount only (no dependencies to prevent loops)
  useEffect(() => {
    const initialize = async () => {
      await checkConnectionState();
    };
    initialize();
  }, []); // Empty dependency array - only run on mount

  // Listen for account & chain changes (only register once per Provider lifetime)
  const listenerAttachedRef = React.useRef(false);

  useEffect(() => {
    if (!window.lukso || listenerAttachedRef.current) return;

    listenerAttachedRef.current = true;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setUpAddress(null);
        setIsConnected(false);
      } else {
        setUpAddress(accounts[0]);
        setIsConnected(true);
      }
    };

    const handleChainChanged = (newChainId: string) => {
      setChainId(newChainId);
    };

    window.lukso?.on?.('accountsChanged', handleAccountsChanged as (...args: unknown[]) => void);
    window.lukso?.on?.('chainChanged', handleChainChanged as (...args: unknown[]) => void);

    return () => {
      window.lukso?.removeListener?.('accountsChanged', handleAccountsChanged as (...args: unknown[]) => void);
      window.lukso?.removeListener?.('chainChanged', handleChainChanged as (...args: unknown[]) => void);
    };
  }, []);

  // Get provider instance for UP extension
  const getProvider = useCallback((): ethers.providers.Web3Provider | null => {
    if (typeof window === 'undefined' || !window.lukso) return null;
    return new ethers.providers.Web3Provider(window.lukso);
  }, []);

  // Connect to Universal Profile using direct window.lukso
  const handleConnect = useCallback(async () => {
    try {
      setConnectionError(null);
      setIsConnecting(true);
      
      // Check if UP extension is installed
      if (!window.lukso) {
        throw new Error('Universal Profile extension not installed');
      }
      
      // Call eth_requestAccounts on window.lukso specifically
      console.log('[UP Context] Calling window.lukso.request...');
      const accounts = await window.lukso.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (accounts && accounts.length > 0) {
        console.log('[UP Context] UP extension connection successful:', accounts[0]);
        
        // Update state
        setUpAddress(accounts[0]);
        setIsConnected(true);
        setIsConnecting(false);
        
        // Check if we're on the correct network (LUKSO mainnet = 42)
        const currentChainId = await window.lukso.request({ method: 'eth_chainId' });
        console.log('[UP Context] Current chain ID:', currentChainId);
        setChainId(currentChainId);
        
        if (currentChainId !== LUKSO_MAINNET_CHAIN_ID) {
          console.log('[UP Context] Requesting switch to LUKSO mainnet...');
          try {
            await window.lukso.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: LUKSO_MAINNET_CHAIN_ID }],
            });
          } catch (switchError) {
            console.warn('[UP Context] Failed to switch network:', switchError);
          }
        }
        
        // Connection successful - no need for additional state checks
        console.log('[UP Context] Connection completed successfully');
      } else {
        setIsConnecting(false);
        throw new Error('No accounts returned from UP extension');
      }
    } catch (error: unknown) {
      const err = error as { code?: number; message?: string };
      console.error('Failed to connect to Universal Profile:', error);
      setIsConnecting(false);
      if (err?.code === 4001) {
        setConnectionError('Connection rejected by user.');
      } else {
        setConnectionError(err?.message || 'Failed to connect to Universal Profile. Please try again.');
      }
    }
  }, []); // Removed checkConnectionState to prevent circular dependency

  // Disconnect from Universal Profile
  const handleDisconnect = useCallback(() => {
    setUpAddress(null);
    setIsConnected(false);
    setConnectionError(null);
    console.log('[UP Context] Disconnected from Universal Profile');
  }, []);

  // Switch to LUKSO network
  const switchToLukso = useCallback(async () => {
    if (!window.lukso) {
      setConnectionError('Universal Profile extension not available.');
      return;
    }

    try {
      await window.lukso.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: LUKSO_MAINNET_CHAIN_ID }],
      });
    } catch (error) {
      console.error('Failed to switch to LUKSO network:', error);
      setConnectionError('Failed to switch to LUKSO network. Please switch manually in your wallet.');
    }
  }, []);

  // Get LYX balance
  const getLyxBalance = useCallback(async (): Promise<string> => {
    const provider = getProvider();
    if (!provider || !upAddress) {
      throw new Error('No provider or address available');
    }
    
    const balance = await provider.getBalance(upAddress);
    return balance.toString();
  }, [getProvider, upAddress]);

  // Verify LYX balance requirement
  const verifyLyxBalance = useCallback(async (minBalance: string): Promise<boolean> => {
    try {
      const balance = await getLyxBalance();
      const balanceBN = ethers.BigNumber.from(balance);
      const minBalanceBN = ethers.BigNumber.from(minBalance);
      return balanceBN.gte(minBalanceBN);
    } catch (error) {
      console.error('Failed to verify LYX balance:', error);
      return false;
    }
  }, [getLyxBalance]);

  // Get token balances (simplified implementation)
  const getTokenBalances = useCallback(async (contractAddresses: string[]): Promise<TokenBalance[]> => {
    const provider = getProvider();
    if (!provider || !upAddress) {
      return [];
    }

    const balances: TokenBalance[] = [];
    
    // For each contract address, check if it's LSP7 or LSP8 and get balance
    for (const contractAddress of contractAddresses) {
      try {
        // Simple ERC20-like balance check for LSP7 tokens
        const contract = new ethers.Contract(contractAddress, [
          'function balanceOf(address) view returns (uint256)',
          'function name() view returns (string)',
          'function symbol() view returns (string)',
          'function supportsInterface(bytes4) view returns (bool)'
        ], provider);
        
        const balance = await contract.balanceOf(upAddress);
        let name = '';
        let symbol = '';
        
        try {
          name = await contract.name();
          symbol = await contract.symbol();
        } catch {
          // Token might not have name/symbol
        }
        
        balances.push({
          contractAddress,
          balance: balance.toString(),
          tokenType: 'LSP7', // Simplified - would need interface detection
          name,
          symbol
        });
      } catch (error) {
        console.error(`Failed to get balance for ${contractAddress}:`, error);
      }
    }
    
    return balances;
  }, [getProvider, upAddress]);

  // Verify token requirements
  const verifyTokenRequirements = useCallback(async (requirements: TokenRequirement[]): Promise<VerificationResult> => {
    const result: VerificationResult = {
      isValid: true,
      missingRequirements: [],
      errors: []
    };

    if (!upAddress) {
      result.isValid = false;
      result.errors.push('No Universal Profile connected');
      return result;
    }

    try {
      for (const requirement of requirements) {
        const balances = await getTokenBalances([requirement.contractAddress]);
        const tokenBalance = balances.find(b => b.contractAddress.toLowerCase() === requirement.contractAddress.toLowerCase());
        
        if (!tokenBalance) {
          result.isValid = false;
          result.missingRequirements.push(`Missing token: ${requirement.name || requirement.contractAddress}`);
          continue;
        }
        
        // Handle minAmount check (with special LSP8 logic)
        let requiredAmount = requirement.minAmount;
        
        // For LSP8 tokens without specified minAmount, default to "1" (must own at least 1 NFT)
        if (requirement.tokenType === 'LSP8' && !requiredAmount) {
          requiredAmount = '1';
        }
        
        if (requiredAmount) {
          try {
            const balanceBN = ethers.BigNumber.from(tokenBalance.balance);
            const minAmountBN = ethers.BigNumber.from(requiredAmount);
            
            if (balanceBN.lt(minAmountBN)) {
              result.isValid = false;
              const tokenName = requirement.name || requirement.symbol || 'tokens';
              
              if (requirement.tokenType === 'LSP8') {
                const nftCount = balanceBN.toString();
                const requiredCount = minAmountBN.toString();
                result.missingRequirements.push(
                  `Insufficient ${tokenName} NFTs: need ${requiredCount}, have ${nftCount}`
                );
              } else {
                result.missingRequirements.push(
                  `Insufficient ${tokenName}: need ${requiredAmount}, have ${tokenBalance.balance}`
                );
              }
            }
          } catch (bnError) {
            console.error(`BigNumber error for token ${requirement.contractAddress}:`, bnError);
            result.isValid = false;
            result.errors.push(`Invalid token amount for ${requirement.name || requirement.contractAddress}`);
          }
        }
      }
    } catch (error) {
      result.isValid = false;
      result.errors.push(`Failed to verify token requirements: ${error}`);
    }

    return result;
  }, [upAddress, getTokenBalances]);

  // LSP26 Follower verification methods
  const getFollowerCount = useCallback(async (address?: string): Promise<number> => {
    const targetAddress = address || upAddress;
    if (!targetAddress) {
      throw new Error('No address provided and no UP connected');
    }
    
    return await lsp26Registry.getFollowerCount(targetAddress);
  }, [upAddress]);

  const isFollowedBy = useCallback(async (followerAddress: string, targetAddress?: string): Promise<boolean> => {
    const target = targetAddress || upAddress;
    if (!target) {
      throw new Error('No target address provided and no UP connected');
    }
    
    return await lsp26Registry.isFollowing(followerAddress, target);
  }, [upAddress]);

  const isFollowing = useCallback(async (targetAddress: string, followerAddress?: string): Promise<boolean> => {
    const follower = followerAddress || upAddress;
    if (!follower) {
      throw new Error('No follower address provided and no UP connected');
    }
    
    return await lsp26Registry.isFollowing(follower, targetAddress);
  }, [upAddress]);

  const verifyFollowerRequirements = useCallback(async (requirements: FollowerRequirement[]): Promise<VerificationResult> => {
    if (!upAddress) {
      return {
        isValid: false,
        missingRequirements: [],
        errors: ['No Universal Profile connected']
      };
    }

    try {
      console.log(`[UP Context] Verifying ${requirements.length} follower requirements`);
      const lsp26Result = await lsp26Registry.verifyFollowerRequirements(upAddress, requirements);
      
      // Fix the error message mapping
      return {
        isValid: lsp26Result.success,
        missingRequirements: lsp26Result.success ? [] : lsp26Result.errors, // Only show missing requirements if failed
        errors: lsp26Result.success ? [] : lsp26Result.errors
      };
    } catch (error) {
      console.error('[UP Context] Follower verification failed:', error);
      return {
        isValid: false,
        missingRequirements: [],
        errors: [error instanceof Error ? error.message : 'Unknown follower verification error']
      };
    }
  }, [upAddress]);

  // Verify all post requirements
  const verifyPostRequirements = useCallback(async (settings: PostSettings): Promise<VerificationResult> => {
    const result: VerificationResult = {
      isValid: true,
      missingRequirements: [],
      errors: []
    };

    if (!SettingsUtils.hasUPGating(settings)) {
      return result; // No gating enabled
    }

    const requirements = SettingsUtils.getUPGatingRequirements(settings);
    if (!requirements) {
      return result;
    }

    // Check LYX balance requirement
    if (requirements.minLyxBalance) {
      try {
        const hasEnoughLyx = await verifyLyxBalance(requirements.minLyxBalance);
        if (!hasEnoughLyx) {
          result.isValid = false;
          const lyxAmount = ethers.utils.formatEther(requirements.minLyxBalance);
          result.missingRequirements.push(`Minimum ${lyxAmount} LYX required`);
        }
      } catch (error) {
        result.isValid = false;
        result.errors.push(`Failed to verify LYX balance: ${error}`);
      }
    }

    // Check token requirements
    if (requirements.requiredTokens && requirements.requiredTokens.length > 0) {
      const tokenResult = await verifyTokenRequirements(requirements.requiredTokens);
      if (!tokenResult.isValid) {
        result.isValid = false;
        result.missingRequirements.push(...tokenResult.missingRequirements);
        result.errors.push(...tokenResult.errors);
      }
    }

    // Check follower requirements (NEW: LSP26 integration)
    if (requirements.followerRequirements && requirements.followerRequirements.length > 0) {
      const followerResult = await verifyFollowerRequirements(requirements.followerRequirements);
      if (!followerResult.isValid) {
        result.isValid = false;
        result.missingRequirements.push(...followerResult.missingRequirements);
        result.errors.push(...followerResult.errors);
      }
    }

    return result;
  }, [verifyLyxBalance, verifyTokenRequirements, verifyFollowerRequirements]);

  // Sign message with Universal Profile
  const signMessage = useCallback(async (message: string): Promise<string> => {
    const provider = getProvider();
    if (!provider || !upAddress) {
      throw new Error('No provider or address available for signing');
    }
    
    const signer = provider.getSigner();
    return await signer.signMessage(message);
  }, [getProvider, upAddress]);

  // Robust LUKSO token balance checking with proxy pattern support
  const checkTokenBalance = useCallback(async (
    contractAddress: string, 
    tokenType: 'LSP7' | 'LSP8'
  ): Promise<{
    balance: string;
    decimals?: number;
    name?: string;
    symbol?: string;
    formattedBalance?: string;
  }> => {
    const provider = getProvider();
    if (!provider || !upAddress) {
      throw new Error('No provider or address available');
    }

    console.log(`[UP Context] Checking token balance for ${contractAddress} (${tokenType})`);

    try {
      // Step 1: Try direct contract calls first
      const directContract = new ethers.Contract(contractAddress, [
        'function balanceOf(address) view returns (uint256)',
        'function decimals() view returns (uint8)',
        'function name() view returns (string)',
        'function symbol() view returns (string)'
      ], provider);

      let workingContract = directContract;

      // Step 2: If direct calls fail, check for proxy pattern
      try {
        const testBalance = await directContract.balanceOf(upAddress);
        console.log(`[UP Context] Direct contract call successful, balance: ${testBalance.toString()}`);
      } catch (directError) {
        console.log(`[UP Context] Direct contract call failed, checking for proxy:`, directError);
        
        // Check EIP-1967 implementation slot
        try {
          const implSlot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
          const slotValue = await provider.getStorageAt(contractAddress, implSlot);
          
          if (slotValue && slotValue !== ethers.constants.HashZero) {
            const implementationAddress = ethers.utils.getAddress('0x' + slotValue.slice(-40));
            console.log(`[UP Context] Found EIP-1967 proxy, implementation: ${implementationAddress}`);
            
            // For balance calls, still use the proxy address (it should delegate properly)
            // But for metadata that might fail, we can try the implementation
            workingContract = new ethers.Contract(implementationAddress, [
              'function balanceOf(address) view returns (uint256)',
              'function decimals() view returns (uint8)',
              'function name() view returns (string)',
              'function symbol() view returns (string)'
            ], provider);
          }
        } catch (proxyError) {
          console.log(`[UP Context] Proxy detection failed:`, proxyError);
          // Continue with direct contract
        }
      }

      // Step 3: Get balance (always use the original proxy address for balance calls)
      let balance;
      try {
        balance = await directContract.balanceOf(upAddress);
        console.log(`[UP Context] Balance from proxy: ${balance.toString()}`);
      } catch (balanceError) {
        // If proxy balance fails, try implementation
        if (workingContract !== directContract) {
          balance = await workingContract.balanceOf(upAddress);
          console.log(`[UP Context] Balance from implementation: ${balance.toString()}`);
        } else {
          throw balanceError;
        }
      }

      // Step 4: Get metadata (LSP7 vs LSP8 handling)
      let name = 'Unknown';
      let symbol = 'UNK';
      let decimals: number | undefined;

      if (tokenType === 'LSP7') {
        // LSP7 might use ERC725Y data keys for name/symbol but standard decimals()
        try {
          // First try ERC725Y data keys (like LSP8)
          const lsp7Contract = new ethers.Contract(contractAddress, [
            'function getData(bytes32) view returns (bytes)',
            'function getDataBatch(bytes32[]) view returns (bytes[])',
            'function decimals() view returns (uint8)'
          ], provider);

          const dataKeys = [
            ERC725YDataKeys.LSP4.LSP4TokenName,
            ERC725YDataKeys.LSP4.LSP4TokenSymbol
          ];

          const [nameBytes, symbolBytes] = await lsp7Contract.getDataBatch(dataKeys);
          
          // Decode the bytes data
          if (nameBytes && nameBytes !== '0x') {
            name = ethers.utils.toUtf8String(nameBytes);
          }
          if (symbolBytes && symbolBytes !== '0x') {
            symbol = ethers.utils.toUtf8String(symbolBytes);
          }
          
          // Get decimals using standard function (this works)
          decimals = await lsp7Contract.decimals();
          
          console.log(`[UP Context] ✅ LSP7 metadata via ERC725Y: name=${name}, symbol=${symbol}, decimals=${decimals}`);
        } catch (erc725yError) {
          console.log(`[UP Context] ⚠️ LSP7 ERC725Y metadata failed, trying standard functions:`, erc725yError);
          
          // Fallback: try standard ERC20-like functions
          try {
            [name, symbol] = await Promise.all([
              directContract.name(),
              directContract.symbol()
            ]);
            decimals = await directContract.decimals();
            
            console.log(`[UP Context] ⚠️ LSP7 fallback to standard functions: name=${name}, symbol=${symbol}, decimals=${decimals}`);
          } catch (metadataError) {
            console.log(`[UP Context] ⚠️ LSP7 standard functions also failed, trying implementation:`, metadataError);
            
            if (workingContract !== directContract) {
              try {
                [name, symbol] = await Promise.all([
                  workingContract.name().catch(() => 'Unknown'),
                  workingContract.symbol().catch(() => 'UNK')
                ]);
                decimals = await workingContract.decimals().catch(() => 18);
                
                console.log(`[UP Context] ⚠️ LSP7 implementation fallback: name=${name}, symbol=${symbol}, decimals=${decimals}`);
              } catch (implError) {
                console.log(`[UP Context] ❌ LSP7 implementation metadata failed:`, implError);
                decimals = 18;
              }
            } else {
              decimals = 18;
            }
          }
        }
      } else {
        // LSP8 uses ERC725Y data keys for metadata
        try {
          const lsp8Contract = new ethers.Contract(contractAddress, [
            'function getData(bytes32) view returns (bytes)',
            'function getDataBatch(bytes32[]) view returns (bytes[])'
          ], provider);

          // Use ERC725Y data keys for LSP4 metadata
          const dataKeys = [
            ERC725YDataKeys.LSP4.LSP4TokenName,
            ERC725YDataKeys.LSP4.LSP4TokenSymbol
          ];

          const [nameBytes, symbolBytes] = await lsp8Contract.getDataBatch(dataKeys);
          
          // Decode the bytes data
          if (nameBytes && nameBytes !== '0x') {
            name = ethers.utils.toUtf8String(nameBytes);
          }
          if (symbolBytes && symbolBytes !== '0x') {
            symbol = ethers.utils.toUtf8String(symbolBytes);
          }
          
          console.log(`[UP Context] ✅ LSP8 metadata via ERC725Y: name=${name}, symbol=${symbol}`);
        } catch (lsp8Error) {
          console.log(`[UP Context] ❌ LSP8 ERC725Y metadata failed:`, lsp8Error);
          
          // Fallback: try standard name()/symbol() functions in case it's a hybrid
          try {
            [name, symbol] = await Promise.all([
              directContract.name().catch(() => 'Unknown'),
              directContract.symbol().catch(() => 'UNK')
            ]);
            console.log(`[UP Context] ⚠️ LSP8 fallback to standard functions: name=${name}, symbol=${symbol}`);
          } catch (fallbackError) {
            console.log(`[UP Context] ❌ LSP8 fallback also failed:`, fallbackError);
          }
        }
      }

      // Step 5: Format balance with proper decimals
      const formattedBalance = tokenType === 'LSP7' ? 
        ethers.utils.formatUnits(balance, decimals || 18) :
        balance.toString(); // For NFTs, just show count

      const result = {
        balance: balance.toString(),
        decimals: tokenType === 'LSP7' ? decimals : undefined,
        name,
        symbol,
        formattedBalance
      };

      console.log(`[UP Context] ✅ Successfully fetched token data:`, result);
      return result;
      
    } catch (error) {
      console.error(`[UP Context] Failed to check ${tokenType} token balance for ${contractAddress}:`, error);
      throw error;
    }
  }, [getProvider, upAddress]);

  // Get token metadata
  const getTokenMetadata = useCallback(async (
    contractAddress: string, 
    tokenType: 'LSP7' | 'LSP8'
  ): Promise<{
    name: string;
    symbol: string;
    decimals?: number;
  }> => {
    const provider = getProvider();
    if (!provider) {
      throw new Error('No provider available');
    }

    try {
      if (tokenType === 'LSP7') {
        // LSP7 might use ERC725Y data keys for name/symbol but standard decimals()
        let name = 'Unknown Token';
        let symbol = 'UNK';
        let decimals = 18;

        try {
          // First try ERC725Y data keys (like LSP8)
          const lsp7Contract = new ethers.Contract(contractAddress, [
            'function getData(bytes32) view returns (bytes)',
            'function getDataBatch(bytes32[]) view returns (bytes[])',
            'function decimals() view returns (uint8)'
          ], provider);

          const dataKeys = [
            ERC725YDataKeys.LSP4.LSP4TokenName,
            ERC725YDataKeys.LSP4.LSP4TokenSymbol
          ];

          const [nameBytes, symbolBytes] = await lsp7Contract.getDataBatch(dataKeys);
          
          // Decode the bytes data
          if (nameBytes && nameBytes !== '0x') {
            name = ethers.utils.toUtf8String(nameBytes);
          }
          if (symbolBytes && symbolBytes !== '0x') {
            symbol = ethers.utils.toUtf8String(symbolBytes);
          }
          
          // Get decimals using standard function (this works)
          decimals = await lsp7Contract.decimals();
        } catch (erc725yError) {
          console.log(`LSP7 ERC725Y metadata failed, trying fallback:`, erc725yError);
          
          // Fallback: try standard ERC20-like functions
          try {
            const contract = new ethers.Contract(contractAddress, [
              'function decimals() view returns (uint8)', 
              'function name() view returns (string)', 
              'function symbol() view returns (string)'
            ], provider);
            
            const namePromise = contract.name().catch(() => 'Unknown Token');
            const symbolPromise = contract.symbol().catch(() => 'UNK');
            const decimalsPromise = contract.decimals().catch(() => 18);
            
            [name, symbol, decimals] = await Promise.all([
              namePromise,
              symbolPromise,
              decimalsPromise
            ]);
          } catch (fallbackError) {
            console.log(`LSP7 fallback metadata also failed:`, fallbackError);
          }
        }
        
        return { name, symbol, decimals };
        
      } else {
        // LSP8 uses ERC725Y data keys for metadata
        const contract = new ethers.Contract(contractAddress, [
          'function getData(bytes32) view returns (bytes)',
          'function getDataBatch(bytes32[]) view returns (bytes[])'
        ], provider);

        // Use ERC725Y data keys for LSP4 metadata
        const dataKeys = [
          ERC725YDataKeys.LSP4.LSP4TokenName,
          ERC725YDataKeys.LSP4.LSP4TokenSymbol
        ];

        let name = 'Unknown Token';
        let symbol = 'UNK';

        try {
          const [nameBytes, symbolBytes] = await contract.getDataBatch(dataKeys);
          
          // Decode the bytes data
          if (nameBytes && nameBytes !== '0x') {
            name = ethers.utils.toUtf8String(nameBytes);
          }
          if (symbolBytes && symbolBytes !== '0x') {
            symbol = ethers.utils.toUtf8String(symbolBytes);
          }
        } catch (erc725yError) {
          console.log(`LSP8 ERC725Y metadata failed, trying fallback:`, erc725yError);
          
          // Fallback: try standard name()/symbol() functions
          try {
            const fallbackContract = new ethers.Contract(contractAddress, [
              'function name() view returns (string)', 
              'function symbol() view returns (string)'
            ], provider);
            
            const namePromise = fallbackContract.name().catch(() => 'Unknown Token');
            const symbolPromise = fallbackContract.symbol().catch(() => 'UNK');
            
            [name, symbol] = await Promise.all([namePromise, symbolPromise]);
          } catch (fallbackError) {
            console.log(`LSP8 fallback metadata also failed:`, fallbackError);
          }
        }
        
        return { name, symbol, decimals: undefined };
      }
      
    } catch (error) {
      console.error(`Failed to get ${tokenType} token metadata:`, error);
      throw error;
    }
  }, [getProvider]);

  const contextValue: UniversalProfileContextType = {
    // Initialization state
    isInitialized: true,
    
    // Connection state
    isConnected,
    upAddress,
    isConnecting,
    connectionError,
    
    // Chain state
    isCorrectChain,
    
    // Connection methods
    connect: handleConnect,
    disconnect: handleDisconnect,
    switchToLukso,
    checkConnectionState,
    
    // Verification methods
    verifyLyxBalance,
    verifyTokenRequirements,
    verifyPostRequirements,
    
    // Balance queries
    getLyxBalance,
    getTokenBalances,
    
    // Token verification methods
    checkTokenBalance,
    getTokenMetadata,
    
    // Signing methods
    signMessage,
    
    // LSP26 Follower verification methods
    getFollowerCount,
    isFollowedBy,
    isFollowing,
    verifyFollowerRequirements
  };

  return (
    <UniversalProfileContext.Provider value={contextValue}>
      {children}
    </UniversalProfileContext.Provider>
  );
}; 
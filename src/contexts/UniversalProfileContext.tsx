'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { init, useConnectWallet, useSetChain } from '@web3-onboard/react';
import injectedModule from '@web3-onboard/injected-wallets';
import { ethers } from 'ethers';
import { PostSettings, TokenRequirement, SettingsUtils } from '@/types/settings';

// LUKSO network configuration
const luksoMainnet = {
  id: '0x2a', // 42 in hex
  token: 'LYX',
  label: 'LUKSO Mainnet',
  rpcUrl: process.env.NEXT_PUBLIC_LUKSO_MAINNET_RPC_URL || 'https://rpc.mainnet.lukso.network'
};

// Web3-Onboard configuration
const injected = injectedModule();

const initOnboard = () => {
  return init({
    wallets: [injected],
    chains: [luksoMainnet],
    appMetadata: {
      name: 'Curia',
      icon: '<svg>...</svg>', // Your app icon
      description: 'Community governance and discussions'
    },
    connect: {
      autoConnectLastWallet: true
    }
  });
};

// Verification result interface
export interface VerificationResult {
  isValid: boolean;
  missingRequirements: string[];
  errors: string[];
}

// Token balance information
export interface TokenBalance {
  contractAddress: string;
  balance: string;
  tokenType: 'LSP7' | 'LSP8';
  name?: string;
  symbol?: string;
}

// Context interface
interface UniversalProfileContextType {
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
  
  // Verification methods
  verifyLyxBalance: (minBalance: string) => Promise<boolean>;
  verifyTokenRequirements: (requirements: TokenRequirement[]) => Promise<VerificationResult>;
  verifyPostRequirements: (settings: PostSettings) => Promise<VerificationResult>;
  
  // Balance queries
  getLyxBalance: () => Promise<string>;
  getTokenBalances: (contractAddresses: string[]) => Promise<TokenBalance[]>;
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
  const [{ wallet, connecting }, connect, disconnect] = useConnectWallet();
  const [{ connectedChain }, setChain] = useSetChain();
  
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const isConnected = !!wallet?.accounts?.[0];
  const upAddress = wallet?.accounts?.[0]?.address || null;
  const isCorrectChain = connectedChain?.id === luksoMainnet.id;
  
  // Get provider instance
  const getProvider = useCallback((): ethers.providers.Web3Provider | null => {
    if (!wallet?.provider) return null;
    return new ethers.providers.Web3Provider(wallet.provider);
  }, [wallet]);

  // Connect to Universal Profile
  const handleConnect = useCallback(async () => {
    try {
      setConnectionError(null);
      await connect();
    } catch (error) {
      console.error('Failed to connect to Universal Profile:', error);
      setConnectionError('Failed to connect to Universal Profile. Please try again.');
    }
  }, [connect]);

  // Disconnect from Universal Profile
  const handleDisconnect = useCallback(() => {
    if (wallet) {
      disconnect(wallet);
    }
    setConnectionError(null);
  }, [disconnect, wallet]);

  // Switch to LUKSO network
  const switchToLukso = useCallback(async () => {
    try {
      await setChain({ chainId: luksoMainnet.id });
    } catch (error) {
      console.error('Failed to switch to LUKSO network:', error);
      setConnectionError('Failed to switch to LUKSO network. Please switch manually in your wallet.');
    }
  }, [setChain]);

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
        
        if (requirement.minAmount) {
          const balanceBN = ethers.BigNumber.from(tokenBalance.balance);
          const minAmountBN = ethers.BigNumber.from(requirement.minAmount);
          
          if (balanceBN.lt(minAmountBN)) {
            result.isValid = false;
            result.missingRequirements.push(
              `Insufficient ${requirement.name || requirement.symbol || 'tokens'}: need ${requirement.minAmount}, have ${tokenBalance.balance}`
            );
          }
        }
      }
    } catch (error) {
      result.isValid = false;
      result.errors.push(`Failed to verify token requirements: ${error}`);
    }

    return result;
  }, [upAddress, getTokenBalances]);

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

    return result;
  }, [verifyLyxBalance, verifyTokenRequirements]);

  const contextValue: UniversalProfileContextType = {
    // Connection state
    isConnected,
    upAddress,
    isConnecting: connecting,
    connectionError,
    
    // Chain state
    isCorrectChain,
    
    // Connection methods
    connect: handleConnect,
    disconnect: handleDisconnect,
    switchToLukso,
    
    // Verification methods
    verifyLyxBalance,
    verifyTokenRequirements,
    verifyPostRequirements,
    
    // Balance queries
    getLyxBalance,
    getTokenBalances
  };

  return (
    <UniversalProfileContext.Provider value={contextValue}>
      {children}
    </UniversalProfileContext.Provider>
  );
};

// Initialize Web3-Onboard
let onboardInitialized = false;
if (typeof window !== 'undefined' && !onboardInitialized) {
  initOnboard();
  onboardInitialized = true;
} 
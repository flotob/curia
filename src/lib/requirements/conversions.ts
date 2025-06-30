import { ethers } from 'ethers';

/**
 * Currency conversion utilities for requirement configuration
 * Extracted from proven logic in existing components
 */

// ===== ETH CONVERSIONS =====

export const parseEthToWei = (ethAmount: string): string => {
  try {
    if (!ethAmount.trim()) {
      throw new Error('Amount cannot be empty');
    }
    return ethers.utils.parseEther(ethAmount).toString();
  } catch {
    throw new Error('Invalid ETH amount format');
  }
};

export const formatWeiToEth = (weiAmount: string): string => {
  try {
    return ethers.utils.formatEther(weiAmount);
  } catch {
    return weiAmount; // Fallback to original value
  }
};

export const isValidEthAmount = (ethAmount: string): boolean => {
  try {
    if (!ethAmount.trim()) return false;
    const parsed = ethers.utils.parseEther(ethAmount);
    return parsed.gt(0);
  } catch {
    return false;
  }
};

// ===== LYX CONVERSIONS =====

export const parseLyxToWei = (lyxAmount: string): string => {
  try {
    if (!lyxAmount.trim()) {
      throw new Error('Amount cannot be empty');
    }
    return ethers.utils.parseEther(lyxAmount).toString();
  } catch {
    throw new Error('Invalid LYX amount format');
  }
};

export const formatWeiToLyx = (weiAmount: string): string => {
  try {
    return ethers.utils.formatEther(weiAmount);
  } catch {
    return weiAmount; // Fallback to original value
  }
};

export const isValidLyxAmount = (lyxAmount: string): boolean => {
  try {
    if (!lyxAmount.trim()) return false;
    const parsed = ethers.utils.parseEther(lyxAmount);
    return parsed.gt(0);
  } catch {
    return false;
  }
};

// ===== TOKEN CONVERSIONS =====

export const parseTokenAmount = (amount: string, decimals: number = 18): string => {
  try {
    if (!amount.trim()) {
      throw new Error('Amount cannot be empty');
    }
    return ethers.utils.parseUnits(amount, decimals).toString();
  } catch {
    throw new Error('Invalid token amount format');
  }
};

export const formatTokenAmount = (amount: string, decimals: number = 18): string => {
  try {
    return ethers.utils.formatUnits(amount, decimals);
  } catch {
    return amount; // Fallback to original value
  }
};

export const isValidTokenAmount = (amount: string, decimals: number = 18): boolean => {
  try {
    if (!amount.trim()) return false;
    const parsed = ethers.utils.parseUnits(amount, decimals);
    return parsed.gt(0);
  } catch {
    return false;
  }
};

// ===== DISPLAY HELPERS =====

export const formatDisplayAmount = (amount: string, decimals: number = 18, maxDecimals: number = 4): string => {
  try {
    const formatted = ethers.utils.formatUnits(amount, decimals);
    const num = parseFloat(formatted);
    
    if (num === 0) return '0';
    if (num < 0.0001) return '< 0.0001';
    
    return num.toLocaleString(undefined, {
      maximumFractionDigits: maxDecimals,
      minimumFractionDigits: 0
    });
  } catch {
    return amount;
  }
};

// ===== VALIDATION HELPERS =====

export const validatePositiveNumber = (value: string): { isValid: boolean; error?: string } => {
  if (!value.trim()) {
    return { isValid: false, error: 'Amount is required' };
  }
  
  const num = parseFloat(value);
  if (isNaN(num)) {
    return { isValid: false, error: 'Must be a valid number' };
  }
  
  if (num <= 0) {
    return { isValid: false, error: 'Amount must be greater than 0' };
  }
  
  return { isValid: true };
};

// ===== ADDRESS FORMATTING =====

/**
 * Format Ethereum address with ellipsis (e.g., "0x1234...5678")
 * Consolidates implementations from RichCategoryHeader.tsx, InlineUPConnection.tsx, etc.
 */
export const formatAddress = (address: string, options?: { 
  short?: boolean; 
  startChars?: number; 
  endChars?: number;
}): string => {
  const { short = true, startChars = 6, endChars = 4 } = options || {};
  
  if (!address || address.length < 10) {
    return address || '';
  }
  
  if (!short) {
    return address;
  }
  
  // Ensure we have enough characters to format
  const actualStartChars = Math.min(startChars, address.length - endChars - 3);
  const actualEndChars = Math.min(endChars, address.length - actualStartChars - 3);
  
  if (actualStartChars <= 0 || actualEndChars <= 0) {
    return address;
  }
  
  return `${address.slice(0, actualStartChars)}...${address.slice(-actualEndChars)}`;
};

/**
 * Format address with additional context (e.g., "vitalik.eth (0x1234...5678)")
 */
export const formatAddressWithENS = (address: string, ensName?: string | null): string => {
  if (ensName) {
    return `${ensName} (${formatAddress(address)})`;
  }
  return formatAddress(address);
};

/**
 * Generate a consistent gradient class for avatar backgrounds based on address
 * Consolidates implementations from RichCategoryHeader.tsx and other components
 */
export const generateAvatarGradient = (address: string): string => {
  const colors = [
    'from-pink-400 to-purple-500',
    'from-blue-400 to-indigo-500', 
    'from-green-400 to-teal-500',
    'from-yellow-400 to-orange-500',
    'from-red-400 to-pink-500',
    'from-purple-400 to-pink-500'
  ];
  
  if (!address || address.length < 4) {
    return colors[0]; // Fallback to first gradient
  }
  
  const index = parseInt(address.slice(2, 4), 16) % colors.length;
  return colors[index];
}; 
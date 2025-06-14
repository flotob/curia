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
/**
 * Validation utilities for requirement configuration
 * Extracted from proven logic in existing components
 */

// ===== ADDRESS VALIDATION =====

export const isValidEthereumAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

export const isValidContractAddress = (address: string): boolean => {
  return isValidEthereumAddress(address);
};

export const validateEthereumAddress = (address: string): { isValid: boolean; error?: string } => {
  if (!address.trim()) {
    return { isValid: false, error: 'Address is required' };
  }
  
  if (!isValidEthereumAddress(address)) {
    return { isValid: false, error: 'Invalid Ethereum address format (must be 0x followed by 40 hex characters)' };
  }
  
  return { isValid: true };
};

// ===== ENS VALIDATION =====

export const isValidENSPattern = (pattern: string): boolean => {
  // Basic ENS pattern validation
  if (!pattern.trim()) return false;
  
  // Allow wildcards with .eth or other TLDs
  const ensRegex = /^(\*\.)?[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-z]{2,}$|^\*\.[a-z]{2,}$|^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-z]{2,}$/;
  return ensRegex.test(pattern);
};

export const validateENSPattern = (pattern: string): { isValid: boolean; error?: string } => {
  if (!pattern.trim()) {
    return { isValid: false, error: 'ENS pattern is required' };
  }
  
  if (!isValidENSPattern(pattern)) {
    return { isValid: false, error: 'Invalid ENS pattern (e.g., *.eth, vitalik.eth, or example.com)' };
  }
  
  return { isValid: true };
};

export const parseENSPatterns = (patternsString: string): string[] => {
  return patternsString
    .split(',')
    .map(pattern => pattern.trim())
    .filter(pattern => pattern.length > 0);
};

export const validateENSPatterns = (patternsString: string): { isValid: boolean; patterns: string[]; errors: string[] } => {
  const patterns = parseENSPatterns(patternsString);
  
  if (patterns.length === 0) {
    return { 
      isValid: false, 
      patterns: [], 
      errors: ['At least one ENS pattern is required'] 
    };
  }
  
  const errors: string[] = [];
  patterns.forEach((pattern, index) => {
    const validation = validateENSPattern(pattern);
    if (!validation.isValid) {
      errors.push(`Pattern ${index + 1}: ${validation.error}`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    patterns,
    errors
  };
};

// ===== TOKEN ID VALIDATION =====

export const validateTokenId = (tokenId: string): { isValid: boolean; error?: string } => {
  if (!tokenId.trim()) {
    return { isValid: false, error: 'Token ID is required' };
  }
  
  // Check if it's a valid number (for most NFTs)
  const numericId = parseInt(tokenId, 10);
  if (isNaN(numericId) || numericId < 0) {
    return { isValid: false, error: 'Token ID must be a valid non-negative number' };
  }
  
  return { isValid: true };
};

// ===== FOLLOWER COUNT VALIDATION =====

export const validateFollowerCount = (count: string): { isValid: boolean; error?: string } => {
  if (!count.trim()) {
    return { isValid: false, error: 'Follower count is required' };
  }
  
  const num = parseInt(count, 10);
  if (isNaN(num)) {
    return { isValid: false, error: 'Follower count must be a valid number' };
  }
  
  if (num < 1) {
    return { isValid: false, error: 'Follower count must be at least 1' };
  }
  
  if (num > 1000000) {
    return { isValid: false, error: 'Follower count cannot exceed 1,000,000' };
  }
  
  return { isValid: true };
};

// ===== GENERAL FORM VALIDATION =====

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export const combineValidations = (...validations: Array<{ isValid: boolean; error?: string; field?: string }>): ValidationResult => {
  const errors: Record<string, string> = {};
  let isValid = true;
  
  validations.forEach((validation, index) => {
    if (!validation.isValid) {
      isValid = false;
      const field = validation.field || `field_${index}`;
      errors[field] = validation.error || 'Validation failed';
    }
  });
  
  return { isValid, errors };
};

// ===== CONTRACT INTERFACE VALIDATION =====

export const LUKSO_INTERFACE_IDS = {
  LSP7_NEW: '0xc52d6008',
  LSP7_LEGACY: '0xb3c4928f', 
  LSP8: '0x3a271706'
} as const;

export const ERC_INTERFACE_IDS = {
  ERC20: '0x36372b07',
  ERC721: '0x80ac58cd',
  ERC1155: '0xd9b67a26'
} as const; 
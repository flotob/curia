// ENS utilities for name-first search functionality
// Uses existing working API services - no CORS issues

import { isValidEthereumAddress } from '@/lib/requirements/validation';

interface ENSProfile {
  address: string;
  name?: string;
  avatar?: string;
  description?: string;
  isValidENS: boolean;
}

/**
 * Resolve ENS name to Ethereum address using ENSData.net API
 * @param ensName - ENS name (e.g., "vitalik.eth") 
 * @returns Ethereum address or null if not found
 */
export const resolveENSToAddress = async (ensName: string): Promise<string | null> => {
  try {
    if (!ensName || !ensName.includes('.')) {
      return null;
    }

    console.log(`[ENS] Resolving ${ensName} via ENSData.net`);
    const response = await fetch(`https://ensdata.net/${ensName}`);
    
    if (response.ok) {
      const data = await response.json();
      const address = data.address;
      console.log(`[ENS] Resolved ${ensName} → ${address}`);
      return address;
    }
    
    console.log(`[ENS] No resolution found for ${ensName}`);
    return null;
    
  } catch (error) {
    console.warn(`[ENS] Failed to resolve name ${ensName}:`, error);
    return null;
  }
};

/**
 * Reverse resolve Ethereum address to ENS name using ENSData.net API
 * @param address - Ethereum address
 * @returns ENS name or null if not found
 */
export const resolveAddressToENS = async (address: string): Promise<string | null> => {
  try {
    if (!address || !isValidEthereumAddress(address)) {
      return null;
    }

    console.log(`[ENS] Reverse resolving ${address} via ENSData.net`);
    const response = await fetch(`https://ensdata.net/${address}`);
    
    if (response.ok) {
      const data = await response.json();
      const ensName = data.name;
      console.log(`[ENS] Reverse resolved ${address} → ${ensName}`);
      return ensName;
    }
    
    console.log(`[ENS] No ENS name found for ${address}`);
    return null;
    
  } catch (error) {
    console.warn(`[ENS] Failed to reverse resolve address ${address}:`, error);
    return null;
  }
};

/**
 * Get ENS profile with avatar and other metadata using ENSData.net API
 * @param ensName - ENS name
 * @returns Complete ENS profile data
 */
export const getENSProfile = async (ensName: string): Promise<ENSProfile | null> => {
  try {
    if (!ensName || !ensName.includes('.')) {
      return null;
    }

    console.log(`[ENS] Fetching profile for ${ensName} via ENSData.net`);
    const response = await fetch(`https://ensdata.net/${ensName}`);
    
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (!data.address) {
      return null;
    }

    const profile: ENSProfile = {
      address: data.address,
      name: data.name || ensName,
      avatar: data.avatar,
      description: data.description,
      isValidENS: true
    };

    console.log(`[ENS] Complete profile for ${ensName}:`, profile);
    return profile;
    
  } catch (error) {
    console.warn(`[ENS] Failed to get ENS profile for ${ensName}:`, error);
    return null;
  }
};

/**
 * Smart search that handles both ENS names and Ethereum addresses
 * @param query - Search query (ENS name or Ethereum address)
 * @returns Normalized result with address and ENS name if available
 */
export const smartENSSearch = async (query: string): Promise<ENSProfile | null> => {
  try {
    const cleanQuery = query.trim().toLowerCase();
    
    if (!cleanQuery) {
      return null;
    }

    // If it looks like an Ethereum address (0x + 40 hex chars)
    if (isValidEthereumAddress(cleanQuery)) {
      console.log(`[ENS] Query is Ethereum address: ${cleanQuery}`);
      
      // Try to get ENS name for this address
      const ensName = await resolveAddressToENS(cleanQuery);
      
      return {
        address: cleanQuery,
        name: ensName || undefined,
        isValidENS: !!ensName
      };
    }
    
    // If it looks like an ENS name (contains a dot)
    if (cleanQuery.includes('.')) {
      console.log(`[ENS] Query is potential ENS name: ${cleanQuery}`);
      
      // Get full ENS profile
      return await getENSProfile(cleanQuery);
    }
    
    // Query doesn't match either pattern
    console.log(`[ENS] Query doesn't match address or ENS pattern: ${cleanQuery}`);
    return null;
    
  } catch (error) {
    console.error(`[ENS] Smart search failed for query "${query}":`, error);
    return null;
  }
};

/**
 * Validate if a string could be an ENS name
 * @param input - Input string to validate
 * @returns True if input could be a valid ENS name
 */
export const isValidENSName = (input: string): boolean => {
  if (!input || typeof input !== 'string') {
    return false;
  }
  
  const cleanInput = input.trim().toLowerCase();
  
  // Must contain a dot and end with a valid TLD
  const validTlds = ['.eth', '.xyz', '.com', '.org', '.io', '.app', '.art'];
  const hasDot = cleanInput.includes('.');
  const hasValidTld = validTlds.some(tld => cleanInput.endsWith(tld));
  
  return hasDot && hasValidTld;
};

/**
 * Format display name for ENS profiles
 * @param profile - ENS profile
 * @returns Formatted display name
 */
export const formatENSDisplayName = (profile: ENSProfile): string => {
  if (profile.name) {
    return profile.name;
  }
  
  return `${profile.address.slice(0, 6)}...${profile.address.slice(-4)}`;
};

/**
 * Export utility object for easy importing
 */
export const ENSUtils = {
  resolveENSToAddress,
  resolveAddressToENS,
  getENSProfile,
  smartENSSearch,
  isValidENSName,
  isValidEthereumAddress, // Imported from validation utils
  formatENSDisplayName
};

export default ENSUtils; 
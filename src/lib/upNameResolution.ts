// Universal Profile name resolution utilities
// Uses LUKSO Envio indexer and UniversalEverything API for UP handle resolution

interface UPProfile {
  address: string;
  name?: string;
  handle?: string; // "username#suffix"
  isValid: boolean;
}

interface UniversalEverythingSearchResponse {
  address?: string;
  name?: string;
  metadata?: {
    LSP3Profile?: {
      name?: string;
      description?: string;
      profileImage?: Array<{ url: string }>;
    };
  };
}

/**
 * Parse Universal Profile handle into name and suffix components
 * @param handle - UP handle (e.g., "feindura#WSu4" or "@feindura#WSu4")
 * @returns Object with name and suffix, or null if invalid format
 */
export const parseUPHandle = (handle: string): { name: string; suffix: string } | null => {
  try {
    if (!handle || typeof handle !== 'string') {
      return null;
    }

    // Remove @ prefix if present
    const cleanHandle = handle.replace(/^@/, '').trim();
    
    // Must contain exactly one # character
    const parts = cleanHandle.split('#');
    if (parts.length !== 2) {
      return null;
    }

    const [name, suffix] = parts;
    
    // Validate name (should be non-empty and reasonable length)
    if (!name || name.length < 1 || name.length > 50) {
      return null;
    }
    
    // Validate suffix (should be 4 characters, alphanumeric)
    if (!suffix || suffix.length !== 4 || !/^[a-zA-Z0-9]{4}$/.test(suffix)) {
      return null;
    }

    return { name, suffix };
  } catch (error) {
    console.warn(`[UPNameResolution] Failed to parse handle "${handle}":`, error);
    return null;
  }
};

/**
 * Resolve Universal Profile handle to address using UniversalEverything API
 * @param handle - UP handle (e.g., "feindura#WSu4")
 * @returns UP address or null if not found
 */
export const resolveUPHandleToAddress = async (handle: string): Promise<string | null> => {
  try {
    const parsed = parseUPHandle(handle);
    if (!parsed) {
      console.log(`[UPNameResolution] Invalid handle format: ${handle}`);
      return null;
    }

    const { name, suffix } = parsed;
    console.log(`[UPNameResolution] Resolving ${handle} via UniversalEverything API`);

    // Use UniversalEverything search API for exact match
    const response = await fetch('https://universaleverything.io/api/profiles/search', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ 
        name: name, 
        addressSuffix: suffix 
      })
    });
    
    if (!response.ok) {
      console.log(`[UPNameResolution] API request failed for ${handle}: ${response.status}`);
      return null;
    }

    const data: UniversalEverythingSearchResponse = await response.json();
    
    if (data.address && isValidUPAddress(data.address)) {
      console.log(`[UPNameResolution] Resolved ${handle} → ${data.address}`);
      return data.address;
    }
    
    console.log(`[UPNameResolution] No valid address found for ${handle}`);
    return null;
    
  } catch (error) {
    console.warn(`[UPNameResolution] Failed to resolve handle ${handle}:`, error);
    return null;
  }
};

/**
 * Get complete Universal Profile information by handle
 * @param handle - UP handle (e.g., "feindura#WSu4")
 * @returns Complete UP profile data or null if not found
 */
export const getUPProfile = async (handle: string): Promise<UPProfile | null> => {
  try {
    const parsed = parseUPHandle(handle);
    if (!parsed) {
      return null;
    }

    const { name, suffix } = parsed;
    console.log(`[UPNameResolution] Fetching profile for ${handle} via UniversalEverything API`);
    
    const response = await fetch('https://universaleverything.io/api/profiles/search', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ 
        name: name, 
        addressSuffix: suffix 
      })
    });
    
    if (!response.ok) {
      return null;
    }

    const data: UniversalEverythingSearchResponse = await response.json();
    
    if (!data.address || !isValidUPAddress(data.address)) {
      return null;
    }

    const profile: UPProfile = {
      address: data.address,
      name: data.metadata?.LSP3Profile?.name || data.name || name,
      handle: handle,
      isValid: true
    };

    console.log(`[UPNameResolution] Complete profile for ${handle}:`, profile);
    return profile;
    
  } catch (error) {
    console.warn(`[UPNameResolution] Failed to get UP profile for ${handle}:`, error);
    return null;
  }
};

/**
 * Validate if a string is a valid Universal Profile address
 * @param address - Address to validate
 * @returns True if valid UP address format
 */
export const isValidUPAddress = (address: string): boolean => {
  if (!address || typeof address !== 'string') {
    return false;
  }
  
  // UP addresses are standard Ethereum addresses (0x + 40 hex characters)
  const upAddressRegex = /^0x[a-fA-F0-9]{40}$/;
  return upAddressRegex.test(address);
};

/**
 * Validate if a string could be a Universal Profile handle
 * @param input - Input string to validate
 * @returns True if input could be a valid UP handle
 */
export const isValidUPHandle = (input: string): boolean => {
  return parseUPHandle(input) !== null;
};

/**
 * Smart search that can handle both UP handles and addresses
 * @param query - Search query (UP handle or address)
 * @returns Normalized result with address and handle if available
 */
export const smartUPSearch = async (query: string): Promise<UPProfile | null> => {
  try {
    const cleanQuery = query.trim();
    
    if (!cleanQuery) {
      return null;
    }

    // If it looks like a UP address (0x + 40 hex chars)
    if (isValidUPAddress(cleanQuery)) {
      console.log(`[UPNameResolution] Query is UP address: ${cleanQuery}`);
      
      return {
        address: cleanQuery,
        isValid: true
      };
    }
    
    // If it looks like a UP handle (name#suffix)
    if (isValidUPHandle(cleanQuery)) {
      console.log(`[UPNameResolution] Query is UP handle: ${cleanQuery}`);
      
      // Get full UP profile by handle
      return await getUPProfile(cleanQuery);
    }
    
    // Query doesn't match either pattern
    console.log(`[UPNameResolution] Query doesn't match address or handle pattern: ${cleanQuery}`);
    return null;
    
  } catch (error) {
    console.error(`[UPNameResolution] Smart search failed for query "${query}":`, error);
    return null;
  }
};

/**
 * Format display name for UP profiles
 * @param profile - UP profile
 * @returns Formatted display name
 */
export const formatUPDisplayName = (profile: UPProfile): string => {
  if (profile.handle) {
    return `@${profile.handle}`;
  }
  
  if (profile.name) {
    return profile.name;
  }
  
  return `${profile.address.slice(0, 6)}...${profile.address.slice(-4)}`;
};

/**
 * Export utility object for easy importing
 */
export const UPNameUtils = {
  parseUPHandle,
  resolveUPHandleToAddress,
  getUPProfile,
  smartUPSearch,
  isValidUPAddress,
  isValidUPHandle,
  formatUPDisplayName
};

export default UPNameUtils;
import { ERC725 } from '@erc725/erc725.js';
import LSP3ProfileSchema from '@erc725/erc725.js/schemas/LSP3ProfileMetadata.json';

// LUKSO RPC endpoint
const getLuksoRpcUrl = (): string => {
  return process.env.NEXT_PUBLIC_LUKSO_MAINNET_RPC_URL || 'https://rpc.mainnet.lukso.network';
};

export interface LSP3Image {
  width?: number;
  height?: number;
  url: string;
  verification?: {
    method: string;
    data: string;
  };
}

export interface LSP3Link {
  title?: string;
  url: string;
}

export interface UPProfileMetadata {
  name?: string;
  description?: string;
  profileImage?: LSP3Image[];
  backgroundImage?: LSP3Image[];
  tags?: string[];
  links?: LSP3Link[];
}

export interface UPProfileInfo {
  address: string;
  name?: string;
  description?: string;
  profileImage?: string;
  backgroundImage?: string;
  tags?: string[];
  links?: LSP3Link[];
  username?: string; // Generated username#1234 format
  displayName?: string; // Formatted display name
  error?: string;
}

export interface UPSocialProfile {
  address: string;
  displayName: string; // Either UP name or fallback to shortened address
  username: string; // name#1234 or 0x1234abcd#5678 format (LUKSO convention)
  profileImage?: string;
  backgroundImage?: string;
  bio?: string; // Description field
  tags?: string[];
  socialLinks?: Array<{
    title?: string;
    url: string;
    type?: 'twitter' | 'github' | 'website' | 'discord' | 'telegram' | 'other';
  }>;
  isVerified?: boolean; // Has complete profile data
  lastFetched?: Date;
  error?: string;
}

/**
 * Resolve IPFS URLs to use LUKSO gateway
 */
const resolveIpfsUrl = (url: string): string => {
  if (url.startsWith('ipfs://')) {
    return `https://api.universalprofile.cloud/ipfs/${url.substring(7)}`;
  }
  return url;
};

/**
 * Fetch Universal Profile metadata using ERC725.js library
 * Enhanced with social profile features and caching
 */
export class UPProfileFetcher {
  private rpcUrl: string;
  private profileCache = new Map<string, { profile: UPSocialProfile; expiry: number }>();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  constructor() {
    this.rpcUrl = getLuksoRpcUrl();
  }

  /**
   * Generate username in name#1234 format (LUKSO convention)
   */
  private generateUsername(name?: string, address?: string): string {
    if (!address) {
      return '#unknown';
    }
    
    // Get last 4 characters of address for suffix
    const addressSuffix = address.slice(-4);
    
    if (name && name.trim()) {
      // Clean the name: remove spaces, special chars, keep alphanumeric
      const cleanName = name.trim().replace(/[^a-zA-Z0-9]/g, '');
      return `${cleanName}#${addressSuffix}`;
    }
    
    // Fallback to short address format
    const shortAddress = `${address.slice(2, 6)}${address.slice(-4)}`; // Remove 0x prefix
    return `${shortAddress}#${addressSuffix}`;
  }

  /**
   * Detect social link types based on URL
   */
  private detectLinkType(url: string): 'twitter' | 'github' | 'website' | 'discord' | 'telegram' | 'other' {
    const lowerUrl = url.toLowerCase();
    
    if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) return 'twitter';
    if (lowerUrl.includes('github.com')) return 'github';
    if (lowerUrl.includes('discord.gg') || lowerUrl.includes('discord.com')) return 'discord';
    if (lowerUrl.includes('t.me') || lowerUrl.includes('telegram.me')) return 'telegram';
    
    return 'website';
  }

  /**
   * Check if profile is from cache and still valid
   */
  private getCachedProfile(address: string): UPSocialProfile | null {
    const cached = this.profileCache.get(address.toLowerCase());
    if (cached && Date.now() < cached.expiry) {
      console.log(`[UPProfileFetcher] Using cached profile for ${address}`);
      return cached.profile;
    }
    return null;
  }

  /**
   * Cache profile data
   */
  private cacheProfile(address: string, profile: UPSocialProfile): void {
    this.profileCache.set(address.toLowerCase(), {
      profile,
      expiry: Date.now() + this.CACHE_DURATION
    });
  }

  /**
   * Get Universal Profile basic info (name, description, profile image)
   */
  async getProfileInfo(upAddress: string): Promise<UPProfileInfo> {
    try {
      // Basic address validation
      if (!upAddress || !/^0x[a-fA-F0-9]{40}$/.test(upAddress)) {
        return {
          address: upAddress,
          error: 'Invalid address format'
        };
      }

      console.log(`[UPProfileFetcher] Fetching profile info for ${upAddress}`);

      // Create ERC725 instance for the Universal Profile
      const erc725 = new ERC725(
        LSP3ProfileSchema,
        upAddress,
        this.rpcUrl,
        {
          ipfsGateway: 'https://api.universalprofile.cloud/ipfs/',
        }
      );

      try {
        // Fetch LSP3Profile metadata using ERC725.js
        const profileData = await erc725.fetchData('LSP3Profile');
        
        // Log the actual structure for debugging
        console.log(`[UPProfileFetcher] Raw profile data structure:`, profileData);
        
        if (!profileData || !profileData.value) {
          console.log(`[UPProfileFetcher] No LSP3Profile data found for ${upAddress}`);
          return {
            address: upAddress,
            name: undefined,
            description: undefined,
            profileImage: undefined
          };
        }

        // Extract profile metadata from the fetched data
        // The data is nested under LSP3Profile key based on the console output
        let metadata: UPProfileMetadata;
        if (typeof profileData.value === 'object' && profileData.value !== null && !Array.isArray(profileData.value)) {
          // Check if data is nested under LSP3Profile key
          const valueObj = profileData.value as Record<string, unknown>;
          metadata = (valueObj.LSP3Profile as UPProfileMetadata) || (profileData.value as UPProfileMetadata);
        } else {
          metadata = profileData.value as UPProfileMetadata;
        }

        console.log(`[UPProfileFetcher] Successfully fetched profile data for ${upAddress}:`, metadata);

        // Handle profileImage array - get the first valid image URL and resolve IPFS
        let profileImageUrl: string | undefined;
        if (metadata.profileImage && Array.isArray(metadata.profileImage) && metadata.profileImage.length > 0) {
          const profileImg = metadata.profileImage.find((img: LSP3Image) => img.url);
          if (profileImg) {
            profileImageUrl = resolveIpfsUrl(profileImg.url);
            console.log(`[UPProfileFetcher] Resolved profile image URL: ${profileImageUrl}`);
          }
        }

        // Handle backgroundImage array - get the first valid image URL and resolve IPFS
        let backgroundImageUrl: string | undefined;
        if (metadata.backgroundImage && Array.isArray(metadata.backgroundImage) && metadata.backgroundImage.length > 0) {
          const backgroundImg = metadata.backgroundImage.find((img: LSP3Image) => img.url);
          if (backgroundImg) {
            backgroundImageUrl = resolveIpfsUrl(backgroundImg.url);
            console.log(`[UPProfileFetcher] Resolved background image URL: ${backgroundImageUrl}`);
          }
        }

        // Generate username and display name
        const username = this.generateUsername(metadata.name, upAddress);
        const displayName = metadata.name || `${upAddress.slice(0, 6)}...${upAddress.slice(-4)}`;

        return {
          address: upAddress,
          name: metadata.name,
          description: metadata.description,
          profileImage: profileImageUrl,
          backgroundImage: backgroundImageUrl,
          tags: metadata.tags,
          links: metadata.links,
          username,
          displayName
        };

      } catch (fetchError) {
        console.log(`[UPProfileFetcher] Failed to fetch LSP3Profile data for ${upAddress}:`, fetchError);
        
        // Return empty profile data instead of throwing
        return {
          address: upAddress,
          name: undefined,
          description: undefined,
          profileImage: undefined
        };
      }

    } catch (error) {
      console.error(`[UPProfileFetcher] Error fetching profile info for ${upAddress}:`, error);
      return {
        address: upAddress,
        error: error instanceof Error ? error.message : 'Failed to fetch profile'
      };
    }
  }

  /**
   * Get comprehensive social profile data with caching
   * This is the main method for UI components
   */
  async getSocialProfile(upAddress: string): Promise<UPSocialProfile> {
    try {
      // Basic address validation
      if (!upAddress || !/^0x[a-fA-F0-9]{40}$/.test(upAddress)) {
        return this.createFallbackProfile(upAddress, 'Invalid address format');
      }

      // Check cache first
      const cachedProfile = this.getCachedProfile(upAddress);
      if (cachedProfile) {
        return cachedProfile;
      }

      console.log(`[UPProfileFetcher] Fetching social profile for ${upAddress}`);

      // Get basic profile info
      const profileInfo = await this.getProfileInfo(upAddress);
      
      if (profileInfo.error) {
        const fallbackProfile = this.createFallbackProfile(upAddress, profileInfo.error);
        this.cacheProfile(upAddress, fallbackProfile);
        return fallbackProfile;
      }

      // Transform to social profile format
      const socialProfile: UPSocialProfile = {
        address: upAddress,
        displayName: profileInfo.displayName || `${upAddress.slice(0, 6)}...${upAddress.slice(-4)}`,
        username: profileInfo.username || this.generateUsername(profileInfo.name, upAddress),
        profileImage: profileInfo.profileImage,
        backgroundImage: profileInfo.backgroundImage,
        bio: profileInfo.description,
        tags: profileInfo.tags,
        socialLinks: profileInfo.links?.map(link => ({
          title: link.title,
          url: link.url,
          type: this.detectLinkType(link.url)
        })),
        isVerified: !!(profileInfo.name || profileInfo.description || profileInfo.profileImage),
        lastFetched: new Date()
      };

      // Cache the result
      this.cacheProfile(upAddress, socialProfile);
      
      console.log(`[UPProfileFetcher] Successfully created social profile for ${upAddress}:`, socialProfile);
      return socialProfile;

    } catch (error) {
      console.error(`[UPProfileFetcher] Error fetching social profile for ${upAddress}:`, error);
      const fallbackProfile = this.createFallbackProfile(upAddress, error instanceof Error ? error.message : 'Unknown error');
      this.cacheProfile(upAddress, fallbackProfile);
      return fallbackProfile;
    }
  }

  /**
   * Create fallback profile for errors or missing data
   */
  private createFallbackProfile(address: string, error?: string): UPSocialProfile {
    return {
      address,
      displayName: `${address.slice(0, 6)}...${address.slice(-4)}`,
      username: this.generateUsername(undefined, address),
      isVerified: false,
      lastFetched: new Date(),
      error
    };
  }

  /**
   * Get display name for a Universal Profile (fallback to shortened address)
   * @deprecated Use getSocialProfile() instead for better caching and data
   */
  async getDisplayName(upAddress: string): Promise<string> {
    try {
      const socialProfile = await this.getSocialProfile(upAddress);
      return socialProfile.displayName;
      
    } catch (error) {
      console.error(`[UPProfileFetcher] Error getting display name for ${upAddress}:`, error);
      return `${upAddress.slice(0, 6)}...${upAddress.slice(-4)}`;
    }
  }

  /**
   * Batch fetch social profiles for multiple addresses with smart caching
   */
  async batchGetSocialProfiles(addresses: string[]): Promise<Record<string, UPSocialProfile>> {
    try {
      console.log(`[UPProfileFetcher] Batch fetching social profiles for ${addresses.length} addresses`);
      
      // Check which profiles are already cached
      const cachedProfiles: Record<string, UPSocialProfile> = {};
      const addressesToFetch: string[] = [];
      
      for (const address of addresses) {
        const cached = this.getCachedProfile(address);
        if (cached) {
          cachedProfiles[address] = cached;
        } else {
          addressesToFetch.push(address);
        }
      }
      
      console.log(`[UPProfileFetcher] Found ${Object.keys(cachedProfiles).length} cached, fetching ${addressesToFetch.length} new profiles`);
      
      // Fetch uncached profiles in parallel
      const newProfilePromises = addressesToFetch.map(async (address) => {
        const profile = await this.getSocialProfile(address);
        return { address, profile };
      });
      
      const newProfileResults = await Promise.all(newProfilePromises);
      
      // Combine cached and new results
      const allProfiles: Record<string, UPSocialProfile> = { ...cachedProfiles };
      newProfileResults.forEach(({ address, profile }) => {
        allProfiles[address] = profile;
      });

      return allProfiles;
      
    } catch (error) {
      console.error(`[UPProfileFetcher] Error batch fetching social profiles:`, error);
      
      // Return fallback profiles for all addresses on error
      const fallbackMap: Record<string, UPSocialProfile> = {};
      addresses.forEach(address => {
        fallbackMap[address] = this.createFallbackProfile(address, 'Batch fetch failed');
      });
      
      return fallbackMap;
    }
  }

  /**
   * Batch fetch profile info for multiple addresses
   * @deprecated Use batchGetSocialProfiles() instead
   */
  async batchGetProfileInfo(addresses: string[]): Promise<Record<string, UPProfileInfo>> {
    try {
      console.log(`[UPProfileFetcher] Batch fetching profile info for ${addresses.length} addresses`);
      
      const results = await Promise.all(
        addresses.map(async (address) => {
          const info = await this.getProfileInfo(address);
          return { address, info };
        })
      );

      const profileMap: Record<string, UPProfileInfo> = {};
      results.forEach(({ address, info }) => {
        profileMap[address] = info;
      });

      return profileMap;
      
    } catch (error) {
      console.error(`[UPProfileFetcher] Error batch fetching profile info:`, error);
      
      // Return empty info for all addresses on error
      const fallbackMap: Record<string, UPProfileInfo> = {};
      addresses.forEach(address => {
        fallbackMap[address] = {
          address,
          error: 'Batch fetch failed'
        };
      });
      
      return fallbackMap;
    }
  }

  /**
   * Clear cached profile data
   */
  clearCache(): void {
    this.profileCache.clear();
    console.log(`[UPProfileFetcher] Cache cleared`);
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats(): { size: number; entries: Array<{ address: string; expiry: Date }> } {
    const entries = Array.from(this.profileCache.entries()).map(([address, data]) => ({
      address,
      expiry: new Date(data.expiry)
    }));
    
    return {
      size: this.profileCache.size,
      entries
    };
  }
}

// Singleton instance for global use
export const upProfileFetcher = new UPProfileFetcher();

// ===== NEW SOCIAL PROFILE UTILITIES =====

/**
 * Get comprehensive social profile data (recommended)
 */
export const getUPSocialProfile = (address: string): Promise<UPSocialProfile> => 
  upProfileFetcher.getSocialProfile(address);

/**
 * Batch fetch social profiles with smart caching (recommended)
 */
export const batchGetUPSocialProfiles = (addresses: string[]): Promise<Record<string, UPSocialProfile>> =>
  upProfileFetcher.batchGetSocialProfiles(addresses);

/**
 * Clear profile cache (useful for development/testing)
 */
export const clearUPProfileCache = (): void => 
  upProfileFetcher.clearCache();

/**
 * Get cache statistics (useful for debugging)
 */
export const getUPProfileCacheStats = () => 
  upProfileFetcher.getCacheStats();

/**
 * Resolve IPFS URLs to use LUKSO gateway (exported utility)
 */
export const resolveUPImageUrl = resolveIpfsUrl;

// ===== LEGACY UTILITIES (deprecated but maintained for compatibility) =====

/**
 * @deprecated Use getUPSocialProfile() instead for better caching and data
 */
export const getUPDisplayName = (address: string): Promise<string> => 
  upProfileFetcher.getDisplayName(address);

/**
 * @deprecated Use getUPSocialProfile() instead for enhanced social data
 */
export const getUPProfileInfo = (address: string): Promise<UPProfileInfo> => 
  upProfileFetcher.getProfileInfo(address);

/**
 * @deprecated Use batchGetUPSocialProfiles() instead for better performance
 */
export const batchGetUPProfileInfo = (addresses: string[]): Promise<Record<string, UPProfileInfo>> =>
  upProfileFetcher.batchGetProfileInfo(addresses); 
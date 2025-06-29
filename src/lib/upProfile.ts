import { ERC725 } from '@erc725/erc725.js';
import LSP3ProfileSchema from '@erc725/erc725.js/schemas/LSP3ProfileMetadata.json';
import { ethers } from 'ethers';

// LUKSO RPC endpoint
const getLuksoRpcUrls = (): string[] => {
  const urls = (process.env.NEXT_PUBLIC_LUKSO_MAINNET_RPC_URL || 'https://rpc.mainnet.lukso.network,https://rpc.lukso.gateway.fm,https://42.rpc.thirdweb.com').split(',');
  return urls.map(url => url.trim());
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
    const gateway = process.env.NEXT_PUBLIC_LUKSO_IPFS_GATEWAY || 'https://api.universalprofile.cloud/ipfs/';
    return `${gateway}${url.substring(7)}`;
  }
  return url;
};

/**
 * Fetch Universal Profile metadata using ERC725.js library
 * Enhanced with social profile features and caching
 */
export class UPProfileFetcher {
  private rpcUrls: string[];
  private profileCache = new Map<string, { profile: UPSocialProfile; expiry: number }>();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
  private sharedProvider: ethers.providers.JsonRpcProvider | null = null;
  private providerPromise: Promise<ethers.providers.JsonRpcProvider> | null = null;

  constructor() {
    this.rpcUrls = getLuksoRpcUrls();
    console.log(`[UPProfileFetcher] Initialized with ${this.rpcUrls.length} RPC endpoints.`);
  }

  /**
   * Create a provider with retry logic across multiple RPC endpoints
   * Now shared across all requests to prevent provider creation storms
   */
  private async createProviderWithRetry(): Promise<ethers.providers.JsonRpcProvider> {
    // If we already have a working provider, return it
    if (this.sharedProvider) {
      return this.sharedProvider;
    }

    // If a provider creation is already in progress, wait for it
    if (this.providerPromise) {
      return this.providerPromise;
    }

    // Start provider creation
    this.providerPromise = this.doCreateProvider();
    
    try {
      this.sharedProvider = await this.providerPromise;
      return this.sharedProvider;
    } finally {
      this.providerPromise = null;
    }
  }

  private async doCreateProvider(): Promise<ethers.providers.JsonRpcProvider> {
    for (const rpcUrl of this.rpcUrls) {
      try {
        // Simpler provider creation to let ethers auto-detect network, fixes request issue
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        // Disable batching (LUKSO RPC rejects batched eth_call). See README "LUKSO RPC quirks".
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (provider as any)._maxBatchSize = 1;
        
        // Test the provider
        await provider.getNetwork();
        console.log(`[UPProfileFetcher] Successfully connected to RPC: ${rpcUrl}`);
        return provider;
      } catch (error) {
        console.warn(`[UPProfileFetcher] Failed to connect to RPC ${rpcUrl}:`, error);
        continue;
      }
    }
    
    // Fallback to first URL if all fail
    console.warn(`[UPProfileFetcher] All RPC endpoints failed, using fallback: ${this.rpcUrls[0]}`);
    return new ethers.providers.JsonRpcProvider(this.rpcUrls[0]);
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
      
      const provider = await this.createProviderWithRetry();
      console.log(`[UPProfileFetcher] Successfully connected to RPC: ${provider.connection.url}`);

      try {
        // Use ERC725.js with the working fetchData() method instead of broken decodeData()
        const erc725 = new ERC725(
          LSP3ProfileSchema,
          upAddress,
          provider.connection.url,
          {
            ipfsGateway: process.env.NEXT_PUBLIC_LUKSO_IPFS_GATEWAY || 'https://api.universalprofile.cloud/ipfs/',
          }
        );

        // Use the working fetchData() approach instead of the broken decodeData() approach
        const profileData = await erc725.fetchData('LSP3Profile');
        console.log(`[UPProfileFetcher] ERC725 fetchData result for ${upAddress}:`, profileData);
        
        if (!profileData || !profileData.value) {
          console.log(`[UPProfileFetcher] No LSP3Profile data for ${upAddress}`);
          return {
            address: upAddress,
            name: undefined,
            description: undefined,
            profileImage: undefined,
          };
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lsp3Profile = profileData.value as any;
        
        // ERC725.js already resolved the IPFS URLs and parsed the JSON for us!
        const metadata: UPProfileMetadata = {
          name: lsp3Profile?.LSP3Profile?.name,
          description: lsp3Profile?.LSP3Profile?.description,
          profileImage: lsp3Profile?.LSP3Profile?.profileImage,
          backgroundImage: lsp3Profile?.LSP3Profile?.backgroundImage,
          tags: lsp3Profile?.LSP3Profile?.tags,
          links: lsp3Profile?.LSP3Profile?.links,
        };

        console.log(`[UPProfileFetcher] Parsed LSP3 metadata for ${upAddress}:`, metadata);

        // Handle profileImage array
        let profileImageUrl: string | undefined;
        if (metadata.profileImage && Array.isArray(metadata.profileImage) && metadata.profileImage.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const profileImg = (metadata.profileImage as any[]).find((img) => img.url);
          if (profileImg) {
            profileImageUrl = resolveIpfsUrl(profileImg.url);
          }
        }

        // Handle backgroundImage array
        let backgroundImageUrl: string | undefined;
        if (metadata.backgroundImage && Array.isArray(metadata.backgroundImage) && metadata.backgroundImage.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const bgImg = (metadata.backgroundImage as any[]).find((img) => img.url);
          if (bgImg) {
            backgroundImageUrl = resolveIpfsUrl(bgImg.url);
          }
        }

        const username = this.generateUsername(metadata.name, upAddress);
        const displayName = metadata.name || username || `${upAddress.slice(0, 6)}...${upAddress.slice(-4)}`;

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
      } catch (err) {
        console.log(`[UPProfileFetcher] LSP3Profile fetch failed for ${upAddress}:`, err);
      }

      // Fallback: empty info
      return {
        address: upAddress,
        name: undefined,
        description: undefined,
        profileImage: undefined
      };

    } catch (error) {
      console.error(`[UPProfileFetcher] CRITICAL: Error fetching profile info for ${upAddress}:`, error);
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
        displayName: profileInfo.displayName || profileInfo.username || `${upAddress.slice(0, 6)}...${upAddress.slice(-4)}`,
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
   * Now uses sequential fetching to prevent React setState conflicts
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
      
      // Create shared provider once for all requests
      const provider = await this.createProviderWithRetry();
      
      // Fetch uncached profiles sequentially to prevent React conflicts
      const allProfiles: Record<string, UPSocialProfile> = { ...cachedProfiles };
      
      for (const address of addressesToFetch) {
        try {
          const profile = await this.getSocialProfileWithProvider(address, provider);
          allProfiles[address] = profile;
        } catch (error) {
          console.warn(`[UPProfileFetcher] Failed to fetch profile for ${address}:`, error);
          allProfiles[address] = this.createFallbackProfile(address, 'Fetch failed');
        }
      }

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
   * Get social profile using a pre-created provider (for batch operations)
   */
  private async getSocialProfileWithProvider(upAddress: string, provider: ethers.providers.JsonRpcProvider): Promise<UPSocialProfile> {
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

      console.log(`[UPProfileFetcher] Fetching social profile for ${upAddress} with shared provider`);

      // Get basic profile info using the shared provider
      const profileInfo = await this.getProfileInfoWithProvider(upAddress, provider);
      
      if (profileInfo.error) {
        const fallbackProfile = this.createFallbackProfile(upAddress, profileInfo.error);
        this.cacheProfile(upAddress, fallbackProfile);
        return fallbackProfile;
      }

      // Transform to social profile format
      const socialProfile: UPSocialProfile = {
        address: upAddress,
        displayName: profileInfo.displayName || profileInfo.username || `${upAddress.slice(0, 6)}...${upAddress.slice(-4)}`,
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
   * Get profile info using a pre-created provider (for batch operations)
   */
  private async getProfileInfoWithProvider(upAddress: string, provider: ethers.providers.JsonRpcProvider): Promise<UPProfileInfo> {
    try {
      console.log(`[UPProfileFetcher] Fetching profile info for ${upAddress} with shared provider`);

      // Use ERC725.js with the RPC URL directly (not the ethers provider object)
      const erc725 = new ERC725(
        LSP3ProfileSchema,
        upAddress,
        provider.connection.url, // Pass the RPC URL string, not the provider object
        {
          ipfsGateway: process.env.NEXT_PUBLIC_LUKSO_IPFS_GATEWAY || 'https://api.universalprofile.cloud/ipfs/',
        }
      );

      try {
        // Use ERC725.js to fetch profile data (this works!)
        const profileData = await erc725.fetchData('LSP3Profile');
        console.log(`[UPProfileFetcher] ERC725 fetchData result for ${upAddress}:`, profileData);
        
        if (!profileData || !profileData.value) {
          console.log(`[UPProfileFetcher] No LSP3Profile data for ${upAddress}`);
          return {
            address: upAddress,
            name: undefined,
            description: undefined,
            profileImage: undefined,
          };
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lsp3Profile = profileData.value as any;
        
        // ERC725.js already resolved the IPFS URLs and parsed the JSON for us!
        const metadata: UPProfileMetadata = {
          name: lsp3Profile?.LSP3Profile?.name,
          description: lsp3Profile?.LSP3Profile?.description,
          profileImage: lsp3Profile?.LSP3Profile?.profileImage,
          backgroundImage: lsp3Profile?.LSP3Profile?.backgroundImage,
          tags: lsp3Profile?.LSP3Profile?.tags,
          links: lsp3Profile?.LSP3Profile?.links,
        };

        console.log(`[UPProfileFetcher] Parsed LSP3 metadata for ${upAddress}:`, metadata);

        // Handle profileImage array
        let profileImageUrl: string | undefined;
        if (metadata.profileImage && Array.isArray(metadata.profileImage) && metadata.profileImage.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const profileImg = (metadata.profileImage as any[]).find((img) => img.url);
          if (profileImg) {
            profileImageUrl = resolveIpfsUrl(profileImg.url);
          }
        }

        // Handle backgroundImage array
        let backgroundImageUrl: string | undefined;
        if (metadata.backgroundImage && Array.isArray(metadata.backgroundImage) && metadata.backgroundImage.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const bgImg = (metadata.backgroundImage as any[]).find((img) => img.url);
          if (bgImg) {
            backgroundImageUrl = resolveIpfsUrl(bgImg.url);
          }
        }

        const username = this.generateUsername(metadata.name, upAddress);
        const displayName = metadata.name || username || `${upAddress.slice(0, 6)}...${upAddress.slice(-4)}`;

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
      } catch (err) {
        console.log(`[UPProfileFetcher] LSP3Profile fetch failed for ${upAddress}:`, err);
      }

      // Fallback: empty info
      return {
        address: upAddress,
        name: undefined,
        description: undefined,
        profileImage: undefined
      };

    } catch (error) {
      console.error(`[UPProfileFetcher] CRITICAL: Error fetching profile info for ${upAddress}:`, error);
      return {
        address: upAddress,
        error: error instanceof Error ? error.message : 'Failed to fetch profile'
      };
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

// ===== NEW TOKEN METADATA UTILITY =====

export interface UPTokenMetadata {
  name: string;
  symbol: string;
  iconUrl?: string;
  decimals?: number;
}

const tokenMetadataCache = new Map<string, { meta: UPTokenMetadata; expiry: number }>();
const TOKEN_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export const getUPTokenMetadata = async (contractAddress: string): Promise<UPTokenMetadata> => {
  const lowerCaseAddress = contractAddress.toLowerCase();
  // Check cache first
  const cached = tokenMetadataCache.get(lowerCaseAddress);
  if (cached && Date.now() < cached.expiry) {
    console.log(`[getUPTokenMetadata] Using cached metadata for ${contractAddress}`);
    return cached.meta;
  }

  console.log(`[getUPTokenMetadata] Fetching metadata for ${contractAddress}`);
  const rpcUrl = getLuksoRpcUrls()[0];
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

  // ----- DEFAULT FALLBACKS -----
  let name: string | undefined;
  let symbol: string | undefined;
  let iconUrl: string | undefined;
  let decimals: number | undefined;

  // ===== 1) TRY STANDARD ERC20/LSP7 FUNCTIONS FIRST =====
  try {
    const erc20Like = new ethers.Contract(contractAddress, [
      'function name() view returns (string)',
      'function symbol() view returns (string)',
      'function decimals() view returns (uint8)'
    ], provider);

    const [rawName, rawSymbol, rawDecimals] = await Promise.all([
      erc20Like.name().catch(() => undefined),
      erc20Like.symbol().catch(() => undefined),
      erc20Like.decimals().catch(() => undefined),
    ]);

    name = typeof rawName === 'string' && rawName.trim() !== '' ? rawName : undefined;
    symbol = typeof rawSymbol === 'string' && rawSymbol.trim() !== '' ? rawSymbol : undefined;
    decimals = typeof rawDecimals === 'number' ? rawDecimals : undefined;
  } catch (erc20PrimaryError) {
    console.warn(`[getUPTokenMetadata] Standard ERC20 calls failed for ${contractAddress}:`, erc20PrimaryError);
  }

  // ===== 2) IF STILL MISSING, TRY BYTES32 VARIANTS =====
  if (!name || !symbol) {
    try {
      const erc20Bytes32 = new ethers.Contract(contractAddress, [
        'function name() view returns (bytes32)',
        'function symbol() view returns (bytes32)'
      ], provider);

      const [nameBytes, symbolBytes] = await Promise.all([
        erc20Bytes32.name().catch(() => undefined),
        erc20Bytes32.symbol().catch(() => undefined),
      ]);

      if (!name && nameBytes && nameBytes !== ethers.constants.HashZero) {
        try {
          name = ethers.utils.parseBytes32String(nameBytes);
        } catch {}
      }
      if (!symbol && symbolBytes && symbolBytes !== ethers.constants.HashZero) {
        try {
          symbol = ethers.utils.parseBytes32String(symbolBytes);
        } catch {}
      }
    } catch (erc20Bytes32Error) {
      console.warn(`[getUPTokenMetadata] ERC20 bytes32 calls failed for ${contractAddress}:`, erc20Bytes32Error);
    }
  }

  // ===== 3) TRY ERC725Y KEYS (LSP4) IF STILL UNRESOLVED =====
  if (!name || !symbol) {
    try {
      const erc725Y = new ethers.Contract(contractAddress, [
        'function getData(bytes32) view returns (bytes)',
      ], provider);

      const LSP4_TOKEN_NAME_KEY = '0xdeba1e292f8ba88238e10ab3c7f88bd4be4fac56cad5194b6ecceaf653468af1';
      const LSP4_TOKEN_SYMBOL_KEY = '0x2f0a68ab07768e01943a599e73362a0e17a63a72e94dd2e384d2c1d4db932756';

      const [nameBytesLSP4, symbolBytesLSP4] = await Promise.all([
        erc725Y.getData(LSP4_TOKEN_NAME_KEY).catch(() => '0x'),
        erc725Y.getData(LSP4_TOKEN_SYMBOL_KEY).catch(() => '0x'),
      ]);

      if (!name && nameBytesLSP4 && nameBytesLSP4 !== '0x') {
        try {
          name = ethers.utils.toUtf8String(nameBytesLSP4);
        } catch {}
      }
      if (!symbol && symbolBytesLSP4 && symbolBytesLSP4 !== '0x') {
        try {
          symbol = ethers.utils.toUtf8String(symbolBytesLSP4);
        } catch {}
      }
    } catch (lsp4Error) {
      console.warn(`[getUPTokenMetadata] ERC725Y fetch failed for ${contractAddress}:`, lsp4Error);
    }
  }

  // ----- DEFAULT FALLBACKS IF STILL UNDEFINED -----
  if (!name) name = 'Unknown Token';
  if (!symbol) symbol = 'UNK';
  if (decimals === undefined) decimals = 18;

  // ----- ICON URL FETCHING -----
  try {
    console.log(`[getUPTokenMetadata] Fetching icon for ${contractAddress}`);
    const erc725YIcon = new ethers.Contract(contractAddress, ['function getData(bytes32) view returns (bytes)'], provider);
    const LSP4_METADATA_KEY = '0x9afb95cacc9f95858ec44aa8c3b685511002e30ae54415823f406128b85b238e';
    const metadataBytes: string = await erc725YIcon.getData(LSP4_METADATA_KEY).catch(() => '0x');
    if (metadataBytes && metadataBytes !== '0x') {
      try {
        const urlStart = 4 + 32;
        const urlLen = parseInt(metadataBytes.slice(2 + urlStart * 2, 2 + urlStart * 2 + 4), 16);
        const urlHex = metadataBytes.slice(2 + urlStart * 2 + 4, 2 + urlStart * 2 + 4 + urlLen * 2);
        
        // Try to decode as UTF-8, but handle errors gracefully
        let metadataUrl: string;
        try {
          metadataUrl = ethers.utils.toUtf8String('0x' + urlHex);
        } catch {
          // If UTF-8 decoding fails, try to extract IPFS hash from hex
          console.log(`[getUPTokenMetadata] UTF-8 decode failed, trying hex pattern extraction for ${contractAddress}`);
          const hexStr = urlHex;
          // Look for IPFS patterns in the hex data (ipfs:// = 697066733a2f2f)
          const ipfsPattern = /697066733a2f2f([a-fA-F0-9]+)/;
          const match = hexStr.match(ipfsPattern);
          if (match) {
            const ipfsHashHex = match[1];
            // Convert hex to ASCII
            let ipfsHash = '';
            for (let i = 0; i < ipfsHashHex.length; i += 2) {
              const byte = parseInt(ipfsHashHex.substr(i, 2), 16);
              if (byte >= 32 && byte <= 126) { // Printable ASCII
                ipfsHash += String.fromCharCode(byte);
              }
            }
            if (ipfsHash.length > 10) { // Reasonable IPFS hash length
              metadataUrl = `ipfs://${ipfsHash}`;
            } else {
              throw new Error('Could not extract valid IPFS hash');
            }
          } else {
            throw new Error('No IPFS pattern found in hex data');
          }
        }
        
        // Resolve IPFS URL and fetch metadata
        const resolvedUrl = metadataUrl.replace('ipfs://', 'https://api.universalprofile.cloud/ipfs/');
        const json = await fetch(resolvedUrl).then(r => r.json()).catch(() => null);
        const ipfsPath = json?.LSP4Metadata?.icon?.[0]?.url;
        if (ipfsPath) {
          iconUrl = resolveIpfsUrl(ipfsPath);
        }
      } catch (parseError) {
        console.log(`[getUPTokenMetadata] Could not parse metadata URL for ${contractAddress}:`, parseError);
      }
    }
  } catch (iconError) {
    console.log(`[getUPTokenMetadata] Could not fetch icon for ${contractAddress}:`, iconError);
  }

  const metadata: UPTokenMetadata = { name, symbol, iconUrl, decimals };

  // 🐛 DEBUG: Log the final metadata to see if iconUrl is included
  console.log(`[getUPTokenMetadata] 🔍 DEBUG - Final metadata for ${contractAddress}:`, metadata);

  // Cache result
  tokenMetadataCache.set(lowerCaseAddress, {
    meta: metadata,
    expiry: Date.now() + TOKEN_CACHE_DURATION,
  });

  return metadata;
};

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
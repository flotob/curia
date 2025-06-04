import { ERC725 } from '@erc725/erc725.js';
import LSP3ProfileSchema from '@erc725/erc725.js/schemas/LSP3ProfileMetadata.json';

// LUKSO RPC endpoint
const getLuksoRpcUrl = (): string => {
  return process.env.NEXT_PUBLIC_LUKSO_MAINNET_RPC_URL || 'https://rpc.mainnet.lukso.network';
};

export interface UPProfileMetadata {
  name?: string;
  description?: string;
  profileImage?: string;
  backgroundImage?: string;
  tags?: string[];
  links?: Array<{
    title: string;
    url: string;
  }>;
}

export interface UPProfileInfo {
  address: string;
  name?: string;
  description?: string;
  profileImage?: string;
  error?: string;
}

/**
 * Fetch Universal Profile metadata using ERC725.js library
 */
export class UPProfileFetcher {
  private rpcUrl: string;

  constructor() {
    this.rpcUrl = getLuksoRpcUrl();
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
          ipfsGateway: 'https://api.universalprofile.cloud/ipfs',
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

        // Handle profileImage array - get the first image URL if available
        let profileImageUrl: string | undefined;
        if (metadata.profileImage && Array.isArray(metadata.profileImage) && metadata.profileImage.length > 0) {
          profileImageUrl = metadata.profileImage[0].url;
        }

        return {
          address: upAddress,
          name: metadata.name,
          description: metadata.description,
          profileImage: profileImageUrl
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
   * Get display name for a Universal Profile (fallback to shortened address)
   */
  async getDisplayName(upAddress: string): Promise<string> {
    try {
      const profileInfo = await this.getProfileInfo(upAddress);
      
      if (profileInfo.name) {
        return profileInfo.name;
      }
      
      // Fallback to shortened address
      return `${upAddress.slice(0, 6)}...${upAddress.slice(-4)}`;
      
    } catch (error) {
      console.error(`[UPProfileFetcher] Error getting display name for ${upAddress}:`, error);
      return `${upAddress.slice(0, 6)}...${upAddress.slice(-4)}`;
    }
  }

  /**
   * Batch fetch profile info for multiple addresses
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
}

// Singleton instance for global use
export const upProfileFetcher = new UPProfileFetcher();

// Utility functions for easy access
export const getUPDisplayName = (address: string): Promise<string> => 
  upProfileFetcher.getDisplayName(address);

export const getUPProfileInfo = (address: string): Promise<UPProfileInfo> => 
  upProfileFetcher.getProfileInfo(address);

export const batchGetUPProfileInfo = (addresses: string[]): Promise<Record<string, UPProfileInfo>> =>
  upProfileFetcher.batchGetProfileInfo(addresses); 
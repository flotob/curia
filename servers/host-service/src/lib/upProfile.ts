/**
 * Universal Profile Social Utilities (Simplified for Host Service)
 * 
 * Simplified version of the main forum app's UP profile utilities
 * Provides essential social profile fetching functionality
 */

import { ethers } from 'ethers';
import { ERC725 } from '@erc725/erc725.js';
// Import LSP3Profile schema - this is the correct way for @erc725/erc725.js
const LSP3ProfileSchema = [
  {
    name: 'LSP3Profile',
    key: '0x5ef83ad9559033e6e941db7d7c495acdce616347d28e90c7ce47cbfcfcad3bc5',
    keyType: 'Singleton',
    valueType: 'bytes',
    valueContent: 'VerifiableURI'
  }
];

// ===== INTERFACES =====

export interface UPSocialProfile {
  address: string;
  displayName: string;
  username: string;
  profileImage?: string;
  bio?: string;
  isVerified?: boolean;
  lastFetched?: Date;
  error?: string;
}

// ===== UTILITIES =====

const LUKSO_RPC_URL = 'https://rpc.mainnet.lukso.network';
const IPFS_GATEWAY = 'https://api.universalprofile.cloud/ipfs/';

/**
 * Resolve IPFS URLs to use LUKSO gateway
 */
const resolveIpfsUrl = (url: string): string => {
  if (url.startsWith('ipfs://')) {
    return url.replace('ipfs://', IPFS_GATEWAY);
  }
  return url;
};

/**
 * Generate a username from profile name and address
 */
const generateUsername = (name?: string, address?: string): string => {
  if (name && address) {
    // Use first 4 characters after 0x for hash
    const addressHash = address.slice(2, 6);
    return `@${name.toLowerCase().replace(/\s+/g, '')}#${addressHash}`;
  }
  if (address) {
    // No name but have address - use address parts for unique username
    return `@${address.slice(2, 6)}${address.slice(-4)}.lukso`;
  }
  // No address at all - create unique identifier with timestamp
  const uniqueId = Date.now().toString(36).slice(-6);
  return `@user${uniqueId}.lukso`;
};

/**
 * Create fallback profile for failed fetches
 */
const createFallbackProfile = (address: string, error?: string): UPSocialProfile => {
  return {
    address,
    displayName: `${address.slice(0, 6)}...${address.slice(-4)}`,
    username: generateUsername(undefined, address),
    isVerified: false,
    lastFetched: new Date(),
    error
  };
};

// ===== MAIN PROFILE FETCHER =====

/**
 * Fetch Universal Profile social data (simplified version)
 */
export const getUPSocialProfile = async (address: string): Promise<UPSocialProfile> => {
  try {
    // Validate address
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return createFallbackProfile(address, 'Invalid address format');
    }

    console.log(`[getUPSocialProfile] Fetching profile for ${address}`);

    // Create ERC725 instance
    const erc725 = new ERC725(
      LSP3ProfileSchema,
      address,
      LUKSO_RPC_URL,
      {
        ipfsGateway: IPFS_GATEWAY,
      }
    );

    // Fetch profile data
    const profileData = await erc725.fetchData('LSP3Profile');
    
    console.log(`[getUPSocialProfile] 🐛 Raw profileData from ERC725:`, JSON.stringify(profileData, null, 2));
    
    if (!profileData || !profileData.value) {
      console.log(`[getUPSocialProfile] No profile data found for ${address}`);
      return createFallbackProfile(address);
    }

    // Parse profile metadata
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lsp3Profile = profileData.value as any;
    const metadata = lsp3Profile?.LSP3Profile;
    
    console.log(`[getUPSocialProfile] 🐛 Parsed metadata:`, JSON.stringify(metadata, null, 2));

    if (!metadata) {
      return createFallbackProfile(address);
    }

    // Extract profile image
    let profileImageUrl: string | undefined;
    console.log(`[getUPSocialProfile] 🐛 Raw metadata.profileImage:`, JSON.stringify(metadata.profileImage, null, 2));
    
    if (metadata.profileImage && Array.isArray(metadata.profileImage) && metadata.profileImage.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const profileImg = (metadata.profileImage as any[]).find((img) => img.url);
      console.log(`[getUPSocialProfile] 🐛 Found profile image object:`, JSON.stringify(profileImg, null, 2));
      
      if (profileImg) {
        profileImageUrl = resolveIpfsUrl(profileImg.url);
        console.log(`[getUPSocialProfile] 🐛 Resolved profile image URL:`, profileImageUrl);
      }
    }

    // Generate username and display name
    const username = generateUsername(metadata.name, address);
    const displayName = metadata.name || username || `${address.slice(0, 6)}...${address.slice(-4)}`;

    // Create social profile
    const socialProfile: UPSocialProfile = {
      address,
      displayName,
      username,
      profileImage: profileImageUrl,
      bio: metadata.description,
      isVerified: !!(metadata.name || metadata.description || profileImageUrl),
      lastFetched: new Date()
    };

    console.log(`[getUPSocialProfile] 🐛 Complete social profile object:`, JSON.stringify(socialProfile, null, 2));
    console.log(`[getUPSocialProfile] Successfully fetched profile for ${address}:`, socialProfile);
    return socialProfile;

  } catch (error) {
    console.error(`[getUPSocialProfile] Error fetching profile for ${address}:`, error);
    return createFallbackProfile(address, error instanceof Error ? error.message : 'Unknown error');
  }
};

/**
 * Batch fetch profiles for multiple addresses
 */
export const batchGetUPSocialProfiles = async (addresses: string[]): Promise<Record<string, UPSocialProfile>> => {
  const profiles: Record<string, UPSocialProfile> = {};
  
  // Fetch profiles sequentially to avoid rate limiting
  for (const address of addresses) {
    try {
      profiles[address] = await getUPSocialProfile(address);
    } catch (error) {
      console.warn(`[batchGetUPSocialProfiles] Failed to fetch profile for ${address}:`, error);
      profiles[address] = createFallbackProfile(address, 'Batch fetch failed');
    }
  }
  
  return profiles;
}; 
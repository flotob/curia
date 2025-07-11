/**
 * LSP26 Follower Registry for Host Service
 * 
 * Simplified version of the main codebase's LSP26 functionality
 * Provides follower count and following status checking
 */

import { ethers } from 'ethers';

// ===== CONFIGURATION =====

const LUKSO_RPC_URL = 'https://rpc.mainnet.lukso.network';
const LSP26_REGISTRY_ADDRESS = '0xf01103E5a9909Fc0DBe8166dA7085e0285daDDcA';

const LSP26_ABI = [
  'function followerCount(address addr) view returns (uint256)',
  'function isFollowing(address follower, address addr) view returns (bool)'
];

// ===== TYPES =====

export interface LSP26Stats {
  followerCount: number;
  followingCount?: number; // Not directly available from LSP26, but kept for compatibility
  error?: string;
}

// ===== REGISTRY CLASS =====

export class LSP26Registry {
  private contract: ethers.Contract;
  private provider: ethers.providers.JsonRpcProvider;

  constructor() {
    this.provider = new ethers.providers.JsonRpcProvider(LUKSO_RPC_URL);
    this.contract = new ethers.Contract(LSP26_REGISTRY_ADDRESS, LSP26_ABI, this.provider);
  }

  /**
   * Get the follower count for a given Universal Profile address
   */
  async getFollowerCount(address: string): Promise<number> {
    try {
      if (!ethers.utils.isAddress(address)) {
        throw new Error('Invalid address format');
      }

      console.log(`[LSP26Registry] Getting follower count for ${address}`);
      const count = await this.contract.followerCount(address);
      const followerCount = count.toNumber();
      
      console.log(`[LSP26Registry] Follower count for ${address}: ${followerCount}`);
      return followerCount;
    } catch (error) {
      console.error(`[LSP26Registry] Error getting follower count for ${address}:`, error);
      throw new Error(`Failed to get follower count: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if one address is following another
   * @param follower - The address that might be following
   * @param target - The address being followed
   */
  async isFollowing(follower: string, target: string): Promise<boolean> {
    try {
      if (!ethers.utils.isAddress(follower) || !ethers.utils.isAddress(target)) {
        throw new Error('Invalid address format');
      }

      console.log(`[LSP26Registry] Checking if ${follower} follows ${target}`);
      const following = await this.contract.isFollowing(follower, target);
      
      console.log(`[LSP26Registry] ${follower} ${following ? 'follows' : 'does not follow'} ${target}`);
      return following;
    } catch (error) {
      console.error(`[LSP26Registry] Error checking follow relationship:`, error);
      throw new Error(`Failed to check follow relationship: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get detailed follower information for a user (useful for UI display)
   */
  async getFollowerInfo(userAddress: string): Promise<LSP26Stats> {
    try {
      const followerCount = await this.getFollowerCount(userAddress);
      return { followerCount };
    } catch (error) {
      console.error(`[LSP26Registry] Error getting follower info:`, error);
      return {
        followerCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// ===== SINGLETON INSTANCE =====

export const lsp26Registry = new LSP26Registry();

// ===== UTILITY FUNCTIONS =====

export const getFollowerCount = (address: string): Promise<number> => 
  lsp26Registry.getFollowerCount(address);

export const isFollowing = (follower: string, target: string): Promise<boolean> => 
  lsp26Registry.isFollowing(follower, target); 
import { ethers } from 'ethers';

// This should be your LUKSO Mainnet RPC endpoint
const LUKSO_MAINNET_RPC = 'https://rpc.mainnet.lukso.network';

// Simple provider instance
const provider = new ethers.providers.JsonRpcProvider(LUKSO_MAINNET_RPC);

// The address of the deployed LSP26 Follower Registry contract
// This is a placeholder and should be replaced with the actual deployed contract address
const LSP26_REGISTRY_ADDRESS = '0x...'; // TODO: Replace with actual address

// A minimal ABI for the LSP26 Follower Registry
const lsp26Abi = [
  "function getFollowerCount(address target) view returns (uint256)",
  "function isFollowing(address follower, address target) view returns (bool)"
];

const registryContract = new ethers.Contract(LSP26_REGISTRY_ADDRESS, lsp26Abi, provider);

/**
 * Checks if a given address is following a target address.
 * @param followerAddress The address of the potential follower.
 * @param targetAddress The address of the target being followed.
 * @returns A promise that resolves to true if following, false otherwise.
 */
async function isFollowing(followerAddress: string, targetAddress: string): Promise<boolean> {
  try {
    return await registryContract.isFollowing(followerAddress, targetAddress);
  } catch (error) {
    console.error(`Error checking isFollowing for ${followerAddress} -> ${targetAddress}:`, error);
    return false;
  }
}

/**
 * Gets the total follower count for a given address.
 * @param targetAddress The address to get the follower count for.
 * @returns A promise that resolves to the number of followers.
 */
async function getFollowerCount(targetAddress: string): Promise<number> {
  try {
    const count = await registryContract.getFollowerCount(targetAddress);
    return count.toNumber();
  } catch (error) {
    console.error(`Error getting follower count for ${targetAddress}:`, error);
    return 0;
  }
}

export const lsp26Registry = {
  isFollowing,
  getFollowerCount,
}; 
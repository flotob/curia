/**
 * Ethereum Blockchain Verification Functions
 * 
 * Server-side verification for Ethereum-based gating requirements:
 * - ETH balance verification
 * - ENS domain verification
 * - ERC-20, ERC-721, ERC-1155 token verification
 * - EFP (Ethereum Follow Protocol) verification
 */

import { ethers } from 'ethers';
import { EthereumGatingRequirements, ERC20Requirement, ERC721Requirement, ERC1155Requirement, EFPRequirement } from '@/types/gating';

interface EFPFollowRecord {
  version: number;
  record_type: string;
  data: string;
  address: string;
  tags: string[];
}

// Ethereum RPC configuration
const ETHEREUM_RPC_URLS = [
  process.env.ETHEREUM_RPC_URL || 'https://ethereum.publicnode.com',
  'https://rpc.ankr.com/eth',
  'https://eth-rpc.gateway.pokt.network'
];

let currentRPCIndex = 0;

/**
 * Raw Ethereum RPC call with fallback support
 */
async function rawEthereumCall(method: string, params: unknown[] = []): Promise<unknown> {
  const maxRetries = ETHEREUM_RPC_URLS.length;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const rpcUrl = ETHEREUM_RPC_URLS[(currentRPCIndex + attempt) % ETHEREUM_RPC_URLS.length];
    
    try {
      console.log(`[Ethereum RPC] Attempting ${method} on ${rpcUrl} (attempt ${attempt + 1}/${maxRetries})`);
      
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method,
          params,
          id: Date.now()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`RPC Error: ${data.error.message || data.error}`);
      }

      // Update current RPC index on success
      currentRPCIndex = (currentRPCIndex + attempt) % ETHEREUM_RPC_URLS.length;
      
      console.log(`[Ethereum RPC] ✅ ${method} successful on ${rpcUrl}`);
      return data.result;
      
    } catch (error) {
      console.warn(`[Ethereum RPC] ❌ ${method} failed on ${rpcUrl}:`, error);
      if (attempt === maxRetries - 1) {
        throw new Error(`All Ethereum RPC endpoints failed for ${method}`);
      }
    }
  }
}

/**
 * Get Ethereum provider instance
 */
function getEthereumProvider(): ethers.providers.JsonRpcProvider {
  const rpcUrl = ETHEREUM_RPC_URLS[currentRPCIndex];
  return new ethers.providers.JsonRpcProvider(rpcUrl);
}

/**
 * Verify ETH balance requirement
 */
export async function verifyETHBalance(
  ethAddress: string,
  minBalance: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    console.log(`[verifyETHBalance] Checking ETH balance for ${ethAddress}, minimum: ${ethers.utils.formatEther(minBalance)} ETH`);

    const balanceHex = await rawEthereumCall('eth_getBalance', [ethAddress, 'latest']);
    const balance = ethers.BigNumber.from(balanceHex as string);
    const minBalanceBN = ethers.BigNumber.from(minBalance);

    const hasEnoughETH = balance.gte(minBalanceBN);
    
    if (!hasEnoughETH) {
      const actualETH = ethers.utils.formatEther(balance);
      const requiredETH = ethers.utils.formatEther(minBalance);
      return {
        valid: false,
        error: `Insufficient ETH balance. Required: ${requiredETH} ETH, Current: ${actualETH} ETH`
      };
    }

    console.log(`[verifyETHBalance] ✅ ETH balance check passed: ${ethers.utils.formatEther(balance)} ETH >= ${ethers.utils.formatEther(minBalance)} ETH`);
    return { valid: true };

  } catch (error) {
    console.error('[verifyETHBalance] Error:', error);
    return { valid: false, error: 'Failed to verify ETH balance' };
  }
}

/**
 * Calculate ENS namehash for a given name
 */
function namehash(name: string): string {
  let node = '0x0000000000000000000000000000000000000000000000000000000000000000';
  
  if (name) {
    const labels = name.split('.');
    for (let i = labels.length - 1; i >= 0; i--) {
      const labelHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(labels[i]));
      node = ethers.utils.keccak256(ethers.utils.concat([node, labelHash]));
    }
  }
  
  return node;
}

/**
 * Verify ENS domain requirements using raw RPC calls
 */
export async function verifyENSRequirements(
  ethAddress: string,
  requiresENS: boolean,
  ensDomainPatterns?: string[]
): Promise<{ valid: boolean; error?: string }> {
  try {
    if (!requiresENS) {
      return { valid: true }; // No ENS requirement
    }

    console.log(`[verifyENSRequirements] Checking ENS for ${ethAddress}`);

    // ENS Registry contract address on mainnet
    const ENS_REGISTRY = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e';
    
    // Calculate reverse node hash: address.addr.reverse
    const normalizedAddress = ethAddress.toLowerCase().replace('0x', '');
    const reverseNode = namehash(`${normalizedAddress}.addr.reverse`);

    // Get resolver for the reverse record
    const resolverData = await rawEthereumCall('eth_call', [
      {
        to: ENS_REGISTRY,
        data: `0x0178b8bf${reverseNode.slice(2)}` // resolver(bytes32)
      },
      'latest'
    ]);

    const resolverAddress = `0x${(resolverData as string).slice(-40)}`;
    
    // Check if resolver is set (not zero address)
    if (resolverAddress === '0x0000000000000000000000000000000000000000') {
      return {
        valid: false,
        error: 'No ENS name found for this address'
      };
    }

    // Get the name from the resolver
    const nameData = await rawEthereumCall('eth_call', [
      {
        to: resolverAddress,
        data: `0x691f3431${reverseNode.slice(2)}` // name(bytes32)
      },
      'latest'
    ]);

    // Decode the name from ABI-encoded string
    let ensName: string;
    try {
      const decoded = ethers.utils.defaultAbiCoder.decode(['string'], nameData as string);
      ensName = decoded[0];
    } catch {
      return {
        valid: false,
        error: 'No ENS name found for this address'
      };
    }

    if (!ensName) {
      return {
        valid: false,
        error: 'No ENS name found for this address'
      };
    }

    // Verify forward resolution (name -> address) to prevent spoofing
    try {
      const nameNode = namehash(ensName);
      const forwardResolverData = await rawEthereumCall('eth_call', [
        {
          to: ENS_REGISTRY,
          data: `0x0178b8bf${nameNode.slice(2)}` // resolver(bytes32)
        },
        'latest'
      ]);

      const forwardResolverAddress = `0x${(forwardResolverData as string).slice(-40)}`;
      
      if (forwardResolverAddress !== '0x0000000000000000000000000000000000000000') {
        const addressData = await rawEthereumCall('eth_call', [
          {
            to: forwardResolverAddress,
            data: `0x3b3b57de${nameNode.slice(2)}` // addr(bytes32)
          },
          'latest'
        ]);

        const resolvedAddress = `0x${(addressData as string).slice(-40)}`;
        
        if (resolvedAddress.toLowerCase() !== ethAddress.toLowerCase()) {
          return {
            valid: false,
            error: 'ENS name does not resolve back to this address'
          };
        }
      }
    } catch (error) {
      console.warn('[verifyENSRequirements] Forward resolution verification failed:', error);
      // Continue anyway as some configurations might not support forward resolution
    }

    // Check domain patterns if specified
    if (ensDomainPatterns && ensDomainPatterns.length > 0) {
      const matchesPattern = ensDomainPatterns.some(pattern => {
        // Convert glob pattern to regex
        const regexPattern = pattern.replace(/\*/g, '.*');
        const regex = new RegExp(`^${regexPattern}$`, 'i');
        return regex.test(ensName);
      });

      if (!matchesPattern) {
        return {
          valid: false,
          error: `ENS domain "${ensName}" does not match required patterns: ${ensDomainPatterns.join(', ')}`
        };
      }
    }

    console.log(`[verifyENSRequirements] ✅ ENS verification passed: ${ensName}`);
    return { valid: true };

  } catch (error) {
    console.error('[verifyENSRequirements] Error:', error);
    return { valid: false, error: 'Failed to verify ENS requirements' };
  }
}

/**
 * Verify ERC-20 token balance
 */
export async function verifyERC20Balance(
  ethAddress: string,
  requirement: ERC20Requirement
): Promise<{ valid: boolean; error?: string }> {
  try {
    console.log(`[verifyERC20Balance] Checking ${requirement.symbol || 'ERC-20'} balance for ${ethAddress}`);

    const ERC20_ABI = [
      'function balanceOf(address) view returns (uint256)',
      'function decimals() view returns (uint8)',
      'function symbol() view returns (string)',
      'function name() view returns (string)'
    ];

    const provider = getEthereumProvider();
    const contract = new ethers.Contract(requirement.contractAddress, ERC20_ABI, provider);

    const [balance, decimals] = await Promise.all([
      contract.balanceOf(ethAddress),
      requirement.decimals ? Promise.resolve(requirement.decimals) : contract.decimals()
    ]);

    const minBalanceBN = ethers.BigNumber.from(requirement.minimum);
    const hasEnoughTokens = balance.gte(minBalanceBN);

    if (!hasEnoughTokens) {
      const actualFormatted = ethers.utils.formatUnits(balance, decimals);
      const requiredFormatted = ethers.utils.formatUnits(requirement.minimum, decimals);
      const tokenName = requirement.symbol || requirement.name || 'tokens';
      
      return {
        valid: false,
        error: `Insufficient ${tokenName}. Required: ${requiredFormatted}, Current: ${actualFormatted}`
      };
    }

    console.log(`[verifyERC20Balance] ✅ ERC-20 balance check passed for ${requirement.symbol || requirement.contractAddress}`);
    return { valid: true };

  } catch (error) {
    console.error('[verifyERC20Balance] Error:', error);
    return { valid: false, error: `Failed to verify ERC-20 token balance: ${requirement.symbol || requirement.contractAddress}` };
  }
}

/**
 * Verify ERC-721 NFT ownership
 */
export async function verifyERC721Ownership(
  ethAddress: string,
  requirement: ERC721Requirement
): Promise<{ valid: boolean; error?: string }> {
  try {
    console.log(`[verifyERC721Ownership] Checking ${requirement.symbol || 'ERC-721'} ownership for ${ethAddress}`);

    const ERC721_ABI = [
      'function balanceOf(address) view returns (uint256)',
      'function symbol() view returns (string)',
      'function name() view returns (string)'
    ];

    const provider = getEthereumProvider();
    const contract = new ethers.Contract(requirement.contractAddress, ERC721_ABI, provider);

    const balance = await contract.balanceOf(ethAddress);
    const minimumCount = requirement.minimumCount || 1;
    const hasEnoughNFTs = balance.gte(minimumCount);

    if (!hasEnoughNFTs) {
      const nftName = requirement.symbol || requirement.name || 'NFTs';
      return {
        valid: false,
        error: `Insufficient ${nftName}. Required: ${minimumCount}, Current: ${balance.toString()}`
      };
    }

    console.log(`[verifyERC721Ownership] ✅ ERC-721 ownership check passed for ${requirement.symbol || requirement.contractAddress}`);
    return { valid: true };

  } catch (error) {
    console.error('[verifyERC721Ownership] Error:', error);
    return { valid: false, error: `Failed to verify ERC-721 ownership: ${requirement.symbol || requirement.contractAddress}` };
  }
}

/**
 * Verify ERC-1155 token balance
 */
export async function verifyERC1155Balance(
  ethAddress: string,
  requirement: ERC1155Requirement
): Promise<{ valid: boolean; error?: string }> {
  try {
    console.log(`[verifyERC1155Balance] Checking ERC-1155 token ${requirement.tokenId} balance for ${ethAddress}`);

    const ERC1155_ABI = [
      'function balanceOf(address account, uint256 id) view returns (uint256)'
    ];

    const provider = getEthereumProvider();
    const contract = new ethers.Contract(requirement.contractAddress, ERC1155_ABI, provider);

    const balance = await contract.balanceOf(ethAddress, requirement.tokenId);
    const minBalanceBN = ethers.BigNumber.from(requirement.minimum);
    const hasEnoughTokens = balance.gte(minBalanceBN);

    if (!hasEnoughTokens) {
      const tokenName = requirement.name || `Token #${requirement.tokenId}`;
      return {
        valid: false,
        error: `Insufficient ${tokenName}. Required: ${requirement.minimum}, Current: ${balance.toString()}`
      };
    }

    console.log(`[verifyERC1155Balance] ✅ ERC-1155 balance check passed for token ${requirement.tokenId}`);
    return { valid: true };

  } catch (error) {
    console.error('[verifyERC1155Balance] Error:', error);
    return { valid: false, error: `Failed to verify ERC-1155 balance: Token #${requirement.tokenId}` };
  }
}

/**
 * Optimized EFP following check using pagination
 * Instead of downloading all following data, we search in chunks
 */
async function checkEFPFollowing(userAddress: string, targetAddress: string): Promise<boolean> {
  const EFP_API_BASE = 'https://api.ethfollow.xyz/api/v1';
  const CHUNK_SIZE = 1000; // Process 1000 records at a time
  let offset = 0;
  let hasMore = true;

  console.log(`[checkEFPFollowing] Searching if ${userAddress} follows ${targetAddress}`);

  while (hasMore) {
    try {
      const response = await fetch(`${EFP_API_BASE}/users/${userAddress}/following?limit=${CHUNK_SIZE}&offset=${offset}`);
      if (!response.ok) {
        throw new Error(`EFP API error: ${response.status}`);
      }

      const data = await response.json();
      const followingList = data.following || [];
      
      // Check current chunk for the target address
      const found = followingList
        .filter((item: unknown): item is EFPFollowRecord => 
          item != null && typeof item === 'object' && 'address' in item)
        .some((item: EFPFollowRecord) => 
          item.address.toLowerCase() === targetAddress.toLowerCase()
        );

      if (found) {
        console.log(`[checkEFPFollowing] ✅ Found match in chunk ${offset}-${offset + CHUNK_SIZE}`);
        return true;
      }

      // Check if we have more data
      hasMore = followingList.length === CHUNK_SIZE;
      offset += CHUNK_SIZE;

      console.log(`[checkEFPFollowing] Checked ${offset} records, continuing...`);
    } catch (error) {
      console.error(`[checkEFPFollowing] Error in chunk ${offset}:`, error);
      throw error;
    }
  }

  console.log(`[checkEFPFollowing] ❌ No match found after checking ${offset} records`);
  return false;
}

/**
 * Verify EFP (Ethereum Follow Protocol) requirements
 */
export async function verifyEFPRequirements(
  ethAddress: string,
  requirements: EFPRequirement[]
): Promise<{ valid: boolean; error?: string }> {
  try {
    console.log(`[verifyEFPRequirements] Checking ${requirements.length} EFP requirements for ${ethAddress}`);

    // EFP API base URL
    const EFP_API_BASE = 'https://api.ethfollow.xyz/api/v1';

    for (const requirement of requirements) {
      switch (requirement.type) {
        case 'minimum_followers': {
          const response = await fetch(`${EFP_API_BASE}/users/${ethAddress}/stats`);
          if (!response.ok) {
            throw new Error(`EFP API error: ${response.status}`);
          }

          const stats = await response.json();
          const followerCount = stats.followers_count || 0;
          const requiredCount = parseInt(requirement.value, 10);

          if (followerCount < requiredCount) {
            return {
              valid: false,
              error: `Insufficient EFP followers. Required: ${requiredCount}, Current: ${followerCount}`
            };
          }

          console.log(`[verifyEFPRequirements] ✅ Follower count check passed: ${followerCount} >= ${requiredCount}`);
          break;
        }

        case 'must_follow': {
          // 🎯 SELF-FOLLOW AUTO-PASS: If user is the person they must follow, auto-pass
          if (requirement.value.toLowerCase() === ethAddress.toLowerCase()) {
            console.log(`[verifyEFPRequirements] ✅ Auto-pass: User IS the person they must follow (${ethAddress})`);
            return { valid: true };
          }

          // Use optimized pagination-based search
          const isFollowing = await checkEFPFollowing(ethAddress, requirement.value);

          if (!isFollowing) {
            return {
              valid: false,
              error: `Not following required address: ${requirement.value.slice(0, 6)}...${requirement.value.slice(-4)}`
            };
          }

          console.log(`[verifyEFPRequirements] ✅ Following check passed: ${ethAddress} follows ${requirement.value}`);
          break;
        }

        case 'must_be_followed_by': {
          // 🎯 SELF-FOLLOW AUTO-PASS: If user is the person who must do the following, auto-pass
          if (requirement.value.toLowerCase() === ethAddress.toLowerCase()) {
            console.log(`[verifyEFPRequirements] ✅ Auto-pass: User IS the required follower (${ethAddress})`);
            return { valid: true };
          }

          // Use optimized pagination-based search (check if requirement.value follows ethAddress)
          const isFollowedBy = await checkEFPFollowing(requirement.value, ethAddress);

          if (!isFollowedBy) {
            return {
              valid: false,
              error: `Not followed by required address: ${requirement.value.slice(0, 6)}...${requirement.value.slice(-4)}`
            };
          }

          console.log(`[verifyEFPRequirements] ✅ Followed-by check passed: ${requirement.value} follows ${ethAddress}`);
          break;
        }

        default:
          return {
            valid: false,
            error: `Unknown EFP requirement type: ${requirement.type}`
          };
      }
    }

    console.log(`[verifyEFPRequirements] ✅ All ${requirements.length} EFP requirements met`);
    return { valid: true };

  } catch (error) {
    console.error('[verifyEFPRequirements] Error:', error);
    return { valid: false, error: 'Failed to verify EFP requirements' };
  }
}

/**
 * Verify all Ethereum gating requirements
 * 
 * @param ethAddress - Ethereum address to verify
 * @param requirements - Ethereum gating requirements to check
 * @param fulfillment - Fulfillment mode: "any" (OR logic) or "all" (AND logic). Defaults to "all" for backward compatibility.
 */
export async function verifyEthereumGatingRequirements(
  ethAddress: string,
  requirements: EthereumGatingRequirements,
  fulfillment: "any" | "all" = "all"
): Promise<{ valid: boolean; error?: string }> {
  try {
    console.log(`[verifyEthereumGatingRequirements] Verifying Ethereum requirements for ${ethAddress} with fulfillment mode: ${fulfillment}`);

    // 🚀 NEW: Collect all requirement results instead of early returns
    const requirementResults: Array<{ valid: boolean; error?: string }> = [];

    // Verify ETH balance requirement
    if (requirements.minimumETHBalance) {
      const ethResult = await verifyETHBalance(ethAddress, requirements.minimumETHBalance);
      requirementResults.push(ethResult);
      console.log(`[verifyEthereumGatingRequirements] ETH balance check: ${ethResult.valid ? '✅' : '❌'} ${ethResult.error || ''}`);
    }

    // Verify ENS requirements
    if (requirements.requiresENS || requirements.ensDomainPatterns) {
      const ensResult = await verifyENSRequirements(
        ethAddress,
        requirements.requiresENS || false,
        requirements.ensDomainPatterns
      );
      requirementResults.push(ensResult);
      console.log(`[verifyEthereumGatingRequirements] ENS check: ${ensResult.valid ? '✅' : '❌'} ${ensResult.error || ''}`);
    }

    // Verify ERC-20 token requirements
    if (requirements.requiredERC20Tokens && requirements.requiredERC20Tokens.length > 0) {
      for (const tokenReq of requirements.requiredERC20Tokens) {
        const tokenResult = await verifyERC20Balance(ethAddress, tokenReq);
        requirementResults.push(tokenResult);
        console.log(`[verifyEthereumGatingRequirements] ERC-20 ${tokenReq.symbol || tokenReq.contractAddress} check: ${tokenResult.valid ? '✅' : '❌'} ${tokenResult.error || ''}`);
      }
    }

    // Verify ERC-721 NFT requirements
    if (requirements.requiredERC721Collections && requirements.requiredERC721Collections.length > 0) {
      for (const nftReq of requirements.requiredERC721Collections) {
        const nftResult = await verifyERC721Ownership(ethAddress, nftReq);
        requirementResults.push(nftResult);
        console.log(`[verifyEthereumGatingRequirements] ERC-721 ${nftReq.symbol || nftReq.contractAddress} check: ${nftResult.valid ? '✅' : '❌'} ${nftResult.error || ''}`);
      }
    }

    // Verify ERC-1155 token requirements
    if (requirements.requiredERC1155Tokens && requirements.requiredERC1155Tokens.length > 0) {
      for (const tokenReq of requirements.requiredERC1155Tokens) {
        const tokenResult = await verifyERC1155Balance(ethAddress, tokenReq);
        requirementResults.push(tokenResult);
        console.log(`[verifyEthereumGatingRequirements] ERC-1155 token ${tokenReq.tokenId} check: ${tokenResult.valid ? '✅' : '❌'} ${tokenResult.error || ''}`);
      }
    }

    // Verify EFP requirements
    if (requirements.efpRequirements && requirements.efpRequirements.length > 0) {
      const efpResult = await verifyEFPRequirements(ethAddress, requirements.efpRequirements);
      requirementResults.push(efpResult);
      console.log(`[verifyEthereumGatingRequirements] EFP requirements check: ${efpResult.valid ? '✅' : '❌'} ${efpResult.error || ''}`);
    }

    // 🚀 NEW: Apply fulfillment logic
    if (requirementResults.length === 0) {
      console.log(`[verifyEthereumGatingRequirements] ✅ No requirements to verify - access granted`);
      return { valid: true }; // No requirements to check
    }

    const validResults = requirementResults.filter(result => result.valid);
    const failedResults = requirementResults.filter(result => !result.valid);

    if (fulfillment === 'any') {
      // ANY mode: At least one requirement must pass
      if (validResults.length > 0) {
        console.log(`[verifyEthereumGatingRequirements] ✅ ANY mode satisfied: ${validResults.length}/${requirementResults.length} requirements met`);
        return { valid: true };
      } else {
        console.log(`[verifyEthereumGatingRequirements] ❌ ANY mode failed: 0/${requirementResults.length} requirements met`);
        return { 
          valid: false, 
          error: failedResults.length > 0 ? failedResults[0].error : 'No requirements satisfied'
        };
      }
    } else {
      // ALL mode: All requirements must pass (default behavior)
      if (validResults.length === requirementResults.length) {
        console.log(`[verifyEthereumGatingRequirements] ✅ ALL mode satisfied: ${validResults.length}/${requirementResults.length} requirements met`);
        return { valid: true };
      } else {
        console.log(`[verifyEthereumGatingRequirements] ❌ ALL mode failed: ${validResults.length}/${requirementResults.length} requirements met`);
        return { 
          valid: false, 
          error: failedResults.length > 0 ? failedResults[0].error : 'Not all requirements satisfied'
        };
      }
    }

  } catch (error) {
    console.error('[verifyEthereumGatingRequirements] Error:', error);
    return { valid: false, error: 'Failed to verify Ethereum requirements' };
  }
} 
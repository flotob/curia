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
          const response = await fetch(`${EFP_API_BASE}/users/${ethAddress}/following`);
          if (!response.ok) {
            throw new Error(`EFP API error: ${response.status}`);
          }

          const data = await response.json();
          const followingList = data.following || [];
          
          // Extract addresses from EFP objects (each has an 'address' field)
          const addresses = followingList
            .filter((item: unknown): item is EFPFollowRecord => 
              item != null && typeof item === 'object' && 'address' in item)
            .map((item: EFPFollowRecord) => item.address);
          
          const isFollowing = addresses.some((addr: string) => 
            addr.toLowerCase() === requirement.value.toLowerCase()
          );

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
          const response = await fetch(`${EFP_API_BASE}/users/${requirement.value}/following`);
          if (!response.ok) {
            throw new Error(`EFP API error: ${response.status}`);
          }

          const data = await response.json();
          const followingList = data.following || [];
          
          // Extract addresses from EFP objects (each has an 'address' field)
          const addresses = followingList
            .filter((item: unknown): item is EFPFollowRecord => 
              item != null && typeof item === 'object' && 'address' in item)
            .map((item: EFPFollowRecord) => item.address);
          
          const isFollowedBy = addresses.some((addr: string) => 
            addr.toLowerCase() === ethAddress.toLowerCase()
          );

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
 */
export async function verifyEthereumGatingRequirements(
  ethAddress: string,
  requirements: EthereumGatingRequirements
): Promise<{ valid: boolean; error?: string }> {
  try {
    console.log(`[verifyEthereumGatingRequirements] Verifying Ethereum requirements for ${ethAddress}`);

    // Verify ETH balance requirement
    if (requirements.minimumETHBalance) {
      const ethResult = await verifyETHBalance(ethAddress, requirements.minimumETHBalance);
      if (!ethResult.valid) {
        return ethResult;
      }
    }

    // Verify ENS requirements
    if (requirements.requiresENS || requirements.ensDomainPatterns) {
      const ensResult = await verifyENSRequirements(
        ethAddress,
        requirements.requiresENS || false,
        requirements.ensDomainPatterns
      );
      if (!ensResult.valid) {
        return ensResult;
      }
    }

    // Verify ERC-20 token requirements
    if (requirements.requiredERC20Tokens && requirements.requiredERC20Tokens.length > 0) {
      for (const tokenReq of requirements.requiredERC20Tokens) {
        const tokenResult = await verifyERC20Balance(ethAddress, tokenReq);
        if (!tokenResult.valid) {
          return tokenResult;
        }
      }
    }

    // Verify ERC-721 NFT requirements
    if (requirements.requiredERC721Collections && requirements.requiredERC721Collections.length > 0) {
      for (const nftReq of requirements.requiredERC721Collections) {
        const nftResult = await verifyERC721Ownership(ethAddress, nftReq);
        if (!nftResult.valid) {
          return nftResult;
        }
      }
    }

    // Verify ERC-1155 token requirements
    if (requirements.requiredERC1155Tokens && requirements.requiredERC1155Tokens.length > 0) {
      for (const tokenReq of requirements.requiredERC1155Tokens) {
        const tokenResult = await verifyERC1155Balance(ethAddress, tokenReq);
        if (!tokenResult.valid) {
          return tokenResult;
        }
      }
    }

    // Verify EFP requirements
    if (requirements.efpRequirements && requirements.efpRequirements.length > 0) {
      const efpResult = await verifyEFPRequirements(ethAddress, requirements.efpRequirements);
      if (!efpResult.valid) {
        return efpResult;
      }
    }

    console.log(`[verifyEthereumGatingRequirements] ✅ All Ethereum requirements verified for ${ethAddress}`);
    return { valid: true };

  } catch (error) {
    console.error('[verifyEthereumGatingRequirements] Error:', error);
    return { valid: false, error: 'Failed to verify Ethereum requirements' };
  }
} 
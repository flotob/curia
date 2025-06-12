/**
 * Universal Profile Verification Functions
 * 
 * Shared verification logic for Universal Profile gating requirements.
 * Used by both the comments API and pre-verification API to ensure consistency.
 */

import { ethers } from 'ethers';
import { 
  TOKEN_FUNCTION_SELECTORS,
  TokenVerificationResult
} from '@/lib/verification';
import { PostSettings, TokenRequirement, FollowerRequirement } from '@/types/settings';
import { SettingsUtils } from '@/types/settings';

// LUKSO mainnet RPC configuration with working fallbacks only
const LUKSO_RPC_URLS = [
  process.env.NEXT_PUBLIC_LUKSO_MAINNET_RPC_URL,
  'https://rpc.mainnet.lukso.network', // Official LUKSO - works ✅
  'https://42.rpc.thirdweb.com'         // Thirdweb by Chain ID - works ✅
].filter(Boolean) as string[];

/**
 * Raw LUKSO RPC call helper - bypasses ethers.js HTTP compatibility issues
 * 
 * Note: We use raw fetch() calls instead of ethers.js providers due to 
 * Next.js runtime compatibility issues. Ethers v5 sets HTTP headers that
 * cause "Referrer 'client' is not a valid URL" errors in serverless environments.
 */
async function rawLuksoCall(method: string, params: unknown[] = []): Promise<unknown> {
  const body = {
    jsonrpc: "2.0",
    id: 1,
    method,
    params,
  };

  for (const rpcUrl of LUKSO_RPC_URLS) {
    try {
      console.log(`[rawLuksoCall] Trying ${method} on ${rpcUrl}`);
      const res = await fetch(rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const { result, error } = await res.json();
      if (error) {
        throw new Error(error.message || 'RPC error');
      }

      console.log(`[rawLuksoCall] Success: ${method} on ${rpcUrl}`);
      return result;
    } catch (error) {
      console.warn(`[rawLuksoCall] Failed ${method} on ${rpcUrl}:`, error);
    }
  }
  
  throw new Error(`All RPC endpoints failed for ${method}`);
}

/**
 * Verify LYX balance requirement using raw RPC calls
 * 
 * Uses eth_getBalance to check the Universal Profile's native LYX balance
 * against the minimum requirement set in the post's gating settings.
 */
export async function verifyLyxBalance(
  upAddress: string, 
  minBalance: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Get the Universal Profile's LYX balance using raw RPC call
    const balanceHex = await rawLuksoCall('eth_getBalance', [upAddress, 'latest']);
    
    // Convert hex balance to BigNumber for precise comparison (avoids floating point issues)
    const balance = ethers.BigNumber.from(balanceHex);
    const minBalanceBN = ethers.BigNumber.from(minBalance);
    
    if (balance.lt(minBalanceBN)) {
      const balanceEth = ethers.utils.formatEther(balance);
      const minBalanceEth = ethers.utils.formatEther(minBalance);
      return { 
        valid: false, 
        error: `Insufficient LYX balance. Required: ${minBalanceEth} LYX, Current: ${balanceEth} LYX` 
      };
    }

    console.log(`[verifyLyxBalance] Balance check passed: ${ethers.utils.formatEther(balance)} LYX >= ${ethers.utils.formatEther(minBalance)} LYX`);
    return { valid: true };

  } catch (error) {
    console.error('[verifyLyxBalance] Raw RPC balance check failed:', error);
    return { 
      valid: false, 
      error: 'Unable to verify LYX balance. Please check your connection and try again.' 
    };
  }
}

/**
 * Verify LSP7 token balance requirement using raw RPC calls
 * 
 * LSP7 tokens are fungible tokens (like ERC20) with balanceOf(address) function
 */
export async function verifyLSP7Balance(
  upAddress: string,
  requirement: TokenRequirement
): Promise<TokenVerificationResult> {
  try {
    console.log(`[verifyLSP7Balance] Checking LSP7 token ${requirement.contractAddress} for ${upAddress}`);

    // Manual ABI encoding for balanceOf(address) call
    const balanceOfSelector = TOKEN_FUNCTION_SELECTORS.LSP7_BALANCE_OF;
    const addressParam = upAddress.slice(2).padStart(64, '0'); // Remove 0x and pad to 32 bytes
    const callData = balanceOfSelector + addressParam;

    // Call balanceOf on the LSP7 token contract
    const balanceHex = await rawLuksoCall('eth_call', [
      {
        to: requirement.contractAddress,
        data: callData
      },
      'latest'
    ]);

    // Convert hex balance to BigNumber for comparison
    const balance = ethers.BigNumber.from(balanceHex);
    const minBalance = ethers.BigNumber.from(requirement.minAmount);

    if (balance.lt(minBalance)) {
      // Format balance for user-friendly error message
      const balanceFormatted = ethers.utils.formatUnits(balance, 18); // LSP7 typically uses 18 decimals
      const minBalanceFormatted = ethers.utils.formatUnits(minBalance, 18);
      
      return {
        valid: false,
        error: `Insufficient ${requirement.symbol || requirement.name} balance. Required: ${minBalanceFormatted}, Current: ${balanceFormatted}`,
        balance: balance.toString()
      };
    }

    console.log(`[verifyLSP7Balance] Token balance check passed: ${ethers.utils.formatUnits(balance, 18)} >= ${ethers.utils.formatUnits(minBalance, 18)}`);
    return { 
      valid: true,
      balance: balance.toString()
    };

  } catch (error) {
    console.error(`[verifyLSP7Balance] Failed to verify LSP7 token ${requirement.contractAddress}:`, error);
    return {
      valid: false,
      error: `Unable to verify ${requirement.symbol || requirement.name} balance. Please check your connection and try again.`,
    };
  }
}

/**
 * Verify LSP8 NFT ownership requirement using raw RPC calls
 * 
 * LSP8 tokens are NFTs (like ERC721) with balanceOf(address) function
 * For now, we check if user owns ANY NFT from the collection (balanceOf > 0)
 */
export async function verifyLSP8Ownership(
  upAddress: string,
  requirement: TokenRequirement
): Promise<TokenVerificationResult> {
  try {
    console.log(`[verifyLSP8Ownership] Checking LSP8 NFT collection ${requirement.contractAddress} for ${upAddress}`);

    // Manual ABI encoding for balanceOf(address) call (same as LSP7)
    const balanceOfSelector = TOKEN_FUNCTION_SELECTORS.LSP8_BALANCE_OF;
    const addressParam = upAddress.slice(2).padStart(64, '0'); // Remove 0x and pad to 32 bytes
    const callData = balanceOfSelector + addressParam;

    // Call balanceOf on the LSP8 NFT contract
    const balanceHex = await rawLuksoCall('eth_call', [
      {
        to: requirement.contractAddress,
        data: callData
      },
      'latest'
    ]);

    // Convert hex balance to number (for NFTs, this is the count of tokens owned)
    const nftCount = ethers.BigNumber.from(balanceHex);
    const minRequired = ethers.BigNumber.from(requirement.minAmount || '1'); // Default to 1 NFT if not specified

    if (nftCount.lt(minRequired)) {
      return {
        valid: false,
        error: `Insufficient ${requirement.symbol || requirement.name} NFTs. Required: ${minRequired.toString()}, Current: ${nftCount.toString()}`,
        balance: nftCount.toString()
      };
    }

    console.log(`[verifyLSP8Ownership] NFT ownership check passed: owns ${nftCount.toString()} NFTs >= ${minRequired.toString()} required`);
    return {
      valid: true,
      balance: nftCount.toString()
    };

  } catch (error) {
    console.error(`[verifyLSP8Ownership] Failed to verify LSP8 NFT ${requirement.contractAddress}:`, error);
    return {
      valid: false,
      error: `Unable to verify ${requirement.symbol || requirement.name} NFT ownership. Please check your connection and try again.`,
    };
  }
}

/**
 * Verify LSP26 follower requirements using proper ethers.js ABI encoding
 */
export async function verifyFollowerRequirements(
  upAddress: string,
  requirements: FollowerRequirement[]
): Promise<{ valid: boolean; error?: string }> {
  try {
    console.log(`[verifyFollowerRequirements] Checking ${requirements.length} follower requirements for ${upAddress}`);

    const LSP26_REGISTRY_ADDRESS = '0xf01103E5a9909Fc0DBe8166dA7085e0285daDDcA';
    
    // Use proper ethers.js Interface for ABI encoding
    const LSP26_ABI = [
      'function followerCount(address addr) view returns (uint256)',
      'function isFollowing(address follower, address addr) view returns (bool)'
    ];
    const iface = new ethers.utils.Interface(LSP26_ABI);

    for (const requirement of requirements) {
      let callData: string;
      let isValid = false;

      switch (requirement.type) {
        case 'minimum_followers': {
          // Call followerCount(address) on LSP26 registry using proper ABI encoding
          callData = iface.encodeFunctionData('followerCount', [upAddress]);
          
          const followerCountHex = await rawLuksoCall('eth_call', [
            {
              to: LSP26_REGISTRY_ADDRESS,
              data: callData
            },
            'latest'
          ]);

          // Decode the result using ethers
          const [followerCount] = iface.decodeFunctionResult('followerCount', followerCountHex as string);
          const followerCountNum = followerCount.toNumber();
          const requiredCount = parseInt(requirement.value, 10);
          
          isValid = followerCountNum >= requiredCount;
          
          if (!isValid) {
            return {
              valid: false,
              error: `Insufficient followers. Required: ${requiredCount}, Current: ${followerCountNum}`
            };
          }
          
          console.log(`[verifyFollowerRequirements] Follower count check passed: ${followerCountNum} >= ${requiredCount}`);
          break;
        }

        case 'followed_by': {
          // Call isFollowing(followerAddress, targetAddress) - check if requirement.value follows upAddress
          callData = iface.encodeFunctionData('isFollowing', [requirement.value, upAddress]);
          
          const isFollowedByHex = await rawLuksoCall('eth_call', [
            {
              to: LSP26_REGISTRY_ADDRESS,
              data: callData
            },
            'latest'
          ]);

          // Decode the boolean result
          const [isFollowedByResult] = iface.decodeFunctionResult('isFollowing', isFollowedByHex as string);
          isValid = Boolean(isFollowedByResult);
          
          if (!isValid) {
            return {
              valid: false,
              error: `Not followed by required profile: ${requirement.value.slice(0, 6)}...${requirement.value.slice(-4)}`
            };
          }
          
          console.log(`[verifyFollowerRequirements] Followed-by check passed: ${requirement.value} follows ${upAddress}`);
          break;
        }

        case 'following': {
          // Call isFollowing(followerAddress, targetAddress) - check if upAddress follows requirement.value
          callData = iface.encodeFunctionData('isFollowing', [upAddress, requirement.value]);
          
          const isFollowingHex = await rawLuksoCall('eth_call', [
            {
              to: LSP26_REGISTRY_ADDRESS,
              data: callData
            },
            'latest'
          ]);

          // Decode the boolean result
          const [isFollowingResult] = iface.decodeFunctionResult('isFollowing', isFollowingHex as string);
          isValid = Boolean(isFollowingResult);
          
          if (!isValid) {
            return {
              valid: false,
              error: `Not following required profile: ${requirement.value.slice(0, 6)}...${requirement.value.slice(-4)}`
            };
          }
          
          console.log(`[verifyFollowerRequirements] Following check passed: ${upAddress} follows ${requirement.value}`);
          break;
        }

        default:
          return {
            valid: false,
            error: `Unknown follower requirement type: ${requirement.type}`
          };
      }
    }

    console.log(`[verifyFollowerRequirements] All ${requirements.length} follower requirements met`);
    return { valid: true };

  } catch (error) {
    console.error('[verifyFollowerRequirements] Error verifying follower requirements:', error);
    return { 
      valid: false, 
      error: 'Failed to verify follower requirements. Please check your connection and try again.' 
    };
  }
}

/**
 * Verify token requirements for both LSP7 and LSP8 tokens
 */
export async function verifyTokenRequirements(
  upAddress: string,
  requirements: TokenRequirement[]
): Promise<{ valid: boolean; error?: string }> {
  try {
    console.log(`[verifyTokenRequirements] Checking ${requirements.length} token requirements for ${upAddress}`);

    // Process all token requirements in parallel for better performance
    const verificationPromises = requirements.map(async (requirement) => {
      if (requirement.tokenType === 'LSP7') {
        return await verifyLSP7Balance(upAddress, requirement);
      } else if (requirement.tokenType === 'LSP8') {
        return await verifyLSP8Ownership(upAddress, requirement);
      } else {
        return {
          valid: false,
          error: `Unsupported token type: ${requirement.tokenType}. Only LSP7 and LSP8 are supported.`
        };
      }
    });

    const results = await Promise.all(verificationPromises);

    // Check if all requirements are met
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (!result.valid) {
        const requirement = requirements[i];
        console.log(`[verifyTokenRequirements] Token requirement failed: ${requirement.symbol || requirement.name} - ${result.error}`);
        return { valid: false, error: result.error };
      }
    }

    console.log(`[verifyTokenRequirements] All ${requirements.length} token requirements met`);
    return { valid: true };

  } catch (error) {
    console.error('[verifyTokenRequirements] Error verifying token requirements:', error);
    return { valid: false, error: 'Failed to verify token requirements' };
  }
}

/**
 * Verify all Universal Profile gating requirements
 * 
 * This is the main verification function that orchestrates all requirement checks.
 * Used by both the comments API and pre-verification API.
 */
export async function verifyPostGatingRequirements(
  upAddress: string,
  postSettings: PostSettings
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Check if gating is enabled
    if (!SettingsUtils.hasUPGating(postSettings)) {
      return { valid: true }; // No gating requirements
    }

    const requirements = SettingsUtils.getUPGatingRequirements(postSettings);
    if (!requirements) {
      return { valid: true }; // No specific requirements
    }

    // Verify LYX balance requirement
    if (requirements.minLyxBalance) {
      const lyxResult = await verifyLyxBalance(upAddress, requirements.minLyxBalance);
      if (!lyxResult.valid) {
        return lyxResult;
      }
    }

    // Verify token requirements (LSP7/LSP8)
    if (requirements.requiredTokens && requirements.requiredTokens.length > 0) {
      const tokenResult = await verifyTokenRequirements(upAddress, requirements.requiredTokens);
      if (!tokenResult.valid) {
        return tokenResult;
      }
    }

    // Verify follower requirements (LSP26)
    if (requirements.followerRequirements && requirements.followerRequirements.length > 0) {
      const followerResult = await verifyFollowerRequirements(upAddress, requirements.followerRequirements);
      if (!followerResult.valid) {
        return followerResult;
      }
    }

    return { valid: true };

  } catch (error) {
    console.error('[verifyPostGatingRequirements] Error verifying requirements:', error);
    return { valid: false, error: 'Failed to verify post requirements' };
  }
} 
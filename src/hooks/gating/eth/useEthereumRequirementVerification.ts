import { useState, useEffect } from 'react';
import { EthereumGatingRequirements } from '@/types/gating';
import { useEthereumProfile } from '@/contexts/EthereumProfileContext';
import { ethers } from 'ethers';

// The detailed status for a single requirement
export interface RequirementVerificationStatus {
  isMet: boolean;
  isLoading: boolean;
  current?: string | number | boolean;
  required?: string | number | boolean;
  error?: string;
}

// The comprehensive status object returned by the hook
export interface EthereumVerificationState {
  isLoading: boolean;
  error: string | null;
  verificationStatus: {
    ethBalance?: RequirementVerificationStatus;
    ens?: RequirementVerificationStatus;
    efp?: Record<string, RequirementVerificationStatus>;
    // Add placeholders for future token types
    erc20?: Record<string, RequirementVerificationStatus>;
    erc721?: Record<string, RequirementVerificationStatus>;
    erc1155?: Record<string, RequirementVerificationStatus>;
  };
  // Pass through raw data for the display component
  rawData: {
    ethBalance: string;
    ensName?: string;
    ensAvatar?: string;
    efpStats: {
      followers: number;
      following: number;
    }
  }
}

const initialState: EthereumVerificationState = {
  isLoading: true,
  error: null,
  verificationStatus: {
    efp: {},
    erc20: {},
    erc721: {},
    erc1155: {},
  },
  rawData: {
    ethBalance: '0',
    efpStats: { followers: 0, following: 0 },
  }
};

export const useEthereumRequirementVerification = (
  ethAddress: string | null | undefined,
  requirements: EthereumGatingRequirements,
): EthereumVerificationState => {
  const { getETHBalance, getENSProfile, getEFPStats, checkEFPFollowing } = useEthereumProfile();
  const [state, setState] = useState<EthereumVerificationState>(initialState);

  const requirementsKey = JSON.stringify(requirements);

  useEffect(() => {
    if (!ethAddress) {
      setState(initialState);
      return;
    }

    const verify = async () => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        // Fetch all data in parallel
        const [ethBalance, ensProfile, efpStats] = await Promise.all([
          getETHBalance(),
          getENSProfile(),
          getEFPStats(),
        ]);

        const newState: EthereumVerificationState = {
          isLoading: false,
          error: null,
          verificationStatus: {
            efp: {},
            erc20: {},
            erc721: {},
            erc1155: {},
          },
          rawData: {
            ethBalance,
            ensName: ensProfile.name,
            ensAvatar: ensProfile.avatar,
            efpStats,
          }
        };

        // --- Perform Verifications ---

        // 1. ETH Balance
        if (requirements.minimumETHBalance) {
          const required = ethers.BigNumber.from(requirements.minimumETHBalance);
          // Convert formatted ETH balance back to wei for comparison
          const current = ethers.utils.parseEther(ethBalance);
          newState.verificationStatus.ethBalance = {
            isMet: current.gte(required),
            isLoading: false,
            current: ethers.utils.formatEther(current),
            required: ethers.utils.formatEther(required),
          };
        }

        // 2. ENS Status - Fixed to check patterns even when requiresENS is false
        if (requirements.requiresENS || requirements.ensDomainPatterns) {
            const hasENS = !!ensProfile.name;
            let isMet = false;
            let error: string | undefined;

            // If ENS is required, user must have ENS name
            if (requirements.requiresENS && !hasENS) {
                isMet = false;
                error = 'ENS name is required';
            }
            // If only patterns are specified (requiresENS is false), having no ENS is still valid unless patterns require specific domains
            else if (!requirements.requiresENS && !hasENS && requirements.ensDomainPatterns) {
                // For pattern-only requirements, no ENS name means requirement is not met
                isMet = false;
                error = `ENS domain matching pattern required: ${requirements.ensDomainPatterns.join(', ')}`;
            }
            // Check pattern matching if ENS name exists
            else if (hasENS) {
                isMet = true; // Default to true if ENS exists
                
                // Apply pattern restrictions if specified
                if (requirements.ensDomainPatterns && requirements.ensDomainPatterns.length > 0) {
                    const matchesPattern = requirements.ensDomainPatterns.some(pattern => {
                        if (pattern === '*') return true;
                        if (pattern.startsWith('*.')) {
                            return ensProfile.name!.endsWith(pattern.slice(1));
                        }
                        return ensProfile.name === pattern;
                    });

                    if (!matchesPattern) {
                        isMet = false;
                        error = `ENS does not match pattern: ${requirements.ensDomainPatterns.join(', ')}`;
                    }
                }
            }
            // If requiresENS is false and no patterns specified, and user has ENS, that's valid
            else if (!requirements.requiresENS && hasENS) {
                isMet = true;
            }
            
            newState.verificationStatus.ens = {
                isMet: isMet,
                isLoading: false,
                current: ensProfile.name,
                required: requirements.ensDomainPatterns?.join(', ') || (requirements.requiresENS ? 'Any ENS' : 'ENS Pattern'),
                error: error,
            };
        }
        
        // 3. EFP Requirements
        if (requirements.efpRequirements) {
            console.log('[EFP Debug] Processing EFP requirements:', requirements.efpRequirements);
            for (const req of requirements.efpRequirements) {
                const key = `${req.type}-${req.value}`;
                console.log(`[EFP Debug] Processing requirement: ${key}`);
                let isMet = false;
                let current: number | boolean = false;

                if (req.type === 'minimum_followers') {
                    current = efpStats.followers;
                    isMet = efpStats.followers >= parseInt(req.value, 10);
                    console.log(`[EFP Debug] Minimum followers: ${efpStats.followers} >= ${req.value} = ${isMet}`);
                } else if (req.type === 'must_follow') {
                    if (req.value.toLowerCase() === ethAddress.toLowerCase()) {
                        console.log('[EFP Debug] Self-follow auto-pass for must_follow');
                        isMet = true; // Self-follow auto-pass
                    } else {
                        // We need to check this async
                        console.log(`[EFP Debug] Checking if ${ethAddress} is following ${req.value}`);
                        isMet = await checkEFPFollowing(ethAddress, req.value);
                        console.log(`[EFP Debug] Result: ${ethAddress} following ${req.value} = ${isMet}`);
                    }
                    current = isMet;
                } else if (req.type === 'must_be_followed_by') {
                     if (req.value.toLowerCase() === ethAddress.toLowerCase()) {
                        console.log('[EFP Debug] Self-follow auto-pass for must_be_followed_by');
                        isMet = true; // Self-follow auto-pass
                    } else {
                        // We need to check this async
                        console.log(`[EFP Debug] Checking if ${req.value} is following ${ethAddress}`);
                        isMet = await checkEFPFollowing(req.value, ethAddress);
                        console.log(`[EFP Debug] Result: ${req.value} following ${ethAddress} = ${isMet}`);
                    }
                    current = isMet;
                }

                newState.verificationStatus.efp![key] = {
                    isMet,
                    isLoading: false,
                    current,
                    required: req.value,
                };
                
                console.log(`[EFP Debug] Final verification result for ${key}:`, newState.verificationStatus.efp![key]);
            }
        } else {
            console.log('[EFP Debug] No EFP requirements found');
        }

        setState(newState);
      } catch (e) {
        console.error("Error during Ethereum requirement verification:", e);
        setState({
          ...initialState,
          isLoading: false,
          error: e instanceof Error ? e.message : 'An unknown error occurred.',
        });
      }
    };

    verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ethAddress, requirementsKey, getETHBalance, getENSProfile, getEFPStats, checkEFPFollowing]);

  return state;
}; 
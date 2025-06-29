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
          const current = ethers.BigNumber.from(ethBalance);
          newState.verificationStatus.ethBalance = {
            isMet: current.gte(required),
            isLoading: false,
            current: ethers.utils.formatEther(current),
            required: ethers.utils.formatEther(required),
          };
        }

        // 2. ENS Status
        if (requirements.requiresENS) {
            const hasENS = !!ensProfile.name;
            let isMet = hasENS;
            let error: string | undefined;

            if (hasENS && requirements.ensDomainPatterns && requirements.ensDomainPatterns.length > 0) {
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
            
            newState.verificationStatus.ens = {
                isMet: isMet,
                isLoading: false,
                current: ensProfile.name,
                required: requirements.ensDomainPatterns?.join(', ') || 'Any ENS',
                error: error,
            };
        }
        
        // 3. EFP Requirements
        if (requirements.efpRequirements) {
            for (const req of requirements.efpRequirements) {
                const key = `${req.type}-${req.value}`;
                let isMet = false;
                let current: number | boolean = false;

                if (req.type === 'minimum_followers') {
                    current = efpStats.followers;
                    isMet = efpStats.followers >= parseInt(req.value, 10);
                } else if (req.type === 'must_follow') {
                    if (req.value.toLowerCase() === ethAddress.toLowerCase()) {
                        isMet = true; // Self-follow auto-pass
                    } else {
                        // We need to check this async
                        isMet = await checkEFPFollowing(ethAddress, req.value);
                    }
                    current = isMet;
                } else if (req.type === 'must_be_followed_by') {
                     if (req.value.toLowerCase() === ethAddress.toLowerCase()) {
                        isMet = true; // Self-follow auto-pass
                    } else {
                        // We need to check this async
                        isMet = await checkEFPFollowing(req.value, ethAddress);
                    }
                    current = isMet;
                }

                newState.verificationStatus.efp![key] = {
                    isMet,
                    isLoading: false,
                    current,
                    required: req.value,
                };
            }
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
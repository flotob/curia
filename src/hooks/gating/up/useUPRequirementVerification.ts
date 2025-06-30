import { useMemo } from 'react';
import { UPGatingRequirements } from '@/types/gating';
import { useUpLyxBalance } from './useUpLyxBalance';
import { useUpTokenVerification } from './useUpTokenVerification';
import { useUpFollowerVerification } from './useUpFollowerVerification';
import { ExtendedVerificationStatus } from '@/components/gating/RichRequirementsDisplay';
import { ethers } from 'ethers';

export const useUPRequirementVerification = (
  upAddress: string | null,
  requirements: UPGatingRequirements,
): { isLoading: boolean, error: string | null, verificationStatus: ExtendedVerificationStatus } => {
  
  const stableRequirements = useMemo(() => requirements, [requirements]);

  // === CHILD HOOKS ===
  const { rawBalance: rawLyxBalance, isLoading: isLoadingLyx, error: lyxError } = useUpLyxBalance(upAddress);
  const { verificationStatus: tokenStatus, isLoading: isLoadingTokens, error: tokenError } = useUpTokenVerification(upAddress, stableRequirements.requiredTokens || []);
  const { verificationStatus: followerStatus, isLoading: isLoadingFollowers, error: followerError } = useUpFollowerVerification(upAddress, stableRequirements.followerRequirements || []);

  // === STATE AGGREGATION ===
  const isLoading = isLoadingLyx || isLoadingTokens || isLoadingFollowers;
  const error = lyxError || tokenError || followerError;

  const verificationStatus: ExtendedVerificationStatus = useMemo(() => {
    // Transform the token status to match the expected format
    const transformedTokenStatus: { [key: string]: { raw: string; formatted: string; decimals?: number; name?: string; symbol?: string; } } = {};
    for (const key in tokenStatus) {
      const value = tokenStatus[key];
      transformedTokenStatus[key] = {
        raw: value.currentBalance,
        formatted: ethers.utils.formatUnits(value.currentBalance, value.metadata?.decimals || 18),
        decimals: value.metadata?.decimals,
        name: value.metadata?.name,
        symbol: value.metadata?.symbol,
      };
    }

    const transformedFollowerStatus: Record<string, boolean> = {};
    for (const key in followerStatus) {
      transformedFollowerStatus[key] = followerStatus[key].isMet;
    }

    return {
      connected: !!upAddress,
      verified: false, // This hook only does frontend checks
      address: upAddress || undefined,
      requirements: [], // This can be deprecated
      balances: {
        lyx: rawLyxBalance ? BigInt(rawLyxBalance) : undefined,
        tokens: transformedTokenStatus,
      },
      followerStatus: transformedFollowerStatus,
      error: error || undefined,
    };
  }, [upAddress, rawLyxBalance, tokenStatus, followerStatus, error]);

  return {
    isLoading,
    error,
    verificationStatus,
  };
}; 
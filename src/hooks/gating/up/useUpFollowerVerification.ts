import { useState, useEffect, useMemo } from 'react';
import { lsp26Registry } from '@/lib/lsp26';
import { FollowerRequirement } from '@/types/gating';

interface FollowerVerificationStatus {
  isMet: boolean;
  current?: string;
}

export const useUpFollowerVerification = (
  address: string | null,
  requirements: FollowerRequirement[]
) => {
  const [verificationStatus, setVerificationStatus] = useState<Record<string, FollowerVerificationStatus>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stableRequirements = useMemo(() => requirements, [JSON.stringify(requirements)]);

  useEffect(() => {
    if (!address || stableRequirements.length === 0) {
      setVerificationStatus({});
      return;
    }

    const verifyFollowers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const newStatus: Record<string, FollowerVerificationStatus> = {};
        for (const req of stableRequirements) {
          const key = `${req.type}-${req.value}`;
          let isMet = false;
          let current: string | undefined;

          if (req.value.toLowerCase() === address.toLowerCase()) {
            isMet = true; // Auto-pass for self-follow requirements
          } else if (req.type === 'minimum_followers') {
            const count = await lsp26Registry.getFollowerCount(address);
            isMet = count >= parseInt(req.value);
            current = `${count} followers`;
          } else if (req.type === 'followed_by') {
            isMet = await lsp26Registry.isFollowing(req.value, address);
            current = isMet ? 'Followed' : 'Not followed';
          } else if (req.type === 'following') {
            isMet = await lsp26Registry.isFollowing(address, req.value);
            current = isMet ? 'Following' : 'Not following';
          }
          newStatus[key] = { isMet, current };
        }
        setVerificationStatus(newStatus);
      } catch (e) {
        console.error('Failed to verify follower requirements:', e);
        setError('Failed to verify follower requirements.');
      } finally {
        setIsLoading(false);
      }
    };

    verifyFollowers();
  }, [address, stableRequirements]);

  return { verificationStatus, isLoading, error };
}; 
import React, { useEffect, useMemo } from 'react';
import { GatingCategoryStatus, UPGatingRequirements } from '@/types/gating';
import { useUpLyxBalance } from '@/hooks/gating/up/useUpLyxBalance';
import { useUpTokenVerification } from '@/hooks/gating/up/useUpTokenVerification';
import { useUpFollowerVerification } from '@/hooks/gating/up/useUpFollowerVerification';
import { LyxRequirementView } from './up/LyxRequirementView';
import { TokenRequirementView } from './up/TokenRequirementView';
import { FollowerRequirementView } from './up/FollowerRequirementView';
import { useUniversalProfile } from '@/contexts/UniversalProfileContext';
import { ethers } from 'ethers';

interface UniversalProfileGatingPanelProps {
  requirements: UPGatingRequirements;
  fulfillment: 'any' | 'all';
  onStatusUpdate: (status: GatingCategoryStatus) => void;
}

export const UniversalProfileGatingPanel: React.FC<UniversalProfileGatingPanelProps> = ({ 
  requirements,
  fulfillment,
  onStatusUpdate,
}) => {
  const { upAddress } = useUniversalProfile();
  
  // Use our new, isolated hooks
  const { balance: lyxBalance, isLoading: isLoadingLyx } = useUpLyxBalance(upAddress);
  const { verificationStatus: tokenStatus, isLoading: isLoadingTokens } = useUpTokenVerification(upAddress, requirements.requiredTokens || []);
  const { verificationStatus: followerStatus, isLoading: isLoadingFollowers } = useUpFollowerVerification(upAddress, requirements.followerRequirements || []);

  const lyxRequirementMet = useMemo(() => {
    if (!requirements.minLyxBalance || lyxBalance === null) {
      return false;
    }
    try {
      const requiredInLyx = ethers.utils.formatEther(requirements.minLyxBalance);
      return parseFloat(lyxBalance) >= parseFloat(requiredInLyx);
    } catch (e) {
      console.error("Error comparing LYX balances:", e);
      return false;
    }
  }, [lyxBalance, requirements.minLyxBalance]);

  useEffect(() => {
    const checks: boolean[] = [];
    let metCount = 0;
    let totalCount = 0;

    if (requirements.minLyxBalance) {
      totalCount++;
      if (lyxRequirementMet) metCount++;
      checks.push(lyxRequirementMet);
    }

    (requirements.requiredTokens || []).forEach(req => {
      totalCount++;
      const key = req.tokenId ? `${req.contractAddress}-${req.tokenId}` : req.contractAddress;
      const isMet = tokenStatus[key]?.isMet || false;
      if (isMet) metCount++;
      checks.push(isMet);
    });

    (requirements.followerRequirements || []).forEach(req => {
      totalCount++;
      const key = `${req.type}-${req.value}`;
      const isMet = followerStatus[key]?.isMet || false;
      if (isMet) metCount++;
      checks.push(isMet);
    });
    
    if (totalCount === 0) {
      onStatusUpdate({ met: 0, total: 0, isMet: true });
      return;
    }

    const isCategoryMet = fulfillment === 'any' ? checks.some(c => c) : checks.every(c => c);

    onStatusUpdate({
      met: metCount,
      total: totalCount,
      isMet: isCategoryMet
    });

  }, [lyxRequirementMet, tokenStatus, followerStatus, requirements, fulfillment, onStatusUpdate]);

  return (
    <div className="space-y-3">
      {requirements.minLyxBalance && (
        <LyxRequirementView
          requiredBalance={requirements.minLyxBalance}
          actualBalance={lyxBalance}
          isLoading={isLoadingLyx}
        />
      )}
      
      {(requirements.requiredTokens || []).map((req, index) => {
        const tokenKey = req.tokenType === 'LSP8' && req.tokenId 
          ? `${req.contractAddress}-${req.tokenId}` 
          : req.contractAddress;
        
        return (
          <TokenRequirementView
            key={index}
            requirement={req}
            status={tokenStatus[tokenKey]}
            isLoading={isLoadingTokens}
          />
        );
      })}

      {(requirements.followerRequirements || []).map((req, index) => (
        <FollowerRequirementView
          key={index}
          requirement={req}
          status={followerStatus[`${req.type}-${req.value}`]}
          isLoading={isLoadingFollowers}
        />
      ))}
    </div>
  );
}; 
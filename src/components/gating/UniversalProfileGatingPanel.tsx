import React from 'react';
import { UPGatingRequirements } from '@/types/gating';
import { useUpLyxBalance } from '@/hooks/gating/up/useUpLyxBalance';
import { useUpTokenVerification } from '@/hooks/gating/up/useUpTokenVerification';
import { useUpFollowerVerification } from '@/hooks/gating/up/useUpFollowerVerification';
import { LyxRequirementView } from './up/LyxRequirementView';
import { TokenRequirementView } from './up/TokenRequirementView';
import { FollowerRequirementView } from './up/FollowerRequirementView';
import { useUniversalProfile } from '@/contexts/UniversalProfileContext';

interface UniversalProfileGatingPanelProps {
  requirements: UPGatingRequirements;
}

export const UniversalProfileGatingPanel: React.FC<UniversalProfileGatingPanelProps> = ({ requirements }) => {
  const { upAddress } = useUniversalProfile();
  
  // Use our new, isolated hooks
  const { balance: lyxBalance, isLoading: isLoadingLyx } = useUpLyxBalance(upAddress);
  const { verificationStatus: tokenStatus, isLoading: isLoadingTokens } = useUpTokenVerification(upAddress, requirements.requiredTokens || []);
  const { verificationStatus: followerStatus, isLoading: isLoadingFollowers } = useUpFollowerVerification(upAddress, requirements.followerRequirements || []);

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
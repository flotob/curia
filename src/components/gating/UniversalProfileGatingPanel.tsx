import React, { useEffect } from 'react';
import { GatingCategoryStatus, UPGatingRequirements } from '@/types/gating';
import { useUniversalProfile } from '@/contexts/UniversalProfileContext';
import { useUPRequirementVerification } from '@/hooks/gating/up/useUPRequirementVerification';
import { RichRequirementsDisplay } from '@/components/gating/RichRequirementsDisplay';

interface UniversalProfileGatingPanelProps {
  requirements: UPGatingRequirements;
  fulfillment: 'any' | 'all';
  onStatusUpdate: (status: GatingCategoryStatus) => void;
  isPreviewMode?: boolean;
}

export const UniversalProfileGatingPanel: React.FC<UniversalProfileGatingPanelProps> = ({ 
  requirements,
  fulfillment,
  onStatusUpdate,
  isPreviewMode,
}) => {
  const { upAddress, connect, disconnect } = useUniversalProfile();
  
  // Use our new, single logic hook
  const { isLoading, verificationStatus } = useUPRequirementVerification(upAddress, requirements);
  
  // Report status up to the parent component
  useEffect(() => {
    if (isLoading) return;

    // Correctly derive checks from the new hook's state structure
    const lyxMet = verificationStatus.balances?.lyx 
      ? (verificationStatus.balances.lyx >= BigInt(requirements.minLyxBalance || '0'))
      : false;

    const tokenChecks = requirements.requiredTokens?.map(req => {
      const tokenKey = req.tokenId ? `${req.contractAddress}-${req.tokenId}` : req.contractAddress;
      const balance = BigInt(verificationStatus.balances?.tokens?.[tokenKey]?.raw || '0');
      const required = BigInt(req.minAmount || '1');
      return balance >= required;
    }) || [];

    const followerChecks = requirements.followerRequirements?.map(req => {
      const key = `${req.type}-${req.value}`;
      return verificationStatus.followerStatus?.[key] || false;
    }) || [];

    const allChecks = [
        (requirements.minLyxBalance ? lyxMet : undefined),
        ...tokenChecks,
        ...followerChecks
    ].filter(v => v !== undefined) as boolean[];
    
    let isMet = false;
    if (allChecks.length > 0) {
        if (fulfillment === 'any') {
            isMet = allChecks.some(c => c === true);
        } else {
            isMet = allChecks.every(c => c === true);
        }
    } else {
        isMet = true; // No requirements means met
    }

    const metCount = allChecks.filter(c => c === true).length;
    const totalCount = allChecks.length;

    onStatusUpdate({
      met: metCount,
      total: totalCount,
      isMet,
    });
  }, [verificationStatus, fulfillment, onStatusUpdate, requirements]);

  // The 'connect' function from the context can be used directly.
  const handleConnect = async () => {
    try {
      await connect();
      // Potentially call onVerificationComplete here if auto-verification is desired after connect
    } catch (error) {
      console.error("Failed to connect Universal Profile:", error);
    }
  };

  return (
    <RichRequirementsDisplay
      requirements={requirements}
      fulfillment={fulfillment}
      userStatus={verificationStatus}
      metadata={{
        icon: '⬡',
        name: 'Universal Profile',
        brandColor: '#F20079' // LUKSO Pink
      }}
      onConnect={handleConnect}
      onDisconnect={disconnect}
      isPreviewMode={isPreviewMode}
    />
  );
}; 
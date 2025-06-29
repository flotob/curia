import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { GatingCategoryStatus, UPGatingRequirements } from '@/types/gating';
import { useUniversalProfile } from '@/contexts/UniversalProfileContext';
import { useUPRequirementVerification } from '@/hooks/gating/up/useUPRequirementVerification';
import { RichRequirementsDisplay } from '@/components/gating/RichRequirementsDisplay';
import { EthereumSmartVerificationButton } from '../ethereum/EthereumSmartVerificationButton';
import { useAuth } from '@/contexts/AuthContext';

interface UniversalProfileGatingPanelProps {
  requirements: UPGatingRequirements;
  fulfillment: 'any' | 'all';
  onStatusUpdate: (status: GatingCategoryStatus) => void;
  onVerificationComplete?: () => void;
  isPreviewMode?: boolean;
  postId?: number;
}

export const UniversalProfileGatingPanel: React.FC<UniversalProfileGatingPanelProps> = ({
  requirements,
  fulfillment,
  onStatusUpdate,
  onVerificationComplete,
  isPreviewMode,
  postId
}) => {
  const { upAddress, connect, disconnect, signMessage } = useUniversalProfile();
  const { token } = useAuth();
  
  const { isLoading, verificationStatus, error: localVerificationError } = useUPRequirementVerification(upAddress, requirements);
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverVerified, setServerVerified] = useState(false);

  const { allRequirementsMet, checks } = useMemo(() => {
    if (isLoading || !verificationStatus.connected) {
      return { allRequirementsMet: false, checks: [] };
    }
    
    const lyxMet = verificationStatus.balances?.lyx && requirements.minLyxBalance
      ? verificationStatus.balances.lyx >= BigInt(requirements.minLyxBalance)
      : undefined;

    const tokenChecks = requirements.requiredTokens?.map(req => {
      const tokenKey = req.tokenId ? `${req.contractAddress}-${req.tokenId}` : req.contractAddress;
      const balance = BigInt(verificationStatus.balances?.tokens?.[tokenKey]?.raw || '0');
      const required = BigInt(req.minAmount || '1');
      return balance >= required;
    });

    const followerChecks = requirements.followerRequirements?.map(req => {
      const key = `${req.type}-${req.value}`;
      return verificationStatus.followerStatus?.[key] || false;
    });

    const allChecks = [
      ...(lyxMet !== undefined ? [lyxMet] : []),
      ...(tokenChecks || []),
      ...(followerChecks || []),
    ];

    let isMet = false;
    if (allChecks.length > 0) {
      if (fulfillment === 'any') {
        isMet = allChecks.some(c => c === true);
      } else {
        isMet = allChecks.every(c => c === true);
      }
    } else {
      isMet = true;
    }
    return { allRequirementsMet: isMet, checks: allChecks };
  }, [isLoading, verificationStatus, requirements, fulfillment]);

  // Report status up to the parent component
  useEffect(() => {
    if (isLoading) return;
    const metCount = checks.filter(c => c === true).length;
    const totalCount = checks.length;
    onStatusUpdate({
      met: metCount,
      total: totalCount,
      isMet: allRequirementsMet,
    });
  }, [allRequirementsMet, checks, onStatusUpdate, isLoading]);

  const handleBackendVerification = useCallback(async () => {
    // In preview mode, don't do backend verification
    if (isPreviewMode) {
      console.log('[UP] Preview mode - no backend verification needed');
      return;
    }

    // For post verification, we need upAddress, token, and postId
    if (!upAddress || !token || !postId) {
      console.error('[UP] Missing required data for verification:', { upAddress: !!upAddress, token: !!token, postId });
      return;
    }

    setIsVerifying(true);
    setServerError(null);
    
    try {
      // Step 1: Generate proper challenge from server (like Ethereum does)
      console.log('[UP] Generating challenge from server...');
      const challengeResponse = await fetch(`/api/posts/${postId}/challenge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          upAddress,
        }),
      });

      if (!challengeResponse.ok) {
        const errorData = await challengeResponse.json();
        throw new Error(errorData.error || 'Failed to generate challenge');
      }

      const { challenge, message } = await challengeResponse.json();
      console.log('[UP] Challenge generated successfully:', challenge);

      // Step 2: Sign the challenge message
      console.log('[UP] Signing challenge message...');
      const signature = await signMessage(message);

      // Step 3: Send complete challenge with signature for verification
      console.log('[UP] Submitting signed challenge for verification...');
      const verificationResponse = await fetch(`/api/posts/${postId}/pre-verify/universal_profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          challenge: {
            ...challenge,
            signature,
          },
        }),
      });

      if (!verificationResponse.ok) {
        const errorData = await verificationResponse.json();
        throw new Error(errorData.error || 'Server verification failed');
      }

      console.log('[UP] ✅ Verification completed successfully');
      setServerVerified(true);
      onVerificationComplete?.();
    } catch (e) {
      console.error('[UP] Backend verification failed:', e);
      setServerError(e instanceof Error ? e.message : 'An unknown error occurred.');
    } finally {
      setIsVerifying(false);
    }
  }, [upAddress, token, isPreviewMode, postId, signMessage, onVerificationComplete]);

  const handleConnect = async () => {
    try {
      await connect();
    } catch (error) {
      console.error("Failed to connect Universal Profile:", error);
    }
  };

  const getButtonState = () => {
    if (isVerifying) return 'verifying';
    if (serverVerified) return 'verification_complete';
    if (!allRequirementsMet) return 'requirements_not_met';
    if (isPreviewMode && allRequirementsMet) return 'preview_mode_complete';
    return 'ready_to_verify';
  }

  return (
    <div className="space-y-4">
      <RichRequirementsDisplay
        requirements={requirements}
        fulfillment={fulfillment}
        userStatus={verificationStatus}
        metadata={{
          icon: '⬡',
          name: 'Universal Profile',
          brandColor: '#F20079'
        }}
        onConnect={handleConnect}
        onDisconnect={disconnect}
        isPreviewMode={isPreviewMode}
      />
      
      {/* Show verification button in both preview and post contexts */}
      {verificationStatus.connected && (
        <EthereumSmartVerificationButton
            state={getButtonState()}
            allRequirementsMet={allRequirementsMet}
            isConnected={verificationStatus.connected}
            isCorrectChain={true}
            isVerifying={isVerifying}
            verified={serverVerified}
            onClick={handleBackendVerification}
            error={serverError || localVerificationError || undefined}
        />
      )}
    </div>
  );
}; 
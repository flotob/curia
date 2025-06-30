/**
 * Ethereum Connection Widget
 * 
 * Displays Ethereum wallet connection UI and verification status using RainbowKit
 * Used by the EthereumProfileRenderer for gated posts
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { 
  AlertTriangle, 
  User,
  Coins,
  Users,
  Shield
} from 'lucide-react';
import { useEthereumProfile, EthereumProfileProvider } from '@/contexts/EthereumProfileContext';
import { EthereumGatingRequirements, GatingCategoryStatus } from '@/types/gating';
import { formatEther } from 'viem';
import { EthereumRichRequirementsDisplay, EthereumExtendedVerificationStatus } from './EthereumRichRequirementsDisplay';
import { EthereumSmartVerificationButton } from './EthereumSmartVerificationButton';
import { useAuth } from '@/contexts/AuthContext';
import { useInvalidateVerificationStatus } from '@/hooks/useGatingData';
import { useEthereumRequirementVerification } from '@/hooks/gating/eth/useEthereumRequirementVerification';
import { authFetch } from '@/utils/authFetch';

interface EthereumConnectionWidgetProps {
  requirements: EthereumGatingRequirements;
  fulfillment?: "any" | "all";
  onStatusUpdate?: (status: GatingCategoryStatus) => void;
  postId?: number;
  serverVerified?: boolean;
  onVerificationComplete?: (canComment?: boolean) => void;
  isPreviewMode?: boolean;
  verificationContext?: {
    type: 'board' | 'post' | 'preview';
    communityId?: string;
    boardId?: number;
    postId?: number;
    lockId?: number;
  };
}

// Internal component that uses the Ethereum context
const EthereumConnectionWidgetInternal: React.FC<EthereumConnectionWidgetProps> = ({
  requirements,
  fulfillment = 'all',
  onStatusUpdate,
  postId,
  serverVerified = false,
  onVerificationComplete,
  isPreviewMode = false,
  verificationContext,
}) => {
  const {
    isConnected,
    connectionError,
    isCorrectChain,
    ethAddress,
    disconnect,
    switchToEthereum,
    signMessage,
  } = useEthereumProfile();
  
  const { token } = useAuth();
  const invalidateVerificationStatus = useInvalidateVerificationStatus();

  // --- NEW: Centralized verification logic hook ---
  const { isLoading: isVerifyingLocally, error: localVerificationError, verificationStatus, rawData } = useEthereumRequirementVerification(ethAddress, requirements);

  const [isVerifying] = useState(false);
  const [verificationState] = useState<'idle' | 'success_pending' | 'error_pending'>('idle');

  // Memoize requirements to prevent unnecessary re-renders
  const requirementsKey = JSON.stringify(requirements);
  const stableRequirements = useMemo(() => requirements, [requirementsKey]);

  // Handle disconnection
  const handleDisconnect = useCallback(() => {
    disconnect();
    // Reset local state if needed
  }, [disconnect]);

  // When local verification results change, report status up to parent
  useEffect(() => {
    if (!onStatusUpdate) return;
    
    const allChecks = [
        verificationStatus.ethBalance,
        verificationStatus.ens,
        ...Object.values(verificationStatus.efp || {}),
        ...Object.values(verificationStatus.erc20 || {}),
        ...Object.values(verificationStatus.erc721 || {}),
        ...Object.values(verificationStatus.erc1155 || {}),
    ].filter(Boolean);

    const metCount = allChecks.filter(c => c!.isMet).length;
    const totalCount = allChecks.length;
    
    let isOverallMet = false;
    if (totalCount > 0) {
        if (fulfillment === 'any') {
            isOverallMet = allChecks.some(c => c!.isMet);
        } else {
            isOverallMet = allChecks.every(c => c!.isMet);
        }
    } else {
        isOverallMet = true; // No requirements means it's met
    }

    onStatusUpdate({
      met: metCount,
      total: totalCount,
      isMet: isOverallMet,
    });
  }, [verificationStatus, fulfillment, onStatusUpdate]);

  // Server pre-verification function
  const verifyRequirements = useCallback(async () => {
    // In preview mode, don't do backend verification
    if (isPreviewMode) {
      console.log('[Ethereum] Preview mode - no backend verification needed');
      return;
    }

    if (!ethAddress || !token) {
      console.error('[Ethereum] Missing required data for verification:', { ethAddress: !!ethAddress, token: !!token });
      return;
    }

    if (!isConnected || !isCorrectChain) {
      console.error('[Ethereum] Not connected or wrong chain');
      return;
    }

    // Determine verification context
    const context = verificationContext || (postId ? { type: 'post' as const, postId } : null);
    
    if (!context) {
      console.error('[Ethereum] No verification context provided');
      return;
    }

    try {
      // Use generic verification flow for all contexts
      const lockId = context.lockId || verificationContext?.lockId;
      if (!lockId) {
        throw new Error('Missing lockId for verification');
      }

      // Determine verification context
      let verifyContext: { type: 'post' | 'board'; id: number };
      if (context.type === 'board') {
        verifyContext = { type: 'board', id: context.boardId! };
      } else if (context.type === 'post') {
        verifyContext = { type: 'post', id: context.postId! };
      } else {
        throw new Error(`Unsupported verification context type: ${context.type}`);
      }

      // Create standardized signing message
      const message = `Verify ethereum_profile for lock access
Lock ID: ${lockId}
Address: ${ethAddress}
Context: ${verifyContext.type}:${verifyContext.id}
Timestamp: ${Date.now()}
Chain: Ethereum

This signature proves you control this address and grants access based on lock requirements.`;

      console.log('[Ethereum] Signing verification message...');
      const signature = await signMessage(message);

      console.log('[Ethereum] Submitting to generic verification endpoint...');
      const verificationResponse = await authFetch(`/api/locks/${lockId}/verify/ethereum_profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signature,
          message,
          address: ethAddress,
          context: verifyContext,
          verificationData: {
            requirements: stableRequirements
          }
        }),
      });

      if (!verificationResponse.ok) {
        const errorData = await verificationResponse.json();
        throw new Error(errorData.error || 'Verification failed');
      }

      const result = await verificationResponse.json();

      if (result.success) {
        console.log('[Ethereum] ✅ Generic verification completed successfully');
        
        // Invalidate verification status for legacy hooks if needed
        if (context.type === 'post' && context.postId) {
          invalidateVerificationStatus(context.postId);
        }
        
        // Notify parent component
        onVerificationComplete?.(true);
      } else {
        throw new Error(result.message || result.error || 'Verification failed');
      }

    } catch (error) {
      console.error('[Ethereum] Backend verification failed:', error);
      throw error; // Let EthereumSmartVerificationButton handle the error display
    }
  }, [ethAddress, isConnected, isCorrectChain, signMessage, token, verificationContext, postId, onVerificationComplete, isPreviewMode, invalidateVerificationStatus]);

  // Format ETH amount for display
  const formatETHAmount = (weiAmount: string): string => {
    try {
      return formatEther(BigInt(weiAmount));
    } catch {
      return '0';
    }
  };

  const allRequirementsMet = useMemo(() => {
    if (isVerifyingLocally) return false;
    const allChecks = [
        verificationStatus.ethBalance,
        verificationStatus.ens,
        ...Object.values(verificationStatus.efp || {}),
    ].filter(Boolean);

    if(allChecks.length === 0) return true;

    return fulfillment === 'any' 
        ? allChecks.some(c => c!.isMet) 
        : allChecks.every(c => c!.isMet);
  }, [verificationStatus, fulfillment, isVerifyingLocally]);

  // Determine button state based on verification progress
  const getButtonState = () => {
    if (verificationState === 'success_pending') return 'verification_success_pending';
    if (verificationState === 'error_pending') return 'verification_error_pending';
    if (serverVerified) return 'verification_complete';
    if (isVerifying) return 'verifying';
    if (!allRequirementsMet) return 'requirements_not_met';
    if (isPreviewMode && allRequirementsMet) return 'preview_mode_complete';
    return 'ready_to_verify';
  };

  // If not connected, show RainbowKit connect button with requirements preview
  if (!isConnected) {
    return (
      <div className="p-4 border rounded-lg bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
        <div className="flex items-center space-x-3 mb-3">
          <div>
            <div className="text-sm font-medium text-blue-800 dark:text-blue-200">Ethereum Profile Required</div>
            <div className="text-xs text-blue-600 dark:text-blue-300">Connect your Ethereum wallet to verify requirements</div>
          </div>
        </div>

        {/* Show requirements preview */}
        <div className="mb-3 space-y-2">
          {stableRequirements.requiresENS && (
            <Badge variant="outline" className="text-xs bg-purple-50 border-purple-200 text-purple-800 dark:bg-purple-900/20 dark:border-purple-700 dark:text-purple-300">
              <User className="w-3 h-3 mr-1" />
              ENS Name Required
            </Badge>
          )}
          
          {stableRequirements.minimumETHBalance && (
            <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300">
              <Coins className="w-3 h-3 mr-1" />
              {formatETHAmount(stableRequirements.minimumETHBalance)} ETH
            </Badge>
          )}

          {stableRequirements.efpRequirements?.some(req => req.type === 'minimum_followers') && (
            <Badge variant="outline" className="text-xs bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300">
              <Users className="w-3 h-3 mr-1" />
              EFP Followers Required
            </Badge>
          )}

          {(stableRequirements.requiredERC20Tokens?.length || 
            stableRequirements.requiredERC721Collections?.length || 
            stableRequirements.requiredERC1155Tokens?.length) && (
            <Badge variant="outline" className="text-xs bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-300">
              <Shield className="w-3 h-3 mr-1" />
              Token Holdings Required
            </Badge>
          )}
        </div>

        {connectionError && (
          <Alert className="mb-3 py-2">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription className="text-xs">
              {connectionError}
            </AlertDescription>
          </Alert>
        )}

        {/* RainbowKit Connect Button */}
        <div className="w-full">
          <ConnectButton />
        </div>
      </div>
    );
  }

  // If connected but wrong chain, show switch button
  if (!isCorrectChain) {
    return (
      <div className="p-4 border rounded-lg bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800">
        <div className="flex items-center space-x-3 mb-3">
          <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          <div>
            <div className="text-sm font-medium text-orange-800 dark:text-orange-200">Wrong Network</div>
            <div className="text-xs text-orange-600 dark:text-orange-300">Please switch to Ethereum Mainnet</div>
          </div>
        </div>

        <div className="flex space-x-2">
          <Button onClick={switchToEthereum} size="sm" className="flex-1">
            Switch to Ethereum
          </Button>
          <Button onClick={handleDisconnect} variant="outline" size="sm">
            Disconnect
          </Button>
        </div>
      </div>
    );
  }

  // Create extended user status for rich display with real blockchain data
  const extendedUserStatus: EthereumExtendedVerificationStatus = {
    connected: isConnected,
    verified: serverVerified,
    requirements: [], // This can be deprecated
    ethAddress: ethAddress || undefined,
    balances: {
      eth: rawData.ethBalance,
      // Placeholder for tokens - to be implemented
      tokens: {} 
    },
    ensStatus: verificationStatus.ens?.isMet,
    efpStatus: Object.entries(verificationStatus.efp || {}).reduce((acc, [key, status]) => {
        acc[key] = status.isMet;
        return acc;
    }, {} as Record<string, boolean>),
    ensName: rawData.ensName,
    ensAvatar: rawData.ensAvatar,
  };

  // Connected and on correct chain - show rich requirements display
  return (
    <div className="space-y-4">
      <EthereumRichRequirementsDisplay
        requirements={stableRequirements}
        fulfillment={fulfillment}
        userStatus={extendedUserStatus}
        metadata={{
          icon: '⟠',
          name: 'Ethereum Profile',
          brandColor: '#627EEA'
        }}
        onConnect={async () => {}} // Already connected
        onDisconnect={handleDisconnect}
        className="border-0"
      />
      
      {!serverVerified && (
        <EthereumSmartVerificationButton
          state={getButtonState()}
          allRequirementsMet={allRequirementsMet}
          isConnected={isConnected}
          isCorrectChain={isCorrectChain}
          isVerifying={isVerifying}
          verified={serverVerified}
          onClick={verifyRequirements}
          error={localVerificationError || undefined}
        />
      )}
    </div>
  );
};

// Main component that wraps with isolated Ethereum provider
export const EthereumConnectionWidget: React.FC<EthereumConnectionWidgetProps> = (props) => {
  // Generate unique storage key based on context
  const storageKey = useMemo(() => {
    if (props.isPreviewMode) return 'wagmi_ethereum_preview';
    if (props.verificationContext?.type === 'board') return `wagmi_ethereum_board_${props.verificationContext.boardId}`;
    if (props.postId) return `wagmi_ethereum_post_${props.postId}`;
    return 'wagmi_ethereum_default';
  }, [props.isPreviewMode, props.verificationContext, props.postId]);

  return (
    <EthereumProfileProvider storageKey={storageKey}>
      <EthereumConnectionWidgetInternal {...props} />
    </EthereumProfileProvider>
  );
}; 
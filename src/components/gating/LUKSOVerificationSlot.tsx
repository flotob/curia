/**
 * LUKSO Verification Slot
 * 
 * Handles verification for universal_profile gating category.
 * Users connect their Universal Profile and sign a challenge to verify requirements.
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle,
  AlertTriangle,
  Loader2
} from 'lucide-react';

import { UPGatingRequirements } from '@/types/gating';
import { useConditionalUniversalProfile, useUPActivation } from '@/contexts/ConditionalUniversalProfileProvider';
import { useAuth } from '@/contexts/AuthContext';
import { authFetchJson } from '@/utils/authFetch';
import { VerificationChallenge } from '@/lib/verification/types';
import { ethers } from 'ethers';
import { RichRequirementsDisplay, ExtendedVerificationStatus } from '@/components/gating/RichRequirementsDisplay';

interface LUKSOVerificationSlotProps {
  postId: number;
  requirements: unknown;
  currentStatus: 'not_started' | 'pending' | 'verified' | 'expired';
  onVerificationComplete?: () => void;
}

export const LUKSOVerificationSlot: React.FC<LUKSOVerificationSlotProps> = ({
  postId,
  requirements,
  currentStatus,
  onVerificationComplete
}) => {
  
  // ===== HOOKS =====
  
  const { token } = useAuth();
  const { activateUP, initializeConnection, hasUserTriggeredConnection } = useUPActivation();
  const {
    isInitialized,
    isConnected,
    upAddress,
    isConnecting,
    connectionError,
    isCorrectChain,
    switchToLukso,
    getLyxBalance,
    connect,
    signMessage
  } = useConditionalUniversalProfile();

  // ===== STATE =====
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lyxBalance, setLyxBalance] = useState<string | null>(null);
  
  // ===== REQUIREMENTS PARSING =====
  
  const upRequirements = requirements as UPGatingRequirements;

  // ===== EFFECTS =====

  // Activate UP functionality
  useEffect(() => {
    console.log('[LUKSOVerificationSlot] Activating UP functionality');
    activateUP();
  }, [activateUP]);

  // Load LYX balance when connected and on correct chain
  useEffect(() => {
    if (isConnected && isCorrectChain && upRequirements?.minLyxBalance) {
      getLyxBalance()
        .then((balance: string) => {
          const formatted = ethers.utils.formatEther(balance);
          setLyxBalance(parseFloat(formatted).toFixed(4));
        })
        .catch((error: unknown) => {
          console.error('Failed to load LYX balance:', error);
          setLyxBalance(null);
        });
    } else {
      setLyxBalance(null);
    }
  }, [isConnected, isCorrectChain, getLyxBalance, upRequirements?.minLyxBalance]);

  // Auto-trigger connection once Web3-Onboard is initialized
  useEffect(() => {
    if (hasUserTriggeredConnection && isInitialized && !isConnected && !isConnecting) {
      console.log('[LUKSOVerificationSlot] Web3-Onboard initialized, auto-triggering connection');
      connect();
    }
  }, [hasUserTriggeredConnection, isInitialized, isConnected, isConnecting, connect]);
  
  // ===== HANDLERS =====
  
  const handleConnect = useCallback(async () => {
    console.log('[LUKSOVerificationSlot] User requested wallet connection');
    initializeConnection();
  }, [initializeConnection]);
  
  const handleVerify = useCallback(async () => {
    if (!isConnected || !upAddress || !token) {
      setError('Please connect your Universal Profile first');
      return;
    }
    
    setIsVerifying(true);
    setError(null);
    
    try {
      // Generate challenge using existing UP challenge endpoint
      const challengeResponse = await authFetchJson<{
        challenge: VerificationChallenge;
        message: string;
      }>(`/api/posts/${postId}/challenge`, {
        method: 'POST',
        token,
        body: JSON.stringify({ upAddress }),
      });

      const { challenge, message } = challengeResponse;
      
      // Sign the challenge using existing UP signing
      const signature = await signMessage(message);
      
      // Add signature to challenge
      const signedChallenge = {
        ...challenge,
        signature
      };
      
      // Submit to pre-verification API
      const response = await authFetchJson<{
        success: boolean;
        error?: string;
      }>(`/api/posts/${postId}/pre-verify/universal_profile`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          challenge: signedChallenge
        })
      });
      
      if (response.success) {
        // Verification successful - now safe to notify parent
        if (onVerificationComplete) {
          onVerificationComplete();
        }
      } else {
        throw new Error(response.error || 'Verification failed');
      }
      
    } catch (err) {
      console.error('UP verification error:', err);
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  }, [isConnected, upAddress, token, postId, signMessage, onVerificationComplete]);

  // ===== RENDER =====
  
  // ===== RICH UI INTEGRATION =====
  
  // Map slot state to ExtendedVerificationStatus for RichRequirementsDisplay
  const extendedUserStatus: ExtendedVerificationStatus = {
    connected: isConnected && isCorrectChain,
    verified: currentStatus === 'verified',
    requirements: [], // Rich component doesn't use this for display
    address: upAddress || undefined,
    mockBalances: {
      lyx: lyxBalance ? ethers.utils.parseEther(lyxBalance).toString() : undefined,
      tokens: {} // TODO: Add token balance mapping when available
    },
    mockFollowerStatus: {} // TODO: Add follower status mapping when available
  };

  // UP metadata for the rich component
  const upMetadata = {
    icon: '🆙',
    name: 'Universal Profile',
    brandColor: '#FE005B' // LUKSO Pink
  };

  // Handle connect action - integrates with slot workflow
  const handleRichConnect = async () => {
    if (!hasUserTriggeredConnection) {
      await handleConnect();
    } else if (!isConnected || !isCorrectChain) {
      if (!isCorrectChain) {
        await switchToLukso();
      } else {
        await handleConnect();
      }
    }
  };

  // Special cases that need simple UI (errors, wrong network)
  if (connectionError) {
    return (
      <div className="border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-3">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <div>
            <div className="text-sm font-medium text-red-800 dark:text-red-100">Connection Error</div>
            <div className="text-xs text-red-600 dark:text-red-400">{connectionError}</div>
          </div>
        </div>
        <Button onClick={handleConnect} size="sm" variant="outline" className="w-full">
          Retry Connection
        </Button>
      </div>
    );
  }

  if (isConnected && !isCorrectChain) {
    return (
      <div className="border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-3">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <div>
            <div className="text-sm font-medium text-amber-800 dark:text-amber-100">Wrong Network</div>
            <div className="text-xs text-amber-600 dark:text-amber-400">Please switch to LUKSO network</div>
          </div>
        </div>
        <Button onClick={switchToLukso} size="sm" variant="outline" className="w-full">
          Switch to LUKSO
        </Button>
      </div>
    );
  }

  // Main rich requirements display for all other states
  return (
    <div className="space-y-4">
      <RichRequirementsDisplay
        requirements={upRequirements}
        userStatus={extendedUserStatus}
        metadata={upMetadata}
        onConnect={handleRichConnect}
        onDisconnect={() => {}} // TODO: Add disconnect functionality if needed
        disabled={isVerifying || isConnecting}
        className="border-0"
      />
      
      {/* Verify button when connected but not verified */}
      {isConnected && isCorrectChain && currentStatus !== 'verified' && (
        <div className="border-t pt-4">
          <Button 
            onClick={handleVerify}
            disabled={isVerifying}
            className="w-full"
            size="sm"
          >
            {isVerifying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verifying Requirements...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete Verification
              </>
            )}
          </Button>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}; 
/**
 * LUKSO Verification Slot
 * 
 * Handles verification for universal_profile gating category.
 * Users connect their Universal Profile and sign a challenge to verify requirements.
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  UserCheck,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Coins,
  Wallet,
  XCircle
} from 'lucide-react';

import { UPGatingRequirements } from '@/types/gating';
import { useConditionalUniversalProfile, useUPActivation } from '@/contexts/ConditionalUniversalProfileProvider';
import { useAuth } from '@/contexts/AuthContext';
import { authFetchJson } from '@/utils/authFetch';
import { VerificationChallenge } from '@/lib/verification/types';
import { ethers } from 'ethers';

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
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  
  // ===== REQUIREMENTS PARSING =====
  
  const upRequirements = requirements as UPGatingRequirements;
  
  const getRequirementsList = () => {
    const reqs: string[] = [];
    
    if (upRequirements.minLyxBalance) {
      const lyxAmount = parseFloat(upRequirements.minLyxBalance) / 1e18;
      reqs.push(`${lyxAmount} LYX minimum balance`);
    }
    
    if (upRequirements.requiredTokens?.length) {
      reqs.push(`${upRequirements.requiredTokens.length} token requirement(s)`);
    }
    
    if (upRequirements.followerRequirements?.length) {
      reqs.push(`${upRequirements.followerRequirements.length} follower requirement(s)`);
    }
    
    return reqs;
  };

  // ===== EFFECTS =====

  // Activate UP functionality
  useEffect(() => {
    console.log('[LUKSOVerificationSlot] Activating UP functionality');
    activateUP();
  }, [activateUP]);

  // Load LYX balance when connected and on correct chain
  useEffect(() => {
    if (isConnected && isCorrectChain && upRequirements?.minLyxBalance) {
      setIsLoadingBalance(true);
      
      getLyxBalance()
        .then((balance: string) => {
          const formatted = ethers.utils.formatEther(balance);
          setLyxBalance(parseFloat(formatted).toFixed(4));
        })
        .catch((error: unknown) => {
          console.error('Failed to load LYX balance:', error);
          setLyxBalance(null);
        })
        .finally(() => setIsLoadingBalance(false));
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

  // Check if user meets LYX requirement
  const meetsLyxRequirement = React.useMemo(() => {
    if (!upRequirements?.minLyxBalance || !lyxBalance) return null;
    
    try {
      const userBalance = ethers.BigNumber.from(ethers.utils.parseEther(lyxBalance));
      const requiredBalance = ethers.BigNumber.from(upRequirements.minLyxBalance);
      return userBalance.gte(requiredBalance);
    } catch {
      return null;
    }
  }, [lyxBalance, upRequirements?.minLyxBalance]);
  
  // ===== RENDER =====
  
  const requirements_list = getRequirementsList();
  
  // Already verified
  if (currentStatus === 'verified') {
    return (
      <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          <div>
            <div className="text-sm font-medium text-green-800 dark:text-green-100">
              Universal Profile Verified
            </div>
            <div className="text-xs text-green-600 dark:text-green-300">
              {upAddress ? `${upAddress.slice(0, 6)}...${upAddress.slice(-4)}` : 'Connected'}
            </div>
          </div>
        </div>
        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700">
          Complete
        </Badge>
      </div>
    );
  }
  
  // Connection required
  if (!hasUserTriggeredConnection) {
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <UserCheck className="h-5 w-5 text-gray-400" />
            <div>
              <div className="text-sm font-medium">Universal Profile</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {requirements_list.length > 0 ? requirements_list.join(', ') : 'Required for verification'}
              </div>
            </div>
          </div>
          <Button 
            onClick={handleConnect}
            size="sm"
            variant="outline"
            className="text-xs"
          >
            <Wallet className="h-3 w-3 mr-1" />
            Connect
          </Button>
        </div>
      </div>
    );
  }

  // Connecting state
  if (isConnecting || (hasUserTriggeredConnection && (!isInitialized || !isConnected))) {
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <UserCheck className="h-5 w-5 text-blue-500" />
            <div>
              <div className="text-sm font-medium">Universal Profile</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Connecting...
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-blue-600">
            <Loader2 className="h-3 w-3 animate-spin" />
            Connecting
          </div>
        </div>
      </div>
    );
  }

  // Wrong network
  if (isConnected && !isCorrectChain) {
    return (
      <div className="border border-amber-200 dark:border-amber-800 rounded-lg">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <div>
              <div className="text-sm font-medium">Universal Profile</div>
              <div className="text-xs text-amber-600 dark:text-amber-400">
                Please switch to LUKSO network
              </div>
            </div>
          </div>
          <Button 
            onClick={() => switchToLukso()}
            size="sm"
            variant="outline"
            className="text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
          >
            Switch Network
          </Button>
        </div>
      </div>
    );
  }

  // Connection error
  if (connectionError) {
    return (
      <div className="border border-red-200 dark:border-red-800 rounded-lg">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <div>
              <div className="text-sm font-medium">Universal Profile</div>
              <div className="text-xs text-red-600 dark:text-red-400">
                Connection failed
              </div>
            </div>
          </div>
          <Button 
            onClick={handleConnect}
            size="sm"
            variant="outline"
            className="text-xs"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }
  
  // Connected - Show verification interface
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <UserCheck className="h-5 w-5 text-blue-500" />
          <div>
            <div className="text-sm font-medium">Universal Profile</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {upAddress ? `${upAddress.slice(0, 6)}...${upAddress.slice(-4)}` : 'Connected'}
            </div>
          </div>
        </div>
        <Button 
          onClick={handleVerify}
          disabled={isVerifying}
          size="sm"
          className="text-xs"
        >
          {isVerifying ? (
            <>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Verifying...
            </>
          ) : (
            'Verify'
          )}
        </Button>
      </div>
      
      {/* Requirements details */}
      <div className="px-4 pb-4">
        <Separator className="mb-3" />
        <div className="space-y-2">
          <div className="text-xs font-medium text-gray-600 dark:text-gray-300">
            Requirements:
          </div>
          
          {/* LYX Balance */}
          {upRequirements.minLyxBalance && (
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Coins className="h-3 w-3 text-yellow-600" />
                <span>LYX Balance: {ethers.utils.formatEther(upRequirements.minLyxBalance)} LYX minimum</span>
              </div>
              {isLoadingBalance ? (
                <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
              ) : lyxBalance ? (
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">{lyxBalance} LYX</span>
                  {meetsLyxRequirement === true ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : meetsLyxRequirement === false ? (
                    <XCircle className="h-3 w-3 text-red-500" />
                  ) : null}
                </div>
              ) : (
                <span className="text-gray-400">-</span>
              )}
            </div>
          )}

          {/* Other requirements */}
          {upRequirements.requiredTokens?.map((token, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <div className="w-1 h-1 bg-gray-400 rounded-full" />
              {token.symbol}: {token.minAmount || 1} minimum
            </div>
          ))}
          
          {upRequirements.followerRequirements?.map((follower, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <div className="w-1 h-1 bg-gray-400 rounded-full" />
              {follower.type === 'minimum_followers' 
                ? `${follower.value} minimum followers`
                : follower.type === 'followed_by' 
                ? `Must be followed by ${follower.value.slice(0, 6)}...${follower.value.slice(-4)}`
                : `Must follow ${follower.value.slice(0, 6)}...${follower.value.slice(-4)}`
              }
            </div>
          ))}
        </div>
      </div>
      
      {/* Error display */}
      {error && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-400">
            <AlertTriangle className="h-3 w-3" />
            {error}
          </div>
        </div>
      )}
    </div>
  );
}; 
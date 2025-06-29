/**
 * Ethereum Connection Widget
 * 
 * Displays Ethereum wallet connection UI and verification status using RainbowKit
 * Used by the EthereumProfileRenderer for gated posts
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import { useEthereumProfile } from '@/contexts/EthereumProfileContext';
import { EthereumGatingRequirements } from '@/types/gating';
import { formatEther } from 'viem';
import { EthereumRichRequirementsDisplay, EthereumExtendedVerificationStatus } from './EthereumRichRequirementsDisplay';
import { EthereumSmartVerificationButton } from './EthereumSmartVerificationButton';
import { useAuth } from '@/contexts/AuthContext';
import { useInvalidateVerificationStatus } from '@/hooks/useGatingData';
import { GatingCategoryStatus } from '@/types/gating';

interface EthereumConnectionWidgetProps {
  requirements: EthereumGatingRequirements;
  fulfillment?: "any" | "all"; // 🚀 NEW: Fulfillment mode for this category
  onStatusUpdate?: (status: GatingCategoryStatus) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  postId?: number;
  // Add server verification status from parent
  serverVerified?: boolean;
  // Callback when verification is complete (to refresh parent data)
  onVerificationComplete?: (canComment?: boolean) => void;
  // Preview mode flag to disable backend verification
  isPreviewMode?: boolean;
  // Verification context for board/post routing
  verificationContext?: {
    type: 'board' | 'post' | 'preview';
    communityId?: string;
    boardId?: number;
    postId?: number;
    lockId?: number;
  };
}

export const EthereumConnectionWidget: React.FC<EthereumConnectionWidgetProps> = ({
  requirements,
  fulfillment = 'all', // 🚀 NEW: Default to 'all' for backward compatibility (will be used in backend verification)
  onStatusUpdate,
  onConnect,
  onDisconnect,
  postId,
  serverVerified = false,
  onVerificationComplete,
  isPreviewMode = false,
  verificationContext
}) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _fulfillment = fulfillment; // TODO: Implement frontend fulfillment logic (Phase 3B)
  const {
    isConnected,
    connectionError,
    isCorrectChain,
    ethAddress,
    disconnect,
    switchToEthereum,
    getENSProfile,
    getEFPStats,
    getETHBalance,
    signMessage,
    verifyPostRequirements
  } = useEthereumProfile();
  
  const { token } = useAuth();
  const invalidateVerificationStatus = useInvalidateVerificationStatus();

  const [verificationResult, setVerificationResult] = useState<{ isValid: boolean; missingRequirements: string[]; errors: string[] } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationState, setVerificationState] = useState<'idle' | 'success_pending' | 'error_pending'>('idle');
  const [ensProfile, setEnsProfile] = useState<{ name?: string; avatar?: string }>({});
  const [, setEfpStats] = useState<{ followers: number; following: number }>({ followers: 0, following: 0 });
  const [ethBalance, setEthBalance] = useState<string>('0');

  // Use refs to track callback props to avoid dependency issues
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);
  
  // Update refs when props change
  useEffect(() => {
    onConnectRef.current = onConnect;
    onDisconnectRef.current = onDisconnect;
  }, [onConnect, onDisconnect]);

  // Memoize requirements to prevent unnecessary re-renders
  // Using JSON.stringify as a simple way to create a stable dependency
  const requirementsKey = JSON.stringify(requirements);
  const stableRequirements = useMemo(() => requirements, [requirementsKey]);

  // Handle disconnection
  const handleDisconnect = useCallback(() => {
    disconnect();
    onDisconnectRef.current?.();
    setVerificationResult(null);
    setVerificationState('idle');
    setEnsProfile({});
    setEfpStats({ followers: 0, following: 0 });
    setEthBalance('0');
  }, [disconnect]);

  // Call onConnect when connection state changes - use ref to avoid dependency issues
  useEffect(() => {
    if (isConnected && onConnectRef.current) {
      onConnectRef.current();
    }
  }, [isConnected]);

  // When local verification results change, report status up to parent
  useEffect(() => {
    if (!onStatusUpdate) return;

    // A more robust way to count requirements
    const totalCount = [
      requirements.requiresENS ? 1 : 0,
      requirements.minimumETHBalance ? 1 : 0,
      (requirements.requiredERC20Tokens || []).length,
      (requirements.requiredERC721Collections || []).length,
      (requirements.requiredERC1155Tokens || []).length,
      (requirements.efpRequirements || []).length,
    ].reduce((sum, count) => sum + count, 0);

    if (!verificationResult) {
      // Not connected or not yet verified
      onStatusUpdate({ met: 0, total: totalCount, isMet: false });
      return;
    }

    const metCount = totalCount - (verificationResult.missingRequirements?.length || 0);

    onStatusUpdate({
      met: metCount,
      total: totalCount,
      isMet: verificationResult.isValid
    });
  }, [verificationResult, requirements, onStatusUpdate]);

  // Server pre-verification function
  const verifyRequirements = useCallback(async () => {
    // In preview mode, don't allow backend verification
    if (isPreviewMode) {
      console.log('[EthereumConnectionWidget] Preview mode - backend verification disabled');
      return;
    }

    // Better validation - check for empty string too, but postId is optional for board verification
    if (!isConnected || !isCorrectChain || !ethAddress || ethAddress.trim() === '' || !token) {
      console.error('[EthereumConnectionWidget] Missing required data for verification', {
        isConnected,
        isCorrectChain,
        ethAddress,
        addressLength: ethAddress?.length,
        postId,
        hasToken: !!token
      });
      return;
    }

    setIsVerifying(true);
    try {
      // Determine if this is board verification context
      const isBoardVerification = !postId && verificationContext?.type === 'board';
      
      if (isBoardVerification) {
        console.log('[EthereumConnectionWidget] Board verification context - submitting to board endpoint');
        
        // For board verification, use board-specific endpoint
        const { communityId, boardId, lockId: contextLockId } = verificationContext;
        
        // 1. Create challenge message for board verification
        const challengeMessage = `Verify Ethereum profile for board access\nBoard: ${boardId}\nAddress: ${ethAddress}\nTimestamp: ${Date.now()}\nChain: Ethereum Mainnet`;
        
        console.log('[EthereumConnectionWidget] Requesting signature for board verification...');
        
        // 2. Request signature from user
        const signature = await signMessage(challengeMessage);
        
        console.log('[EthereumConnectionWidget] Signature received, submitting to board endpoint...');

        // 3. Submit to board pre-verification API  
        if (!contextLockId) {
          throw new Error('Missing lockId in verification context for board verification');
        }
        
        const response = await fetch(`/api/communities/${communityId}/boards/${boardId}/locks/${contextLockId}/pre-verify/ethereum_profile`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            signature,
            message: challengeMessage,
            address: ethAddress,
            verificationData: {
              requirements: stableRequirements
            }
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Server returned ${response.status}`);
        }

        const result = await response.json();
        console.log('[EthereumConnectionWidget] Board verification result:', result);

        if (result.success) {
          console.log('[EthereumConnectionWidget] ✅ Board verification successful!');
          
          setVerificationState('success_pending');
          setVerificationResult({
            isValid: true,
            missingRequirements: [],
            errors: []
          });
          
          if (onVerificationComplete) {
            onVerificationComplete(true); // Pass canComment: true for successful verification
          }
          
          setTimeout(() => {
            setVerificationState('idle');
          }, 2000);
        } else {
          throw new Error(result.message || 'Board verification failed');
        }
        
        return;
      }
      
      // Handle case where postId is missing but it's not board verification (shouldn't happen)
      if (!postId) {
        throw new Error('Missing context for verification - neither post nor board context available');
      }

      console.log('[EthereumConnectionWidget] Starting server pre-verification...');

      // 1. Create challenge message
      const challengeMessage = `Verify Ethereum profile for post ${postId}\nAddress: ${ethAddress}\nTimestamp: ${Date.now()}\nChain: Ethereum Mainnet`;
      
      console.log('[EthereumConnectionWidget] Requesting signature from user...');
      
      // 2. Request signature from user
      const signature = await signMessage(challengeMessage);
      
      console.log('[EthereumConnectionWidget] Signature received, submitting to server...');

      // 3. Create challenge object for API
      const challenge = {
        type: 'ethereum_profile',
        postId: postId,
        ethAddress: ethAddress,
        message: challengeMessage,
        signature: signature,
        timestamp: Date.now(),
        requirements: stableRequirements
      };

      // 4. Submit to server pre-verification API
      const response = await fetch(`/api/posts/${postId}/pre-verify/ethereum_profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ challenge })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server returned ${response.status}`);
      }

      const result = await response.json();
      console.log('[EthereumConnectionWidget] Server verification result:', result);

      if (result.success && result.verificationStatus === 'verified') {
        // Success! Show immediate feedback and refresh data
        console.log('[EthereumConnectionWidget] ✅ Verification successful!');
        
        // 1. Show immediate success feedback
        setVerificationState('success_pending');
        
        // 2. Update local state to show success
        setVerificationResult({
          isValid: true,
          missingRequirements: [],
          errors: []
        });
        
        // 3. Manually invalidate and refetch verification status immediately
        if (postId) {
          invalidateVerificationStatus(postId);
        }
        
        // 4. Notify parent to refresh verification status
        if (onVerificationComplete) {
          onVerificationComplete();
        }
        
        // 5. Reset state after a brief delay (UI will update from React Query)
        setTimeout(() => {
          setVerificationState('idle');
        }, 2000);
      } else {
        // Verification failed - show immediate feedback
        console.log('[EthereumConnectionWidget] ❌ Verification failed:', result.error);
        
        setVerificationState('error_pending');
        setVerificationResult({
          isValid: false,
          missingRequirements: ['Server verification failed'],
          errors: [result.error || 'Unknown server error']
        });
        
        // Reset error state after delay
        setTimeout(() => {
          setVerificationState('idle');
        }, 3000);
      }

    } catch (error) {
      console.error('[EthereumConnectionWidget] Verification failed:', error);
      
      setVerificationState('error_pending');
      setVerificationResult({
        isValid: false,
        missingRequirements: ['Verification failed'],
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
      
      // Reset error state after delay
      setTimeout(() => {
        setVerificationState('idle');
      }, 3000);
    } finally {
      setIsVerifying(false);
    }
  }, [isConnected, isCorrectChain, ethAddress, postId, token, signMessage, stableRequirements, onVerificationComplete, isPreviewMode, verificationContext, invalidateVerificationStatus]);

  // Local verification function to check if requirements are met (for UI only)
  const performLocalVerification = useCallback(async () => {
    // Better validation - check for empty string too
    if (!isConnected || !isCorrectChain || !ethAddress || ethAddress.trim() === '') {
      console.log('[EthereumConnectionWidget] Skipping local verification - missing required data', {
        isConnected,
        isCorrectChain,
        ethAddress,
        addressLength: ethAddress?.length
      });
      return false;
    }

    try {
      // Create a mock post settings to use with verifyPostRequirements
      const postSettings = {
        responsePermissions: {
          categories: [{
            type: 'ethereum_profile',
            requirements: stableRequirements
          }]
        }
      };

      // Use the context's verification function
      const result = await verifyPostRequirements(postSettings);
      
      // Update local verification result for UI feedback
      setVerificationResult(result);
      return result.isValid;
    } catch (error) {
      console.error('[EthereumConnectionWidget] Local verification failed:', error);
      setVerificationResult({
        isValid: false,
        missingRequirements: ['Local verification failed'],
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
      return false;
    }
  }, [isConnected, isCorrectChain, ethAddress, stableRequirements, verifyPostRequirements]);

  // Load profile data when connected (separate from verification)
  const loadProfileData = useCallback(async () => {
    // Better validation - check for empty string too
    if (!isConnected || !isCorrectChain || !ethAddress || ethAddress.trim() === '') {
      console.log('[EthereumConnectionWidget] Skipping profile data load - missing required data', {
        isConnected,
        isCorrectChain,
        ethAddress,
        addressLength: ethAddress?.length
      });
      return;
    }

    try {
      const [ensData, efpData, balanceData] = await Promise.all([
        getENSProfile(),
        getEFPStats(), 
        getETHBalance()
      ]);
      
      setEnsProfile(ensData);
      setEfpStats(efpData);
      setEthBalance(balanceData);
      
      // Perform local verification after loading profile data
      await performLocalVerification();
    } catch (error) {
      console.error('[EthereumConnectionWidget] Failed to fetch profile data:', error);
    }
  }, [isConnected, isCorrectChain, ethAddress, getENSProfile, getEFPStats, getETHBalance, performLocalVerification]);

  // Load profile data when connected
  useEffect(() => {
    // Better validation - check for empty string too
    if (isConnected && isCorrectChain && ethAddress && ethAddress.trim() !== '') {
      console.log('[EthereumConnectionWidget] Triggering profile data load for address:', ethAddress);
      loadProfileData();
    } else {
      console.log('[EthereumConnectionWidget] Not loading profile data - validation failed', {
        isConnected,
        isCorrectChain,
        ethAddress,
        addressLength: ethAddress?.length
      });
    }
  }, [isConnected, isCorrectChain, ethAddress, loadProfileData]);

  // Reset verification when disconnected
  useEffect(() => {
    if (!isConnected) {
      setVerificationResult(null);
      setIsVerifying(false);
      setVerificationState('idle');
    }
  }, [isConnected]);

  // Format ETH amount for display
  const formatETHAmount = (weiAmount: string): string => {
    try {
      return formatEther(BigInt(weiAmount));
    } catch {
      return '0';
    }
  };

  // Check if all requirements are met locally (for button enable/disable)
  const allRequirementsMet = verificationResult?.isValid || false;

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

  // Create real balances object for the rich display
  const balances = {
    eth: ethBalance,
    tokens: stableRequirements.requiredERC20Tokens?.reduce((acc, token) => {
      acc[token.contractAddress] = {
        raw: '0', // TODO: Replace with real token balance from blockchain
        formatted: '0',
        decimals: token.decimals,
        name: token.name,
        symbol: token.symbol
      };
      return acc;
    }, {} as Record<string, {
      raw: string;
      formatted: string;
      decimals?: number;
      name?: string;
      symbol?: string;
    }>) || {}
  };

  // Create extended user status for rich display with real blockchain data
  const extendedUserStatus: EthereumExtendedVerificationStatus = {
    connected: isConnected,
    verified: serverVerified, // Use server verification status, not local
    requirements: [],
    ethAddress: ethAddress || undefined,
    balances,
    ensStatus: ensProfile.name ? true : false,
    efpStatus: stableRequirements.efpRequirements?.reduce((acc, efp) => {
      const key = `${efp.type}-${efp.value}`;
      // ✅ Use actual verification result instead of hardcoded false
      if (verificationResult) {
        // More precise logic to determine if this specific requirement failed
        let failed = false;
        
        if (efp.type === 'minimum_followers') {
          // For minimum followers, look for specific patterns in missing requirements
          failed = verificationResult.missingRequirements.some(missing => 
            missing.includes(`Need ${efp.value} followers`) || 
            missing.includes(`${efp.value} followers, have`)
          );
        } else if (efp.type === 'must_follow') {
          // For must follow, look for specific address in missing requirements
          failed = verificationResult.missingRequirements.some(missing => 
            missing.includes(`Must follow ${efp.value}`) ||
            missing.includes(efp.value)
          );
        } else if (efp.type === 'must_be_followed_by') {
          // For must be followed by, look for specific address in missing requirements
          failed = verificationResult.missingRequirements.some(missing => 
            missing.includes(`Must be followed by ${efp.value}`) ||
            missing.includes(efp.value)
          );
        }
        
        acc[key] = !failed;
      } else {
        // No verification result yet - default to false
        acc[key] = false;
      }
      return acc;
    }, {} as Record<string, boolean>) || {},
    // Add ENS name information for display
    ensName: ensProfile.name,
    ensAvatar: ensProfile.avatar
  };

  // Connected and on correct chain - show rich requirements display
  return (
    <div className="space-y-4">
      <EthereumRichRequirementsDisplay
        requirements={stableRequirements}
        fulfillment={fulfillment} // 🚀 NEW: Pass fulfillment mode to display component
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
      
      {/* Only show verification button if not already server-verified */}
      {!serverVerified && (
        <EthereumSmartVerificationButton
          state={getButtonState()}
          allRequirementsMet={allRequirementsMet}
          isConnected={isConnected}
          isCorrectChain={isCorrectChain}
          isVerifying={isVerifying}
          verified={serverVerified} // Use server verification status
          onClick={verifyRequirements}
          error={verificationResult?.errors[0]}
        />
      )}
    </div>
  );
}; 
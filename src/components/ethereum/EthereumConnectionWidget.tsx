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

interface EthereumConnectionWidgetProps {
  requirements: EthereumGatingRequirements;
  onConnect?: () => void;
  onDisconnect?: () => void;
  postId?: number;
  // Add server verification status from parent
  serverVerified?: boolean;
  // Callback when verification is complete (to refresh parent data)
  onVerificationComplete?: () => void;
}

export const EthereumConnectionWidget: React.FC<EthereumConnectionWidgetProps> = ({
  requirements,
  onConnect,
  onDisconnect,
  postId,
  serverVerified = false,
  onVerificationComplete
}) => {
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

  const [verificationResult, setVerificationResult] = useState<{ isValid: boolean; missingRequirements: string[]; errors: string[] } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
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

  // Server pre-verification function
  const verifyRequirements = useCallback(async () => {
    if (!isConnected || !isCorrectChain || !ethAddress || !postId || !token) {
      console.error('[EthereumConnectionWidget] Missing required data for verification');
      return;
    }

    setIsVerifying(true);
    try {
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
        // Success! The parent component will refresh and show verified status
        console.log('[EthereumConnectionWidget] ✅ Verification successful!');
        
        // Update local state to show success
        setVerificationResult({
          isValid: true,
          missingRequirements: [],
          errors: []
        });
        
        // Notify parent to refresh verification status
        if (onVerificationComplete) {
          onVerificationComplete();
        }
      } else {
        // Verification failed
        console.log('[EthereumConnectionWidget] ❌ Verification failed:', result.error);
        setVerificationResult({
          isValid: false,
          missingRequirements: ['Server verification failed'],
          errors: [result.error || 'Unknown server error']
        });
      }

    } catch (error) {
      console.error('[EthereumConnectionWidget] Verification failed:', error);
      setVerificationResult({
        isValid: false,
        missingRequirements: ['Verification failed'],
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    } finally {
      setIsVerifying(false);
    }
  }, [isConnected, isCorrectChain, ethAddress, postId, token, signMessage, stableRequirements, onVerificationComplete]);

  // Local verification function to check if requirements are met (for UI only)
  const performLocalVerification = useCallback(async () => {
    if (!isConnected || !isCorrectChain || !ethAddress) {
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
    if (!isConnected || !isCorrectChain || !ethAddress) {
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
    if (isConnected && isCorrectChain && ethAddress) {
      loadProfileData();
    }
  }, [isConnected, isCorrectChain, ethAddress, loadProfileData]);

  // Reset verification when disconnected
  useEffect(() => {
    if (!isConnected) {
      setVerificationResult(null);
      setIsVerifying(false);
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

  // Create mock balances for the rich display
  const mockBalances = {
    eth: ethBalance,
    tokens: stableRequirements.requiredERC20Tokens?.reduce((acc, token) => {
      acc[token.contractAddress] = {
        raw: '0', // TODO: Replace with real token balance
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

  // Create extended user status for rich display
  const extendedUserStatus: EthereumExtendedVerificationStatus = {
    connected: isConnected,
    verified: serverVerified, // Use server verification status, not local
    requirements: [],
    ethAddress: ethAddress || undefined,
    mockBalances,
    mockENSStatus: ensProfile.name ? true : false,
    mockEFPStatus: stableRequirements.efpRequirements?.reduce((acc, efp) => {
      const key = `${efp.type}-${efp.value}`;
      acc[key] = false; // TODO: Replace with real EFP status
      return acc;
    }, {} as Record<string, boolean>) || {},
    // Add ENS name information for display
    ensName: ensProfile.name,
    ensAvatar: ensProfile.avatar
  };

  // Check if all requirements are met locally (for button enable/disable)
  const allRequirementsMet = verificationResult?.isValid || false;

  // Connected and on correct chain - show rich requirements display
  return (
    <div className="space-y-4">
      <EthereumRichRequirementsDisplay
        requirements={stableRequirements}
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
          state="ready_to_verify"
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
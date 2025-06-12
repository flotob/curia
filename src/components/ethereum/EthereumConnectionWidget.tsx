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

interface EthereumConnectionWidgetProps {
  requirements: EthereumGatingRequirements;
  onConnect?: () => void;
  onDisconnect?: () => void;
  postId?: number;
}

export const EthereumConnectionWidget: React.FC<EthereumConnectionWidgetProps> = ({
  requirements,
  onConnect,
  onDisconnect,
  postId // eslint-disable-line @typescript-eslint/no-unused-vars
}) => {
  const {
    isConnected,
    connectionError,
    isCorrectChain,
    ethAddress,
    disconnect,
    switchToEthereum,
    verifyPostRequirements,
    getENSProfile,
    getEFPStats,
    getETHBalance
  } = useEthereumProfile();

  const [verificationResult, setVerificationResult] = useState<{ isValid: boolean; missingRequirements: string[]; errors: string[] } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [ensProfile, setEnsProfile] = useState<{ name?: string; avatar?: string }>({});
  const [efpStats, setEfpStats] = useState<{ followers: number; following: number }>({ followers: 0, following: 0 });
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

  // Memoize the verification function to prevent recreation on every render
  const verifyRequirements = useCallback(async () => {
    if (!isConnected || !isCorrectChain || !ethAddress) {
      return;
    }

    setIsVerifying(true);
    try {
      // Create a mock post settings object for verification
      const postSettings = {
        responsePermissions: {
          categories: [{
            type: 'ethereum_profile',
            requirements: stableRequirements
          }]
        }
      };

      const result = await verifyPostRequirements(postSettings);
      setVerificationResult(result);

      // Fetch profile data
      try {
        const [ensData, efpData, balanceData] = await Promise.all([
          getENSProfile(),
          getEFPStats(),
          getETHBalance()
        ]);
        
        setEnsProfile(ensData);
        setEfpStats(efpData);
        setEthBalance(balanceData);
      } catch (error) {
        console.error('[EthereumConnectionWidget] Failed to fetch profile data:', error);
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
  }, [isConnected, isCorrectChain, ethAddress, stableRequirements, verifyPostRequirements, getENSProfile, getEFPStats, getETHBalance]);

  // Verify requirements when connected - only depend on the memoized function
  useEffect(() => {
    if (isConnected && isCorrectChain && ethAddress) {
      verifyRequirements();
    }
  }, [isConnected, isCorrectChain, ethAddress, verifyRequirements]);

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
    verified: verificationResult?.isValid || false,
    requirements: [],
    ethAddress: ethAddress || undefined,
    mockBalances,
    mockENSStatus: ensProfile.name ? true : false,
    mockEFPStatus: stableRequirements.efpRequirements?.reduce((acc, efp) => {
      const key = `${efp.type}-${efp.value}`;
      acc[key] = false; // TODO: Replace with real EFP status
      return acc;
    }, {} as Record<string, boolean>) || {}
  };

  // Check if all requirements are met (simplified for now)
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
      
      <EthereumSmartVerificationButton
        state="ready_to_verify"
        allRequirementsMet={allRequirementsMet}
        isConnected={isConnected}
        isCorrectChain={isCorrectChain}
        isVerifying={isVerifying}
        verified={verificationResult?.isValid || false}
        onClick={verifyRequirements}
        error={verificationResult?.errors[0]}
      />
    </div>
  );
}; 
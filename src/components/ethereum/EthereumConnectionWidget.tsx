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
  CheckCircle, 
  AlertTriangle, 
  Loader2,
  User,
  Coins,
  Users,
  Shield
} from 'lucide-react';
import { useEthereumProfile } from '@/contexts/EthereumProfileContext';
import { EthereumGatingRequirements } from '@/types/gating';
import { formatEther } from 'viem';

interface EthereumConnectionWidgetProps {
  requirements: EthereumGatingRequirements;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export const EthereumConnectionWidget: React.FC<EthereumConnectionWidgetProps> = ({
  requirements,
  onConnect,
  onDisconnect
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

  // Format address for display
  const formatAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
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

  // Connected and on correct chain - show verification status
  return (
    <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900/50">
      {/* Connection Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <div>
              <div className="text-sm font-medium">
                {ensProfile.name || formatAddress(ethAddress || '')}
              </div>
              <div className="text-xs text-muted-foreground">
                Ethereum Connected
              </div>
            </div>
          </div>
          {ensProfile.avatar && (
            <img 
              src={ensProfile.avatar} 
              alt="ENS Avatar" 
              className="w-8 h-8 rounded-full"
            />
          )}
        </div>
        <Button onClick={handleDisconnect} variant="ghost" size="sm">
          Disconnect
        </Button>
      </div>

      {/* Profile Stats */}
      <div className="grid grid-cols-3 gap-3 mb-3 text-center">
        <div className="text-xs">
          <div className="font-medium">{formatETHAmount(ethBalance)}</div>
          <div className="text-muted-foreground">ETH</div>
        </div>
        <div className="text-xs">
          <div className="font-medium">{efpStats.followers}</div>
          <div className="text-muted-foreground">Followers</div>
        </div>
        <div className="text-xs">
          <div className="font-medium">{efpStats.following}</div>
          <div className="text-muted-foreground">Following</div>
        </div>
      </div>

      {/* Verification Status */}
      {isVerifying ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          <span className="text-sm text-muted-foreground">Verifying requirements...</span>
        </div>
      ) : verificationResult ? (
        <div className={`p-3 rounded-lg border ${
          verificationResult.isValid 
            ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
            : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
        }`}>
          <div className="flex items-center space-x-2 mb-2">
            {verificationResult.isValid ? (
              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
            )}
            <span className={`text-sm font-medium ${
              verificationResult.isValid ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
            }`}>
              {verificationResult.isValid ? 'All Requirements Met' : 'Requirements Not Met'}
            </span>
          </div>
          
          {!verificationResult.isValid && verificationResult.missingRequirements.length > 0 && (
            <div className="text-xs text-red-700 dark:text-red-300">
              <div className="font-medium mb-1">Missing:</div>
              <ul className="list-disc list-inside space-y-1">
                {verificationResult.missingRequirements.map((req, idx) => (
                  <li key={idx}>{req}</li>
                ))}
              </ul>
            </div>
          )}

          {verificationResult.errors.length > 0 && (
            <div className="text-xs text-red-700 dark:text-red-300 mt-2">
              <div className="font-medium mb-1">Errors:</div>
              <ul className="list-disc list-inside space-y-1">
                {verificationResult.errors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}; 
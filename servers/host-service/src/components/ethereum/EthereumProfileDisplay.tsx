/**
 * Ethereum Profile Display Component for Host Service
 * 
 * Beautiful profile display for ENS/EFP users during authentication flow
 * Shows "moment of delight" with rich profile information
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Users, 
  CheckCircle, 
  RefreshCw,
  ExternalLink,
  UserPlus,
  ArrowLeft,
  Wallet
} from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useDisconnect, useAccount } from 'wagmi';

// ===== TYPES =====

interface EFPProfile {
  address: string;
  ensName?: string;
  displayName: string;
  avatar?: string;
  followers: number;
  following: number;
  isVerified?: boolean;
}

export interface EthereumProfileDisplayProps {
  address: string;
  ensName?: string;
  ensAvatar?: string;
  onSwitchWallet?: () => void; // Switch to different wallet within same ecosystem
  onBack?: () => void; // Go back to main authentication selection
  onContinue?: () => void;
  className?: string;
}

// ===== MAIN COMPONENT =====

export const EthereumProfileDisplay: React.FC<EthereumProfileDisplayProps> = ({
  address,
  ensName,
  ensAvatar,
  onSwitchWallet,
  onBack,
  onContinue,
  className = ''
}) => {
  // Use proven wallet switching pattern from main app
  const { disconnect } = useDisconnect();
  const [showWalletSelector, setShowWalletSelector] = useState(false);
  
  // 🔥 CRITICAL: Fix hydration issue with mounting check (proven pattern)
  const [hasMounted, setHasMounted] = useState(false);
  
  // 🔥 CRITICAL: Use real-time wallet state to ensure updates after switching
  const { address: connectedAddress, isConnected } = useAccount();
  
  const [efpProfile, setEfpProfile] = useState<EFPProfile | null>(null);
  const [isLoadingEfp, setIsLoadingEfp] = useState(false);
  const [efpError, setEfpError] = useState<string | null>(null);
  const [isValidENS, setIsValidENS] = useState<boolean | null>(null); // null = checking, true = has ENS, false = no ENS

  // ===== HYDRATION FIX =====
  
  useEffect(() => {
    // Prevent hydration mismatch by ensuring component has mounted
    setHasMounted(true);
  }, []);

  // ===== EFP PROFILE FETCHING =====
  
  useEffect(() => {
    const fetchEfpProfile = async () => {
      // Use real-time connected address instead of prop address
      const currentAddress = connectedAddress || address;
      if (!currentAddress || !isConnected) return;
      
      setIsLoadingEfp(true);
      setEfpError(null);
      setIsValidENS(null); // Start validation check
      
      try {
        console.log(`[EthereumProfileDisplay] Fetching EFP profile for: ${currentAddress}`);

        // ===== VALIDATION: Check if this address has an ENS name =====
        // Use proven validation patterns from main forum app
        
        // 1. Address format validation (from main app pattern)
        const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
        
        // Basic address format validation first
        if (!ethAddressRegex.test(currentAddress)) {
          console.log(`[EthereumProfileDisplay] ❌ Invalid Ethereum address format: ${currentAddress}`);
          setIsValidENS(false);
          setEfpError('Invalid Ethereum address format. Please ensure you connected the correct wallet.');
          return;
        }

        // Fetch both details and stats from EFP API
        const [detailsResponse, statsResponse] = await Promise.all([
          fetch(`https://api.ethfollow.xyz/api/v1/users/${currentAddress}/details`),
          fetch(`https://api.ethfollow.xyz/api/v1/users/${currentAddress}/stats`)
        ]);

        let profileData: EFPProfile = {
          address: currentAddress,
          displayName: ensName || `${currentAddress.slice(0, 6)}...${currentAddress.slice(-4)}`,
          ensName,
          avatar: ensAvatar,
          followers: 0,
          following: 0,
          isVerified: false // Will be set after ENS validation
        };

        // Get profile details if available
        if (detailsResponse.ok) {
          const detailsData = await detailsResponse.json();
          profileData = {
            ...profileData,
            ensName: detailsData.ens?.name || ensName,
            displayName: detailsData.ens?.name || ensName || profileData.displayName,
            avatar: detailsData.ens?.avatar || ensAvatar,
            isVerified: !!(detailsData.ens?.name || ensName) // Verified if has ENS
          };
        }

        // Get stats if available
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          profileData.followers = statsData.followers_count || 0;
          profileData.following = statsData.following_count || 0;
        }

        // ===== ENS VALIDATION: Now validate using the actual ENS name we found =====
        const finalEnsName = profileData.ensName;
        if (finalEnsName && finalEnsName.trim() && finalEnsName.includes('.')) {
          // Check if it has a valid TLD
          const validTlds = ['.eth', '.xyz', '.com', '.org', '.io', '.app', '.art'];
          const hasValidTld = validTlds.some(tld => finalEnsName.toLowerCase().endsWith(tld));
          
          if (hasValidTld) {
            console.log(`[EthereumProfileDisplay] ✅ Valid ENS name detected: ${finalEnsName}`);
            setIsValidENS(true);
            setEfpError(null); // Clear any previous errors
          } else {
            console.log(`[EthereumProfileDisplay] ❌ ENS name has invalid TLD: ${finalEnsName}`);
            setIsValidENS(false);
            setEfpError(`ENS domain "${finalEnsName}" does not have a valid TLD. Supported: .eth, .xyz, .com, .org, .io, .app, .art`);
          }
        } else {
          console.log(`[EthereumProfileDisplay] ❌ No ENS name found for this address`);
          setIsValidENS(false);
          setEfpError('This address does not have an ENS domain. Please connect a wallet with an ENS name or go back and select "Continue as Guest".');
        }

        console.log(`[EthereumProfileDisplay] ✅ EFP profile fetched:`, profileData);
        setEfpProfile(profileData);

      } catch (error) {
        console.error('[EthereumProfileDisplay] Error fetching EFP profile:', error);
        
        // Even if EFP fetch fails, we might still have ENS data from props
        if (ensName && ensName.trim() && ensName.includes('.')) {
          const validTlds = ['.eth', '.xyz', '.com', '.org', '.io', '.app', '.art'];
          const hasValidTld = validTlds.some(tld => ensName.toLowerCase().endsWith(tld));
          
          if (hasValidTld) {
            console.log(`[EthereumProfileDisplay] ✅ Using ENS from props: ${ensName}`);
            setIsValidENS(true);
            setEfpError(null);
          } else {
            setIsValidENS(false);
            setEfpError(`ENS domain "${ensName}" does not have a valid TLD. Supported: .eth, .xyz, .com, .org, .io, .app, .art`);
          }
        } else {
          setEfpError('Failed to load profile data. Please ensure you have an ENS domain.');
          setIsValidENS(false);
        }
        
        // Create fallback profile for display purposes only
        setEfpProfile({
          address: currentAddress,
          displayName: ensName || `${currentAddress.slice(0, 6)}...${currentAddress.slice(-4)}`,
          ensName,
          avatar: ensAvatar,
          followers: 0,
          following: 0,
          isVerified: false
        });
      } finally {
        setIsLoadingEfp(false);
      }
    };

    fetchEfpProfile();
  }, [connectedAddress, address, ensName, ensAvatar, isConnected]);

  // ===== HELPER FUNCTIONS =====
  
  const formatFollowerCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const formatAddress = (addr: string): string => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // ===== RENDER =====

  // Prevent hydration mismatch: Don't render wallet-specific content until mounted
  if (!hasMounted) {
    return (
      <Card className={`border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 ${className}`}>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading wallet information...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!efpProfile && isLoadingEfp) {
    return (
      <Card className={`border-2 border-blue-200 ${className}`}>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full bg-gray-200 animate-pulse" />
            <div className="flex-1">
              <div className="h-5 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4 mb-2" />
              <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!efpProfile) {
    return (
      <Card className={`border-2 border-red-200 ${className}`}>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            Failed to load profile information
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 ${className}`}>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Connected Successfully! 
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your Ethereum profile is ready
            </p>
          </div>

          {/* Profile Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-blue-200 dark:border-blue-800 p-4">
            <div className="flex items-start space-x-4">
              {/* Avatar */}
              <div className="relative">
                {efpProfile.avatar ? (
                  <img
                    src={efpProfile.avatar}
                    alt={efpProfile.displayName}
                    className="w-16 h-16 rounded-full object-cover border-2 border-blue-200"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                    ⟠
                  </div>
                )}
                {efpProfile.isVerified && (
                  <CheckCircle className="absolute -bottom-1 -right-1 h-5 w-5 text-green-500 bg-white rounded-full" />
                )}
              </div>

              {/* Profile Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="font-semibold text-lg text-gray-900 dark:text-gray-100 truncate">
                    {efpProfile.displayName}
                  </h4>
                  {efpProfile.ensName && (
                    <Badge variant="outline" className="text-xs">
                      ENS
                    </Badge>
                  )}
                </div>
                
                <p className="text-sm text-gray-500 dark:text-gray-400 font-mono mb-3">
                  {formatAddress(efpProfile.address)}
                </p>

                {/* EFP Social Stats */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400">
                    <Users className="h-4 w-4" />
                    <span>{formatFollowerCount(efpProfile.followers)} followers</span>
                  </div>
                  <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400">
                    <UserPlus className="h-4 w-4" />
                    <span>{formatFollowerCount(efpProfile.following)} following</span>
                  </div>
                </div>

                {/* EFP Badge */}
                {(efpProfile.followers > 0 || efpProfile.following > 0) && (
                  <div className="mt-2">
                    <Badge variant="secondary" className="text-xs">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      EFP Verified
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Error Display */}
          {efpError && (
            <div className={`text-xs rounded-lg p-3 ${
              isValidENS === false 
                ? 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' 
                : 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20'
            }`}>
              <div className="flex items-center space-x-2">
                {isValidENS === false ? (
                  <User className="h-4 w-4" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                <span>{efpError}</span>
              </div>
              {isValidENS === false && (
                <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                  <p>• Register an ENS domain at <a href="https://ens.domains" target="_blank" rel="noopener noreferrer" className="underline">ens.domains</a></p>
                  <p>• Try connecting a different wallet with an ENS name</p>
                  <p>• Or go back and select "Continue as Guest" instead</p>
                </div>
              )}
            </div>
          )}

          {/* Validation Success */}
          {isValidENS === true && !efpError && (
            <div className="text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4" />
                <span>✅ Valid ENS domain detected - ready to continue!</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Primary Action Button */}
            {onContinue && (
              <Button
                onClick={onContinue}
                disabled={isValidENS !== true} // Only enable when valid ENS is confirmed
                className={`w-full ${
                  isValidENS === true
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                {isValidENS === null ? 'Validating...' : isValidENS ? 'Continue' : 'ENS Domain Required'}
              </Button>
            )}

            {/* Secondary Actions */}
            <div className="flex space-x-3">
              {/* Back Button */}
              {onBack && (
                <Button
                  variant="outline"
                  onClick={onBack}
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}

              {/* Switch Wallet Button - Uses proven pattern from main app */}
              {onSwitchWallet && !showWalletSelector && (
                <Button
                  variant="outline"
                  onClick={() => {
                    // Show wallet selector directly
                    setShowWalletSelector(true);
                  }}
                  className="flex-1"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  Switch Wallet
                </Button>
              )}

              {/* Inline Wallet Selector - Shows RainbowKit ConnectButton */}
              {onSwitchWallet && showWalletSelector && (
                <div className="flex-1 flex flex-col space-y-2">
                  <ConnectButton />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowWalletSelector(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              )}

              {/* Fallback: Legacy single button for backwards compatibility */}
              {!onBack && onSwitchWallet && (
                <Button
                  variant="outline"
                  onClick={onSwitchWallet}
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Switch Wallet
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 
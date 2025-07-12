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
import { useDisconnect, useAccount, useSignMessage } from 'wagmi';
import { useTheme } from '@/contexts/ThemeContext';

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
  onContinue?: (updatedProfileData?: any) => void; // Pass back updated profile data after signing
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
  
  // 🎨 Theme system integration
  const { resolvedTheme } = useTheme();
  
  // 🎨 Wallet signing integration
  const { signMessageAsync } = useSignMessage();
  
  const [efpProfile, setEfpProfile] = useState<EFPProfile | null>(null);
  const [isLoadingEfp, setIsLoadingEfp] = useState(false);
  const [efpError, setEfpError] = useState<string | null>(null);
  const [isValidENS, setIsValidENS] = useState<boolean | null>(null); // null = checking, true = has ENS, false = no ENS
  const [isSigningChallenge, setIsSigningChallenge] = useState(false);

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

  // Handle immediate signing when Continue is clicked
  const handleContinueWithSigning = async () => {
    if (!efpProfile?.ensName || !connectedAddress) {
      console.error('[EthereumProfileDisplay] Missing required data for signing');
      return;
    }

    setIsSigningChallenge(true);

    try {
      // Generate challenge
      const challengeResponse = await fetch('/api/auth/generate-challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identityType: 'ens',
          walletAddress: connectedAddress,
          ensName: efpProfile.ensName
        })
      });

      if (!challengeResponse.ok) {
        throw new Error('Failed to generate challenge');
      }

      const { challenge, message } = await challengeResponse.json();

      // Sign the message using wagmi
      console.log('[EthereumProfileDisplay] Requesting signature...');
      const signature = await signMessageAsync({ message });
      
      console.log('[EthereumProfileDisplay] ✅ Message signed, verifying...');

      // Verify signature with backend
      const verifyResponse = await fetch('/api/auth/verify-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identityType: 'ens',
          challenge,
          signature,
          message,
          walletAddress: connectedAddress,
          ensName: efpProfile.ensName
        })
      });

      if (!verifyResponse.ok) {
        throw new Error('Signature verification failed');
      }

      const { user, token, expiresAt } = await verifyResponse.json();
      console.log('[EthereumProfileDisplay] ✅ Authentication complete!', { user, token });
      
      // Store session token
      if (token) {
        localStorage.setItem('curia_session_token', token);
      }

      // 🎯 CRITICAL FIX: Create updated ProfileData with database user information
      const updatedProfileData = {
        type: 'ens' as const,
        address: connectedAddress,
        name: user.name || efpProfile?.ensName || ensName,
        avatar: user.profile_picture_url || efpProfile?.avatar || ensAvatar,
        domain: efpProfile?.ensName || ensName,
        userId: user.user_id,  // Add database user ID
        sessionToken: token,
        verificationLevel: 'verified' as const
      };

      console.log('[EthereumProfileDisplay] ✅ Passing back updated ProfileData:', updatedProfileData);

      // Continue to next step with updated profile data that includes database info
      if (onContinue) {
        onContinue(updatedProfileData);
      }

    } catch (error) {
      console.error('[EthereumProfileDisplay] Signing error:', error);
      alert('Failed to authenticate. Please try again.');
    } finally {
      setIsSigningChallenge(false);
    }
  };

  // ===== RENDER =====

  // Prevent hydration mismatch: Don't render wallet-specific content until mounted
  if (!hasMounted) {
    return (
      <Card className={`border-2 border-border bg-gradient-to-br from-card to-muted/20 ${className}`}>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto border-4 border-border border-t-primary rounded-full animate-spin mb-4"></div>
            <p className="text-muted-foreground">Loading wallet information...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!efpProfile && isLoadingEfp) {
    return (
      <Card className={`border-2 border-border ${className}`}>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full bg-muted animate-pulse" />
            <div className="flex-1">
              <div className="h-5 bg-muted rounded animate-pulse mb-2" />
              <div className="h-4 bg-muted rounded animate-pulse w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!efpProfile) {
    return (
      <Card className={`border-2 border-destructive/20 ${className}`}>
        <CardContent className="p-6">
          <div className="text-center text-destructive">
            Failed to load profile information
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-2 border-border bg-gradient-to-br from-card to-muted/20 ${className}`}>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-foreground">
              Connected Successfully! 
            </h3>
            <p className="text-sm text-muted-foreground">
              Your Ethereum profile is ready
            </p>
          </div>

          {/* Profile Card */}
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-start space-x-4">
              {/* Avatar */}
              <div className="relative">
                {efpProfile.avatar ? (
                  <img
                    src={efpProfile.avatar}
                    alt={efpProfile.displayName}
                    className="w-16 h-16 rounded-full object-cover border-2 border-border"
                  />
                ) : (
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold ${
                    resolvedTheme === 'dark' 
                      ? 'bg-gradient-to-br from-blue-500 to-purple-600' 
                      : 'bg-gradient-to-br from-blue-400 to-purple-500'
                  }`}>
                    ⟠
                  </div>
                )}
                {efpProfile.isVerified && (
                  <CheckCircle className={`absolute -bottom-1 -right-1 h-5 w-5 text-green-500 rounded-full ${
                    resolvedTheme === 'dark' ? 'bg-background' : 'bg-card'
                  }`} />
                )}
              </div>

              {/* Profile Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="font-semibold text-lg text-foreground truncate">
                    {efpProfile.displayName}
                  </h4>
                  {efpProfile.ensName && (
                    <Badge variant="outline" className="text-xs">
                      ENS
                    </Badge>
                  )}
                </div>
                
                <p className="text-sm text-muted-foreground font-mono mb-3">
                  {formatAddress(efpProfile.address)}
                </p>

                {/* EFP Social Stats */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{formatFollowerCount(efpProfile.followers)} followers</span>
                  </div>
                  <div className="flex items-center space-x-1 text-sm text-muted-foreground">
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
            <div className={`text-xs rounded-lg p-3 border ${
              isValidENS === false 
                ? 'text-destructive bg-destructive/10 border-destructive/20' 
                : 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
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
                <div className="mt-2 text-xs text-destructive">
                  <p>• Register an ENS domain at <a href="https://ens.domains" target="_blank" rel="noopener noreferrer" className="underline">ens.domains</a></p>
                  <p>• Try connecting a different wallet with an ENS name</p>
                  <p>• Or go back and select "Continue as Guest" instead</p>
                </div>
              )}
            </div>
          )}

          {/* Validation Success */}
          {isValidENS === true && !efpError && (
            <div className="text-xs bg-green-200 dark:bg-green-900/20 rounded-lg p-3 border border-green-400 dark:border-green-800" style={{ color: resolvedTheme === 'dark' ? '#86efac' : '#1f2937' }}>
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
                onClick={handleContinueWithSigning}
                disabled={isValidENS !== true || isSigningChallenge} // Only enable when valid ENS is confirmed
                className="w-full"
                variant={isValidENS === true ? 'default' : 'secondary'}
              >
                {isSigningChallenge 
                  ? 'Signing...' 
                  : isValidENS === null 
                    ? 'Validating...' 
                    : isValidENS 
                      ? 'Continue & Sign' 
                      : 'ENS Domain Required'
                }
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
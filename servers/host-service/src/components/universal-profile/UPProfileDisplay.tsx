/**
 * Universal Profile Display Component for Host Service
 * 
 * Beautiful profile display for UP users during authentication flow
 * Shows "moment of delight" with rich profile information
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  RefreshCw,
  Star,
  User,
  Users,
  UserPlus,
  ArrowLeft,
  Wallet
} from 'lucide-react';
import { getUPSocialProfile, UPSocialProfile } from '../../lib/upProfile';
import { lsp26Registry, LSP26Stats } from '../../lib/lsp26';
import { useTheme } from '@/contexts/ThemeContext';

// TypeScript declarations for Universal Profile extension
declare global {
  interface Window {
    lukso?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
    };
  }
}

// ===== TYPES =====

export interface UPProfileDisplayProps {
  address: string;
  onSwitchWallet?: () => void; // Switch to different UP account
  onBack?: () => void; // Go back to main authentication selection
  onContinue?: (updatedProfileData?: any) => void; // Pass back updated profile data after signing
  className?: string;
}

// ===== MAIN COMPONENT =====

export const UPProfileDisplay: React.FC<UPProfileDisplayProps> = ({
  address,
  onSwitchWallet,
  onBack,
  onContinue,
  className = ''
}) => {
  // 🎨 Theme system integration
  const { resolvedTheme } = useTheme();
  
  // 🔥 CRITICAL: Fix hydration issue with mounting check (proven pattern)
  const [hasMounted, setHasMounted] = useState(false);
  
  const [profile, setProfile] = useState<UPSocialProfile | null>(null);
  const [socialStats, setSocialStats] = useState<LSP26Stats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isValidUP, setIsValidUP] = useState<boolean | null>(null); // null = checking, true = valid UP, false = not a UP
  const [isSigningChallenge, setIsSigningChallenge] = useState(false);

  // ===== HYDRATION FIX =====
  
  useEffect(() => {
    // Prevent hydration mismatch by ensuring component has mounted
    setHasMounted(true);
  }, []);

  // ===== PROFILE FETCHING =====
  
  useEffect(() => {
    const fetchProfile = async () => {
      if (!address) return;
      
      setIsLoading(true);
      setError(null);
      setIsValidUP(null); // Start validation check
      
      try {
        console.log(`[UPProfileDisplay] Fetching UP profile for: ${address}`);
        const profileData = await getUPSocialProfile(address);
        setProfile(profileData);

        // ===== VALIDATION: Check if this is actually a Universal Profile =====
        // Use proven validation patterns from main forum app
        
        // 1. Address format validation (from main app pattern)
        const upAddressRegex = /^0x[a-fA-F0-9]{40}$/;
        if (!upAddressRegex.test(address)) {
          console.log(`[UPProfileDisplay] ❌ Invalid UP address format: ${address}`);
          setIsValidUP(false);
          setError('Invalid Universal Profile address format. Please ensure you connected the correct wallet.');
        } else {
          // 2. LSP3 profile data validation (from main app pattern)
          const hasValidLSP3Profile = !!(
            profileData && 
            !profileData.error && 
            profileData.displayName && 
            profileData.displayName.trim() && 
            // Not just formatted address fallback
            profileData.displayName !== `${address.slice(0, 6)}...${address.slice(-4)}` &&
            // Has actual profile metadata (proven pattern from main app)
            (profileData.profileImage || profileData.bio || profileData.username !== `user_${address.slice(-6)}`)
          );

          if (hasValidLSP3Profile) {
            console.log(`[UPProfileDisplay] ✅ Valid Universal Profile detected with LSP3 metadata`);
            setIsValidUP(true);
          } else {
            console.log(`[UPProfileDisplay] ❌ Not a valid Universal Profile - missing or invalid LSP3 metadata`);
            setIsValidUP(false);
            setError('This address does not contain valid Universal Profile metadata (LSP3). Please connect a wallet with a properly configured Universal Profile.');
          }
        }

        if (profileData.error) {
          setError(profileData.error);
          setIsValidUP(false);
        }

        console.log(`[UPProfileDisplay] ✅ UP profile fetched:`, profileData);

      } catch (err) {
        console.error('[UPProfileDisplay] Error fetching UP profile:', err);
        setError('Failed to load Universal Profile data. This may not be a valid Universal Profile address.');
        setIsValidUP(false);
        
        // Create basic fallback profile for display purposes only
        setProfile({
          address,
          displayName: `${address.slice(0, 6)}...${address.slice(-4)}`,
          username: `user_${address.slice(-6)}`,
          isVerified: false,
          lastFetched: new Date()
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [address]);

  // ===== SOCIAL STATS FETCHING =====
  
  useEffect(() => {
    const fetchSocialStats = async () => {
      if (!address) return;
      
      setIsLoadingStats(true);
      
      try {
        console.log(`[UPProfileDisplay] Fetching LSP26 stats for: ${address}`);
        const stats = await lsp26Registry.getFollowerInfo(address);
        setSocialStats(stats);
        console.log(`[UPProfileDisplay] ✅ LSP26 stats fetched:`, stats);

      } catch (err) {
        console.error('[UPProfileDisplay] Error fetching LSP26 stats:', err);
        setSocialStats({ followerCount: 0, error: 'Failed to load social stats' });
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchSocialStats();
  }, [address]);

  // ===== HELPER FUNCTIONS =====
  
  const formatAddress = (addr: string): string => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  // Handle immediate signing when Continue is clicked
  const handleContinueWithSigning = async () => {
    if (!profile?.displayName || !address) {
      console.error('[UPProfileDisplay] Missing required data for signing');
      return;
    }

    setIsSigningChallenge(true);

    try {
      // Generate challenge
      const challengeResponse = await fetch('/api/auth/generate-challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identityType: 'universal_profile',
          upAddress: address
        })
      });

      if (!challengeResponse.ok) {
        throw new Error('Failed to generate challenge');
      }

      const { challenge, message } = await challengeResponse.json();

      // Sign the message using Universal Profile extension
      console.log('[UPProfileDisplay] Requesting UP signature...');
      
      // Check if UP extension is available
      if (typeof window === 'undefined' || !window.lukso) {
        throw new Error('Universal Profile extension not found. Please install the Universal Profile browser extension.');
      }

      // Sign using UP extension
      const signature = await window.lukso.request({
        method: 'personal_sign',
        params: [message, address]
      });
      
      console.log('[UPProfileDisplay] ✅ Message signed, verifying...');

      // Verify signature with backend
      const verifyResponse = await fetch('/api/auth/verify-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identityType: 'universal_profile',
          challenge,
          signature,
          message,
          upAddress: address
        })
      });

      if (!verifyResponse.ok) {
        throw new Error('Signature verification failed');
      }

      const { user, token, expiresAt } = await verifyResponse.json();
      console.log('[UPProfileDisplay] ✅ Authentication complete!', { user, token });
      
      // Store session token
      if (token) {
        localStorage.setItem('curia_session_token', token);
      }

      // 🎯 CRITICAL FIX: Create updated ProfileData with database user information
      const updatedProfileData = {
        type: 'universal_profile' as const,
        address: address,
        name: user.name || profile.displayName,
        avatar: user.profile_picture_url || profile.profileImage,
        userId: user.user_id,  // Add database user ID
        sessionToken: token,
        verificationLevel: 'verified' as const
      };

      console.log('[UPProfileDisplay] ✅ Passing back updated ProfileData:', updatedProfileData);

      // Continue to next step with updated profile data that includes database info
      if (onContinue) {
        onContinue(updatedProfileData);
      }

    } catch (error) {
      console.error('[UPProfileDisplay] Signing error:', error);
      alert(`Failed to authenticate: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  if (!profile && isLoading) {
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

  if (!profile) {
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
              Your Universal Profile is ready
            </p>
          </div>

          {/* Profile Card */}
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-start space-x-4">
              {/* Avatar */}
              <div className="relative">
                {profile.profileImage ? (
                  <img
                    src={profile.profileImage}
                    alt={profile.displayName}
                    className="w-16 h-16 rounded-full object-cover border-2 border-border"
                  />
                ) : (
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold ${
                    resolvedTheme === 'dark' 
                      ? 'bg-gradient-to-br from-emerald-500 to-teal-600' 
                      : 'bg-gradient-to-br from-emerald-400 to-teal-500'
                  }`}>
                    {profile.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                {profile.isVerified && (
                  <CheckCircle className={`absolute -bottom-1 -right-1 h-5 w-5 text-green-500 rounded-full ${
                    resolvedTheme === 'dark' ? 'bg-background' : 'bg-card'
                  }`} />
                )}
              </div>

              {/* Profile Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="font-semibold text-lg text-foreground truncate">
                    {profile.displayName}
                  </h4>
                  <Badge variant="outline" className="text-xs">
                    UP
                  </Badge>
                </div>
                
                <p className="text-sm text-muted-foreground mb-2">
                  {profile.username}
                </p>

                <p className="text-sm text-muted-foreground font-mono mb-3">
                  {formatAddress(profile.address)}
                </p>

                {/* Bio */}
                {profile.bio && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {profile.bio}
                  </p>
                )}

                {/* Social Stats */}
                <div className="flex items-center space-x-4 mb-3">
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {isLoadingStats ? (
                        <span className="animate-pulse">Loading...</span>
                      ) : socialStats && !socialStats.error ? (
                        <span className="font-medium">
                          {formatNumber(socialStats.followerCount)} followers
                        </span>
                      ) : (
                        <span className="text-muted-foreground">No stats</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Verification Badge */}
                {profile.isVerified && (
                  <div className="flex items-center space-x-1">
                    <Badge variant="secondary" className="text-xs">
                      <Star className="h-3 w-3 mr-1" />
                      Verified Profile
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Error Display */}
          {(error || (socialStats && socialStats.error)) && (
            <div className={`text-xs rounded-lg p-3 border ${
              isValidUP === false 
                ? 'text-destructive bg-destructive/10 border-destructive/20' 
                : 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
            }`}>
              <div className="flex items-center space-x-2">
                {isValidUP === false ? (
                  <User className="h-4 w-4" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                <span>{error || socialStats?.error}</span>
              </div>
              {isValidUP === false && (
                <div className="mt-2 text-xs text-destructive">
                  <p>• Ensure you have a Universal Profile set up on LUKSO</p>
                  <p>• Try connecting a different wallet</p>
                  <p>• Visit <a href="https://universalprofile.cloud" target="_blank" rel="noopener noreferrer" className="underline">universalprofile.cloud</a> to create one</p>
                </div>
              )}
            </div>
          )}

          {/* Validation Success */}
          {isValidUP === true && !error && (
            <div className="text-xs bg-green-200 dark:bg-green-900/20 rounded-lg p-3 border border-green-400 dark:border-green-800" style={{ color: resolvedTheme === 'dark' ? '#86efac' : '#1f2937' }}>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4" />
                <span>✅ Valid Universal Profile detected - ready to continue!</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Primary Action Button */}
            {onContinue && (
              <Button
                onClick={handleContinueWithSigning}
                disabled={isValidUP !== true || isSigningChallenge} // Only enable when valid UP is confirmed
                className="w-full"
                variant={isValidUP === true ? 'default' : 'secondary'}
              >
                {isSigningChallenge 
                  ? 'Signing...' 
                  : isValidUP === null 
                    ? 'Validating...' 
                    : isValidUP 
                      ? 'Continue & Sign' 
                      : 'Universal Profile Required'
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

              {/* Switch Wallet Button - Triggers UP extension again */}
              {onSwitchWallet && (
                <Button
                  variant="outline"
                  onClick={() => {
                    // For UP, we trigger a new connection which opens the UP extension
                    if (typeof window !== 'undefined' && window.lukso) {
                      window.lukso.request({ method: 'eth_requestAccounts' })
                        .then(() => {
                          // Reload the page or trigger a refresh to get new account
                          window.location.reload();
                        })
                        .catch(console.error);
                    } else {
                      // Fallback to callback if UP extension not available
                      onSwitchWallet();
                    }
                  }}
                  className="flex-1"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  Switch Wallet
                </Button>
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
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

// ===== TYPES =====

export interface UPProfileDisplayProps {
  address: string;
  onSwitchWallet?: () => void; // Switch to different UP account
  onBack?: () => void; // Go back to main authentication selection
  onContinue?: () => void;
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
  const [profile, setProfile] = useState<UPSocialProfile | null>(null);
  const [socialStats, setSocialStats] = useState<LSP26Stats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isValidUP, setIsValidUP] = useState<boolean | null>(null); // null = checking, true = valid UP, false = not a UP

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

  // ===== RENDER =====

  if (isLoading) {
    return (
      <Card className={`border-2 border-emerald-200 ${className}`}>
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

  if (!profile) {
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
    <Card className={`border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 ${className}`}>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Connected Successfully! 
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your Universal Profile is ready
            </p>
          </div>

          {/* Profile Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-emerald-200 dark:border-emerald-800 p-4">
            <div className="flex items-start space-x-4">
              {/* Avatar */}
              <div className="relative">
                {profile.profileImage ? (
                  <img
                    src={profile.profileImage}
                    alt={profile.displayName}
                    className="w-16 h-16 rounded-full object-cover border-2 border-emerald-200"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-2xl font-bold">
                    {profile.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                {profile.isVerified && (
                  <CheckCircle className="absolute -bottom-1 -right-1 h-5 w-5 text-green-500 bg-white rounded-full" />
                )}
              </div>

              {/* Profile Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="font-semibold text-lg text-gray-900 dark:text-gray-100 truncate">
                    {profile.displayName}
                  </h4>
                  <Badge variant="outline" className="text-xs">
                    UP
                  </Badge>
                </div>
                
                <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-2">
                  {profile.username}
                </p>

                <p className="text-sm text-gray-500 dark:text-gray-400 font-mono mb-3">
                  {formatAddress(profile.address)}
                </p>

                {/* Bio */}
                {profile.bio && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                    {profile.bio}
                  </p>
                )}

                {/* Social Stats */}
                <div className="flex items-center space-x-4 mb-3">
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {isLoadingStats ? (
                        <span className="animate-pulse">Loading...</span>
                      ) : socialStats && !socialStats.error ? (
                        <span className="font-medium">
                          {formatNumber(socialStats.followerCount)} followers
                        </span>
                      ) : (
                        <span className="text-gray-400">No stats</span>
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
            <div className={`text-xs rounded-lg p-3 ${
              isValidUP === false 
                ? 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' 
                : 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20'
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
                <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                  <p>• Ensure you have a Universal Profile set up on LUKSO</p>
                  <p>• Try connecting a different wallet</p>
                  <p>• Visit <a href="https://universalprofile.cloud" target="_blank" rel="noopener noreferrer" className="underline">universalprofile.cloud</a> to create one</p>
                </div>
              )}
            </div>
          )}

          {/* Validation Success */}
          {isValidUP === true && !error && (
            <div className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 border border-emerald-200 dark:border-emerald-800">
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
                onClick={onContinue}
                disabled={isValidUP !== true} // Only enable when valid UP is confirmed
                className={`w-full ${
                  isValidUP === true
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                {isValidUP === null ? 'Validating...' : isValidUP ? 'Continue' : 'Invalid Universal Profile'}
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
/**
 * Universal Profile Display Component for Host Service
 * 
 * Beautiful profile display for UP users during authentication flow
 * Shows "moment of delight" with rich profile information
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  CheckCircle, 
  RefreshCw,
  Star,
  User,
  Users,
  UserPlus
} from 'lucide-react';
import { getUPSocialProfile, UPSocialProfile } from '../../lib/upProfile';
import { lsp26Registry, LSP26Stats } from '../../lib/lsp26';

// ===== TYPES =====

export interface UPProfileDisplayProps {
  address: string;
  onSwitchWallet?: () => void;
  onContinue?: () => void;
  className?: string;
}

// ===== MAIN COMPONENT =====

export const UPProfileDisplay: React.FC<UPProfileDisplayProps> = ({
  address,
  onSwitchWallet,
  onContinue,
  className = ''
}) => {
  const [profile, setProfile] = useState<UPSocialProfile | null>(null);
  const [socialStats, setSocialStats] = useState<LSP26Stats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ===== PROFILE FETCHING =====
  
  useEffect(() => {
    const fetchProfile = async () => {
      if (!address) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        console.log(`[UPProfileDisplay] Fetching UP profile for: ${address}`);
        const profileData = await getUPSocialProfile(address);
        setProfile(profileData);

        if (profileData.error) {
          setError(profileData.error);
        }

        console.log(`[UPProfileDisplay] ✅ UP profile fetched:`, profileData);

      } catch (err) {
        console.error('[UPProfileDisplay] Error fetching UP profile:', err);
        setError('Failed to load profile data');
        
        // Create basic fallback profile
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
            <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <RefreshCw className="h-3 w-3" />
                <span>{error || socialStats?.error}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            {onSwitchWallet && (
              <Button
                variant="outline"
                onClick={onSwitchWallet}
                className="flex-1"
              >
                Switch Wallet
              </Button>
            )}
            {onContinue && (
              <Button
                onClick={onContinue}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                Continue
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 
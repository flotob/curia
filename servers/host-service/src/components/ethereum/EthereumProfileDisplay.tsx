/**
 * Ethereum Profile Display Component for Host Service
 * 
 * Beautiful profile display for ENS/EFP users during authentication flow
 * Shows "moment of delight" with rich profile information
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  User, 
  Users, 
  CheckCircle, 
  RefreshCw,
  ExternalLink,
  UserPlus
} from 'lucide-react';

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
  onSwitchWallet?: () => void;
  onContinue?: () => void;
  className?: string;
}

// ===== MAIN COMPONENT =====

export const EthereumProfileDisplay: React.FC<EthereumProfileDisplayProps> = ({
  address,
  ensName,
  ensAvatar,
  onSwitchWallet,
  onContinue,
  className = ''
}) => {
  const [efpProfile, setEfpProfile] = useState<EFPProfile | null>(null);
  const [isLoadingEfp, setIsLoadingEfp] = useState(false);
  const [efpError, setEfpError] = useState<string | null>(null);

  // ===== EFP PROFILE FETCHING =====
  
  useEffect(() => {
    const fetchEfpProfile = async () => {
      if (!address) return;
      
      setIsLoadingEfp(true);
      setEfpError(null);
      
      try {
        console.log(`[EthereumProfileDisplay] Fetching EFP profile for: ${address}`);

        // Fetch both details and stats from EFP API
        const [detailsResponse, statsResponse] = await Promise.all([
          fetch(`https://api.ethfollow.xyz/api/v1/users/${address}/details`),
          fetch(`https://api.ethfollow.xyz/api/v1/users/${address}/stats`)
        ]);

        let profileData: EFPProfile = {
          address,
          displayName: ensName || `${address.slice(0, 6)}...${address.slice(-4)}`,
          ensName,
          avatar: ensAvatar,
          followers: 0,
          following: 0,
          isVerified: !!ensName
        };

        // Get profile details if available
        if (detailsResponse.ok) {
          const detailsData = await detailsResponse.json();
          profileData = {
            ...profileData,
            ensName: detailsData.ens?.name || ensName,
            displayName: detailsData.ens?.name || ensName || profileData.displayName,
            avatar: detailsData.ens?.avatar || ensAvatar,
            isVerified: true // From EFP API so considered verified
          };
        }

        // Get stats if available
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          profileData.followers = statsData.followers_count || 0;
          profileData.following = statsData.following_count || 0;
        }

        console.log(`[EthereumProfileDisplay] ✅ EFP profile fetched:`, profileData);
        setEfpProfile(profileData);

      } catch (error) {
        console.error('[EthereumProfileDisplay] Error fetching EFP profile:', error);
        setEfpError('Failed to load social profile data');
        
        // Create fallback profile
        setEfpProfile({
          address,
          displayName: ensName || `${address.slice(0, 6)}...${address.slice(-4)}`,
          ensName,
          avatar: ensAvatar,
          followers: 0,
          following: 0,
          isVerified: !!ensName
        });
      } finally {
        setIsLoadingEfp(false);
      }
    };

    fetchEfpProfile();
  }, [address, ensName, ensAvatar]);

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
            <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <RefreshCw className="h-3 w-3" />
                <span>{efpError}</span>
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
                className="flex-1 bg-blue-600 hover:bg-blue-700"
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
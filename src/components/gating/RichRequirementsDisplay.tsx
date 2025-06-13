/**
 * Rich Requirements Display Component
 * 
 * A beautiful, prominent display of gating requirements with:
 * - Gradient backgrounds based on verification status
 * - Profile pictures for follower requirements
 * - Token icons from IPFS metadata
 * - Detailed "Required vs You have" information
 * - Real-time loading states and animations
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Coins, 
  Users, 
  UserCheck, 
  UserX,
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2,
  Wallet
} from 'lucide-react';
import { ethers } from 'ethers';

import { UPGatingRequirements, VerificationStatus } from '@/types/gating';
import { getUPSocialProfile, UPSocialProfile } from '@/lib/upProfile';

// ===== TYPES =====

// Extended verification status with additional properties needed for rich display
export interface ExtendedVerificationStatus extends VerificationStatus {
  address?: string; // User's wallet address when connected
  balances?: {
    lyx?: string; // Raw balance for LYX (wei)
    tokens?: Record<string, {
      raw: string;        // Raw balance for BigNumber comparisons 
      formatted: string;  // Formatted balance for display
      decimals?: number;
      name?: string;
      symbol?: string;
    }>;
  };
  followerStatus?: Record<string, boolean>;
}

export interface RichRequirementsDisplayProps {
  requirements: UPGatingRequirements;
  userStatus: ExtendedVerificationStatus;
  metadata: {
    icon: string;
    name: string;
    brandColor: string;
  };
  onConnect: () => Promise<void>;
  onDisconnect?: () => void;
  disabled?: boolean;
  className?: string;
}

interface RequirementVerificationState {
  // LYX Balance
  lyxBalance?: {
    userBalance: string;
    formattedBalance: string;
    meetsRequirement: boolean;
    isLoading: boolean;
    error?: string;
  };
  
  // Token Requirements
  tokenBalances: Record<string, {
    balance: string;
    formattedBalance: string;
    decimals?: number;
    name?: string;
    symbol?: string;
    iconUrl?: string;
    meetsRequirement: boolean;
    isLoading: boolean;
    error?: string;
  }>;
  
  // Follower Requirements
  followerVerifications: Record<string, {
    type: 'minimum_followers' | 'followed_by' | 'following';
    value: string;
    userFollowerCount?: number;
    status: boolean;
    isLoading: boolean;
    error?: string;
  }>;
  
  // Social Profiles (for display)
  socialProfiles: Record<string, UPSocialProfile>;
  isLoadingSocialProfiles: boolean;
}

// ===== MAIN COMPONENT =====

export const RichRequirementsDisplay: React.FC<RichRequirementsDisplayProps> = ({
  requirements,
  userStatus,
  metadata,
  onConnect,
  onDisconnect,
  disabled = false,
  className = ''
}) => {
  // ===== STATE =====
  
  const [verificationState, setVerificationState] = useState<RequirementVerificationState>({
    tokenBalances: {},
    followerVerifications: {},
    socialProfiles: {},
    isLoadingSocialProfiles: false
  });

  // ===== SOCIAL PROFILE FETCHING =====
  
  const fetchSocialProfiles = useCallback(async (addresses: string[]) => {
    if (addresses.length === 0) return;
    
    setVerificationState(prev => ({ ...prev, isLoadingSocialProfiles: true }));
    
    try {
      console.log(`[RichRequirementsDisplay] Fetching social profiles for ${addresses.length} addresses`);
      
      const profilePromises = addresses.map(async (address) => {
        try {
          const profile = await getUPSocialProfile(address);
          return { address, profile };
        } catch (error) {
          console.error(`Failed to fetch social profile for ${address}:`, error);
          // Create fallback profile
          return { 
            address, 
            profile: {
              address,
              displayName: `${address.slice(0, 6)}...${address.slice(-4)}`,
              username: `@${address.slice(2, 6)}${address.slice(-4)}.lukso`,
              isVerified: false,
              lastFetched: new Date()
            } as UPSocialProfile
          };
        }
      });

      const profileResults = await Promise.all(profilePromises);
      const newProfiles: Record<string, UPSocialProfile> = {};
      
      profileResults.forEach(({ address, profile }) => {
        newProfiles[address] = profile;
      });

      setVerificationState(prev => ({ 
        ...prev, 
        socialProfiles: { ...prev.socialProfiles, ...newProfiles },
        isLoadingSocialProfiles: false
      }));
    } catch (error) {
      console.error('[RichRequirementsDisplay] Error fetching social profiles:', error);
      setVerificationState(prev => ({ ...prev, isLoadingSocialProfiles: false }));
    }
  }, []);

  // Load social profiles when requirements change
  useEffect(() => {
    const addressesToFetch: string[] = [];
    
    // Add follower requirement addresses
    if (requirements.followerRequirements) {
      const followerAddresses = requirements.followerRequirements
        .filter(req => req.type !== 'minimum_followers')
        .map(req => req.value)
        .filter(address => !verificationState.socialProfiles[address]);
      
      addressesToFetch.push(...followerAddresses);
    }
    
    // Add connected user address if available
    if (userStatus.connected && userStatus.address && !verificationState.socialProfiles[userStatus.address]) {
      addressesToFetch.push(userStatus.address);
    }
    
    if (addressesToFetch.length > 0) {
      fetchSocialProfiles(addressesToFetch);
    }
  }, [requirements, userStatus.connected, userStatus.address, verificationState.socialProfiles, fetchSocialProfiles]);

  // ===== HELPER FUNCTIONS =====
  
  const formatBalance = (balance: string): string => {
    const num = parseFloat(balance);
    return num < 0.001 ? '< 0.001' : num.toFixed(3);
  };

  const formatAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Get status styling for requirement cards
  const getRequirementStyling = (isLoading: boolean, meetsRequirement?: boolean, error?: string) => {
    if (isLoading) {
      return 'bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 border-gray-200 dark:border-gray-700';
    }
    if (error) {
      return 'bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/10 dark:to-rose-900/10 border-red-200 dark:border-red-800';
    }
    if (meetsRequirement === true) {
      return 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 border-green-200 dark:border-green-800';
    }
    if (meetsRequirement === false) {
      return 'bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/10 dark:to-rose-900/10 border-red-200 dark:border-red-800';
    }
    return 'bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/10 dark:to-yellow-900/10 border-amber-200 dark:border-amber-800';
  };

  // Get status icon for requirements
  const getStatusIcon = (isLoading: boolean, meetsRequirement?: boolean, error?: string) => {
    if (isLoading) {
      return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
    }
    if (error) {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
    if (meetsRequirement === true) {
      return <CheckCircle className="h-5 w-5 text-emerald-500" />;
    }
    if (meetsRequirement === false) {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
    return <AlertTriangle className="h-5 w-5 text-amber-500" />;
  };

  // ===== REAL VERIFICATION DATA =====
  // Using real blockchain data from connected Universal Profile
  
  // LYX balance verification with real data
  const lyxVerification = requirements.minLyxBalance ? {
    userBalance: userStatus.balances?.lyx || '0',
    formattedBalance: userStatus.balances?.lyx ? formatBalance(userStatus.balances.lyx) : '0',
    meetsRequirement: userStatus.balances?.lyx ? 
      ethers.BigNumber.from(userStatus.balances.lyx).gte(ethers.BigNumber.from(requirements.minLyxBalance)) : false,
    isLoading: false
  } : undefined;

  // Token verification with real blockchain data
  const tokenVerifications: Record<string, {
    balance: string;
    formattedBalance: string;
    decimals?: number;
    name?: string;
    symbol?: string;
    iconUrl?: string;
    meetsRequirement: boolean;
    isLoading: boolean;
    error?: string;
  }> = {};
  if (requirements.requiredTokens) {
    requirements.requiredTokens.forEach(token => {
      const tokenData = userStatus.balances?.tokens?.[token.contractAddress];
      tokenVerifications[token.contractAddress] = {
        balance: tokenData?.raw || '0',
        formattedBalance: tokenData?.formatted || '0',
        name: tokenData?.name || token.name,
        symbol: tokenData?.symbol || token.symbol,
        decimals: tokenData?.decimals,
        meetsRequirement: tokenData ? 
          ethers.BigNumber.from(tokenData.raw).gte(ethers.BigNumber.from(token.minAmount || '0')) : false,
        isLoading: false
      };
    });
  }

  // Follower verification with real data
  const followerVerifications: Record<string, {
    type: 'minimum_followers' | 'followed_by' | 'following';
    value: string;
    userFollowerCount?: number;
    status: boolean;
    isLoading: boolean;
    error?: string;
  }> = {};
  if (requirements.followerRequirements) {
    requirements.followerRequirements.forEach(follower => {
      const key = `${follower.type}-${follower.value}`;
      followerVerifications[key] = {
        type: follower.type,
        value: follower.value,
        status: userStatus.followerStatus?.[key] || false,
        isLoading: false
      };
    });
  }

  // ===== RENDER =====

  return (
    <Card className={`border-2 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center text-sm">
              <Shield className="h-4 w-4 mr-2" />
              {metadata.name} Required
            </CardTitle>
            <CardDescription className="text-xs">
              This post requires verification to comment
            </CardDescription>
          </div>
          
          {/* Connected Profile Status Bar */}
          {userStatus.connected && userStatus.address && (
            <div className="flex items-center space-x-2">
              {(() => {
                const connectedProfile = verificationState.socialProfiles[userStatus.address!];
                return connectedProfile ? (
                  <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    {/* Profile Picture */}
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                      {connectedProfile.profileImage ? (
                        <img 
                          src={connectedProfile.profileImage} 
                          alt={connectedProfile.displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                          {connectedProfile.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    {/* Name and Username */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                        {connectedProfile.displayName}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {connectedProfile.username}
                      </div>
                    </div>
                    {/* Verification Badge */}
                    {connectedProfile.isVerified && (
                      <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                        <CheckCircle className="w-3 h-3 text-white" />
                      </div>
                    )}
                    {/* Disconnect Button */}
                    {onDisconnect && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onDisconnect}
                        className="h-auto p-1 opacity-60 hover:opacity-100 text-gray-500 hover:text-red-500"
                        title="Disconnect"
                      >
                        <XCircle size={14} />
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    {/* Loading or fallback */}
                    {verificationState.isLoadingSocialProfiles ? (
                      <>
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1"></div>
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white text-sm font-medium">
                          {userStatus.address!.charAt(2).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                            {metadata.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                            {formatAddress(userStatus.address!)}
                          </div>
                        </div>
                        {/* Disconnect Button */}
                        {onDisconnect && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={onDisconnect}
                            className="h-auto p-1 opacity-60 hover:opacity-100 text-gray-500 hover:text-red-500"
                            title="Disconnect"
                          >
                            <XCircle size={14} />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Requirements Section */}
        <div className="space-y-1">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Requirements
          </h4>
          
          {/* LYX Balance Requirement */}
          {requirements.minLyxBalance && (
            <div className={`flex items-center justify-between p-3 rounded-lg border min-h-[60px] ${
              getRequirementStyling(lyxVerification?.isLoading || false, lyxVerification?.meetsRequirement)
            }`}>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Coins className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <div className="font-medium text-sm">LYX Balance</div>
                  <div className="text-xs text-muted-foreground">
                    Required: {ethers.utils.formatEther(requirements.minLyxBalance)} LYX
                    {lyxVerification && ` • You have: ${lyxVerification.formattedBalance} LYX`}
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                {getStatusIcon(lyxVerification?.isLoading || false, lyxVerification?.meetsRequirement)}
              </div>
            </div>
          )}
          
          {/* Token Requirements */}
          {requirements.requiredTokens && requirements.requiredTokens.length > 0 && (
            <>
              {requirements.requiredTokens.map((tokenReq, index) => {
                const tokenData = tokenVerifications[tokenReq.contractAddress];
                let displayAmount: string;
                
                if (tokenReq.tokenType === 'LSP7') {
                  displayAmount = ethers.utils.formatUnits(tokenReq.minAmount || '0', tokenData?.decimals || 18);
                } else {
                  displayAmount = tokenReq.minAmount || '1';
                }
                
                return (
                  <div key={index} className={`flex items-center justify-between p-3 rounded-lg border min-h-[60px] ${
                    getRequirementStyling(tokenData?.isLoading, tokenData?.meetsRequirement, tokenData?.error)
                  }`}>
                    <div className="flex items-center space-x-3">
                      {/* Token Icon or Fallback */}
                      {tokenData?.iconUrl ? (
                        <img 
                          src={tokenData.iconUrl} 
                          alt={`${tokenData.name || 'Token'} icon`}
                          className="w-8 h-8 rounded-full object-cover border border-gray-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          {tokenReq.tokenType === 'LSP8' ? '🎨' : '🪙'}
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-sm flex items-center space-x-2">
                          <span>{tokenData?.symbol || tokenReq.symbol || tokenReq.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {tokenReq.tokenType}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Required: {displayAmount} {tokenData?.symbol || tokenReq.symbol || 'tokens'}
                          {tokenData && ` • You have: ${tokenData.formattedBalance} ${tokenData.symbol || 'tokens'}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      {getStatusIcon(tokenData?.isLoading, tokenData?.meetsRequirement, tokenData?.error)}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* Follower Requirements */}
          {requirements.followerRequirements && requirements.followerRequirements.length > 0 && (
            <>
              {requirements.followerRequirements.map((followerReq, index) => {
                const reqKey = `${followerReq.type}-${followerReq.value}`;
                const reqData = followerVerifications[reqKey];
                
                if (followerReq.type === 'minimum_followers') {
                  return (
                    <div key={index} className={`flex items-center justify-between p-3 rounded-lg border min-h-[60px] ${
                      getRequirementStyling(reqData?.isLoading, reqData?.status, reqData?.error)
                    }`}>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                          <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">Minimum Followers</div>
                          <div className="text-xs text-muted-foreground">
                            Required: {followerReq.value} followers
                            {reqData?.userFollowerCount !== undefined && ` • You have: ${reqData.userFollowerCount} followers`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        {getStatusIcon(reqData?.isLoading, reqData?.status, reqData?.error)}
                      </div>
                    </div>
                  );
                } else {
                  // Address-based requirement with social profile
                  const socialProfile = verificationState.socialProfiles[followerReq.value];
                  const iconClass = followerReq.type === 'followed_by'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-blue-600 dark:text-blue-400';
                  
                  return (
                    <div key={index} className={`p-3 rounded-lg border min-h-[80px] ${
                      getRequirementStyling(reqData?.isLoading, reqData?.status, reqData?.error)
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1">
                          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center flex-shrink-0">
                            {followerReq.type === 'followed_by' ? (
                              <UserCheck className={`h-4 w-4 ${iconClass}`} />
                            ) : (
                              <UserX className={`h-4 w-4 ${iconClass}`} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm mb-1">
                              {followerReq.type === 'followed_by' ? 'Must be followed by' : 'Must follow'}
                            </div>
                            {/* Social Profile Display */}
                            {socialProfile ? (
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                                  {socialProfile.profileImage ? (
                                    <img 
                                      src={socialProfile.profileImage} 
                                      alt={socialProfile.displayName}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                                      {socialProfile.displayName.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center space-x-1 min-w-0">
                                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                    {socialProfile.displayName}
                                  </span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {socialProfile.username}
                                  </span>
                                </div>
                              </div>
                            ) : verificationState.isLoadingSocialProfiles ? (
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
                                <div className="w-20 h-4 bg-gray-200 rounded animate-pulse" />
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground font-mono">
                                {followerReq.value.slice(0, 6)}...{followerReq.value.slice(-4)}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center ml-3">
                          {getStatusIcon(reqData?.isLoading, reqData?.status, reqData?.error)}
                        </div>
                      </div>
                    </div>
                  );
                }
              })}
            </>
          )}
        </div>

        {/* Connection Actions */}
        {!userStatus.connected && (
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              Connect your {metadata.name} to verify requirements and comment.
            </div>
            <Button
              onClick={onConnect}
              disabled={disabled}
              className="w-full"
              size="sm"
            >
              <Wallet className="h-4 w-4 mr-2" />
              Connect {metadata.name}
            </Button>
          </div>
        )}

        {/* Overall Status */}
        {userStatus.connected && (
          <div className="text-xs">
            {(() => {
              const allMet = userStatus.verified;
              
              if (allMet) {
                return (
                  <div className="flex items-center text-emerald-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    All requirements met - ready to comment!
                  </div>
                );
              } else {
                return (
                  <div className="flex items-center text-red-600">
                    <XCircle className="h-3 w-3 mr-1" />
                    Some requirements not met
                  </div>
                );
              }
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 
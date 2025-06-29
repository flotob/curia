/**
 * Ethereum Rich Requirements Display Component
 * 
 * A beautiful, prominent display of Ethereum gating requirements with:
 * - Gradient backgrounds based on verification status
 * - Token icons and metadata
 * - Detailed "Required vs You have" information
 * - Real-time loading states and animations
 * - Matches Universal Profile RichRequirementsDisplay patterns
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
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2,
  Wallet,
  Hash,
  User
} from 'lucide-react';
import { ethers } from 'ethers';

import { EthereumGatingRequirements, VerificationStatus } from '@/types/gating';

// ===== TYPES =====

// EFP Profile interface for fetching profile data
interface EFPProfile {
  address: string;
  ensName?: string;
  displayName: string;
  avatar?: string;
  followers: number;
  following: number;
  isVerified?: boolean;
}

// Extended verification status with additional properties needed for rich display
export interface EthereumExtendedVerificationStatus extends VerificationStatus {
  ethAddress?: string; // User's Ethereum wallet address when connected
  balances?: {
    eth?: string; // Raw balance for ETH (wei)
    tokens?: Record<string, {
      raw: string;        // Raw balance for BigNumber comparisons 
      formatted: string;  // Formatted balance for display
      decimals?: number;
      name?: string;
      symbol?: string;
    }>;
  };
  ensStatus?: boolean; // Real ENS verification status
  efpStatus?: Record<string, boolean>; // Real EFP verification status by requirement key
  ensName?: string; // ENS name if available
  ensAvatar?: string; // ENS avatar if available
}

export interface EthereumRichRequirementsDisplayProps {
  requirements: EthereumGatingRequirements;
  fulfillment?: "any" | "all"; // 🚀 NEW: Fulfillment mode for this category
  userStatus: EthereumExtendedVerificationStatus;
  metadata: {
    icon: string;
    name: string;
    brandColor: string;
  };
  onConnect: () => Promise<void>;
  onDisconnect?: () => void;
  disabled?: boolean;
  className?: string;
  showHeader?: boolean; // NEW: Default to true for backward compatibility
}

// ===== MAIN COMPONENT =====

export const EthereumRichRequirementsDisplay: React.FC<EthereumRichRequirementsDisplayProps> = ({
  requirements,
  fulfillment = 'all', // 🚀 NEW: Default to 'all' for backward compatibility
  userStatus,
  metadata,
  onConnect,
  onDisconnect,
  disabled = false,
  className = '',
  showHeader = true // NEW: Default to true for backward compatibility
}) => {
  // ===== STATE FOR EFP PROFILES =====
  
  const [efpProfiles, setEfpProfiles] = useState<Record<string, EFPProfile>>({});
  const [isLoadingEfpProfiles, setIsLoadingEfpProfiles] = useState(false);

  // ===== EFP PROFILE FETCHING =====
  
  const fetchEfpProfiles = useCallback(async (addresses: string[]) => {
    if (addresses.length === 0) return;
    
    setIsLoadingEfpProfiles(true);
    try {
      console.log(`[EthereumRichDisplay] Fetching EFP profiles for ${addresses.length} addresses`);
      
      const profilePromises = addresses.map(async (address) => {
        try {
          // Fetch both details and stats for complete profile data (same as EFPUserSearch)
          const [detailsResponse, statsResponse] = await Promise.all([
            fetch(`https://api.ethfollow.xyz/api/v1/users/${address}/details`),
            fetch(`https://api.ethfollow.xyz/api/v1/users/${address}/stats`)
          ]);
          
          if (detailsResponse.ok) {
            const detailsData = await detailsResponse.json();
            let stats = { followers_count: 0, following_count: 0 };
            
            // Get stats if available
            if (statsResponse.ok) {
              stats = await statsResponse.json();
            }
            
            return {
              address,
              profile: {
                address: detailsData.address || address,
                ensName: detailsData.ens?.name,
                displayName: detailsData.ens?.name || `${address.slice(0, 6)}...${address.slice(-4)}`,
                avatar: detailsData.ens?.avatar,
                followers: stats.followers_count || 0,
                following: stats.following_count || 0,
                isVerified: true // From EFP API so considered verified
              }
            };
          }
        } catch (error) {
          console.error(`Failed to fetch EFP profile for ${address}:`, error);
        }
        
        // Create fallback profile
        return { 
          address, 
          profile: {
            address,
            displayName: `${address.slice(0, 6)}...${address.slice(-4)}`,
            avatar: undefined,
            followers: 0,
            following: 0,
            isVerified: false
          } as EFPProfile
        };
      });

      const profileResults = await Promise.all(profilePromises);
      const newProfiles: Record<string, EFPProfile> = {};
      
      profileResults.forEach(({ address, profile }) => {
        newProfiles[address] = profile;
      });

      setEfpProfiles(prev => ({ ...prev, ...newProfiles }));
    } catch (error) {
      console.error('[EthereumRichDisplay] Error fetching EFP profiles:', error);
    } finally {
      setIsLoadingEfpProfiles(false);
    }
  }, []);

  // Load EFP profiles when requirements change
  useEffect(() => {
    if (requirements.efpRequirements && requirements.efpRequirements.length > 0) {
      const addressesToFetch = requirements.efpRequirements
        .filter(req => req.type !== 'minimum_followers')
        .map(req => req.value)
        .filter(address => address && !efpProfiles[address]);

      if (addressesToFetch.length > 0) {
        fetchEfpProfiles(addressesToFetch);
      }
    }
  }, [requirements.efpRequirements, fetchEfpProfiles, efpProfiles]);

  // ===== HELPER FUNCTIONS =====
  
  const formatAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatFollowerCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
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
  // Using userStatus.balances to populate verification state with real blockchain data
  
  // ETH balance verification
  const ethVerification = requirements.minimumETHBalance ? {
    userBalance: userStatus.balances?.eth || '0',
    formattedBalance: userStatus.balances?.eth || '0', // Already formatted
    meetsRequirement: userStatus.balances?.eth ? 
      ethers.utils.parseEther(userStatus.balances.eth).gte(ethers.BigNumber.from(requirements.minimumETHBalance)) : false,
    isLoading: false
  } : undefined;

  // ERC-20 token verification with real blockchain data
  const tokenVerifications: Record<string, {
    balance: string;
    formattedBalance: string;
    decimals?: number;
    name?: string;
    symbol?: string;
    logoUrl?: string;
    meetsRequirement: boolean;
    isLoading: boolean;
    error?: string;
  }> = {};
  
  if (requirements.requiredERC20Tokens) {
    requirements.requiredERC20Tokens.forEach(token => {
      const tokenData = userStatus.balances?.tokens?.[token.contractAddress];
      tokenVerifications[token.contractAddress] = {
        balance: tokenData?.raw || '0',
        formattedBalance: tokenData?.formatted || '0',
        name: tokenData?.name || token.name,
        symbol: tokenData?.symbol || token.symbol,
        decimals: tokenData?.decimals || token.decimals,
        meetsRequirement: tokenData ? 
          ethers.BigNumber.from(tokenData.raw).gte(ethers.BigNumber.from(token.minimum || '0')) : false,
        isLoading: false
      };
    });
  }

  // ENS verification with real data
  const ensVerification = requirements.requiresENS ? {
    hasENS: userStatus.ensStatus || false,
    isLoading: false
  } : undefined;

  // EFP verification with real blockchain data
  const efpVerifications: Record<string, {
    type: 'minimum_followers' | 'must_follow' | 'must_be_followed_by';
    value: string;
    status: boolean;
    isLoading: boolean;
    error?: string;
  }> = {};
  
  if (requirements.efpRequirements) {
    requirements.efpRequirements.forEach(efp => {
      const key = `${efp.type}-${efp.value}`;
      efpVerifications[key] = {
        type: efp.type,
        value: efp.value,
        status: userStatus.efpStatus?.[key] || false,
        isLoading: false
      };
    });
  }

  // ===== RENDER =====

  return (
    <Card className={`border-2 ${className}`}>
      {showHeader && (
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
            {userStatus.connected && userStatus.ethAddress && (
              <div className="flex items-center space-x-2">
                <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  {/* Profile Avatar or Ethereum Icon */}
                  {userStatus.ensAvatar ? (
                    <img 
                      src={userStatus.ensAvatar} 
                      alt="ENS Avatar"
                      className="w-10 h-10 rounded-full object-cover border border-gray-300"
                      onError={(e) => {
                        // Fallback to Ethereum icon if avatar fails to load
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-lg font-bold">
                      ⟠
                    </div>
                  )}
                  {/* ENS Name or Address */}
                  <div className="flex-1">
                    <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                      {userStatus.ensName || 'Ethereum Wallet'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                      {formatAddress(userStatus.ethAddress)}
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
                </div>
              </div>
            )}
          </div>
        </CardHeader>
      )}
      
      <CardContent className="space-y-3">
        {/* Requirements Section */}
        <div className="space-y-1">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Requirements
          </h4>
          
          {/* ETH Balance Requirement */}
          {requirements.minimumETHBalance && (
            <div className={`flex items-center justify-between p-3 rounded-lg border min-h-[60px] ${
              getRequirementStyling(ethVerification?.isLoading || false, ethVerification?.meetsRequirement)
            }`}>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Coins className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="font-medium text-sm">ETH Balance</div>
                  <div className="text-xs text-muted-foreground">
                    Required: {ethers.utils.formatEther(requirements.minimumETHBalance)} ETH
                    {ethVerification && ` • You have: ${ethVerification.formattedBalance} ETH`}
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                {getStatusIcon(ethVerification?.isLoading || false, ethVerification?.meetsRequirement)}
              </div>
            </div>
          )}
          
          {/* ENS Name Requirement */}
          {requirements.requiresENS && (
            <div className={`flex items-center justify-between p-3 rounded-lg border min-h-[60px] ${
              getRequirementStyling(ensVerification?.isLoading || false, ensVerification?.hasENS)
            }`}>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Hash className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <div className="font-medium text-sm">ENS Name</div>
                  <div className="text-xs text-muted-foreground">
                    Required: Valid ENS domain
                    {ensVerification?.hasENS ? ' • You have: ENS name verified' : ' • You have: No ENS name'}
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                {getStatusIcon(ensVerification?.isLoading || false, ensVerification?.hasENS)}
              </div>
            </div>
          )}
          
          {/* ERC-20 Token Requirements */}
          {requirements.requiredERC20Tokens && requirements.requiredERC20Tokens.length > 0 && (
            <>
              {requirements.requiredERC20Tokens.map((tokenReq, index) => {
                const tokenData = tokenVerifications[tokenReq.contractAddress];
                const displayAmount = ethers.utils.formatUnits(tokenReq.minimum || '0', tokenData?.decimals || 18);
                
                return (
                  <div key={index} className={`flex items-center justify-between p-3 rounded-lg border min-h-[60px] ${
                    getRequirementStyling(tokenData?.isLoading, tokenData?.meetsRequirement, tokenData?.error)
                  }`}>
                    <div className="flex items-center space-x-3">
                      {/* Token Icon or Fallback */}
                      {tokenData?.logoUrl ? (
                        <img 
                          src={tokenData.logoUrl} 
                          alt={`${tokenData.name || 'Token'} icon`}
                          className="w-8 h-8 rounded-full object-cover border border-gray-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          🪙
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-sm flex items-center space-x-2">
                          <span>{tokenData?.symbol || tokenReq.symbol || tokenReq.name}</span>
                          <Badge variant="outline" className="text-xs">
                            ERC-20
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

          {/* ERC-721 NFT Requirements */}
          {requirements.requiredERC721Collections && requirements.requiredERC721Collections.length > 0 && (
            <>
              {requirements.requiredERC721Collections.map((nftReq, index) => (
                <div key={index} className={`flex items-center justify-between p-3 rounded-lg border min-h-[60px] ${
                  getRequirementStyling(false, false) // TODO: Add NFT verification
                }`}>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                      🎨
                    </div>
                    <div>
                      <div className="font-medium text-sm flex items-center space-x-2">
                        <span>{nftReq.name || formatAddress(nftReq.contractAddress)}</span>
                        <Badge variant="outline" className="text-xs">
                          ERC-721
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Required: Own NFT from this collection
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {getStatusIcon(false, false)}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* EFP Requirements */}
          {requirements.efpRequirements && requirements.efpRequirements.length > 0 && (
            <>
              {requirements.efpRequirements.map((efpReq, index) => {
                const key = `${efpReq.type}-${efpReq.value}`;
                const efpData = efpVerifications[key];
                
                if (efpReq.type === 'minimum_followers') {
                  return (
                    <div key={index} className={`flex items-center justify-between p-3 rounded-lg border min-h-[60px] ${
                      getRequirementStyling(efpData?.isLoading || false, efpData?.status, efpData?.error)
                    }`}>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                          <Users className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                          <div className="font-medium text-sm flex items-center space-x-2">
                            <span>{efpReq.value}+ Followers</span>
                            <Badge variant="outline" className="text-xs">EFP</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Have at least {efpReq.value} followers on EFP
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        {getStatusIcon(efpData?.isLoading || false, efpData?.status, efpData?.error)}
                      </div>
                    </div>
                  );
                } else {
                  // Address-based requirement with EFP profile display
                  const efpProfile = efpProfiles[efpReq.value];
                  const isProfileLoading = isLoadingEfpProfiles && !efpProfile;
                  
                  return (
                    <div key={index} className={`rounded-lg border min-h-[60px] ${
                      getRequirementStyling(efpData?.isLoading || false, efpData?.status, efpData?.error)
                    }`}>
                      <div className="flex items-center justify-between p-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                            <Users className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                          </div>
                          <div>
                            <div className="font-medium text-sm flex items-center space-x-2">
                              <span>
                                {efpReq.type === 'must_follow' && 'Must Follow'}
                                {efpReq.type === 'must_be_followed_by' && 'Followed By'}
                              </span>
                              <Badge variant="outline" className="text-xs">EFP</Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {efpReq.type === 'must_follow' ? 'You must follow this user' : 'You must be followed by this user'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          {getStatusIcon(efpData?.isLoading || false, efpData?.status, efpData?.error)}
                        </div>
                      </div>
                      
                      {/* EFP Profile Display */}
                      <div className="border-t border-border/50 p-3 bg-muted/30">
                        {isProfileLoading ? (
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
                            <div className="flex-1">
                              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1" />
                              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
                            </div>
                          </div>
                        ) : efpProfile ? (
                          <div className="flex items-center space-x-3">
                            {/* EFP Profile Avatar */}
                            <div className="relative">
                              {efpProfile.avatar ? (
                                <img
                                  src={efpProfile.avatar}
                                  alt={efpProfile.displayName}
                                  className="w-10 h-10 rounded-full object-cover border border-gray-300"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                  <User className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                              {efpProfile.isVerified && (
                                <CheckCircle className="absolute -bottom-1 -right-1 h-4 w-4 text-green-500 bg-white rounded-full" />
                              )}
                            </div>
                            
                            {/* Profile Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-sm truncate">
                                  {efpProfile.displayName}
                                </span>
                                {efpProfile.ensName && efpProfile.ensName !== efpProfile.displayName && (
                                  <Badge variant="outline" className="text-xs">
                                    {efpProfile.ensName}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {efpProfile.address.slice(0, 6)}...{efpProfile.address.slice(-4)}
                              </div>
                              
                              {/* EFP Stats */}
                              <div className="flex items-center space-x-3 mt-1">
                                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                                  <Users className="h-3 w-3" />
                                  <span>{formatFollowerCount(efpProfile.followers)} followers</span>
                                </div>
                                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                                  <User className="h-3 w-3" />
                                  <span>{formatFollowerCount(efpProfile.following)} following</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground font-mono">
                            {formatAddress(efpReq.value)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
              })}
            </>
          )}
        </div>

        {/* Overall Status */}
        {userStatus.connected && (
          <div className="text-xs">
            {(() => {
              // 🚀 NEW: Calculate if requirements are met based on fulfillment mode
              const requirementChecks = [];
              
              // Check ETH balance requirement
              if (ethVerification) {
                requirementChecks.push(ethVerification.meetsRequirement);
              }
              
              // Check ENS requirement
              if (ensVerification) {
                requirementChecks.push(ensVerification.hasENS);
              }
              
              // Check ERC-20 token requirements
              if (requirements.requiredERC20Tokens) {
                requirements.requiredERC20Tokens.forEach(token => {
                  const tokenData = tokenVerifications[token.contractAddress];
                  requirementChecks.push(tokenData?.meetsRequirement || false);
                });
              }
              
              // Check ERC-721 NFT requirements
              if (requirements.requiredERC721Collections) {
                requirements.requiredERC721Collections.forEach(() => {
                  // TODO: Add actual NFT verification logic
                  requirementChecks.push(false);
                });
              }
              
              // Check ERC-1155 token requirements
              if (requirements.requiredERC1155Tokens) {
                requirements.requiredERC1155Tokens.forEach(() => {
                  // TODO: Add actual ERC-1155 verification logic
                  requirementChecks.push(false);
                });
              }
              
              // Check EFP requirements
              if (requirements.efpRequirements) {
                requirements.efpRequirements.forEach(efp => {
                  const key = `${efp.type}-${efp.value}`;
                  const efpData = efpVerifications[key];
                  requirementChecks.push(efpData?.status || false);
                });
              }
              
              // Check ENS pattern requirements
              if (requirements.ensDomainPatterns) {
                requirements.ensDomainPatterns.forEach(() => {
                  // TODO: Add actual ENS pattern verification logic
                  requirementChecks.push(false);
                });
              }
              
              // 🚀 NEW: Apply fulfillment mode logic
              let requirementsMet = false;
              let statusMessage = '';
              
              if (requirementChecks.length === 0) {
                requirementsMet = true;
                statusMessage = 'No requirements to verify';
              } else if (fulfillment === 'any') {
                // ANY mode: At least one requirement must be satisfied
                requirementsMet = requirementChecks.some(met => met === true);
                const metCount = requirementChecks.filter(met => met === true).length;
                statusMessage = requirementsMet 
                  ? `Requirements met (${metCount}/${requirementChecks.length}) - ready to comment!`
                  : `Need any 1 of ${requirementChecks.length} requirements`;
              } else {
                // ALL mode: All requirements must be satisfied (default behavior)
                requirementsMet = requirementChecks.every(met => met === true);
                const metCount = requirementChecks.filter(met => met === true).length;
                statusMessage = requirementsMet
                  ? 'All requirements met - ready to comment!'
                  : `Need all requirements (${metCount}/${requirementChecks.length} completed)`;
              }
              
              if (requirementsMet) {
                return (
                  <div className="flex items-center text-emerald-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {statusMessage}
                  </div>
                );
              } else {
                return (
                  <div className="flex items-center text-red-600">
                    <XCircle className="h-3 w-3 mr-1" />
                    {statusMessage}
                  </div>
                );
              }
            })()}
          </div>
        )}

        {/* Connection Action */}
        {!userStatus.connected && (
          <div className="pt-3 border-t">
            <Button
              onClick={onConnect}
              disabled={disabled}
              className="w-full"
              size="sm"
            >
              <Wallet className="h-4 w-4 mr-2" />
              Connect Ethereum Wallet
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { useUniversalProfile, UniversalProfileProvider } from '@/contexts/UniversalProfileContext';
import { 
  Wallet, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2, 
  Shield,
  Coins,
  Users,
  UserCheck,
  UserX
} from 'lucide-react';
import { ethers } from 'ethers';
import { PostSettings, SettingsUtils } from '@/types/settings';
import { getUPSocialProfile, UPSocialProfile } from '@/lib/upProfile';
import { lsp26Registry } from '@/lib/lsp26';

interface InlineUPConnectionProps {
  postSettings?: PostSettings;
  className?: string;
}

// Internal component that uses UP context (must be inside UniversalProfileProvider)
const InlineUPConnectionContent: React.FC<InlineUPConnectionProps> = ({ 
  postSettings,
  className = '' 
}) => {
  // 🚀 PERFECT PATTERN: Direct UP context usage (like tipping modal)
  const {
    upAddress,
    isConnecting,
    connect,
    disconnect,
    getLyxBalance,
    getTokenBalances,
  } = useUniversalProfile();
  const isConnected = !!upAddress;

  // 🚀 SIMPLIFIED STATE: Only essential states
  const [verificationData, setVerificationData] = useState<{
    lyxBalance: string | null;
    tokenBalances: Record<string, {
      balance: string;
      formattedBalance: string;
      decimals?: number;
      name?: string;
      symbol?: string;
      meetsRequirement?: boolean;
    }>;
    followerStatus: Record<string, boolean>;
    socialProfiles: Record<string, UPSocialProfile>;
    isLoading: boolean;
  }>({
    lyxBalance: null,
    tokenBalances: {},
    followerStatus: {},
    socialProfiles: {},
    isLoading: false
  });

  // Get gating requirements
  const hasGating = postSettings ? SettingsUtils.hasUPGating(postSettings) : false;
  const requirements = hasGating && postSettings ? SettingsUtils.getUPGatingRequirements(postSettings) : null;

  // 🚀 CLEAN CONNECTION LOGIC: Like tipping modal
  const handleConnect = useCallback(async (event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    try {
      await connect();
    } catch (error) {
      console.error('[InlineUPConnection] Connection failed:', error);
    }
  }, [connect]);

  const handleDisconnect = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    disconnect();
  }, [disconnect]);

  // 🚀 SIMPLIFIED VERIFICATION: Single useEffect, no infinite loops
  useEffect(() => {
    if (!isConnected || !requirements) {
      setVerificationData(prev => ({ ...prev, isLoading: false }));
      return;
    }

    const verifyRequirements = async () => {
      setVerificationData(prev => ({ ...prev, isLoading: true }));
      
      try {
                 const newData = {
           lyxBalance: null as string | null,
           tokenBalances: {} as Record<string, {
             balance: string;
             formattedBalance: string;
             decimals?: number;
             name?: string;
             symbol?: string;
             meetsRequirement?: boolean;
           }>,
           followerStatus: {} as Record<string, boolean>,
           socialProfiles: {} as Record<string, UPSocialProfile>,
           isLoading: false
         };

        // Check LYX balance
        if (requirements.minLyxBalance) {
          try {
            const balance = await getLyxBalance();
            const formatted = ethers.utils.formatEther(balance);
            newData.lyxBalance = parseFloat(formatted).toFixed(4);
          } catch (error) {
            console.error('Failed to load LYX balance:', error);
          }
        }

        // Check token balances
        if (requirements.requiredTokens) {
          for (const tokenReq of requirements.requiredTokens) {
            const contractAddress = tokenReq.contractAddress.toLowerCase();
            
            try {
                             // Handle LSP8 specific token ID verification
               if (tokenReq.tokenType === 'LSP8' && tokenReq.tokenId && upAddress) {
                 if (!window.lukso) {
                   throw new Error('Universal Profile extension not available');
                 }
                 const provider = new ethers.providers.Web3Provider(window.lukso);
                const contract = new ethers.Contract(tokenReq.contractAddress, [
                  'function tokenOwnerOf(bytes32) view returns (address)'
                ], provider);

                const tokenIdBytes32 = ethers.utils.hexZeroPad(
                  typeof tokenReq.tokenId === 'string' && tokenReq.tokenId.startsWith('0x')
                    ? tokenReq.tokenId
                    : ethers.BigNumber.from(tokenReq.tokenId).toHexString(),
                  32
                );

                const owner = await contract.tokenOwnerOf(tokenIdBytes32);
                const ownsSpecificToken = owner.toLowerCase() === upAddress.toLowerCase();
                
                // 🎯 FIX: Use same tokenKey logic that RichRequirementsDisplay uses for retrieval
                const tokenKey = `${tokenReq.contractAddress}-${tokenReq.tokenId}`;
                console.log(`[InlineUPConnection] 🔧 Storing LSP8 token data with key: ${tokenKey}, owns: ${ownsSpecificToken}`);
                
                newData.tokenBalances[tokenKey] = {
                  balance: ownsSpecificToken ? '1' : '0',
                  formattedBalance: ownsSpecificToken ? '1' : '0',
                  name: tokenReq.name,
                  symbol: tokenReq.symbol,
                  meetsRequirement: ownsSpecificToken
                };
              } else {
                // Regular token balance check
                const balances = await getTokenBalances([tokenReq.contractAddress]);
                const tokenData = balances[0];
                
                // Note: The context does not fetch real-time balances for this component.
                // This check is metadata-only for now. A more complete implementation
                // would require a separate balance-fetching mechanism here.
                newData.tokenBalances[contractAddress] = {
                  balance: '0',
                  formattedBalance: '(Preview)',
                  decimals: tokenData.decimals,
                  name: tokenData.name,
                  symbol: tokenData.symbol,
                  meetsRequirement: false
                };
              }
            } catch (error) {
              console.error(`Failed to verify token ${tokenReq.symbol}:`, error);
              newData.tokenBalances[contractAddress] = {
                balance: '0',
                formattedBalance: '0',
                meetsRequirement: false
              };
            }
          }
        }

        // Check follower requirements
        if (requirements.followerRequirements) {
          for (const followerReq of requirements.followerRequirements) {
            const reqKey = `${followerReq.type}-${followerReq.value}`;
            
            try {
              let status = false;
              
              // Self-follow auto-pass check
              if (upAddress && followerReq.value.toLowerCase() === upAddress.toLowerCase()) {
                status = true;
              } else {
                switch (followerReq.type) {
                  case 'minimum_followers':
                    const userFollowerCount = await lsp26Registry.getFollowerCount(upAddress);
                    const requiredCount = parseInt(followerReq.value);
                    status = userFollowerCount >= requiredCount;
                    break;
                  case 'followed_by':
                    status = await lsp26Registry.isFollowing(followerReq.value, upAddress);
                    break;
                  case 'following':
                    status = await lsp26Registry.isFollowing(upAddress, followerReq.value);
                    break;
                }
              }
              
              newData.followerStatus[reqKey] = status;
              
              // Load social profile for display
              if (followerReq.type !== 'minimum_followers') {
                try {
                  const profile = await getUPSocialProfile(followerReq.value);
                  newData.socialProfiles[followerReq.value] = profile;
                } catch {
                  // Create fallback profile
                  newData.socialProfiles[followerReq.value] = {
                    address: followerReq.value,
                    displayName: `${followerReq.value.slice(0, 6)}...${followerReq.value.slice(-4)}`,
                    username: `@${followerReq.value.slice(2, 6)}${followerReq.value.slice(-4)}.lukso`,
                    isVerified: false,
                    lastFetched: new Date()
                  };
                }
              }
            } catch (error) {
              console.error(`Failed to verify follower requirement ${reqKey}:`, error);
              newData.followerStatus[reqKey] = false;
            }
          }
        }

        // Load connected user's social profile
        if (upAddress) {
          try {
            const userProfile = await getUPSocialProfile(upAddress);
            newData.socialProfiles[upAddress] = userProfile;
          } catch {
            // Fallback profile
            newData.socialProfiles[upAddress] = {
              address: upAddress,
              displayName: `${upAddress.slice(0, 6)}...${upAddress.slice(-4)}`,
              username: `@${upAddress.slice(2, 6)}${upAddress.slice(-4)}.lukso`,
              isVerified: false,
              lastFetched: new Date()
            };
          }
        }

        setVerificationData(newData);
      } catch (error) {
        console.error('Verification failed:', error);
        setVerificationData(prev => ({ ...prev, isLoading: false }));
      }
    };

    verifyRequirements();
  }, [isConnected, requirements, upAddress, getLyxBalance, getTokenBalances]);

  // Helper functions
  const formatAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance: string): string => {
    const num = parseFloat(balance);
    return num < 0.001 ? '< 0.001' : num.toFixed(3);
  };

  // Check if LYX requirement is met
  const meetsLyxRequirement = React.useMemo(() => {
    if (!requirements?.minLyxBalance || !verificationData.lyxBalance) return null;
    try {
      const userBalance = ethers.utils.parseEther(verificationData.lyxBalance);
      const requiredBalance = ethers.BigNumber.from(requirements.minLyxBalance);
      return userBalance.gte(requiredBalance);
    } catch {
      return null;
    }
  }, [verificationData.lyxBalance, requirements?.minLyxBalance]);

  // Don't render anything if no gating
  if (!hasGating || !requirements) {
    return null;
  }

  // Show the UP interface
  return (
    <Card className={`border-2 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center text-sm">
              <Shield className="h-4 w-4 mr-2" />
              Universal Profile Required
            </CardTitle>
            <CardDescription className="text-xs">
              This post requires verification to comment
            </CardDescription>
          </div>
          
          {/* Connected Profile Status Bar */}
          {isConnected && upAddress && (
            <div className="flex items-center space-x-2">
              <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                {/* Profile Picture */}
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                  {verificationData.socialProfiles[upAddress]?.profileImage ? (
                    <img 
                      src={verificationData.socialProfiles[upAddress].profileImage} 
                      alt={verificationData.socialProfiles[upAddress].displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                      {(verificationData.socialProfiles[upAddress]?.displayName || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                {/* Name and Username */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                    {verificationData.socialProfiles[upAddress]?.displayName || formatAddress(upAddress)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {verificationData.socialProfiles[upAddress]?.username || formatAddress(upAddress)}
                  </div>
                </div>
                {/* Verification Badge */}
                {verificationData.socialProfiles[upAddress]?.isVerified && (
                  <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                    <CheckCircle className="w-3 h-3 text-white" />
                  </div>
                )}
                {/* Disconnect Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDisconnect}
                  className="h-auto p-1 opacity-60 hover:opacity-100 text-gray-500 hover:text-red-500"
                  title="Disconnect"
                >
                  <XCircle size={14} />
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Requirements Display */}
        {requirements && (
          <div className="space-y-1">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Requirements
            </h4>
            
            {/* LYX Balance Requirement */}
            {requirements.minLyxBalance && (
              <div className={`flex items-center justify-between p-3 rounded-lg border min-h-[60px] ${
                verificationData.isLoading ? 'bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 border-gray-200 dark:border-gray-700' :
                meetsLyxRequirement === true ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 border-green-200 dark:border-green-800' :
                meetsLyxRequirement === false ? 'bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/10 dark:to-rose-900/10 border-red-200 dark:border-red-800' :
                'bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/10 dark:to-yellow-900/10 border-amber-200 dark:border-amber-800'
              }`}>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Coins className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">LYX Balance</div>
                    <div className="text-xs text-muted-foreground">
                      Required: {ethers.utils.formatEther(requirements.minLyxBalance)} LYX
                      {verificationData.lyxBalance && ` • You have: ${formatBalance(verificationData.lyxBalance)} LYX`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  {verificationData.isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : meetsLyxRequirement !== null ? (
                    meetsLyxRequirement ? (
                      <CheckCircle className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                  )}
                </div>
              </div>
            )}
            
            {/* Token Requirements */}
            {requirements.requiredTokens && requirements.requiredTokens.map((tokenReq, index) => {
              // 🎯 FIX: Use same tokenKey logic for retrieval as storage
              const tokenKey = tokenReq.tokenType === 'LSP8' && tokenReq.tokenId 
                ? `${tokenReq.contractAddress}-${tokenReq.tokenId}` // Unique key for specific LSP8 tokens
                : tokenReq.contractAddress.toLowerCase(); // Standard key for LSP7 and LSP8 collection verification
              
              const tokenData = verificationData.tokenBalances[tokenKey];
              let displayAmount: string;
              
              if (tokenReq.tokenType === 'LSP7') {
                displayAmount = ethers.utils.formatUnits(tokenReq.minAmount || '0', tokenData?.decimals || 18);
              } else {
                displayAmount = tokenReq.minAmount || '1';
              }
              
              return (
                <div key={index} className={`flex items-center justify-between p-3 rounded-lg border min-h-[60px] ${
                  verificationData.isLoading ? 'bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 border-gray-200 dark:border-gray-700' :
                  tokenData?.meetsRequirement === true ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 border-green-200 dark:border-green-800' :
                  tokenData?.meetsRequirement === false ? 'bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/10 dark:to-rose-900/10 border-red-200 dark:border-red-800' :
                  'bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/10 dark:to-yellow-900/10 border-amber-200 dark:border-amber-800'
                }`}>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Coins className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="font-medium text-sm flex items-center space-x-2">
                        <span>{tokenData?.symbol || tokenReq.symbol || tokenReq.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {tokenReq.tokenType}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Required: {displayAmount} {tokenData?.symbol || tokenReq.symbol || 'tokens'}
                        {tokenData && ` • You have: ${parseFloat(tokenData.formattedBalance).toFixed(4)} ${tokenData.symbol}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {verificationData.isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : tokenData?.meetsRequirement !== undefined ? (
                      tokenData.meetsRequirement ? (
                        <CheckCircle className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                    )}
                  </div>
                </div>
              );
            })}

            {/* Follower Requirements */}
            {requirements.followerRequirements && requirements.followerRequirements.map((followerReq, index) => {
              const reqKey = `${followerReq.type}-${followerReq.value}`;
              const reqStatus = verificationData.followerStatus[reqKey];
              
              if (followerReq.type === 'minimum_followers') {
                return (
                  <div key={index} className={`flex items-center justify-between p-3 rounded-lg border min-h-[60px] ${
                    verificationData.isLoading ? 'bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 border-gray-200 dark:border-gray-700' :
                    reqStatus === true ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 border-green-200 dark:border-green-800' :
                    reqStatus === false ? 'bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/10 dark:to-rose-900/10 border-red-200 dark:border-red-800' :
                    'bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/10 dark:to-yellow-900/10 border-amber-200 dark:border-amber-800'
                  }`}>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">Minimum Followers</div>
                        <div className="text-xs text-muted-foreground">
                          Required: {followerReq.value} followers
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      {verificationData.isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      ) : reqStatus !== undefined ? (
                        reqStatus ? (
                          <CheckCircle className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                      )}
                    </div>
                  </div>
                );
              } else {
                // Address-based requirement with social profile
                const socialProfile = verificationData.socialProfiles[followerReq.value];
                const iconClass = followerReq.type === 'followed_by'
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-blue-600 dark:text-blue-400';
                
                return (
                  <div key={index} className={`p-3 rounded-lg border min-h-[80px] ${
                    verificationData.isLoading ? 'bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 border-gray-200 dark:border-gray-700' :
                    reqStatus === true ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 border-green-200 dark:border-green-800' :
                    reqStatus === false ? 'bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/10 dark:to-rose-900/10 border-red-200 dark:border-red-800' :
                    'bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/10 dark:to-yellow-900/10 border-amber-200 dark:border-amber-800'
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
                          ) : (
                            <div className="text-xs text-muted-foreground font-mono">
                              {followerReq.value.slice(0, 6)}...{followerReq.value.slice(-4)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center ml-3">
                        {verificationData.isLoading ? (
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        ) : reqStatus !== undefined ? (
                          reqStatus ? (
                            <CheckCircle className="h-5 w-5 text-emerald-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-amber-500" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              }
            })}
          </div>
        )}

        {/* Connection Status & Actions */}
        {!isConnected ? (
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              Connect your Universal Profile to verify ownership and comment.
            </div>
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full"
              size="sm"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Wallet className="mr-2 h-3 w-3" />
                  Connect Universal Profile
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Connection Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {isConnected ? (
                  <CheckCircle className="h-3 w-3 text-emerald-500" />
                ) : (
                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                )}
                <span className="text-xs font-medium">
                  {isConnected ? 'Connected' : 'Wrong Network'}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleDisconnect} className="h-6 px-2 text-xs">
                Disconnect
              </Button>
            </div>
            
            {/* Verification Status */}
            {isConnected && (
              <div className="text-xs">
                {(() => {
                  if (verificationData.isLoading) {
                    return (
                      <div className="flex items-center text-muted-foreground">
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Checking requirements...
                      </div>
                    );
                  }
                  
                  // Check all requirements
                  const lyxMet = !requirements?.minLyxBalance || meetsLyxRequirement === true;
                  const tokensMet = !requirements?.requiredTokens || 
                    requirements.requiredTokens.every(req => {
                      const tokenData = verificationData.tokenBalances[req.contractAddress.toLowerCase()];
                      return tokenData?.meetsRequirement === true;
                    });
                  const followersMet = !requirements?.followerRequirements ||
                    requirements.followerRequirements.every(req => {
                      const reqKey = `${req.type}-${req.value}`;
                      return verificationData.followerStatus[reqKey] === true;
                    });
                  
                  if (lyxMet && tokensMet && followersMet) {
                    return (
                      <div className="flex items-center text-emerald-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        All requirements met - ready to comment!
                      </div>
                    );
                  }
                  
                  return (
                    <div className="flex items-center text-red-600">
                      <XCircle className="h-3 w-3 mr-1" />
                      Some requirements not met
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// 🚀 PERFECT PATTERN: Main component wrapper that provides UP context (like tipping modal)
export const InlineUPConnection: React.FC<InlineUPConnectionProps> = (props) => {
  return (
    <UniversalProfileProvider>
      <InlineUPConnectionContent {...props} />
    </UniversalProfileProvider>
  );
}; 
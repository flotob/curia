'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { useUniversalProfile } from '@/contexts/UniversalProfileContext';
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
import { getUPDisplayName, getUPSocialProfile, UPSocialProfile } from '@/lib/upProfile';

interface InlineUPConnectionProps {
  postSettings?: PostSettings;
  className?: string;
}

export const InlineUPConnection: React.FC<InlineUPConnectionProps> = ({ 
  postSettings,
  className = '' 
}) => {
  const {
    isConnected,
    upAddress,
    isConnecting,
    connectionError,
    isCorrectChain,
    disconnect,
    switchToLukso,
    getLyxBalance,
    checkTokenBalance,
    connect,
    getFollowerCount,
    isFollowedBy,
    isFollowing
  } = useUniversalProfile();

  const [lyxBalance, setLyxBalance] = React.useState<string | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = React.useState(false);

  
  // Token balance states
  const [tokenBalances, setTokenBalances] = React.useState<Record<string, {
    balance: string;
    formattedBalance: string;
    decimals?: number;
    name?: string;
    symbol?: string;
    isLoading: boolean;
    error?: string;
    meetsRequirement?: boolean;
  }>>({});
  const [isLoadingTokens, setIsLoadingTokens] = React.useState(false);

  // Follower verification states
  const [followerData, setFollowerData] = React.useState<{
    userFollowerCount?: number;
    followerRequirements: Record<string, {
      type: 'minimum_followers' | 'followed_by' | 'following';
      value: string;
      description?: string;
      isLoading: boolean;
      status?: boolean;
      error?: string;
    }>;
    isLoadingFollowers: boolean;
  }>({
    followerRequirements: {},
    isLoadingFollowers: false
  });

  // UP profile names for follower requirements (address -> display name)
  const [upProfileNames, setUpProfileNames] = React.useState<Record<string, string>>({});
  
  // Social profiles for follower requirements (address -> social profile)
  const [socialProfiles, setSocialProfiles] = React.useState<Record<string, UPSocialProfile>>({});
  const [isLoadingSocialProfiles, setIsLoadingSocialProfiles] = React.useState(false);

  // Get gating requirements
  const hasGating = postSettings ? SettingsUtils.hasUPGating(postSettings) : false;
  const requirements = hasGating && postSettings ? SettingsUtils.getUPGatingRequirements(postSettings) : null;

  // Load LYX balance when connected and on correct chain (removed getLyxBalance from deps to prevent infinite loop)
  React.useEffect(() => {
    if (isConnected && isCorrectChain && requirements?.minLyxBalance) {
      setIsLoadingBalance(true);
      
      getLyxBalance()
        .then((balance: string) => {
          const formatted = ethers.utils.formatEther(balance);
          setLyxBalance(parseFloat(formatted).toFixed(4));
        })
        .catch((error: unknown) => {
          console.error('Failed to load LYX balance:', error);
          setLyxBalance(null);
        })
        .finally(() => setIsLoadingBalance(false));
    } else {
      setLyxBalance(null);
    }
  }, [isConnected, isCorrectChain, requirements?.minLyxBalance]); // Removed getLyxBalance to prevent infinite loop

  // Load token balances when connected and on correct chain (removed checkTokenBalance from deps to prevent infinite loop)
  React.useEffect(() => {
    if (isConnected && isCorrectChain && requirements?.requiredTokens && requirements.requiredTokens.length > 0) {
      setIsLoadingTokens(true);
      
      const loadTokenBalances = async () => {
        const newTokenBalances: typeof tokenBalances = {};
        
        for (const tokenReq of requirements.requiredTokens || []) {
          const contractAddress = tokenReq.contractAddress.toLowerCase();
          
          try {
            // Set loading state for this token
            newTokenBalances[contractAddress] = {
              balance: '0',
              formattedBalance: '0',
              isLoading: true
            };
            setTokenBalances(prev => ({ ...prev, ...newTokenBalances }));
            
            // 🎯 LSP8 TOKEN ID FIX: Handle specific token ID verification
            if (tokenReq.tokenType === 'LSP8' && tokenReq.tokenId) {
              console.log(`[Inline-UP-LSP8] ✅ Starting specific token ID verification: ${tokenReq.tokenId}`);
              
              try {
                // Use UniversalProfile context for token ID verification
                const tokenData = await checkTokenBalance(tokenReq.contractAddress, tokenReq.tokenType);
                
                // For specific token ID, we need to check tokenOwnerOf instead of just balance
                if (upAddress) {
                  const provider = window.lukso;
                  if (provider) {
                    // Manual check for token ownership using tokenOwnerOf
                    const contract = new ethers.Contract(tokenReq.contractAddress, [
                      'function tokenOwnerOf(bytes32) view returns (address)'
                    ], new ethers.providers.Web3Provider(provider));

                    // ✅ Use ethers utilities instead of manual padding (research recommendation)
                    const tokenIdBytes32 = ethers.utils.hexZeroPad(
                      typeof tokenReq.tokenId === 'string' && tokenReq.tokenId.startsWith('0x')
                        ? tokenReq.tokenId
                        : ethers.BigNumber.from(tokenReq.tokenId).toHexString(),
                      32
                    );

                    console.log(`[Inline-UP-LSP8] Token ID conversion: "${tokenReq.tokenId}" -> "${tokenIdBytes32}"`);
                    console.log(`[Inline-UP-LSP8] Calling tokenOwnerOf on contract: ${tokenReq.contractAddress}`);

                    const owner = await contract.tokenOwnerOf(tokenIdBytes32);
                    const ownsSpecificToken = owner.toLowerCase() === upAddress.toLowerCase();
                    
                    console.log(`[Inline-UP-LSP8] TokenOwnerOf result: owner="${owner}", user="${upAddress}", owns=${ownsSpecificToken}`);
                    
                    newTokenBalances[contractAddress] = {
                      balance: ownsSpecificToken ? '1' : '0',
                      formattedBalance: ownsSpecificToken ? '1' : '0',
                      decimals: undefined,
                      name: tokenData.name || tokenReq.name,
                      symbol: tokenData.symbol || tokenReq.symbol,
                      isLoading: false,
                      meetsRequirement: ownsSpecificToken
                    };

                    if (ownsSpecificToken) {
                      console.log(`[Inline-UP-LSP8] ✅ User owns specific LSP8 token ID ${tokenReq.tokenId}`);
                    } else {
                      console.log(`[Inline-UP-LSP8] ❌ User does NOT own specific LSP8 token ID ${tokenReq.tokenId}`);
                    }
                  } else {
                    throw new Error('Universal Profile provider not available');
                  }
                } else {
                  throw new Error('No UP address available');
                }
              } catch (tokenIdError) {
                console.error(`[Inline-UP-LSP8] ❌ Token ID verification failed:`, tokenIdError);
                newTokenBalances[contractAddress] = {
                  balance: '0',
                  formattedBalance: '0',
                  isLoading: false,
                  error: 'Token ID verification failed',
                  meetsRequirement: false
                };
              }
            } else {
              // Collection ownership or LSP7 token verification (existing logic)
              const tokenData = await checkTokenBalance(tokenReq.contractAddress, tokenReq.tokenType);
              
              // Check if requirement is met
              const userBalance = ethers.BigNumber.from(tokenData.balance);
              
              // Handle undefined minAmount for LSP8 tokens (default to "1")
              let requiredAmount = tokenReq.minAmount;
              if (tokenReq.tokenType === 'LSP8' && !requiredAmount) {
                requiredAmount = '1';
              }
              
              const requiredBalance = ethers.BigNumber.from(requiredAmount || '0');
              const meetsRequirement = userBalance.gte(requiredBalance);
              
              newTokenBalances[contractAddress] = {
                balance: tokenData.balance,
                formattedBalance: tokenData.formattedBalance || '0',
                decimals: tokenData.decimals,
                name: tokenData.name || tokenReq.name,
                symbol: tokenData.symbol || tokenReq.symbol,
                isLoading: false,
                meetsRequirement
              };
            }
            
          } catch (error) {
            console.error(`Failed to load balance for ${tokenReq.symbol}:`, error);
            newTokenBalances[contractAddress] = {
              balance: '0',
              formattedBalance: '0',
              isLoading: false,
              error: 'Unable to load',
              meetsRequirement: false
            };
          }
          
          // Update state for this token
          setTokenBalances(prev => ({ ...prev, ...newTokenBalances }));
        }
        
        setIsLoadingTokens(false);
      };
      
      loadTokenBalances();
    } else {
      setTokenBalances({});
      setIsLoadingTokens(false);
    }
  }, [isConnected, isCorrectChain, requirements?.requiredTokens, upAddress]); // Removed checkTokenBalance to prevent infinite loop

  // Load follower data when connected and on correct chain (removed functions from deps to prevent infinite loop)
  React.useEffect(() => {
    if (isConnected && isCorrectChain && requirements?.followerRequirements && requirements.followerRequirements.length > 0) {
      setFollowerData(prev => ({ ...prev, isLoadingFollowers: true }));
      
      const loadFollowerData = async () => {
        const newFollowerRequirements: typeof followerData.followerRequirements = {};
        let userFollowerCount: number | undefined;
        
        try {
          // Load user's own follower count for display
          userFollowerCount = await getFollowerCount();
        } catch (error) {
          console.error('Failed to load user follower count:', error);
        }
        
        // Check each follower requirement
        for (const followerReq of requirements.followerRequirements || []) {
          const reqKey = `${followerReq.type}-${followerReq.value}`;
          
          try {
            // Set loading state for this requirement
            newFollowerRequirements[reqKey] = {
              type: followerReq.type,
              value: followerReq.value,
              description: followerReq.description,
              isLoading: true
            };
            setFollowerData(prev => ({ 
              ...prev, 
              followerRequirements: { ...prev.followerRequirements, ...newFollowerRequirements }
            }));
            
            let status = false;
            
            // 🎯 SELF-FOLLOW AUTO-PASS: Check if user is the required person
            if (upAddress && followerReq.value.toLowerCase() === upAddress.toLowerCase()) {
              console.log(`[InlineUPConnection] ✅ Auto-pass: User IS the required person (${upAddress}) for ${followerReq.type}`);
              status = true;
            } else {
              // Normal verification logic
              switch (followerReq.type) {
                case 'minimum_followers':
                  const requiredCount = parseInt(followerReq.value);
                  status = (userFollowerCount || 0) >= requiredCount;
                  break;
                  
                case 'followed_by':
                  status = await isFollowedBy(followerReq.value);
                  break;
                  
                case 'following':
                  status = await isFollowing(followerReq.value);
                  break;
              }
            }
            
            newFollowerRequirements[reqKey] = {
              type: followerReq.type,
              value: followerReq.value,
              description: followerReq.description,
              isLoading: false,
              status
            };
            
          } catch (error) {
            console.error(`Failed to verify follower requirement ${reqKey}:`, error);
            newFollowerRequirements[reqKey] = {
              type: followerReq.type,
              value: followerReq.value,
              description: followerReq.description,
              isLoading: false,
              error: 'Verification failed'
            };
          }
          
          // Update state for this requirement
          setFollowerData(prev => ({ 
            ...prev, 
            userFollowerCount,
            followerRequirements: { ...prev.followerRequirements, ...newFollowerRequirements }
          }));
        }
        
        setFollowerData(prev => ({ ...prev, isLoadingFollowers: false }));
      };
      
      loadFollowerData();
    } else {
      setFollowerData({
        followerRequirements: {},
        isLoadingFollowers: false
      });
    }
  }, [isConnected, isCorrectChain, requirements?.followerRequirements, upAddress]); // Removed all UP functions to prevent infinite loop

  // Load UP profile names for follower requirements
  const fetchUPNames = React.useCallback(async (addresses: string[]) => {
    if (addresses.length === 0) return;
    
    console.log(`[InlineUPConnection] Fetching UP names for ${addresses.length} addresses`);
    
    const namePromises = addresses.map(async (address) => {
      try {
        const displayName = await getUPDisplayName(address);
        return { address, displayName };
      } catch (error) {
        console.error(`Failed to fetch UP name for ${address}:`, error);
        return { address, displayName: `${address.slice(0, 6)}...${address.slice(-4)}` };
      }
    });

    const nameResults = await Promise.all(namePromises);
    const newNames: Record<string, string> = {};
    
    nameResults.forEach(({ address, displayName }) => {
      newNames[address] = displayName;
    });

    setUpProfileNames(prev => ({ ...prev, ...newNames }));
  }, []);

  // Load social profiles for follower requirements
  const fetchSocialProfiles = React.useCallback(async (addresses: string[]) => {
    if (addresses.length === 0) return;
    
    setIsLoadingSocialProfiles(true);
    try {
      console.log(`[InlineUPConnection] Fetching social profiles for ${addresses.length} addresses`);
      
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

      setSocialProfiles(prev => ({ ...prev, ...newProfiles }));
    } catch (error) {
      console.error('[InlineUPConnection] Error fetching social profiles:', error);
    } finally {
      setIsLoadingSocialProfiles(false);
    }
  }, []);

  React.useEffect(() => {
    if (requirements?.followerRequirements && requirements.followerRequirements.length > 0) {
      const addressesToFetch = requirements.followerRequirements
        .filter(req => req.type !== 'minimum_followers') // Only fetch for address-based requirements
        .map(req => req.value)
        .filter(address => !upProfileNames[address]); // Don't refetch already loaded names

      fetchUPNames(addressesToFetch);
    }
  }, [requirements?.followerRequirements, fetchUPNames, upProfileNames]);

  // Fetch social profiles for follower requirements + connected user
  React.useEffect(() => {
    const addressesToFetch: string[] = [];
    
    // Add follower requirement addresses
    if (requirements?.followerRequirements && requirements.followerRequirements.length > 0) {
      const followerAddresses = requirements.followerRequirements
        .filter(req => req.type !== 'minimum_followers') // Only fetch for address-based requirements
        .map(req => req.value)
        .filter(address => !socialProfiles[address]); // Don't refetch already loaded profiles
      
      addressesToFetch.push(...followerAddresses);
    }
    
    // Add connected user address
    if (upAddress && !socialProfiles[upAddress]) {
      addressesToFetch.push(upAddress);
    }
    
    // Fetch all needed profiles
    if (addressesToFetch.length > 0) {
      console.log(`[InlineUPConnection] Fetching social profiles for ${addressesToFetch.length} addresses:`, addressesToFetch);
      fetchSocialProfiles(addressesToFetch);
    }
  }, [requirements?.followerRequirements, upAddress, fetchSocialProfiles, socialProfiles]);

  // Handle connection request
  const handleConnect = React.useCallback(async (event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation(); // Prevent event bubbling that collapses comment section
      event.preventDefault();
    }
    console.log('[InlineUPConnection] Attempting wallet connection');
    try {
      await connect();
    } catch (error) {
      console.error('[InlineUPConnection] Connection failed:', error);
    }
  }, [connect]);

  // Handle disconnect with event prevention
  const handleDisconnect = React.useCallback((event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent event bubbling
    event.preventDefault();
    disconnect();
  }, [disconnect]);

  // Handle network switch with event prevention  
  const handleSwitchNetwork = React.useCallback((event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent event bubbling
    event.preventDefault();
    switchToLukso();
  }, [switchToLukso]);

  // Check if we're on mobile device
  const [isMobile, setIsMobile] = React.useState(false);
  
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const formatAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance: string): string => {
    const num = parseFloat(balance);
    return num < 0.001 ? '< 0.001' : num.toFixed(3);
  };

  // Check if user meets LYX requirement
  const meetsLyxRequirement = React.useMemo(() => {
    if (!requirements?.minLyxBalance || !lyxBalance) return null;
    
    try {
      const userBalance = ethers.BigNumber.from(ethers.utils.parseEther(lyxBalance));
      const requiredBalance = ethers.BigNumber.from(requirements.minLyxBalance);
      return userBalance.gte(requiredBalance);
    } catch {
      return null;
    }
  }, [lyxBalance, requirements?.minLyxBalance]);

  // Don't render anything if no gating
  if (!hasGating || !requirements) {
    return null;
  }

  // Show the full UP interface
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
          <div className="flex items-center space-x-2">
            {(() => {
              const connectedProfile = upAddress ? socialProfiles[upAddress] : null;
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
                  {/* Disconnect Dropdown */}
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
              ) : (
                <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  {/* Loading or fallback */}
                  {isLoadingSocialProfiles ? (
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
                        {upAddress ? upAddress.charAt(2).toUpperCase() : '?'}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                          Universal Profile
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                          {formatAddress(upAddress!)}
                        </div>
                      </div>
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
                    </>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Unified Requirements Display */}
        {requirements && (
          <div className="space-y-1">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Requirements
            </h4>
            
            {/* LYX Balance Requirement */}
            {requirements.minLyxBalance && (
              <div className={`flex items-center justify-between p-3 rounded-lg border min-h-[60px] ${
                isLoadingBalance ? 'bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 border-gray-200 dark:border-gray-700' :
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
                      {lyxBalance && ` • You have: ${formatBalance(lyxBalance)} LYX`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  {isLoadingBalance ? (
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
            {requirements.requiredTokens && requirements.requiredTokens.length > 0 && (
              <>
                {requirements.requiredTokens.map((tokenReq, index) => {
                  const contractAddress = tokenReq.contractAddress.toLowerCase();
                  const tokenData = tokenBalances[contractAddress];
                  let displayAmount: string;
                  
                  if (tokenReq.tokenType === 'LSP7') {
                    displayAmount = ethers.utils.formatUnits(tokenReq.minAmount || '0', tokenData?.decimals || 18);
                  } else {
                    displayAmount = tokenReq.minAmount || '1';
                  }
                  
                  return (
                    <div key={index} className={`flex items-center justify-between p-3 rounded-lg border min-h-[60px] ${
                      tokenData?.isLoading ? 'bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 border-gray-200 dark:border-gray-700' :
                      tokenData?.error ? 'bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/10 dark:to-rose-900/10 border-red-200 dark:border-red-800' :
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
                        {tokenData?.isLoading ? (
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        ) : tokenData?.error ? (
                          <XCircle className="h-5 w-5 text-red-500" />
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
              </>
            )}

            {/* Follower Requirements */}
            {requirements.followerRequirements && requirements.followerRequirements.length > 0 && (
              <>
                {requirements.followerRequirements.map((followerReq, index) => {
                  const reqKey = `${followerReq.type}-${followerReq.value}`;
                  const reqData = followerData.followerRequirements[reqKey];
                  
                  if (followerReq.type === 'minimum_followers') {
                    return (
                      <div key={index} className={`flex items-center justify-between p-3 rounded-lg border min-h-[60px] ${
                        reqData?.isLoading ? 'bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 border-gray-200 dark:border-gray-700' :
                        reqData?.error ? 'bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/10 dark:to-rose-900/10 border-red-200 dark:border-red-800' :
                        reqData?.status === true ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 border-green-200 dark:border-green-800' :
                        reqData?.status === false ? 'bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/10 dark:to-rose-900/10 border-red-200 dark:border-red-800' :
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
                              {followerData.userFollowerCount !== undefined && ` • You have: ${followerData.userFollowerCount} followers`}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          {reqData?.isLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          ) : reqData?.error ? (
                            <XCircle className="h-5 w-5 text-red-500" />
                          ) : reqData?.status !== undefined ? (
                            reqData.status ? (
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
                    const socialProfile = socialProfiles[followerReq.value];
                    const iconClass = followerReq.type === 'followed_by'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-blue-600 dark:text-blue-400';
                    
                    return (
                      <div key={index} className={`p-3 rounded-lg border min-h-[80px] ${
                        reqData?.isLoading ? 'bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 border-gray-200 dark:border-gray-700' :
                        reqData?.error ? 'bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/10 dark:to-rose-900/10 border-red-200 dark:border-red-800' :
                        reqData?.status === true ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 border-green-200 dark:border-green-800' :
                        reqData?.status === false ? 'bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/10 dark:to-rose-900/10 border-red-200 dark:border-red-800' :
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
                              {/* Social Profile Display - BIGGER IMAGES */}
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
                              ) : isLoadingSocialProfiles ? (
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
                            {reqData?.isLoading ? (
                              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            ) : reqData?.error ? (
                              <XCircle className="h-5 w-5 text-red-500" />
                            ) : reqData?.status !== undefined ? (
                              reqData.status ? (
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
              </>
            )}
          </div>
        )}

        {/* Connection Status & Actions */}
        {!isConnected ? (
          <div className="space-y-3">
            {isMobile ? (
              <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-3 w-3" />
                  <span className="font-medium">Desktop Required</span>
                </div>
                Universal Profile connection is currently only available on desktop devices. Please use a desktop browser to verify your token requirements and participate in this discussion.
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Connection Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {isCorrectChain ? (
                  <CheckCircle className="h-3 w-3 text-emerald-500" />
                ) : (
                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                )}
                <span className="text-xs font-medium">
                  {isCorrectChain ? 'Connected' : 'Wrong Network'}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleDisconnect} className="h-6 px-2 text-xs">
                Disconnect
              </Button>
            </div>

            
            {/* Network Switch Button */}
            {!isCorrectChain && (
              <Button 
                variant="outline" 
                onClick={handleSwitchNetwork} 
                className="w-full" 
                size="sm"
                disabled={isMobile}
              >
                Switch to LUKSO Network
              </Button>
            )}
            
            {/* Verification Status */}
            {isCorrectChain && (
              <div className="text-xs">
                {(() => {
                  // Check if all LYX requirements are met
                  const lyxMet = !requirements?.minLyxBalance || meetsLyxRequirement === true;
                  
                  // Check if all token requirements are met
                  const tokensMet = !requirements?.requiredTokens || 
                    requirements.requiredTokens.every(req => {
                      const tokenData = tokenBalances[req.contractAddress.toLowerCase()];
                      return tokenData?.meetsRequirement === true;
                    });
                  
                  // Check if still loading
                  const isLoading = (requirements?.minLyxBalance && meetsLyxRequirement === null) ||
                    isLoadingTokens ||
                    (requirements?.requiredTokens && requirements.requiredTokens.some(req => {
                      const tokenData = tokenBalances[req.contractAddress.toLowerCase()];
                      return tokenData?.isLoading === true;
                    }));
                  
                  if (isLoading) {
                    return (
                      <div className="flex items-center text-muted-foreground">
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Checking requirements...
                      </div>
                    );
                  }
                  
                  if (lyxMet && tokensMet) {
                    return (
                      <div className="flex items-center text-emerald-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        All requirements met - ready to comment!
                      </div>
                    );
                  }
                  
                  // Show specific error for what's missing
                  if (!lyxMet) {
                    return (
                      <div className="flex items-center text-red-600">
                        <XCircle className="h-3 w-3 mr-1" />
                        Insufficient LYX balance required
                      </div>
                    );
                  }
                  
                  if (!tokensMet) {
                    return (
                      <div className="flex items-center text-red-600">
                        <XCircle className="h-3 w-3 mr-1" />
                        Insufficient token balance required
                      </div>
                    );
                  }
                  
                  return null;
                })()}
              </div>
            )}
          </div>
        )}
        
        {/* Connection Error */}
        {connectionError && (
          <div className="flex items-center space-x-2 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded">
            <XCircle className="h-3 w-3 flex-shrink-0" />
            <span>{connectionError}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useConditionalUniversalProfile, useUPActivation } from '@/contexts/ConditionalUniversalProfileProvider';
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
import { getUPDisplayName } from '@/lib/upProfile';

interface InlineUPConnectionProps {
  postSettings?: PostSettings;
  className?: string;
}

export const InlineUPConnection: React.FC<InlineUPConnectionProps> = ({ 
  postSettings,
  className = '' 
}) => {
  const { activateUP, initializeConnection, hasUserTriggeredConnection } = useUPActivation();
  const {
    isInitialized,
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
  } = useConditionalUniversalProfile();

  const [lyxBalance, setLyxBalance] = React.useState<string | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = React.useState(false);
  const [balanceError, setBalanceError] = React.useState<string | null>(null);
  
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

  // Get gating requirements
  const hasGating = postSettings ? SettingsUtils.hasUPGating(postSettings) : false;
  const requirements = hasGating && postSettings ? SettingsUtils.getUPGatingRequirements(postSettings) : null;

  // Activate UP functionality when gating is detected (but don't initialize yet)
  React.useEffect(() => {
    if (hasGating) {
      console.log('[InlineUPConnection] Gating detected, marking UP as needed');
      activateUP();
    }
  }, [hasGating, activateUP]);

  // Load LYX balance when connected and on correct chain
  React.useEffect(() => {
    if (isConnected && isCorrectChain && requirements?.minLyxBalance) {
      setIsLoadingBalance(true);
      setBalanceError(null);
      
      getLyxBalance()
        .then((balance: string) => {
          const formatted = ethers.utils.formatEther(balance);
          setLyxBalance(parseFloat(formatted).toFixed(4));
        })
        .catch((error: unknown) => {
          console.error('Failed to load LYX balance:', error);
          setLyxBalance(null);
          setBalanceError('Unable to load balance');
        })
        .finally(() => setIsLoadingBalance(false));
    } else {
      setLyxBalance(null);
      setBalanceError(null);
    }
  }, [isConnected, isCorrectChain, getLyxBalance, requirements?.minLyxBalance]);

  // Load token balances when connected and on correct chain
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
            
            // Check token balance with proper decimals
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
  }, [isConnected, isCorrectChain, checkTokenBalance, requirements?.requiredTokens]);

  // Load follower data when connected and on correct chain
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
   }, [isConnected, isCorrectChain, getFollowerCount, isFollowedBy, isFollowing, requirements?.followerRequirements]); // eslint-disable-line react-hooks/exhaustive-deps

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

  React.useEffect(() => {
    if (requirements?.followerRequirements && requirements.followerRequirements.length > 0) {
      const addressesToFetch = requirements.followerRequirements
        .filter(req => req.type !== 'minimum_followers') // Only fetch for address-based requirements
        .map(req => req.value)
        .filter(address => !upProfileNames[address]); // Don't refetch already loaded names

      fetchUPNames(addressesToFetch);
    }
  }, [requirements?.followerRequirements, fetchUPNames, upProfileNames]);

  // Handle explicit connection request (triggers Web3-Onboard initialization)
  const handleConnectWallet = React.useCallback((event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation(); // Prevent event bubbling that collapses comment section
      event.preventDefault();
    }
    console.log('[InlineUPConnection] User requested wallet connection');
    initializeConnection();
  }, [initializeConnection]);
  
  // Handle actual wallet connection (after Web3-Onboard is initialized)
  const handleConnect = React.useCallback(async (event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation(); // Prevent event bubbling that collapses comment section
      event.preventDefault();
    }
    console.log('[InlineUPConnection] Attempting wallet connection via Web3-Onboard');
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

  // Auto-trigger connection once Web3-Onboard is initialized (seamless UX)
  React.useEffect(() => {
    if (hasUserTriggeredConnection && isInitialized && !isConnected && !isConnecting) {
      console.log('[InlineUPConnection] Web3-Onboard initialized, auto-triggering connection');
      handleConnect();
    }
  }, [hasUserTriggeredConnection, isInitialized, isConnected, isConnecting, handleConnect]);

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

  // Show requirements and connect button if UP hasn't been triggered yet
  if (!hasUserTriggeredConnection) {
    return (
      <div className={`border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
            Universal Profile Required
          </span>
        </div>
        
        <div className="space-y-2 mb-3">
          {requirements.minLyxBalance && (
            <div className="text-xs text-blue-700 dark:text-blue-300">
              • Minimum {ethers.utils.formatEther(requirements.minLyxBalance)} LYX required
            </div>
          )}
          
          {requirements.requiredTokens?.map((token, index) => (
            <div key={index} className="text-xs text-blue-700 dark:text-blue-300">
              • {token.name || token.symbol || 'Token'}: {
                token.tokenType === 'LSP8' 
                  ? `${token.minAmount || '1'} NFT(s)` 
                  : `${token.minAmount || '0'} tokens`
              }
            </div>
          ))}

          {requirements.followerRequirements?.map((follower, index) => {
            const upName = upProfileNames[follower.value] || `${follower.value.slice(0, 6)}...${follower.value.slice(-4)}`;
            return (
              <div key={index} className="text-xs text-blue-700 dark:text-blue-300">
                • {follower.description || (
                  follower.type === 'minimum_followers' ? `Minimum ${follower.value} followers` :
                  follower.type === 'followed_by' ? `Must be followed by ${upName}` :
                  `Must follow ${upName}`
                )}
              </div>
            );
          })}
        </div>
        
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
            <Button
              onClick={handleConnectWallet}
              className="w-full"
              size="sm"
            >
              <Wallet className="h-4 w-4 mr-2" />
              Connect Universal Profile
            </Button>
            
            <div className="text-xs text-blue-600 dark:text-blue-400 mt-2">
              Connect your Universal Profile to verify token requirements and participate in this discussion.
            </div>
          </>
        )}
      </div>
    );
  }

  // Show initializing/connecting state if triggered but not connected yet
  if (hasUserTriggeredConnection && (!isInitialized || (!isConnected && !connectionError))) {
    return (
      <div className={`border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <Loader2 className="h-4 w-4 text-amber-600 dark:text-amber-400 animate-spin" />
          <span className="text-sm font-medium text-amber-900 dark:text-amber-100">
            {!isInitialized ? 'Initializing Universal Profile' : 'Connecting to Wallet'}
          </span>
        </div>
        
        <div className="text-xs text-amber-700 dark:text-amber-300">
          {!isInitialized 
            ? 'Setting up Web3-Onboard connection interface...' 
            : 'Opening wallet connection dialog...'}
        </div>
      </div>
    );
  }

  // Once initialization is complete, show the full UP interface
  return (
    <Card className={`border-2 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-sm">
          <Shield className="h-4 w-4 mr-2" />
          Universal Profile Required
        </CardTitle>
        <CardDescription className="text-xs">
          This post requires verification to comment
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Requirements Display */}
        {requirements && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Requirements
            </h4>
            
            {requirements.minLyxBalance && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <Coins className="h-3 w-3 mr-1 text-amber-500" />
                  <span>LYX Balance</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-muted-foreground">
                    {ethers.utils.formatEther(requirements.minLyxBalance)} LYX
                  </span>
                  {meetsLyxRequirement !== null && (
                    meetsLyxRequirement ? (
                      <CheckCircle className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-500" />
                    )
                  )}
                </div>
              </div>
            )}
            
            {/* Token Requirements Display */}
            {requirements.requiredTokens && requirements.requiredTokens.length > 0 && (
              <div className="space-y-2">
                {requirements.requiredTokens.map((tokenReq, index) => {
                  const contractAddress = tokenReq.contractAddress.toLowerCase();
                  const tokenData = tokenBalances[contractAddress];
                  // Display required amount (LSP8 defaults to "1" if undefined)
                  let displayAmount: string;
                  if (tokenReq.tokenType === 'LSP7') {
                    displayAmount = ethers.utils.formatUnits(tokenReq.minAmount || '0', tokenData?.decimals || 18);
                  } else {
                    // LSP8: show NFT count, default to "1" if undefined
                    displayAmount = tokenReq.minAmount || '1';
                  }
                  
                  return (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center">
                        <Coins className="h-3 w-3 mr-1 text-blue-500" />
                        <span>{tokenData?.symbol || tokenReq.symbol || tokenReq.name}</span>
                        <span className="text-xs text-muted-foreground ml-1">
                          ({tokenReq.tokenType})
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-muted-foreground text-xs">
                          {displayAmount} {tokenData?.symbol || tokenReq.symbol || 'tokens'}
                        </span>
                        {tokenData?.isLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : tokenData?.error ? (
                          <XCircle className="h-3 w-3 text-red-500" />
                        ) : tokenData?.meetsRequirement !== undefined ? (
                          tokenData.meetsRequirement ? (
                            <CheckCircle className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-500" />
                          )
                        ) : (
                          <AlertTriangle className="h-3 w-3 text-amber-500" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Follower Requirements Display */}
            {requirements.followerRequirements && requirements.followerRequirements.length > 0 && (
              <div className="space-y-2">
                {requirements.followerRequirements.map((followerReq, index) => {
                  const reqKey = `${followerReq.type}-${followerReq.value}`;
                  const reqData = followerData.followerRequirements[reqKey];
                  
                  const getDisplayText = () => {
                    if (followerReq.description) return followerReq.description;
                    
                    const upName = upProfileNames[followerReq.value] || `${followerReq.value.slice(0, 6)}...${followerReq.value.slice(-4)}`;
                    
                    switch (followerReq.type) {
                      case 'minimum_followers':
                        return `${followerReq.value} Followers`;
                      case 'followed_by':
                        return `Followed by ${upName}`;
                      case 'following':
                        return `Following ${upName}`;
                      default:
                        return 'Follower Requirement';
                    }
                  };

                  const getIcon = () => {
                    switch (followerReq.type) {
                      case 'minimum_followers':
                        return <Users className="h-3 w-3 mr-1 text-purple-500" />;
                      case 'followed_by':
                        return <UserCheck className="h-3 w-3 mr-1 text-green-500" />;
                      case 'following':
                        return <UserX className="h-3 w-3 mr-1 text-blue-500" />;
                    }
                  };
                  
                  return (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center">
                        {getIcon()}
                        <span>{getDisplayText()}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        {followerReq.type === 'minimum_followers' && followerData.userFollowerCount !== undefined && (
                          <span className="text-muted-foreground text-xs">
                            ({followerData.userFollowerCount} followers)
                          </span>
                        )}
                        {reqData?.isLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : reqData?.error ? (
                          <XCircle className="h-3 w-3 text-red-500" />
                        ) : reqData?.status !== undefined ? (
                          reqData.status ? (
                            <CheckCircle className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-500" />
                          )
                        ) : (
                          <AlertTriangle className="h-3 w-3 text-amber-500" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
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
            
            {/* Profile Info */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Profile:</span>
                <Badge variant="outline" className="text-xs font-mono">
                  {formatAddress(upAddress!)}
                </Badge>
              </div>
              
              {/* LYX Balance Display */}
              {requirements?.minLyxBalance && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">LYX Balance:</span>
                  <div className="flex items-center space-x-1">
                    {isLoadingBalance ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : balanceError ? (
                      <span className="text-red-500">{balanceError}</span>
                    ) : lyxBalance ? (
                      <div className="flex items-center space-x-1">
                        <span className={`font-mono ${
                          meetsLyxRequirement === true ? 'text-emerald-600' : 
                          meetsLyxRequirement === false ? 'text-red-600' : 
                          'text-foreground'
                        }`}>
                          {formatBalance(lyxBalance)} LYX
                        </span>
                        {meetsLyxRequirement !== null && (
                          meetsLyxRequirement ? (
                            <CheckCircle className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-500" />
                          )
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Unable to load</span>
                    )}
                  </div>
                </div>
              )}
              
              {/* Token Balance Display */}
              {requirements?.requiredTokens && requirements.requiredTokens.map((tokenReq, index) => {
                const contractAddress = tokenReq.contractAddress.toLowerCase();
                const tokenData = tokenBalances[contractAddress];
                
                return (
                  <div key={index} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      {tokenData?.symbol || tokenReq.symbol || tokenReq.name}:
                    </span>
                    <div className="flex items-center space-x-1">
                      {tokenData?.isLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : tokenData?.error ? (
                        <span className="text-red-500">{tokenData.error}</span>
                      ) : tokenData ? (
                        <div className="flex items-center space-x-1">
                          <span className={`font-mono ${
                            tokenData.meetsRequirement === true ? 'text-emerald-600' : 
                            tokenData.meetsRequirement === false ? 'text-red-600' : 
                            'text-foreground'
                          }`}>
                            {parseFloat(tokenData.formattedBalance).toFixed(4)} {tokenData.symbol}
                          </span>
                          {tokenData.meetsRequirement !== undefined && (
                            tokenData.meetsRequirement ? (
                              <CheckCircle className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <XCircle className="h-3 w-3 text-red-500" />
                            )
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Unable to load</span>
                      )}
                    </div>
                  </div>
                );
              })}
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
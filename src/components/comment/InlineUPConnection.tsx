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
  Coins
} from 'lucide-react';
import { ethers } from 'ethers';
import { PostSettings, SettingsUtils } from '@/types/settings';

interface InlineUPConnectionProps {
  postSettings?: PostSettings;
  className?: string;
}

export const InlineUPConnection: React.FC<InlineUPConnectionProps> = ({ 
  postSettings,
  className = '' 
}) => {
  const { activateUP } = useUPActivation();
  const {
    isConnected,
    upAddress,
    isConnecting,
    connectionError,
    isCorrectChain,
    connect,
    disconnect,
    switchToLukso,
    getLyxBalance,
    checkTokenBalance
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

  // Get gating requirements
  const hasGating = postSettings ? SettingsUtils.hasUPGating(postSettings) : false;
  const requirements = hasGating && postSettings ? SettingsUtils.getUPGatingRequirements(postSettings) : null;

  // Activate UP functionality when gating is detected
  React.useEffect(() => {
    if (hasGating) {
      console.log('[InlineUPConnection] Gating detected, activating Universal Profile');
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

  const handleConnect = async () => {
    try {
      await connect();
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

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

  if (!hasGating) {
    return null; // Don't show anything if post isn't gated
  }

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
                {isCorrectChain ? (
                  <CheckCircle className="h-3 w-3 text-emerald-500" />
                ) : (
                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                )}
                <span className="text-xs font-medium">
                  {isCorrectChain ? 'Connected' : 'Wrong Network'}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={disconnect} className="h-6 px-2 text-xs">
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
                onClick={switchToLukso} 
                className="w-full" 
                size="sm"
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
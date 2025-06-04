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
    getLyxBalance
  } = useConditionalUniversalProfile();

  const [lyxBalance, setLyxBalance] = React.useState<string | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = React.useState(false);
  const [balanceError, setBalanceError] = React.useState<string | null>(null);

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
            
            {/* TODO: Add token requirements display in Phase 2 */}
            {requirements.requiredTokens && requirements.requiredTokens.length > 0 && (
              <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                Token verification coming soon
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
                {meetsLyxRequirement === true ? (
                  <div className="flex items-center text-emerald-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    All requirements met - ready to comment!
                  </div>
                ) : meetsLyxRequirement === false ? (
                  <div className="flex items-center text-red-600">
                    <XCircle className="h-3 w-3 mr-1" />
                    Insufficient LYX balance required
                  </div>
                ) : (
                  <div className="flex items-center text-muted-foreground">
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Checking requirements...
                  </div>
                )}
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
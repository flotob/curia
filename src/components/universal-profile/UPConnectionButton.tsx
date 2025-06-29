'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUniversalProfile } from '@/contexts/UniversalProfileContext';
import { Wallet, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { ethers } from 'ethers';

interface UPConnectionButtonProps {
  variant?: 'full' | 'compact';
  className?: string;
}

export const UPConnectionButton: React.FC<UPConnectionButtonProps> = ({ 
  variant = 'compact',
  className = '' 
}) => {
  const {
    upAddress,
    isConnecting,
    connect,
    disconnect,
    getLyxBalance,
  } = useUniversalProfile();

  const isConnected = !!upAddress;

  const [balance, setBalance] = useState<string | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = React.useState(false);

  // Load LYX balance when connected (removed getLyxBalance from deps to prevent infinite loop)
  React.useEffect(() => {
    if (isConnected && upAddress) {
      setIsLoadingBalance(true);
      getLyxBalance()
        .then(balance => {
          const formatted = ethers.utils.formatEther(balance);
          setBalance(parseFloat(formatted).toFixed(4));
        })
        .catch(error => {
          console.error('Failed to load LYX balance:', error);
          setBalance(null);
        })
        .finally(() => setIsLoadingBalance(false));
    } else {
      setBalance(null);
    }
  }, [isConnected, upAddress]);

  const handleConnect = async (event?: React.MouseEvent) => {
    // Prevent modal closing when clicking wallet connection buttons
    if (event) {
      event.stopPropagation();
    }
    
    try {
      await connect();
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  const formatAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (variant === 'compact') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {!isConnected ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleConnect}
            disabled={isConnecting}
            className="flex items-center space-x-2"
          >
            {isConnecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wallet className="h-4 w-4" />
            )}
            <span>{isConnecting ? 'Connecting...' : 'Connect UP'}</span>
          </Button>
        ) : (
          <div className="flex items-center space-x-2">
            <Badge variant={isConnected ? 'default' : 'secondary'} className="flex items-center space-x-1">
              {isConnected ? (
                <CheckCircle className="h-3 w-3 text-green-500" />
              ) : (
                <AlertTriangle className="h-3 w-3 text-yellow-500" />
              )}
              <span className="text-xs">{formatAddress(upAddress!)}</span>
            </Badge>
            
            {isConnected && balance && (
              <Badge variant="outline" className="text-xs">
                {balance} LYX
              </Badge>
            )}
            
            {!isConnected && (
              <Button variant="outline" size="sm" onClick={handleConnect}>
                Connect UP
              </Button>
            )}
            
            <Button variant="ghost" size="sm" onClick={disconnect}>
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Full variant
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-sm">
          <Wallet className="h-4 w-4" />
          <span>Universal Profile</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {!isConnected ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Connect your Universal Profile to enable token-gated posts and responses.
            </p>
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Wallet className="mr-2 h-4 w-4" />
                  Connect Universal Profile
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">
                  Connected
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={disconnect}>
                Disconnect
              </Button>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Address:</span>
                <span className="font-mono">{formatAddress(upAddress!)}</span>
              </div>
              
              {isConnected && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">LYX Balance:</span>
                  <span className="font-mono">
                    {isLoadingBalance ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : balance ? (
                      `${balance} LYX`
                    ) : (
                      'Unable to load'
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 
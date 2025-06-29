import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { TokenRequirement } from '@/types/gating';
import { ethers } from 'ethers';

interface TokenRequirementViewProps {
  requirement: TokenRequirement;
  status?: {
    isMet: boolean;
    currentBalance: string;
    metadata?: {
      name: string;
      symbol: string;
      decimals: number;
      iconUrl?: string;
    };
  };
  isLoading: boolean;
}

export const TokenRequirementView: React.FC<TokenRequirementViewProps> = ({
  requirement,
  status,
  isLoading,
}) => {
  const { name, symbol, minAmount, tokenId } = requirement;
  const displayName = status?.metadata?.name || name || 'Token';
  const displaySymbol = status?.metadata?.symbol || symbol || '???';
  const decimals = status?.metadata?.decimals || 18;

  const getDisplayStatus = () => {
    if (isLoading) {
      return (
        <Badge variant="outline" className="flex items-center">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Loading...
        </Badge>
      );
    }
    if (!status) {
      return <Badge variant="secondary">Not Connected</Badge>;
    }
    
    if (tokenId) {
      return (
        <Badge variant={status.isMet ? 'default' : 'destructive'} className="flex items-center">
          {status.isMet ? (
            <CheckCircle className="h-3 w-3 mr-1" />
          ) : (
            <AlertTriangle className="h-3 w-3 mr-1" />
          )}
          {status.isMet ? 'Owned' : 'Not Owned'}
        </Badge>
      );
    }

    const currentBalanceFormatted = ethers.utils.formatUnits(status.currentBalance, decimals);
    return (
      <Badge variant={status.isMet ? 'default' : 'destructive'} className="flex items-center">
        {status.isMet ? (
          <CheckCircle className="h-3 w-3 mr-1" />
        ) : (
          <AlertTriangle className="h-3 w-3 mr-1" />
        )}
        {parseFloat(currentBalanceFormatted).toFixed(2)} {displaySymbol}
      </Badge>
    );
  };

  const getRequirementText = () => {
    if (tokenId) {
      return `Requires Token ID: ${tokenId}`;
    }
    const requiredAmountFormatted = ethers.utils.formatUnits(minAmount || '0', decimals);
    return `Requires: ${requiredAmountFormatted} ${displaySymbol}`;
  };

  return (
    <div className="flex items-center justify-between p-2 bg-muted rounded-md">
      <div className="flex items-center space-x-2">
        {status?.metadata?.iconUrl ? (
          <img src={status.metadata.iconUrl} alt={displayName} className="h-6 w-6 rounded-full" />
        ) : (
          <span className="text-lg">{requirement.tokenType === 'LSP8' ? '🎨' : '🪙'}</span>
        )}
        <div>
          <p className="text-sm">{displayName}</p>
          <p className="text-xs text-muted-foreground">
            {getRequirementText()}
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {getDisplayStatus()}
      </div>
    </div>
  );
}; 
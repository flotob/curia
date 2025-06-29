import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Coins, CheckCircle, AlertTriangle } from 'lucide-react';
import { ethers } from 'ethers';

interface LyxRequirementViewProps {
  requiredBalance: string; // Balance in Wei
  actualBalance: string | null; // Formatted balance in LYX
  isLoading: boolean;
}

export const LyxRequirementView: React.FC<LyxRequirementViewProps> = ({
  requiredBalance,
  actualBalance,
  isLoading,
}) => {
  // Format the required balance from Wei to LYX for display
  const formattedRequiredBalance = ethers.utils.formatEther(requiredBalance);
  const isMet = actualBalance !== null && parseFloat(actualBalance) >= parseFloat(formattedRequiredBalance);

  return (
    <div className="flex items-center justify-between p-2 bg-muted rounded-md">
      <div className="flex items-center space-x-2">
        <Coins className="h-4 w-4 text-pink-500" />
        <span className="text-sm">Requires {formattedRequiredBalance} LYX</span>
      </div>
      <div className="flex items-center space-x-2">
        {isLoading ? (
          <Badge variant="outline">Loading...</Badge>
        ) : actualBalance !== null ? (
          <Badge variant={isMet ? 'default' : 'destructive'}>
            {isMet ? (
              <CheckCircle className="h-3 w-3 mr-1" />
            ) : (
              <AlertTriangle className="h-3 w-3 mr-1" />
            )}
            {actualBalance} LYX
          </Badge>
        ) : (
          <Badge variant="secondary">Not Connected</Badge>
        )}
      </div>
    </div>
  );
}; 
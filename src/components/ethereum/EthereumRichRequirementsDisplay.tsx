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

import React from 'react';
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
  Hash
} from 'lucide-react';
import { ethers } from 'ethers';

import { EthereumGatingRequirements, VerificationStatus } from '@/types/gating';

// ===== TYPES =====

// Extended verification status with additional properties needed for rich display
export interface EthereumExtendedVerificationStatus extends VerificationStatus {
  ethAddress?: string; // User's Ethereum wallet address when connected
  mockBalances?: {
    eth?: string; // Raw balance for ETH (wei)
    tokens?: Record<string, {
      raw: string;        // Raw balance for BigNumber comparisons 
      formatted: string;  // Formatted balance for display
      decimals?: number;
      name?: string;
      symbol?: string;
    }>;
  };
  mockENSStatus?: boolean;
  mockEFPStatus?: Record<string, boolean>;
}

export interface EthereumRichRequirementsDisplayProps {
  requirements: EthereumGatingRequirements;
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
}

// ===== MAIN COMPONENT =====

export const EthereumRichRequirementsDisplay: React.FC<EthereumRichRequirementsDisplayProps> = ({
  requirements,
  userStatus,
  metadata,
  onConnect,
  onDisconnect,
  disabled = false,
  className = ''
}) => {
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

  // ===== MOCK VERIFICATION DATA =====
  // Using userStatus.mockBalances to populate verification state
  
  // Mock ETH balance verification
  const ethVerification = requirements.minimumETHBalance ? {
    userBalance: userStatus.mockBalances?.eth || '0',
    formattedBalance: userStatus.mockBalances?.eth ? formatBalance(ethers.utils.formatEther(userStatus.mockBalances.eth)) : '0',
    meetsRequirement: userStatus.mockBalances?.eth ? 
      ethers.BigNumber.from(userStatus.mockBalances.eth).gte(ethers.BigNumber.from(requirements.minimumETHBalance)) : false,
    isLoading: false
  } : undefined;

  // Mock token verification for ERC-20
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
      const mockTokenData = userStatus.mockBalances?.tokens?.[token.contractAddress];
      tokenVerifications[token.contractAddress] = {
        balance: mockTokenData?.raw || '0',
        formattedBalance: mockTokenData?.formatted || '0',
        name: mockTokenData?.name || token.name,
        symbol: mockTokenData?.symbol || token.symbol,
        decimals: mockTokenData?.decimals || token.decimals,
        meetsRequirement: mockTokenData ? 
          ethers.BigNumber.from(mockTokenData.raw).gte(ethers.BigNumber.from(token.minimum || '0')) : false,
        isLoading: false
      };
    });
  }

  // Mock ENS verification
  const ensVerification = requirements.requiresENS ? {
    hasENS: userStatus.mockENSStatus || false,
    isLoading: false
  } : undefined;

  // Mock EFP verification
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
        status: userStatus.mockEFPStatus?.[key] || false,
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
          {userStatus.connected && userStatus.ethAddress && (
            <div className="flex items-center space-x-2">
              <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                {/* Ethereum Icon */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-lg font-bold">
                  ⟠
                </div>
                {/* Address and Network */}
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                    Ethereum Wallet
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
                          <span>
                            {efpReq.type === 'minimum_followers' && `${efpReq.value}+ Followers`}
                            {efpReq.type === 'must_follow' && 'Must Follow'}
                            {efpReq.type === 'must_be_followed_by' && 'Followed By'}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            EFP
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {efpReq.type === 'minimum_followers' && `Have at least ${efpReq.value} followers on EFP`}
                          {efpReq.type !== 'minimum_followers' && (efpReq.description || formatAddress(efpReq.value))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      {getStatusIcon(efpData?.isLoading || false, efpData?.status, efpData?.error)}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

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
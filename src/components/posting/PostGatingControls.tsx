'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PostSettings, TokenRequirement, UPGatingRequirements } from '@/types/settings';
import { Shield, Plus, X, Coins, HelpCircle } from 'lucide-react';
import { ethers } from 'ethers';

interface PostGatingControlsProps {
  value?: PostSettings['responsePermissions'];
  onChange: (value: PostSettings['responsePermissions']) => void;
  disabled?: boolean;
}

interface TokenRequirementFormData {
  contractAddress: string;
  tokenType: 'LSP7' | 'LSP8';
  minAmount: string;
  tokenId: string;
  name: string;
  symbol: string;
}

const defaultTokenRequirement: TokenRequirementFormData = {
  contractAddress: '',
  tokenType: 'LSP7',
  minAmount: '',
  tokenId: '',
  name: '',
  symbol: ''
};

export const PostGatingControls: React.FC<PostGatingControlsProps> = ({
  value,
  onChange,
  disabled = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Extract current values
  const upGating = value?.upGating;
  const isEnabled = upGating?.enabled || false;
  const requirements = upGating?.requirements || {};
  const currentLyxBalance = requirements.minLyxBalance || '';
  const currentTokens = requirements.requiredTokens || [];

  // Local state for adding new token requirements
  const [newTokenRequirement, setNewTokenRequirement] = useState<TokenRequirementFormData>(defaultTokenRequirement);

  // Helper to update gating settings
  const updateGatingSettings = (updates: Partial<UPGatingRequirements> | { enabled: boolean }) => {
    if ('enabled' in updates) {
      // Toggling enabled state
      const newValue = {
        ...value,
        upGating: {
          enabled: updates.enabled,
          requirements: updates.enabled ? (requirements || {}) : {}
        }
      };
      onChange(newValue);
    } else {
      // Updating requirements
      const newValue = {
        ...value,
        upGating: {
          enabled: isEnabled,
          requirements: {
            ...requirements,
            ...updates
          }
        }
      };
      onChange(newValue);
    }
  };

  // Handle LYX balance change
  const handleLyxBalanceChange = (lyxAmount: string) => {
    try {
      if (!lyxAmount.trim()) {
        // Remove LYX requirement
        const newRequirements = { ...requirements };
        delete newRequirements.minLyxBalance;
        updateGatingSettings(newRequirements);
        return;
      }

      const weiAmount = ethers.utils.parseEther(lyxAmount).toString();
      updateGatingSettings({ minLyxBalance: weiAmount });
    } catch (error) {
      console.error('Invalid LYX amount:', error);
    }
  };

  // Add new token requirement
  const handleAddTokenRequirement = () => {
    if (!newTokenRequirement.contractAddress.trim()) return;

    const tokenReq: TokenRequirement = {
      contractAddress: newTokenRequirement.contractAddress,
      tokenType: newTokenRequirement.tokenType,
      name: newTokenRequirement.name || undefined,
      symbol: newTokenRequirement.symbol || undefined
    };

    if (newTokenRequirement.tokenType === 'LSP7' && newTokenRequirement.minAmount) {
      try {
        tokenReq.minAmount = ethers.utils.parseUnits(newTokenRequirement.minAmount, 18).toString();
      } catch (error) {
        console.error('Invalid token amount:', error);
        return;
      }
    }

    if (newTokenRequirement.tokenType === 'LSP8' && newTokenRequirement.tokenId) {
      tokenReq.tokenId = newTokenRequirement.tokenId;
    }

    const updatedTokens = [...currentTokens, tokenReq];
    updateGatingSettings({ requiredTokens: updatedTokens });
    setNewTokenRequirement(defaultTokenRequirement);
  };

  // Remove token requirement
  const handleRemoveTokenRequirement = (index: number) => {
    const updatedTokens = currentTokens.filter((_, i) => i !== index);
    updateGatingSettings({ requiredTokens: updatedTokens });
  };

  // Get human-readable LYX amount
  const getLyxDisplayAmount = (weiAmount: string): string => {
    try {
      return ethers.utils.formatEther(weiAmount);
    } catch {
      return weiAmount;
    }
  };

  // Get human-readable token amount
  const getTokenDisplayAmount = (weiAmount: string): string => {
    try {
      return ethers.utils.formatUnits(weiAmount, 18);
    } catch {
      return weiAmount;
    }
  };

  return (
    <Card className="border-2 border-dashed border-muted hover:border-primary/70 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-medium">Response Gating</CardTitle>
            <HelpCircle className="h-3 w-3 text-muted-foreground" />
          </div>
          <div className="flex items-center space-x-2">
            {isEnabled && (
              <Badge variant="secondary" className="text-xs">
                <Shield className="h-3 w-3 mr-1" />
                Gated
              </Badge>
            )}
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                updateGatingSettings({ enabled: e.target.checked });
                if (e.target.checked) setIsExpanded(true);
              }}
              disabled={disabled}
              className="h-4 w-4"
            />
          </div>
        </div>
        </CardHeader>

        {isEnabled && (
          <CardContent className="pt-0 space-y-4">
            {!isExpanded && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(true)}
                className="w-full text-xs"
              >
                Configure Gating Requirements
              </Button>
            )}

            {isExpanded && (
              <div className="space-y-4">
                {/* LYX Balance Requirement */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Coins className="h-4 w-4 text-primary" />
                    <Label className="text-sm font-medium">Minimum LYX Balance</Label>
                  </div>
                  <div className="flex space-x-2">
                    <Input
                      type="number"
                      placeholder="e.g., 100"
                      value={currentLyxBalance ? getLyxDisplayAmount(currentLyxBalance) : ''}
                      onChange={(e) => handleLyxBalanceChange(e.target.value)}
                      disabled={disabled}
                      className="text-sm"
                    />
                    <div className="flex items-center px-3 bg-muted rounded-md">
                      <span className="text-sm text-muted-foreground">LYX</span>
                    </div>
                  </div>
                </div>

                {/* Current Token Requirements */}
                {currentTokens.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Required Tokens</Label>
                    <div className="space-y-2">
                      {currentTokens.map((token, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className="text-xs">
                                {token.tokenType}
                              </Badge>
                              <span className="text-sm font-medium">
                                {token.name || token.symbol || `Token ${index + 1}`}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {token.contractAddress.slice(0, 10)}...{token.contractAddress.slice(-8)}
                              {token.minAmount && (
                                <span className="ml-2">
                                  Min: {getTokenDisplayAmount(token.minAmount)} {token.symbol || 'tokens'}
                                </span>
                              )}
                              {token.tokenId && (
                                <span className="ml-2">Token ID: {token.tokenId}</span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveTokenRequirement(index)}
                            disabled={disabled}
                            className="p-1 h-auto"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add New Token Requirement */}
                <div className="space-y-3 p-3 border border-dashed border-muted rounded-md">
                  <div className="flex items-center space-x-2">
                    <Plus className="h-4 w-4 text-primary" />
                    <Label className="text-sm font-medium">Add Token Requirement</Label>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Token Type</Label>
                      <Select
                        value={newTokenRequirement.tokenType}
                        onValueChange={(value: 'LSP7' | 'LSP8') => 
                          setNewTokenRequirement(prev => ({ ...prev, tokenType: value }))
                        }
                        disabled={disabled}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LSP7">LSP7 (Fungible)</SelectItem>
                          <SelectItem value="LSP8">LSP8 (NFT)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label className="text-xs">Contract Address</Label>
                      <Input
                        placeholder="0x..."
                        value={newTokenRequirement.contractAddress}
                        onChange={(e) => setNewTokenRequirement(prev => ({ ...prev, contractAddress: e.target.value }))}
                        disabled={disabled}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Name (optional)</Label>
                      <Input
                        placeholder="Token name"
                        value={newTokenRequirement.name}
                        onChange={(e) => setNewTokenRequirement(prev => ({ ...prev, name: e.target.value }))}
                        disabled={disabled}
                        className="text-sm"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-xs">Symbol (optional)</Label>
                      <Input
                        placeholder="TKN"
                        value={newTokenRequirement.symbol}
                        onChange={(e) => setNewTokenRequirement(prev => ({ ...prev, symbol: e.target.value }))}
                        disabled={disabled}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  {newTokenRequirement.tokenType === 'LSP7' ? (
                    <div>
                      <Label className="text-xs">Minimum Amount</Label>
                      <Input
                        type="number"
                        placeholder="1000"
                        value={newTokenRequirement.minAmount}
                        onChange={(e) => setNewTokenRequirement(prev => ({ ...prev, minAmount: e.target.value }))}
                        disabled={disabled}
                        className="text-sm"
                      />
                    </div>
                  ) : (
                    <div>
                      <Label className="text-xs">Token ID (optional)</Label>
                      <Input
                        placeholder="123"
                        value={newTokenRequirement.tokenId}
                        onChange={(e) => setNewTokenRequirement(prev => ({ ...prev, tokenId: e.target.value }))}
                        disabled={disabled}
                        className="text-sm"
                      />
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddTokenRequirement}
                    disabled={disabled || !newTokenRequirement.contractAddress.trim()}
                    className="w-full text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Token Requirement
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(false)}
                  className="w-full text-xs"
                >
                  Collapse
                </Button>
              </div>
                      )}
        </CardContent>
      )}
    </Card>
  );
}; 
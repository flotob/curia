'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Package } from 'lucide-react';

import { GatingRequirement, ERC1155TokenConfig } from '@/types/locks';
import { validateEthereumAddress, validateTokenId } from '@/lib/requirements/validation';


interface ERC1155TokenConfiguratorProps {
  editingRequirement?: GatingRequirement;
  onSave: (requirement: GatingRequirement) => void;
  onCancel: () => void;
  disabled?: boolean;
}

export const ERC1155TokenConfigurator: React.FC<ERC1155TokenConfiguratorProps> = ({
  editingRequirement,
  onSave,
  onCancel,
  disabled = false
}) => {
  // ===== STATE =====
  
  const [contractAddress, setContractAddress] = useState('');
  const [tokenId, setTokenId] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [tokenName, setTokenName] = useState('');
  const [addressValidation, setAddressValidation] = useState<{ isValid: boolean; error?: string }>({ isValid: false });
  const [tokenIdValidation, setTokenIdValidation] = useState<{ isValid: boolean; error?: string }>({ isValid: false });
  const [amountValidation, setAmountValidation] = useState<{ isValid: boolean; error?: string }>({ isValid: false });
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);

  // ===== INITIALIZATION =====
  
  useEffect(() => {
    if (editingRequirement && editingRequirement.type === 'erc1155_token') {
      const config = editingRequirement.config as ERC1155TokenConfig;
      setContractAddress(config.contractAddress || '');
      setTokenId(config.tokenId || '');
      setTokenName(config.name || '');
      
      // Convert back to human readable amount (assuming 0 decimals for ERC1155)
      if (config.minAmount) {
        setMinAmount(config.minAmount);
      }
    }
  }, [editingRequirement]);

  // ===== VALIDATION =====
  
  useEffect(() => {
    const validation = validateEthereumAddress(contractAddress);
    setAddressValidation(validation);
    
    // Clear metadata when address changes
    if (!validation.isValid) {
      setTokenName('');
    }
  }, [contractAddress]);

  useEffect(() => {
    const validation = validateTokenId(tokenId);
    setTokenIdValidation(validation);
  }, [tokenId]);

  useEffect(() => {
    if (!minAmount.trim()) {
      setAmountValidation({ isValid: false, error: 'Minimum amount is required' });
      return;
    }
    
    const amount = parseInt(minAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      setAmountValidation({ isValid: false, error: 'Must be a positive number' });
      return;
    }
    
    if (amount > 1000000) {
      setAmountValidation({ isValid: false, error: 'Amount too large (max 1,000,000)' });
      return;
    }
    
    setAmountValidation({ isValid: true });
  }, [minAmount]);

  // ===== HANDLERS =====
  
  const handleSave = () => {
    if (!addressValidation.isValid || !tokenIdValidation.isValid || !amountValidation.isValid || !contractAddress.trim() || !tokenId.trim() || !minAmount.trim()) return;

    try {
      // ERC1155 amounts are typically whole numbers (no decimals)
      const requirement: GatingRequirement = {
        id: editingRequirement?.id || crypto.randomUUID(),
        type: 'erc1155_token',
        category: 'token',
        config: {
          contractAddress: contractAddress.trim(),
          tokenId: tokenId.trim(),
          minAmount: minAmount.trim(),
          name: tokenName.trim() || undefined
        } as ERC1155TokenConfig,
        isValid: true,
        displayName: `ERC1155 Token: ≥ ${minAmount} of token #${tokenId}`
      };

      onSave(requirement);
    } catch (error) {
      console.error('Failed to save ERC1155 token requirement:', error);
      setAmountValidation({ isValid: false, error: 'Failed to save requirement' });
    }
  };

  const handleFetchMetadata = async () => {
    if (!addressValidation.isValid) return;
    
    setIsLoadingMetadata(true);
    try {
      // TODO: Implement actual ERC1155 metadata fetching
      // For now, use placeholder values
      setTokenName('Unknown Token');
    } catch (error) {
      console.error('Failed to fetch token metadata:', error);
    } finally {
      setIsLoadingMetadata(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && addressValidation.isValid && tokenIdValidation.isValid && amountValidation.isValid) {
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const isFormValid = addressValidation.isValid && tokenIdValidation.isValid && amountValidation.isValid && contractAddress.trim() && tokenId.trim() && minAmount.trim();

  // ===== RENDER =====
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={onCancel}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Requirements
          </button>
        </div>
        
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {editingRequirement ? 'Edit Requirement' : 'Add Requirement'}
        </div>
      </div>

      {/* Configuration Form */}
      <div className="max-w-md mx-auto">
        <div className="group relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 p-6 transition-all duration-300 hover:shadow-lg hover:border-rose-300 dark:hover:border-rose-600">
          {/* Icon and Title */}
          <div className="flex items-center space-x-3 mb-6">
            <div className="flex-shrink-0 w-12 h-12 bg-rose-500 rounded-xl flex items-center justify-center shadow-lg">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">ERC1155 Token Requirement</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Require Ethereum ERC1155 multi-token</p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Contract Address */}
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                ERC1155 Contract Address *
              </Label>
              <div className="flex space-x-2 mt-1">
                <Input
                  type="text"
                  placeholder="0x..."
                  value={contractAddress}
                  onChange={(e) => setContractAddress(e.target.value)}
                  onKeyDown={handleKeyPress}
                  disabled={disabled}
                  className={`text-sm ${
                    addressValidation.isValid 
                      ? 'border-rose-200 focus:border-rose-400 focus:ring-rose-400' 
                      : contractAddress.trim() 
                        ? 'border-red-300 focus:border-red-400 focus:ring-red-400'
                        : 'border-gray-300 focus:border-gray-400 focus:ring-gray-400'
                  }`}
                />
                <Button 
                  size="sm"
                  onClick={handleFetchMetadata}
                  disabled={disabled || !addressValidation.isValid || isLoadingMetadata}
                  variant="outline"
                  className="shrink-0"
                >
                  {isLoadingMetadata ? '...' : 'Fetch'}
                </Button>
              </div>
              
              {/* Address Validation Message */}
              {contractAddress.trim() && !addressValidation.isValid && addressValidation.error && (
                <p className="text-sm text-red-600 mt-1">
                  {addressValidation.error}
                </p>
              )}
            </div>

            {/* Token Metadata */}
            {tokenName && (
              <div className="p-3 bg-rose-50 dark:bg-rose-900/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-rose-900 dark:text-rose-100">
                      {tokenName || 'Unknown Token'}
                    </p>
                    <p className="text-xs text-rose-700 dark:text-rose-300">
                      ERC1155 Multi-Token
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Token ID */}
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Token ID *
              </Label>
              <Input
                type="text"
                placeholder="e.g., 1234"
                value={tokenId}
                onChange={(e) => setTokenId(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={disabled}
                className={`mt-1 text-lg font-medium ${
                  tokenIdValidation.isValid 
                    ? 'border-rose-200 focus:border-rose-400 focus:ring-rose-400' 
                    : tokenId.trim() 
                      ? 'border-red-300 focus:border-red-400 focus:ring-red-400'
                      : 'border-gray-300 focus:border-gray-400 focus:ring-gray-400'
                }`}
              />

              {/* Token ID Validation Message */}
              {tokenId.trim() && !tokenIdValidation.isValid && tokenIdValidation.error && (
                <p className="text-sm text-red-600 mt-1">
                  {tokenIdValidation.error}
                </p>
              )}
              
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Specific token ID within the ERC1155 contract
              </p>
            </div>

            {/* Minimum Amount */}
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Minimum Amount *
              </Label>
              <div className="flex space-x-3 mt-1">
                <div className="flex-1">
                  <Input
                    type="text"
                    placeholder="e.g., 5"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                    onKeyDown={handleKeyPress}
                    disabled={disabled}
                    className={`text-lg font-medium ${
                      amountValidation.isValid 
                        ? 'border-rose-200 focus:border-rose-400 focus:ring-rose-400' 
                        : minAmount.trim() 
                          ? 'border-red-300 focus:border-red-400 focus:ring-red-400'
                          : 'border-gray-300 focus:border-gray-400 focus:ring-gray-400'
                    }`}
                  />
                </div>
                <div className="flex items-center px-4 bg-rose-100 dark:bg-rose-900/30 rounded-lg border border-rose-200 dark:border-rose-800">
                  <span className="text-sm font-medium text-rose-800 dark:text-rose-200">
                    tokens
                  </span>
                </div>
              </div>

              {/* Amount Validation Message */}
              {minAmount.trim() && !amountValidation.isValid && amountValidation.error && (
                <p className="text-sm text-red-600 mt-1">
                  {amountValidation.error}
                </p>
              )}
              
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Minimum amount of this specific token ID required
              </p>
            </div>

            {/* Success Preview */}
            {isFormValid && (
              <div className="mt-4 p-3 bg-rose-100 dark:bg-rose-900/30 rounded-lg border border-rose-200 dark:border-rose-800">
                <p className="text-sm text-rose-800 dark:text-rose-200">
                  ✓ Users need ≥ <strong>{minAmount} tokens</strong> of ID #{tokenId}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 mt-6">
          <Button 
            variant="outline" 
            onClick={onCancel}
            disabled={disabled}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={disabled || !isFormValid}
            className="bg-rose-600 hover:bg-rose-700 text-white"
          >
            {editingRequirement ? 'Update Requirement' : 'Add Requirement'}
          </Button>
        </div>
      </div>

      {/* Help Text */}
      <div className="max-w-md mx-auto text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          ERC1155 is a multi-token standard supporting both fungible and non-fungible tokens. 
          Users must hold the specified amount of the specific token ID.
        </p>
      </div>
    </div>
  );
}; 
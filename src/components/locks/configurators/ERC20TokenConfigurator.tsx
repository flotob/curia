'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, DollarSign } from 'lucide-react';
import { ethers } from 'ethers';

import { GatingRequirement, ERC20TokenConfig } from '@/types/locks';
import { validateEthereumAddress } from '@/lib/requirements/validation';
import { parseTokenAmount } from '@/lib/requirements/conversions';

interface ERC20TokenConfiguratorProps {
  editingRequirement?: GatingRequirement;
  onSave: (requirement: GatingRequirement) => void;
  onCancel: () => void;
  disabled?: boolean;
}

export const ERC20TokenConfigurator: React.FC<ERC20TokenConfiguratorProps> = ({
  editingRequirement,
  onSave,
  onCancel,
  disabled = false
}) => {
  // ===== STATE =====
  
  const [contractAddress, setContractAddress] = useState('');
  const [tokenAmount, setTokenAmount] = useState('');
  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [decimals, setDecimals] = useState(18);
  const [addressValidation, setAddressValidation] = useState<{ isValid: boolean; error?: string }>({ isValid: false });
  const [amountValidation, setAmountValidation] = useState<{ isValid: boolean; error?: string }>({ isValid: false });
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);

  // ===== INITIALIZATION =====
  
  useEffect(() => {
    if (editingRequirement && editingRequirement.type === 'erc20_token') {
      const config = editingRequirement.config as ERC20TokenConfig;
      setContractAddress(config.contractAddress || '');
      setTokenName(config.name || '');
      setTokenSymbol(config.symbol || '');
      setDecimals(config.decimals || 18);
      
      // Convert wei back to human readable
      if (config.minAmount) {
        const humanAmount = parseFloat(config.minAmount) / Math.pow(10, config.decimals || 18);
        setTokenAmount(humanAmount.toString());
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
      setTokenSymbol('');
      setDecimals(18);
    }
  }, [contractAddress]);

  useEffect(() => {
    if (!tokenAmount.trim()) {
      setAmountValidation({ isValid: false, error: 'Token amount is required' });
      return;
    }
    
    const amount = parseFloat(tokenAmount);
    if (isNaN(amount) || amount <= 0) {
      setAmountValidation({ isValid: false, error: 'Must be a positive number' });
      return;
    }
    
    if (amount > 1e12) {
      setAmountValidation({ isValid: false, error: 'Amount too large' });
      return;
    }
    
    setAmountValidation({ isValid: true });
  }, [tokenAmount]);

  // ===== HANDLERS =====
  
  const handleSave = () => {
    if (!addressValidation.isValid || !amountValidation.isValid || !contractAddress.trim() || !tokenAmount.trim()) return;

    try {
      // Convert to smallest units using token decimals
      const smallestUnits = parseTokenAmount(tokenAmount, decimals);
      
      const requirement: GatingRequirement = {
        id: editingRequirement?.id || crypto.randomUUID(),
        type: 'erc20_token',
        category: 'token',
        config: {
          contractAddress: contractAddress.trim(),
          minAmount: smallestUnits.toString(),
          decimals,
          name: tokenName.trim() || undefined,
          symbol: tokenSymbol.trim() || undefined
        } as ERC20TokenConfig,
        isValid: true,
        displayName: `ERC20 Token: ≥ ${parseFloat(tokenAmount).toLocaleString()} ${tokenSymbol || 'tokens'}`
      };

      onSave(requirement);
    } catch (error) {
      console.error('Failed to save ERC20 token requirement:', error);
      setAmountValidation({ isValid: false, error: 'Failed to save requirement' });
    }
  };

  const handleFetchMetadata = async () => {
    if (!addressValidation.isValid) return;
    
    setIsLoadingMetadata(true);
    try {
      console.log(`[ERC20 Configurator] Fetching metadata for contract: ${contractAddress}`);

      // Setup Ethereum provider
      const provider = new ethers.providers.JsonRpcProvider(
        process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || 'https://eth.llamarpc.com'
      );

      // Standard ERC20 ABI
      const ERC20_ABI = [
        'function name() view returns (string)',
        'function symbol() view returns (string)',
        'function decimals() view returns (uint8)',
        'function totalSupply() view returns (uint256)'
      ];

      const contract = new ethers.Contract(contractAddress, ERC20_ABI, provider);

      // Fetch metadata in parallel
      const [name, symbol, decimals] = await Promise.all([
        contract.name().catch(() => 'Unknown Token'),
        contract.symbol().catch(() => 'UNK'),
        contract.decimals().catch(() => 18)
      ]);

      console.log(`[ERC20 Configurator] ✅ ERC20 metadata: name=${name}, symbol=${symbol}, decimals=${decimals}`);

      // Update state with fetched metadata
      setTokenName(name);
      setTokenSymbol(symbol);
      setDecimals(decimals);

    } catch (error) {
      console.error('[ERC20 Configurator] Failed to fetch token metadata:', error);
      // Keep placeholder values for user feedback
      setTokenName('Unknown Token');
      setTokenSymbol('UNK');
      setDecimals(18);
    } finally {
      setIsLoadingMetadata(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && addressValidation.isValid && amountValidation.isValid) {
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const isFormValid = addressValidation.isValid && amountValidation.isValid && contractAddress.trim() && tokenAmount.trim();

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
        <div className="group relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6 transition-all duration-300 hover:shadow-lg hover:border-green-300 dark:hover:border-green-600">
          {/* Icon and Title */}
          <div className="flex items-center space-x-3 mb-6">
            <div className="flex-shrink-0 w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">ERC20 Token Requirement</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Require minimum Ethereum ERC20 tokens</p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Contract Address */}
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                ERC20 Contract Address *
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
                      ? 'border-green-200 focus:border-green-400 focus:ring-green-400' 
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
            {(tokenName || tokenSymbol) && (
              <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-900 dark:text-green-100">
                      {tokenName || 'Unknown Token'}
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-300">
                      {tokenSymbol || 'UNK'} • {decimals} decimals
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Token Amount */}
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Minimum Amount *
              </Label>
              <div className="flex space-x-3 mt-1">
                <div className="flex-1">
                  <Input
                    type="text"
                    placeholder="e.g., 1000"
                    value={tokenAmount}
                    onChange={(e) => setTokenAmount(e.target.value)}
                    onKeyDown={handleKeyPress}
                    disabled={disabled}
                    className={`text-lg font-medium ${
                      amountValidation.isValid 
                        ? 'border-green-200 focus:border-green-400 focus:ring-green-400' 
                        : tokenAmount.trim() 
                          ? 'border-red-300 focus:border-red-400 focus:ring-red-400'
                          : 'border-gray-300 focus:border-gray-400 focus:ring-gray-400'
                    }`}
                  />
                </div>
                <div className="flex items-center px-4 bg-green-100 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800">
                  <span className="text-sm font-medium text-green-800 dark:text-green-200">
                    {tokenSymbol || 'tokens'}
                  </span>
                </div>
              </div>

              {/* Amount Validation Message */}
              {tokenAmount.trim() && !amountValidation.isValid && amountValidation.error && (
                <p className="text-sm text-red-600 mt-1">
                  {amountValidation.error}
                </p>
              )}
            </div>

            {/* Success Preview */}
            {isFormValid && (
              <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-800 dark:text-green-200">
                  ✓ Users need at least <strong>{parseFloat(tokenAmount).toLocaleString()} {tokenSymbol || 'tokens'}</strong>
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
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {editingRequirement ? 'Update Requirement' : 'Add Requirement'}
          </Button>
        </div>
      </div>

      {/* Help Text */}
      <div className="max-w-md mx-auto text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          ERC20 tokens are fungible tokens on Ethereum. Users must hold the specified minimum amount to access gated content.
        </p>
      </div>
    </div>
  );
}; 
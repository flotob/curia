'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Gem } from 'lucide-react';
import { ethers } from 'ethers';

import { GatingRequirement, ERC721NFTConfig } from '@/types/locks';
import { validateEthereumAddress } from '@/lib/requirements/validation';

interface ERC721NFTConfiguratorProps {
  editingRequirement?: GatingRequirement;
  onSave: (requirement: GatingRequirement) => void;
  onCancel: () => void;
  disabled?: boolean;
}

export const ERC721NFTConfigurator: React.FC<ERC721NFTConfiguratorProps> = ({
  editingRequirement,
  onSave,
  onCancel,
  disabled = false
}) => {
  // ===== STATE =====
  
  const [contractAddress, setContractAddress] = useState('');
  const [minCount, setMinCount] = useState('');
  const [collectionName, setCollectionName] = useState('');
  const [collectionSymbol, setCollectionSymbol] = useState('');
  const [addressValidation, setAddressValidation] = useState<{ isValid: boolean; error?: string }>({ isValid: false });
  const [countValidation, setCountValidation] = useState<{ isValid: boolean; error?: string }>({ isValid: false });
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);

  // ===== INITIALIZATION =====
  
  useEffect(() => {
    if (editingRequirement && editingRequirement.type === 'erc721_nft') {
      const config = editingRequirement.config as ERC721NFTConfig;
      setContractAddress(config.contractAddress || '');
      setCollectionName(config.name || '');
      setCollectionSymbol(config.symbol || '');
      
      if (config.minCount) {
        setMinCount(config.minCount.toString());
      }
    }
  }, [editingRequirement]);

  // ===== VALIDATION =====
  
  useEffect(() => {
    const validation = validateEthereumAddress(contractAddress);
    setAddressValidation(validation);
    
    // Clear metadata when address changes
    if (!validation.isValid) {
      setCollectionName('');
      setCollectionSymbol('');
    }
  }, [contractAddress]);

  useEffect(() => {
    if (!minCount.trim()) {
      setCountValidation({ isValid: false, error: 'Minimum count is required' });
      return;
    }
    
    const num = parseInt(minCount, 10);
    if (isNaN(num) || num <= 0) {
      setCountValidation({ isValid: false, error: 'Must be a positive number' });
      return;
    }
    
    if (num > 10000) {
      setCountValidation({ isValid: false, error: 'Count too large (max 10,000)' });
      return;
    }
    
    setCountValidation({ isValid: true });
  }, [minCount]);

  // ===== HANDLERS =====
  
  const handleSave = () => {
    if (!addressValidation.isValid || !countValidation.isValid || !contractAddress.trim() || !minCount.trim()) return;

    try {
      const requirement: GatingRequirement = {
        id: editingRequirement?.id || crypto.randomUUID(),
        type: 'erc721_nft',
        category: 'token',
        config: {
          contractAddress: contractAddress.trim(),
          minCount: parseInt(minCount.trim()),
          name: collectionName.trim() || undefined,
          symbol: collectionSymbol.trim() || undefined
        } as ERC721NFTConfig,
        isValid: true,
        displayName: `ERC721 NFT: ≥ ${minCount} from ${collectionName || 'collection'}`
      };

      onSave(requirement);
    } catch (error) {
      console.error('Failed to save ERC721 NFT requirement:', error);
      setCountValidation({ isValid: false, error: 'Failed to save requirement' });
    }
  };

  const handleFetchMetadata = async () => {
    if (!addressValidation.isValid) return;
    
    setIsLoadingMetadata(true);
    try {
      console.log(`[ERC721 Configurator] Fetching metadata for contract: ${contractAddress}`);

      // Setup Ethereum provider
      const provider = new ethers.providers.JsonRpcProvider(
        process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || 'https://eth.llamarpc.com'
      );

      // Standard ERC721 ABI
      const ERC721_ABI = [
        'function name() view returns (string)',
        'function symbol() view returns (string)',
        'function totalSupply() view returns (uint256)',
        'function supportsInterface(bytes4) view returns (bool)'
      ];

      const contract = new ethers.Contract(contractAddress, ERC721_ABI, provider);

      // Verify it's an ERC721 contract
      const ERC721_INTERFACE_ID = '0x80ac58cd';
      let isERC721 = false;
      
      try {
        isERC721 = await contract.supportsInterface(ERC721_INTERFACE_ID);
        console.log(`[ERC721 Configurator] Interface check: ERC721=${isERC721}`);
      } catch (error) {
        console.log(`[ERC721 Configurator] Interface check failed, assuming ERC721:`, error);
        // Continue anyway - some contracts don't implement supportsInterface
      }

      // Fetch metadata in parallel
      const [name, symbol] = await Promise.all([
        contract.name().catch(() => 'Unknown Collection'),
        contract.symbol().catch(() => 'UNK')
      ]);

      console.log(`[ERC721 Configurator] ✅ ERC721 metadata: name=${name}, symbol=${symbol}`);

      // Update state with fetched metadata
      setCollectionName(name);
      setCollectionSymbol(symbol);

    } catch (error) {
      console.error('[ERC721 Configurator] Failed to fetch collection metadata:', error);
      // Keep placeholder values for user feedback
      setCollectionName('Unknown Collection');
      setCollectionSymbol('UNK');
    } finally {
      setIsLoadingMetadata(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && addressValidation.isValid && countValidation.isValid) {
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const isFormValid = addressValidation.isValid && countValidation.isValid && contractAddress.trim() && minCount.trim();

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
        <div className="group relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 p-6 transition-all duration-300 hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-600">
          {/* Icon and Title */}
          <div className="flex items-center space-x-3 mb-6">
            <div className="flex-shrink-0 w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
              <Gem className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">ERC721 NFT Requirement</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Require Ethereum ERC721 NFT ownership</p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Contract Address */}
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                ERC721 Contract Address *
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
                      ? 'border-indigo-200 focus:border-indigo-400 focus:ring-indigo-400' 
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

            {/* Collection Metadata */}
            {(collectionName || collectionSymbol) && (
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
                      {collectionName || 'Unknown Collection'}
                    </p>
                    <p className="text-xs text-indigo-700 dark:text-indigo-300">
                      {collectionSymbol || 'UNK'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Minimum Count */}
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Minimum Count *
              </Label>
              <div className="flex space-x-3 mt-1">
                <div className="flex-1">
                  <Input
                    type="text"
                    placeholder="e.g., 3"
                    value={minCount}
                    onChange={(e) => setMinCount(e.target.value)}
                    onKeyDown={handleKeyPress}
                    disabled={disabled}
                    className={`text-lg font-medium ${
                      countValidation.isValid 
                        ? 'border-indigo-200 focus:border-indigo-400 focus:ring-indigo-400' 
                        : minCount.trim() 
                          ? 'border-red-300 focus:border-red-400 focus:ring-red-400'
                          : 'border-gray-300 focus:border-gray-400 focus:ring-gray-400'
                    }`}
                  />
                </div>
                <div className="flex items-center px-4 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg border border-indigo-200 dark:border-indigo-800">
                  <span className="text-sm font-medium text-indigo-800 dark:text-indigo-200">
                    NFTs
                  </span>
                </div>
              </div>

              {/* Count Validation Message */}
              {minCount.trim() && !countValidation.isValid && countValidation.error && (
                <p className="text-sm text-red-600 mt-1">
                  {countValidation.error}
                </p>
              )}
              
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Users must own at least this many NFTs from the collection
              </p>
            </div>

            {/* Success Preview */}
            {isFormValid && (
              <div className="mt-4 p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg border border-indigo-200 dark:border-indigo-800">
                <p className="text-sm text-indigo-800 dark:text-indigo-200">
                  ✓ Users need ≥ <strong>{minCount} NFTs</strong> from {collectionName || 'collection'}
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
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {editingRequirement ? 'Update Requirement' : 'Add Requirement'}
          </Button>
        </div>
      </div>

      {/* Help Text */}
      <div className="max-w-md mx-auto text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          ERC721 NFTs are non-fungible tokens on Ethereum. Users must own the specified minimum count from the collection.
        </p>
      </div>
    </div>
  );
}; 
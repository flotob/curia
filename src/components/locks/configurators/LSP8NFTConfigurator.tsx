'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Image, ToggleLeft, ToggleRight } from 'lucide-react';
import { ethers } from 'ethers';

import { GatingRequirement, LSP8NFTConfig } from '@/types/locks';
import { validateEthereumAddress, validateTokenId } from '@/lib/requirements/validation';

interface LSP8NFTConfiguratorProps {
  editingRequirement?: GatingRequirement;
  onSave: (requirement: GatingRequirement) => void;
  onCancel: () => void;
  disabled?: boolean;
}

export const LSP8NFTConfigurator: React.FC<LSP8NFTConfiguratorProps> = ({
  editingRequirement,
  onSave,
  onCancel,
  disabled = false
}) => {
  // ===== STATE =====
  
  const [contractAddress, setContractAddress] = useState('');
  const [requirementType, setRequirementType] = useState<'specific' | 'count'>('count');
  const [tokenId, setTokenId] = useState('');
  const [minCount, setMinCount] = useState('');
  const [collectionName, setCollectionName] = useState('');
  const [collectionSymbol, setCollectionSymbol] = useState('');
  const [addressValidation, setAddressValidation] = useState<{ isValid: boolean; error?: string }>({ isValid: false });
  const [valueValidation, setValueValidation] = useState<{ isValid: boolean; error?: string }>({ isValid: false });
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);

  // ===== INITIALIZATION =====
  
  useEffect(() => {
    if (editingRequirement && editingRequirement.type === 'lsp8_nft') {
      const config = editingRequirement.config as LSP8NFTConfig;
      setContractAddress(config.contractAddress || '');
      setCollectionName(config.name || '');
      setCollectionSymbol(config.symbol || '');
      
      if (config.tokenId) {
        setRequirementType('specific');
        setTokenId(config.tokenId);
      } else if (config.minAmount) {
        setRequirementType('count');
        setMinCount(config.minAmount);
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
    if (requirementType === 'specific') {
      if (!tokenId.trim()) {
        setValueValidation({ isValid: false, error: 'Token ID is required' });
        return;
      }
      
      const validation = validateTokenId(tokenId);
      setValueValidation(validation);
    } else {
      if (!minCount.trim()) {
        setValueValidation({ isValid: false, error: 'Minimum count is required' });
        return;
      }
      
      const num = parseInt(minCount, 10);
      if (isNaN(num) || num <= 0) {
        setValueValidation({ isValid: false, error: 'Must be a positive number' });
        return;
      }
      
      const validation = { isValid: true };
      setValueValidation(validation);
    }
  }, [requirementType, tokenId, minCount]);

  // ===== HANDLERS =====
  
  const handleSave = () => {
    if (!addressValidation.isValid || !valueValidation.isValid || !contractAddress.trim()) return;
    
    const currentValue = requirementType === 'specific' ? tokenId : minCount;
    if (!currentValue.trim()) return;

    try {
      const config: LSP8NFTConfig = {
        contractAddress: contractAddress.trim(),
        name: collectionName.trim() || undefined,
        symbol: collectionSymbol.trim() || undefined
      };

      if (requirementType === 'specific') {
        config.tokenId = tokenId.trim();
      } else {
        config.minAmount = minCount.trim();
      }
      
      const requirement: GatingRequirement = {
        id: editingRequirement?.id || crypto.randomUUID(),
        type: 'lsp8_nft',
        category: 'token',
        config,
        isValid: true,
        displayName: requirementType === 'specific' 
          ? `LSP8 NFT: Token #${tokenId} from ${collectionName || 'collection'}`
          : `LSP8 NFT: ≥ ${minCount} from ${collectionName || 'collection'}`
      };

      onSave(requirement);
    } catch (error) {
      console.error('Failed to save LSP8 NFT requirement:', error);
      setValueValidation({ isValid: false, error: 'Failed to save requirement' });
    }
  };

  const handleFetchMetadata = async () => {
    if (!addressValidation.isValid) return;
    
    setIsLoadingMetadata(true);
    try {
      console.log(`[LSP8 Configurator] Fetching metadata for contract: ${contractAddress}`);

      // Setup provider
      const rpcUrl = process.env.NEXT_PUBLIC_LUKSO_MAINNET_RPC_URL || 'https://rpc.mainnet.lukso.network';
      const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

      // First verify it's an LSP8 contract
      const contract = new ethers.Contract(contractAddress, [
        'function supportsInterface(bytes4) view returns (bool)',
        'function getData(bytes32) view returns (bytes)',
        'function getDataBatch(bytes32[]) view returns (bytes[])'
      ], provider);

      // Check LSP8 interface ID
      const LSP8_INTERFACE_ID = '0x3a271706';
      let isLSP8 = false;
      
      try {
        isLSP8 = await contract.supportsInterface(LSP8_INTERFACE_ID);
        console.log(`[LSP8 Configurator] Interface check: LSP8=${isLSP8}`);
      } catch (error) {
        console.log(`[LSP8 Configurator] Interface check failed:`, error);
        // Try proxy detection
        try {
          const implSlot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
          const slotValue = await provider.getStorageAt(contractAddress, implSlot);
          if (slotValue && slotValue !== ethers.constants.HashZero) {
            const implementationAddress = ethers.utils.getAddress('0x' + slotValue.slice(-40));
            console.log(`[LSP8 Configurator] Found EIP-1967 proxy, implementation: ${implementationAddress}`);
            const implContract = new ethers.Contract(implementationAddress, [
              'function supportsInterface(bytes4) view returns (bool)'
            ], provider);
            isLSP8 = await implContract.supportsInterface(LSP8_INTERFACE_ID);
          }
        } catch (proxyError) {
          console.log(`[LSP8 Configurator] Proxy detection failed:`, proxyError);
        }
      }

      if (!isLSP8) {
        throw new Error('Contract does not appear to be a valid LUKSO LSP8 NFT collection.');
      }

      // Fetch LSP4 metadata using ERC725Y data keys
      let name = 'Unknown Collection';
      let symbol = 'UNK';

      try {
        // LSP4 metadata data keys
        const LSP4_TOKEN_NAME_KEY = '0xdeba1e292f8ba88238e10ab3c7f88bd4be4fac56cad5194b6ecceaf653468af1';
        const LSP4_TOKEN_SYMBOL_KEY = '0x2f0a68ab07768e01943a599e73362a0e17a63a72e94dd2e384d2c1d4db932756';
        
        const dataKeys = [LSP4_TOKEN_NAME_KEY, LSP4_TOKEN_SYMBOL_KEY];
        const [nameBytes, symbolBytes] = await contract.getDataBatch(dataKeys);
        
        // Decode the bytes data
        if (nameBytes && nameBytes !== '0x') {
          name = ethers.utils.toUtf8String(nameBytes);
        }
        if (symbolBytes && symbolBytes !== '0x') {
          symbol = ethers.utils.toUtf8String(symbolBytes);
        }
        
        console.log(`[LSP8 Configurator] ✅ LSP8 metadata via ERC725Y: name=${name}, symbol=${symbol}`);
      } catch (lsp8Error) {
        console.log(`[LSP8 Configurator] ❌ LSP8 ERC725Y metadata failed:`, lsp8Error);
        
        // Fallback: try standard name()/symbol() functions
        try {
          const fallbackContract = new ethers.Contract(contractAddress, [
            'function name() view returns (string)',
            'function symbol() view returns (string)'
          ], provider);
          
          [name, symbol] = await Promise.all([
            fallbackContract.name().catch(() => 'Unknown Collection'),
            fallbackContract.symbol().catch(() => 'UNK')
          ]);
          console.log(`[LSP8 Configurator] ⚠️ LSP8 fallback to standard functions: name=${name}, symbol=${symbol}`);
        } catch (fallbackError) {
          console.log(`[LSP8 Configurator] ❌ LSP8 fallback also failed:`, fallbackError);
        }
      }

      // Update state with fetched metadata
      setCollectionName(name);
      setCollectionSymbol(symbol);

      console.log(`[LSP8 Configurator] ✅ Successfully fetched LSP8 metadata`);

    } catch (error) {
      console.error('[LSP8 Configurator] Failed to fetch collection metadata:', error);
      // Keep placeholder values for user feedback
      setCollectionName('Unknown Collection');
      setCollectionSymbol('UNK');
    } finally {
      setIsLoadingMetadata(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && addressValidation.isValid && valueValidation.isValid) {
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const isFormValid = addressValidation.isValid && valueValidation.isValid && contractAddress.trim();

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
        <div className="group relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-6 transition-all duration-300 hover:shadow-lg hover:border-purple-300 dark:hover:border-purple-600">
          {/* Icon and Title */}
          <div className="flex items-center space-x-3 mb-6">
            <div className="flex-shrink-0 w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg">
              <Image className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">LSP8 NFT Requirement</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Require LUKSO LSP8 NFT ownership</p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Contract Address */}
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                LSP8 Contract Address *
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
                      ? 'border-purple-200 focus:border-purple-400 focus:ring-purple-400' 
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
              <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
                      {collectionName || 'Unknown Collection'}
                    </p>
                    <p className="text-xs text-purple-700 dark:text-purple-300">
                      {collectionSymbol || 'UNK'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Requirement Type Toggle */}
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Requirement Type
              </Label>
              <div className="flex items-center space-x-4 mt-2">
                <button
                  type="button"
                  onClick={() => setRequirementType('count')}
                  disabled={disabled}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors ${
                    requirementType === 'count'
                      ? 'border-purple-300 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200'
                      : 'border-gray-300 hover:border-gray-400 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {requirementType === 'count' ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                  <span className="text-sm">Min Count</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => setRequirementType('specific')}
                  disabled={disabled}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors ${
                    requirementType === 'specific'
                      ? 'border-purple-300 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200'
                      : 'border-gray-300 hover:border-gray-400 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {requirementType === 'specific' ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                  <span className="text-sm">Specific Token</span>
                </button>
              </div>
            </div>

            {/* Value Input */}
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {requirementType === 'specific' ? 'Token ID *' : 'Minimum Count *'}
              </Label>
              <Input
                type="text"
                placeholder={requirementType === 'specific' ? 'e.g., 1234' : 'e.g., 3'}
                value={requirementType === 'specific' ? tokenId : minCount}
                onChange={(e) => requirementType === 'specific' ? setTokenId(e.target.value) : setMinCount(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={disabled}
                className={`mt-1 text-lg font-medium ${
                  valueValidation.isValid 
                    ? 'border-purple-200 focus:border-purple-400 focus:ring-purple-400' 
                    : (requirementType === 'specific' ? tokenId.trim() : minCount.trim())
                      ? 'border-red-300 focus:border-red-400 focus:ring-red-400'
                      : 'border-gray-300 focus:border-gray-400 focus:ring-gray-400'
                }`}
              />

              {/* Value Validation Message */}
              {((requirementType === 'specific' && tokenId.trim()) || (requirementType === 'count' && minCount.trim())) && 
               !valueValidation.isValid && valueValidation.error && (
                <p className="text-sm text-red-600 mt-1">
                  {valueValidation.error}
                </p>
              )}
              
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {requirementType === 'specific' 
                  ? 'Users must own this specific NFT token ID'
                  : 'Users must own at least this many NFTs from the collection'
                }
              </p>
            </div>

            {/* Success Preview */}
            {isFormValid && (
              <div className="mt-4 p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-800">
                <p className="text-sm text-purple-800 dark:text-purple-200">
                  ✓ Users need {requirementType === 'specific' 
                    ? `token #${tokenId} from ${collectionName || 'collection'}`
                    : `≥ ${minCount} NFTs from ${collectionName || 'collection'}`
                  }
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
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {editingRequirement ? 'Update Requirement' : 'Add Requirement'}
          </Button>
        </div>
      </div>

      {/* Help Text */}
      <div className="max-w-md mx-auto text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          LSP8 NFTs are non-fungible tokens on LUKSO. You can require either a specific token ID or a minimum count from the collection.
        </p>
      </div>
    </div>
  );
}; 
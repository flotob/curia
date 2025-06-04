'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { PostSettings, TokenRequirement, UPGatingRequirements } from '@/types/settings';
import { Shield, Plus, X, Coins, HelpCircle, Search, CheckCircle, AlertTriangle } from 'lucide-react';
import { ethers } from 'ethers';
import { INTERFACE_IDS, SupportedStandards, ERC725YDataKeys } from '@lukso/lsp-smart-contracts';

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

interface FetchedTokenMetadata {
  name: string;
  symbol: string;
  decimals?: number;
  tokenType: 'LSP7' | 'LSP8';
  contractAddress: string;
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
  
  // State for metadata fetching process
  const [contractAddress, setContractAddress] = useState('');
  const [fetchedMetadata, setFetchedMetadata] = useState<FetchedTokenMetadata | null>(null);
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Validate contract address format
  const isValidContractAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  // Robust LUKSO token detection using official libraries and proxy handling
  const fetchTokenMetadata = async (): Promise<void> => {
    if (!contractAddress.trim()) {
      setFetchError('Please enter a contract address');
      return;
    }

    if (!isValidContractAddress(contractAddress)) {
      setFetchError('Invalid contract address format. Must be a valid Ethereum address (0x...)');
      return;
    }

    setIsFetchingMetadata(true);
    setFetchError(null);

    try {
      // Use LUKSO mainnet RPC
      const rpcUrl = process.env.NEXT_PUBLIC_LUKSO_MAINNET_RPC_URL || 'https://rpc.mainnet.lukso.network';
      const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

      console.log(`[LUKSO Token Detection] Analyzing contract: ${contractAddress}`);

      // Step 1: Check if contract supports LSP4 Digital Asset standard via ERC725Y
      let isLSP4Asset = false;
      try {
        const erc725Contract = new ethers.Contract(contractAddress, [
          'function getData(bytes32) view returns (bytes)',
        ], provider);
        
        const lsp4Key = SupportedStandards.LSP4DigitalAsset.key;
        const lsp4ExpectedValue = SupportedStandards.LSP4DigitalAsset.value;
        const storedValue = await erc725Contract.getData(lsp4Key);
        isLSP4Asset = storedValue === lsp4ExpectedValue;
        console.log(`[LUKSO Token Detection] LSP4 Digital Asset support: ${isLSP4Asset}`);
      } catch (error) {
        console.log(`[LUKSO Token Detection] LSP4 check failed (not ERC725Y):`, error);
      }

      // Step 2: Check interface support for LSP7/LSP8 (supporting multiple versions)
      const contract = new ethers.Contract(contractAddress, [
        'function supportsInterface(bytes4) view returns (bool)',
        'function name() view returns (string)',
        'function symbol() view returns (string)',
        'function decimals() view returns (uint8)'
      ], provider);

      // Use official LUKSO interface IDs + legacy versions
      const LSP7_INTERFACE_ID_NEW = INTERFACE_IDS.LSP7DigitalAsset; // Latest (0xc52d6008)
      const LSP7_INTERFACE_ID_LEGACY = '0xb3c4928f'; // Legacy v0.14 (for older tokens like LYXOG)
      const LSP8_INTERFACE_ID = INTERFACE_IDS.LSP8IdentifiableDigitalAsset; // Stable (0x3a271706)

      console.log(`[LUKSO Token Detection] Interface IDs to check:`);
      console.log(`  LSP7 New: ${LSP7_INTERFACE_ID_NEW}`);
      console.log(`  LSP7 Legacy: ${LSP7_INTERFACE_ID_LEGACY}`);
      console.log(`  LSP8: ${LSP8_INTERFACE_ID}`);

      // Check interfaces on main contract
      let isLSP7 = false, isLSP8 = false;
      try {
        const [newLSP7, legacyLSP7, lsp8] = await Promise.all([
          contract.supportsInterface(LSP7_INTERFACE_ID_NEW).catch(() => false),
          contract.supportsInterface(LSP7_INTERFACE_ID_LEGACY).catch(() => false),
          contract.supportsInterface(LSP8_INTERFACE_ID).catch(() => false)
        ]);
        
        isLSP7 = newLSP7 || legacyLSP7;
        isLSP8 = lsp8;
        
        console.log(`[LUKSO Token Detection] Direct interface check results:`);
        console.log(`  LSP7 (new): ${newLSP7}, LSP7 (legacy): ${legacyLSP7} → Combined: ${isLSP7}`);
        console.log(`  LSP8: ${isLSP8}`);
      } catch (error) {
        console.log(`[LUKSO Token Detection] Direct interface check failed:`, error);
      }

      // Step 3: If no interfaces detected, check for proxy pattern (EIP-1967)
      let implementationAddress: string | null = null;
      if (!isLSP7 && !isLSP8) {
        console.log(`[LUKSO Token Detection] No interfaces detected, checking for proxy...`);
        
        try {
          // Check EIP-1967 implementation slot
          const implSlot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
          const slotValue = await provider.getStorageAt(contractAddress, implSlot);
          
          if (slotValue && slotValue !== ethers.constants.HashZero) {
            implementationAddress = ethers.utils.getAddress('0x' + slotValue.slice(-40));
            console.log(`[LUKSO Token Detection] Found EIP-1967 proxy, implementation: ${implementationAddress}`);
            
            // Check interfaces on implementation contract
            const implContract = new ethers.Contract(implementationAddress, [
              'function supportsInterface(bytes4) view returns (bool)',
              'function name() view returns (string)',
              'function symbol() view returns (string)',
              'function decimals() view returns (uint8)'
            ], provider);
            
            const [newLSP7, legacyLSP7, lsp8] = await Promise.all([
              implContract.supportsInterface(LSP7_INTERFACE_ID_NEW).catch(() => false),
              implContract.supportsInterface(LSP7_INTERFACE_ID_LEGACY).catch(() => false),
              implContract.supportsInterface(LSP8_INTERFACE_ID).catch(() => false)
            ]);
            
            isLSP7 = newLSP7 || legacyLSP7;
            isLSP8 = lsp8;
            
            console.log(`[LUKSO Token Detection] Implementation interface check results:`);
            console.log(`  LSP7 (new): ${newLSP7}, LSP7 (legacy): ${legacyLSP7} → Combined: ${isLSP7}`);
            console.log(`  LSP8: ${lsp8}`);
          }
        } catch (error) {
          console.log(`[LUKSO Token Detection] Proxy detection failed:`, error);
        }
      }

      // Step 4: Final validation
      if (!isLSP7 && !isLSP8) {
        if (isLSP4Asset) {
          setFetchError('Contract has LSP4 metadata but no detectable LSP7/LSP8 interfaces. May be a custom implementation.');
        } else {
          setFetchError('Contract does not appear to be a valid LUKSO LSP7 or LSP8 token. Check console for detailed analysis.');
        }
        return;
      }

      const tokenType: 'LSP7' | 'LSP8' = isLSP7 ? 'LSP7' : 'LSP8';
      console.log(`[LUKSO Token Detection] ✅ Detected as ${tokenType} token`);

      // Step 5: Fetch token metadata (LSP7 vs LSP8 handling)
      let name = 'Unknown Token';
      let symbol = 'UNK';
      let decimals: number | undefined;

      if (tokenType === 'LSP7') {
        // LSP7 might use ERC725Y data keys for name/symbol but standard decimals()
        try {
          // First try ERC725Y data keys (like LSP8)
          const lsp7Contract = new ethers.Contract(contractAddress, [
            'function getData(bytes32) view returns (bytes)',
            'function getDataBatch(bytes32[]) view returns (bytes[])',
            'function decimals() view returns (uint8)'
          ], provider);

          const dataKeys = [
            ERC725YDataKeys.LSP4.LSP4TokenName,
            ERC725YDataKeys.LSP4.LSP4TokenSymbol
          ];

          const [nameBytes, symbolBytes] = await lsp7Contract.getDataBatch(dataKeys);
          
          // Decode the bytes data
          if (nameBytes && nameBytes !== '0x') {
            name = ethers.utils.toUtf8String(nameBytes);
          }
          if (symbolBytes && symbolBytes !== '0x') {
            symbol = ethers.utils.toUtf8String(symbolBytes);
          }
          
          // Get decimals using standard function (this works)
          decimals = await lsp7Contract.decimals();
          
          console.log(`[LUKSO Token Detection] ✅ LSP7 metadata via ERC725Y: name=${name}, symbol=${symbol}, decimals=${decimals}`);
        } catch (erc725yError) {
          console.log(`[LUKSO Token Detection] ❌ LSP7 ERC725Y metadata failed, trying standard functions:`, erc725yError);
          
          // Fallback: try standard ERC20-like functions
          try {
            [name, symbol] = await Promise.all([
              contract.name(),
              contract.symbol()
            ]);
            decimals = await contract.decimals();
            
            console.log(`[LUKSO Token Detection] ⚠️ LSP7 fallback to standard functions: name=${name}, symbol=${symbol}, decimals=${decimals}`);
          } catch (metadataError) {
            console.log(`[LUKSO Token Detection] LSP7 standard functions also failed, trying implementation:`, metadataError);
            
            if (implementationAddress) {
              try {
                const implContract = new ethers.Contract(implementationAddress, [
                  'function name() view returns (string)',
                  'function symbol() view returns (string)',
                  'function decimals() view returns (uint8)'
                ], provider);
                
                [name, symbol] = await Promise.all([
                  implContract.name().catch(() => 'Unknown Token'),
                  implContract.symbol().catch(() => 'UNK')
                ]);
                decimals = await implContract.decimals().catch(() => 18);
                
                console.log(`[LUKSO Token Detection] ⚠️ LSP7 implementation fallback: name=${name}, symbol=${symbol}, decimals=${decimals}`);
              } catch (implError) {
                console.log(`[LUKSO Token Detection] ❌ LSP7 implementation metadata failed:`, implError);
                decimals = 18;
              }
            } else {
              console.log(`[LUKSO Token Detection] No implementation found, using defaults`);
              decimals = 18;
            }
          }
        }
      } else {
        // LSP8 uses ERC725Y data keys for metadata
        try {
          const lsp8Contract = new ethers.Contract(contractAddress, [
            'function getData(bytes32) view returns (bytes)',
            'function getDataBatch(bytes32[]) view returns (bytes[])'
          ], provider);

          // Use ERC725Y data keys for LSP4 metadata
          const dataKeys = [
            ERC725YDataKeys.LSP4.LSP4TokenName,
            ERC725YDataKeys.LSP4.LSP4TokenSymbol
          ];

          const [nameBytes, symbolBytes] = await lsp8Contract.getDataBatch(dataKeys);
          
          // Decode the bytes data
          if (nameBytes && nameBytes !== '0x') {
            name = ethers.utils.toUtf8String(nameBytes);
          }
          if (symbolBytes && symbolBytes !== '0x') {
            symbol = ethers.utils.toUtf8String(symbolBytes);
          }
          
          console.log(`[LUKSO Token Detection] ✅ LSP8 metadata via ERC725Y: name=${name}, symbol=${symbol}`);
        } catch (lsp8Error) {
          console.log(`[LUKSO Token Detection] ❌ LSP8 ERC725Y metadata failed:`, lsp8Error);
          
          // Fallback: try standard name()/symbol() functions in case it's a hybrid
          try {
            [name, symbol] = await Promise.all([
              contract.name().catch(() => 'Unknown Token'),
              contract.symbol().catch(() => 'UNK')
            ]);
            console.log(`[LUKSO Token Detection] ⚠️ LSP8 fallback to standard functions: name=${name}, symbol=${symbol}`);
          } catch (fallbackError) {
            console.log(`[LUKSO Token Detection] ❌ LSP8 fallback also failed:`, fallbackError);
          }
        }
      }

      const metadata: FetchedTokenMetadata = {
        name,
        symbol,
        decimals: tokenType === 'LSP7' ? decimals : undefined,
        tokenType,
        contractAddress
      };

      console.log(`[LUKSO Token Detection] ✅ Successfully fetched metadata:`, metadata);
      setFetchedMetadata(metadata);
      setFetchError(null);

    } catch (error) {
      console.error('[LUKSO Token Detection] Failed to fetch token metadata:', error);
      setFetchError('Failed to fetch token metadata. Please check the contract address and try again.');
    } finally {
      setIsFetchingMetadata(false);
    }
  };

  // Reset fetch state when starting a new token requirement
  const resetFetchState = () => {
    setContractAddress('');
    setFetchedMetadata(null);
    setFetchError(null);
    setNewTokenRequirement(defaultTokenRequirement);
  };

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

  // Add new token requirement using fetched metadata
  const handleAddTokenRequirement = () => {
    if (!fetchedMetadata) return;

    const tokenReq: TokenRequirement = {
      contractAddress: fetchedMetadata.contractAddress,
      tokenType: fetchedMetadata.tokenType,
      name: fetchedMetadata.name,
      symbol: fetchedMetadata.symbol
    };

    if (fetchedMetadata.tokenType === 'LSP7' && newTokenRequirement.minAmount) {
      try {
        const decimals = fetchedMetadata.decimals || 18;
        tokenReq.minAmount = ethers.utils.parseUnits(newTokenRequirement.minAmount, decimals).toString();
      } catch (error) {
        console.error('Invalid token amount:', error);
        return;
      }
    }

    if (fetchedMetadata.tokenType === 'LSP8') {
      if (newTokenRequirement.tokenId) {
        // Specific NFT ID requirement
        tokenReq.tokenId = newTokenRequirement.tokenId;
      } else if (newTokenRequirement.minAmount) {
        // Collection ownership requirement (multiple NFTs)
        tokenReq.minAmount = newTokenRequirement.minAmount;
      } else {
        // Default: any NFT from collection (minAmount = "1")
        tokenReq.minAmount = '1';
      }
    }

    const updatedTokens = [...currentTokens, tokenReq];
    updateGatingSettings({ requiredTokens: updatedTokens });
    resetFetchState();
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
                                  {token.tokenType === 'LSP8' ? 
                                    `Min: ${token.minAmount} NFTs` : 
                                    `Min: ${getTokenDisplayAmount(token.minAmount)} ${token.symbol || 'tokens'}`
                                  }
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

                {/* Add New Token Requirement - Multi-step Flow */}
                <div className="space-y-3 p-3 border border-dashed border-muted rounded-md">
                  <div className="flex items-center space-x-2">
                    <Plus className="h-4 w-4 text-primary" />
                    <Label className="text-sm font-medium">Add Token Requirement</Label>
                  </div>
                  
                  {/* Step 1: Contract Address Input */}
                  {!fetchedMetadata && (
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs font-medium">Contract Address</Label>
                        <div className="flex space-x-2">
                          <Input
                            placeholder="0x... (LSP7 or LSP8 token contract)"
                            value={contractAddress}
                            onChange={(e) => setContractAddress(e.target.value)}
                            disabled={disabled || isFetchingMetadata}
                            className="text-sm flex-1"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchTokenMetadata}
                            disabled={disabled || isFetchingMetadata || !contractAddress.trim()}
                            className="px-3"
                          >
                            {isFetchingMetadata ? (
                              <div className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full" />
                            ) : (
                              <Search className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                        {fetchError && (
                          <div className="flex items-center space-x-1 mt-1 text-xs text-red-600">
                            <AlertTriangle className="h-3 w-3" />
                            <span>{fetchError}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Step 2: Show Fetched Metadata + Amount Input */}
                  {fetchedMetadata && (
                    <div className="space-y-3">
                      {/* Success indicator with token info */}
                      <div className="flex items-center space-x-2 p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-md border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                            {fetchedMetadata.name} ({fetchedMetadata.symbol})
                          </div>
                          <div className="text-xs text-emerald-700 dark:text-emerald-300">
                            {fetchedMetadata.tokenType} Token • {fetchedMetadata.contractAddress.slice(0, 10)}...{fetchedMetadata.contractAddress.slice(-8)}
                            {fetchedMetadata.decimals && (
                              <span> • {fetchedMetadata.decimals} decimals</span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={resetFetchState}
                          disabled={disabled}
                          className="p-1 h-auto text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Amount/Token ID input based on token type */}
                      {fetchedMetadata.tokenType === 'LSP7' ? (
                        <div>
                          <Label className="text-xs font-medium">Minimum Amount Required</Label>
                          <div className="flex space-x-2">
                            <Input
                              type="number"
                              step="any"
                              placeholder="e.g., 100"
                              value={newTokenRequirement.minAmount}
                              onChange={(e) => setNewTokenRequirement(prev => ({ ...prev, minAmount: e.target.value }))}
                              disabled={disabled}
                              className="text-sm flex-1"
                            />
                            <div className="flex items-center px-3 bg-muted rounded-md border">
                              <span className="text-sm text-muted-foreground font-medium">
                                {fetchedMetadata.symbol}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <Label className="text-xs font-medium">NFT Requirement</Label>
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id="any-nft"
                                name="nft-requirement"
                                checked={!newTokenRequirement.tokenId && !newTokenRequirement.minAmount}
                                onChange={() => setNewTokenRequirement(prev => ({ ...prev, tokenId: '', minAmount: '' }))}
                                disabled={disabled}
                                className="h-3 w-3"
                              />
                              <Label htmlFor="any-nft" className="text-xs">
                                Any NFT from this collection (default)
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id="collection-amount"
                                name="nft-requirement"
                                checked={Boolean(newTokenRequirement.minAmount) && !newTokenRequirement.tokenId}
                                onChange={() => setNewTokenRequirement(prev => ({ ...prev, tokenId: '', minAmount: '1' }))}
                                disabled={disabled}
                                className="h-3 w-3"
                              />
                              <Label htmlFor="collection-amount" className="text-xs">
                                Minimum NFTs from collection:
                              </Label>
                              <Input
                                type="number"
                                placeholder="1"
                                value={newTokenRequirement.minAmount}
                                onChange={(e) => setNewTokenRequirement(prev => ({ ...prev, minAmount: e.target.value, tokenId: '' }))}
                                disabled={disabled || (!newTokenRequirement.minAmount && !Boolean(newTokenRequirement.minAmount))}
                                className="text-sm w-16"
                                min="1"
                              />
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id="specific-nft"
                                name="nft-requirement"
                                checked={Boolean(newTokenRequirement.tokenId)}
                                onChange={() => setNewTokenRequirement(prev => ({ ...prev, tokenId: '1', minAmount: '' }))}
                                disabled={disabled}
                                className="h-3 w-3"
                              />
                              <Label htmlFor="specific-nft" className="text-xs">
                                Specific NFT ID:
                              </Label>
                              <Input
                                placeholder="Token ID"
                                value={newTokenRequirement.tokenId}
                                onChange={(e) => setNewTokenRequirement(prev => ({ ...prev, tokenId: e.target.value, minAmount: '' }))}
                                disabled={disabled || !Boolean(newTokenRequirement.tokenId)}
                                className="text-sm w-24"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Add requirement button */}
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleAddTokenRequirement}
                        disabled={
                          disabled || 
                          (fetchedMetadata.tokenType === 'LSP7' && newTokenRequirement.minAmount.trim() === '') ||
                          (fetchedMetadata.tokenType === 'LSP8' && newTokenRequirement.tokenId !== '' && newTokenRequirement.tokenId.trim() === '') ||
                          (fetchedMetadata.tokenType === 'LSP8' && newTokenRequirement.minAmount !== '' && newTokenRequirement.minAmount.trim() === '')
                        }
                        className="w-full text-xs"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Token Requirement
                      </Button>
                    </div>
                  )}
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
/**
 * Ethereum Profile Category Renderer
 * 
 * Implements the CategoryRenderer interface for Ethereum Profile gating
 * Encapsulates all Ethereum-specific verification and UI logic
 */

import React, { ReactNode } from 'react';
import { 
  CategoryRenderer, 
  CategoryRendererProps, 
  CategoryConfigProps, 
  CategoryConnectionProps,
  GatingCategoryMetadata, 
  VerificationResult,
  EthereumGatingRequirements,
  ERC20Requirement,
  ERC721Requirement,
  EFPRequirement
} from '@/types/gating';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

import { ethers } from 'ethers';
import { EthereumConnectionWidget } from '@/components/ethereum/EthereumConnectionWidget';
import { EFPUserSearch } from '@/components/gating/EFPUserSearch';

// ===== ETHEREUM PROFILE RENDERER CLASS =====

export class EthereumProfileRenderer implements CategoryRenderer {
  
  /**
   * Get category metadata for branding and display
   */
  getMetadata(): GatingCategoryMetadata {
    return {
      name: 'Ethereum Profile',
      description: 'Ethereum blockchain identity & social verification',
      icon: '⟠', // Ethereum diamond
      brandColor: '#627EEA', // Ethereum blue
      shortName: 'ETH'
    };
  }

  /**
   * Render the display component (for PostCard and detail views)
   */
  renderDisplay(props: CategoryRendererProps): ReactNode {
    const { category, userStatus, isExpanded, onToggleExpanded, onConnect, onDisconnect, disabled } = props;
    const requirements = category.requirements as EthereumGatingRequirements;
    const metadata = this.getMetadata();

    return (
      <EthereumDisplayComponent
        category={category}
        requirements={requirements}
        userStatus={userStatus}
        isExpanded={isExpanded}
        onToggleExpanded={onToggleExpanded}
        metadata={metadata}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
        disabled={disabled}
      />
    );
  }

  /**
   * Render the configuration component (for post creation)
   */
  renderConfig(props: CategoryConfigProps): ReactNode {
    const { requirements, onChange, disabled } = props;
    
    return (
      <EthereumConfigComponent
        requirements={requirements as EthereumGatingRequirements}
        onChange={(newReqs) => onChange(newReqs)}
        disabled={disabled}
      />
    );
  }

  /**
   * NEW: Render the connection component (for commenter-side)
   */
  renderConnection(props: CategoryConnectionProps): ReactNode {
    const { requirements, onConnect, onDisconnect, postId, userStatus, onVerificationComplete, isPreviewMode } = props;
    
    return (
      <EthereumConnectionWidget
        requirements={requirements as EthereumGatingRequirements}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
        postId={postId}
        serverVerified={userStatus?.verified || false}
        onVerificationComplete={onVerificationComplete}
        isPreviewMode={isPreviewMode}
      />
    );
  }

  /**
   * NEW: Generate challenge for Ethereum verification
   */
  async generateChallenge(ethAddress: string, postId: number): Promise<unknown> {
    const challenge = {
      type: 'ethereum_profile',
      chainId: 1, // Ethereum mainnet
      address: ethAddress,
      postId,
      timestamp: Date.now(),
      nonce: Math.random().toString(36).substring(2, 15),
      message: `Verify access to post ${postId} on Ethereum mainnet\nAddress: ${ethAddress}\nTimestamp: ${Date.now()}`
    };
    
    return challenge;
  }

  /**
   * NEW: Verify user requirements (server-side)
   */
  async verifyUserRequirements(ethAddress: string, requirements: unknown): Promise<VerificationResult> {
    try {
      const reqs = requirements as EthereumGatingRequirements;
      
      // Call the server-side verification function
      const response = await fetch('/api/ethereum/verify-requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: ethAddress,
          requirements: reqs
        })
      });

      if (!response.ok) {
        throw new Error(`Verification failed: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        isValid: result.valid || false,
        missingRequirements: result.missingRequirements || [],
        errors: result.errors || []
      };
    } catch (error) {
      console.error('[EthereumProfileRenderer] Verification failed:', error);
      return {
        isValid: false,
        missingRequirements: [],
        errors: [error instanceof Error ? error.message : 'Verification failed']
      };
    }
  }

  /**
   * NEW: Validate Ethereum signature
   */
  async validateSignature(challenge: unknown): Promise<boolean> {
    try {
      const challengeObj = challenge as { 
        address: string; 
        message: string; 
        signature: string; 
        chainId: number;
      };

      if (!challengeObj.address || !challengeObj.message || !challengeObj.signature) {
        console.error('[EthereumProfileRenderer] Invalid challenge format');
        return false;
      }

      // Call server-side signature validation
      const response = await fetch('/api/ethereum/validate-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: challengeObj.address,
          message: challengeObj.message,
          signature: challengeObj.signature,
          chainId: challengeObj.chainId
        })
      });

      if (!response.ok) {
        console.error('[EthereumProfileRenderer] Signature validation request failed:', response.status);
        return false;
      }

      const result = await response.json();
      return result.valid || false;
    } catch (error) {
      console.error('[EthereumProfileRenderer] Signature validation failed:', error);
      return false;
    }
  }

  /**
   * Client-side verification using Ethereum context
   */
  async verify(requirements: EthereumGatingRequirements, ethAddress?: string): Promise<VerificationResult> {
    if (!ethAddress) {
      return {
        isValid: false,
        missingRequirements: ['Ethereum wallet not connected'],
        errors: []
      };
    }

    try {
      // This would be called from a component that has access to the Ethereum context
      // For now, call the server-side verification
      return await this.verifyUserRequirements(ethAddress, requirements);
    } catch (error) {
      console.error('[EthereumProfileRenderer] Client verification failed:', error);
      return {
        isValid: false,
        missingRequirements: [],
        errors: [error instanceof Error ? error.message : 'Verification failed']
      };
    }
  }

  /**
   * Validate requirements structure
   */
  validateRequirements(requirements: unknown): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!requirements || typeof requirements !== 'object') {
      errors.push('Requirements must be an object');
      return { valid: false, errors };
    }

    const req = requirements as Record<string, unknown>;

    // Validate ETH balance
    if (req.minimumETHBalance !== undefined) {
      try {
        ethers.utils.parseEther(req.minimumETHBalance as string);
      } catch {
        errors.push('Invalid ETH balance format');
      }
    }

    // Validate ERC-20 requirements
    if (req.requiredERC20Tokens && Array.isArray(req.requiredERC20Tokens)) {
      for (const token of req.requiredERC20Tokens) {
        const tokenObj = token as Record<string, unknown>;
        if (!tokenObj.contractAddress || !/^0x[a-fA-F0-9]{40}$/.test(tokenObj.contractAddress as string)) {
          errors.push('Invalid ERC-20 contract address');
        }
        if (!tokenObj.minimum) {
          errors.push('ERC-20 minimum balance is required');
        }
      }
    }

    // Validate ERC-721 requirements
    if (req.requiredERC721Collections && Array.isArray(req.requiredERC721Collections)) {
      for (const nft of req.requiredERC721Collections) {
        const nftObj = nft as Record<string, unknown>;
        if (!nftObj.contractAddress || !/^0x[a-fA-F0-9]{40}$/.test(nftObj.contractAddress as string)) {
          errors.push('Invalid ERC-721 contract address');
        }
      }
    }

    // Validate EFP requirements
    if (req.efpRequirements && Array.isArray(req.efpRequirements)) {
      for (const efp of req.efpRequirements) {
        const efpObj = efp as Record<string, unknown>;
        if (!efpObj.type || !['minimum_followers', 'must_follow', 'must_be_followed_by'].includes(efpObj.type as string)) {
          errors.push('Invalid EFP requirement type');
        }
        if (!efpObj.value) {
          errors.push('EFP requirement value is required');
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Get default requirements structure
   */
  getDefaultRequirements(): EthereumGatingRequirements {
    return {
      requiresENS: false,
      minimumETHBalance: undefined,
      requiredERC20Tokens: [],
      requiredERC721Collections: [],
      requiredERC1155Tokens: [],
      efpRequirements: []
    };
  }
}

// ===== DISPLAY COMPONENT =====

interface EthereumDisplayComponentProps extends CategoryRendererProps {
  requirements: EthereumGatingRequirements;
  metadata: GatingCategoryMetadata;
}

const EthereumDisplayComponent: React.FC<EthereumDisplayComponentProps> = ({
  requirements,
  userStatus,
  isExpanded, // eslint-disable-line @typescript-eslint/no-unused-vars
  onToggleExpanded, // eslint-disable-line @typescript-eslint/no-unused-vars
  metadata, // eslint-disable-line @typescript-eslint/no-unused-vars
  onConnect,
  onDisconnect
}) => {
  // EthereumConnectionWidget handles all the RainbowKit integration, wallet connection,
  // balance checking, verification status, and UI display internally
  // Note: This is used in poster-side display, so no verification completion callback needed
  return (
    <EthereumConnectionWidget
      requirements={requirements}
      onConnect={onConnect}
      onDisconnect={onDisconnect}
      serverVerified={userStatus?.verified || false}
    />
  );
};

// ===== CONFIG COMPONENT =====

interface EthereumConfigComponentProps {
  requirements: EthereumGatingRequirements;
  onChange: (requirements: EthereumGatingRequirements) => void;
  disabled?: boolean;
}

const EthereumConfigComponent: React.FC<EthereumConfigComponentProps> = ({
  requirements,
  onChange,
  disabled = false
}) => {
  const handleETHBalanceChange = (ethAmount: string) => {
    try {
      if (!ethAmount.trim()) {
        const newRequirements = { ...requirements };
        delete newRequirements.minimumETHBalance;
        onChange(newRequirements);
        return;
      }

      const weiAmount = ethers.utils.parseEther(ethAmount).toString();
      onChange({ ...requirements, minimumETHBalance: weiAmount });
    } catch (error) {
      console.error('Invalid ETH amount:', error);
    }
  };

  const getETHDisplayAmount = (weiAmount: string): string => {
    try {
      return ethers.utils.formatEther(weiAmount);
    } catch {
      return weiAmount;
    }
  };

  // ERC-20 token management
  const addERC20Token = () => {
    const newToken = {
      contractAddress: '',
      minimum: '',
      name: '',
      symbol: '',
      decimals: 18
    };
    const updatedTokens = [...(requirements.requiredERC20Tokens || []), newToken];
    onChange({ ...requirements, requiredERC20Tokens: updatedTokens });
  };

  const updateERC20Token = (index: number, field: keyof ERC20Requirement, value: string | number) => {
    const updatedTokens = [...(requirements.requiredERC20Tokens || [])];
    updatedTokens[index] = { ...updatedTokens[index], [field]: value };
    onChange({ ...requirements, requiredERC20Tokens: updatedTokens });
  };

  const removeERC20Token = (index: number) => {
    const updatedTokens = [...(requirements.requiredERC20Tokens || [])];
    updatedTokens.splice(index, 1);
    onChange({ ...requirements, requiredERC20Tokens: updatedTokens.length > 0 ? updatedTokens : undefined });
  };

  // ERC-721 NFT management
  const addERC721Collection = () => {
    const newCollection = {
      contractAddress: '',
      minimumCount: 1,
      name: '',
      symbol: ''
    };
    const updatedCollections = [...(requirements.requiredERC721Collections || []), newCollection];
    onChange({ ...requirements, requiredERC721Collections: updatedCollections });
  };

  const updateERC721Collection = (index: number, field: keyof ERC721Requirement, value: string | number) => {
    const updatedCollections = [...(requirements.requiredERC721Collections || [])];
    updatedCollections[index] = { ...updatedCollections[index], [field]: value };
    onChange({ ...requirements, requiredERC721Collections: updatedCollections });
  };

  const removeERC721Collection = (index: number) => {
    const updatedCollections = [...(requirements.requiredERC721Collections || [])];
    updatedCollections.splice(index, 1);
    onChange({ ...requirements, requiredERC721Collections: updatedCollections.length > 0 ? updatedCollections : undefined });
  };

  // EFP requirement management
  const addEFPRequirement = () => {
    const newRequirement = {
      type: 'minimum_followers' as const,
      value: '',
      description: ''
    };
    const updatedRequirements = [...(requirements.efpRequirements || []), newRequirement];
    onChange({ ...requirements, efpRequirements: updatedRequirements });
  };

  const updateEFPRequirement = (index: number, field: keyof EFPRequirement, value: string) => {
    const updatedRequirements = [...(requirements.efpRequirements || [])];
    updatedRequirements[index] = { ...updatedRequirements[index], [field]: value };
    const newRequirements = { ...requirements, efpRequirements: updatedRequirements };
    onChange(newRequirements);
  };

  const removeEFPRequirement = (index: number) => {
    const updatedRequirements = [...(requirements.efpRequirements || [])];
    updatedRequirements.splice(index, 1);
    onChange({ ...requirements, efpRequirements: updatedRequirements.length > 0 ? updatedRequirements : undefined });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Configure Ethereum Requirements
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Set the criteria users must meet to access your content
        </p>
      </div>

      {/* ETH Balance Card */}
      <div className="group relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 transition-all duration-300 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-2xl">💎</span>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">ETH Balance</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Minimum Ethereum holdings required</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Input
              type="number"
              placeholder="0.0"
              value={requirements.minimumETHBalance ? getETHDisplayAmount(requirements.minimumETHBalance) : ''}
              onChange={(e) => handleETHBalanceChange(e.target.value)}
              disabled={disabled}
              className="w-24 text-center border-blue-200 focus:border-blue-400 focus:ring-blue-400"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">ETH</span>
          </div>
        </div>
        {requirements.minimumETHBalance && (
          <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <p className="text-xs text-blue-800 dark:text-blue-200">
              ✓ Users need at least {getETHDisplayAmount(requirements.minimumETHBalance)} ETH in their wallet
            </p>
          </div>
        )}
      </div>

      {/* ENS Name Card */}
      <div className="group relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-6 transition-all duration-300 hover:shadow-lg hover:border-purple-300 dark:hover:border-purple-600">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-2xl">📛</span>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">ENS Domain</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Require users to have an ENS name</p>
            </div>
          </div>
          <div className="flex items-center">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={requirements.requiresENS || false}
                onChange={(e) => onChange({ ...requirements, requiresENS: e.target.checked })}
                disabled={disabled}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
            </label>
          </div>
        </div>
        {requirements.requiresENS && (
          <div className="mt-4 space-y-3">
            <Input
              type="text"
              placeholder="e.g., *.eth, *.xyz (comma-separated patterns)"
              value={requirements.ensDomainPatterns?.join(', ') || ''}
              onChange={(e) => {
                const patterns = e.target.value.split(',').map(s => s.trim()).filter(s => s);
                onChange({ ...requirements, ensDomainPatterns: patterns.length ? patterns : undefined });
              }}
              disabled={disabled}
              className="border-purple-200 focus:border-purple-400 focus:ring-purple-400"
            />
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <p className="text-xs text-purple-800 dark:text-purple-200">
                ✓ Users must own an ENS domain matching your patterns
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ERC-20 Tokens Card */}
      <div className="group relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6 transition-all duration-300 hover:shadow-lg hover:border-green-300 dark:hover:border-green-600">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-2xl">🪙</span>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">ERC-20 Tokens</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Require specific token holdings</p>
            </div>
          </div>
          <Button
            type="button"
            onClick={addERC20Token}
            disabled={disabled}
            className="bg-green-500 hover:bg-green-600 text-white shadow-md"
            size="sm"
          >
            <span className="text-lg mr-1">+</span>
            Add Token
          </Button>
        </div>
        
        {requirements.requiredERC20Tokens && requirements.requiredERC20Tokens.length > 0 ? (
          <div className="space-y-4">
            {requirements.requiredERC20Tokens.map((token, index) => (
              <div key={index} className="relative p-4 bg-white dark:bg-gray-800 rounded-xl border border-green-200 dark:border-green-700 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-green-700 dark:text-green-300">
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-gray-100">
                        {token.name || `Token ${index + 1}`}
                      </h5>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {token.symbol || 'Token requirement'}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeERC20Token(index)}
                    disabled={disabled}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    ✕
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-gray-600 dark:text-gray-400">Contract Address</Label>
                    <Input
                      type="text"
                      placeholder="0x..."
                      value={token.contractAddress}
                      onChange={(e) => updateERC20Token(index, 'contractAddress', e.target.value)}
                      disabled={disabled}
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600 dark:text-gray-400">Minimum Amount</Label>
                    <Input
                      type="text"
                      placeholder="1000"
                      value={token.minimum}
                      onChange={(e) => updateERC20Token(index, 'minimum', e.target.value)}
                      disabled={disabled}
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600 dark:text-gray-400">Token Name (Optional)</Label>
                    <Input
                      type="text"
                      placeholder="USD Coin"
                      value={token.name || ''}
                      onChange={(e) => updateERC20Token(index, 'name', e.target.value)}
                      disabled={disabled}
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600 dark:text-gray-400">Symbol (Optional)</Label>
                    <Input
                      type="text"
                      placeholder="USDC"
                      value={token.symbol || ''}
                      onChange={(e) => updateERC20Token(index, 'symbol', e.target.value)}
                      disabled={disabled}
                      className="mt-1 text-xs"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <span className="text-4xl mb-2 block opacity-50">🪙</span>
            <p className="text-sm">No token requirements yet</p>
            <p className="text-xs">Click &quot;Add Token&quot; to get started</p>
          </div>
        )}
      </div>

      {/* NFT Collections Card */}
      <div className="group relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 p-6 transition-all duration-300 hover:shadow-lg hover:border-orange-300 dark:hover:border-orange-600">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-2xl">🖼️</span>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">NFT Collections</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Require ownership of specific NFTs</p>
            </div>
          </div>
          <Button
            type="button"
            onClick={addERC721Collection}
            disabled={disabled}
            className="bg-orange-500 hover:bg-orange-600 text-white shadow-md"
            size="sm"
          >
            <span className="text-lg mr-1">+</span>
            Add Collection
          </Button>
        </div>
        
        {requirements.requiredERC721Collections && requirements.requiredERC721Collections.length > 0 ? (
          <div className="space-y-4">
            {requirements.requiredERC721Collections.map((collection, index) => (
              <div key={index} className="relative p-4 bg-white dark:bg-gray-800 rounded-xl border border-orange-200 dark:border-orange-700 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-orange-700 dark:text-orange-300">
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-gray-100">
                        {collection.name || `Collection ${index + 1}`}
                      </h5>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {collection.symbol || 'NFT requirement'}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeERC721Collection(index)}
                    disabled={disabled}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    ✕
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <Label className="text-xs text-gray-600 dark:text-gray-400">Contract Address</Label>
                    <Input
                      type="text"
                      placeholder="0x..."
                      value={collection.contractAddress}
                      onChange={(e) => updateERC721Collection(index, 'contractAddress', e.target.value)}
                      disabled={disabled}
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600 dark:text-gray-400">Minimum Count</Label>
                    <Input
                      type="number"
                      placeholder="1"
                      value={collection.minimumCount || 1}
                      onChange={(e) => updateERC721Collection(index, 'minimumCount', parseInt(e.target.value) || 1)}
                      disabled={disabled}
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600 dark:text-gray-400">Collection Name</Label>
                    <Input
                      type="text"
                      placeholder="Bored Ape Yacht Club"
                      value={collection.name || ''}
                      onChange={(e) => updateERC721Collection(index, 'name', e.target.value)}
                      disabled={disabled}
                      className="mt-1 text-xs"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <span className="text-4xl mb-2 block opacity-50">🖼️</span>
            <p className="text-sm">No NFT requirements yet</p>
            <p className="text-xs">Click &quot;Add Collection&quot; to get started</p>
          </div>
        )}
      </div>

      {/* EFP Social Requirements Card */}
      <div className="group relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 p-6 transition-all duration-300 hover:shadow-lg hover:border-pink-300 dark:hover:border-pink-600">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 w-12 h-12 bg-pink-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-2xl">👥</span>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">EFP Social</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Ethereum Follow Protocol requirements</p>
            </div>
          </div>
          <Button
            type="button"
            onClick={addEFPRequirement}
            disabled={disabled}
            className="bg-pink-500 hover:bg-pink-600 text-white shadow-md"
            size="sm"
          >
            <span className="text-lg mr-1">+</span>
            Add Social Rule
          </Button>
        </div>
        
        {requirements.efpRequirements && requirements.efpRequirements.length > 0 ? (
          <div className="space-y-4">
            {requirements.efpRequirements.map((efp, index) => (
              <div key={index} className="relative p-4 bg-white dark:bg-gray-800 rounded-xl border border-pink-200 dark:border-pink-700 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-pink-700 dark:text-pink-300">
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-gray-100">
                        {efp.type === 'minimum_followers' ? 'Follower Count' : 
                         efp.type === 'must_follow' ? 'Must Follow' : 'Must Be Followed By'}
                      </h5>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {efp.description || 'Social requirement'}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeEFPRequirement(index)}
                    disabled={disabled}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    ✕
                  </Button>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-gray-600 dark:text-gray-400">Requirement Type</Label>
                    <select
                      value={efp.type}
                      onChange={(e) => updateEFPRequirement(index, 'type', e.target.value)}
                      disabled={disabled}
                      className="mt-1 w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="minimum_followers">Minimum Followers</option>
                      <option value="must_follow">Must Follow Address</option>
                      <option value="must_be_followed_by">Must Be Followed By Address</option>
                    </select>
                  </div>
                  
                  {efp.type === 'minimum_followers' ? (
                    <div>
                      <Label className="text-xs text-gray-600 dark:text-gray-400">Minimum Follower Count</Label>
                      <Input
                        type="number"
                        placeholder="100"
                        value={efp.value}
                        onChange={(e) => updateEFPRequirement(index, 'value', e.target.value)}
                        disabled={disabled}
                        className="mt-1 text-sm"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-600 dark:text-gray-400">
                        Search for user to {efp.type === 'must_follow' ? 'follow' : 'be followed by'}
                      </Label>
                      <EFPUserSearch
                        onSelect={(profile) => {
                          // ✅ Fix: Update both value and description in a single state change to prevent race condition
                          const updatedRequirements = [...(requirements.efpRequirements || [])];
                          updatedRequirements[index] = {
                            ...updatedRequirements[index],
                            value: profile.address,
                            description: `${profile.displayName} (${profile.ensName || profile.address.slice(0, 6) + '...' + profile.address.slice(-4)})`
                          };
                          const newRequirements = { ...requirements, efpRequirements: updatedRequirements };
                          onChange(newRequirements);
                        }}
                        placeholder={`Search for user to ${efp.type === 'must_follow' ? 'follow' : 'be followed by'}`}
                        className="text-sm"
                      />
                      {efp.value && (
                        <div className="p-2 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
                          <p className="text-xs text-pink-700 dark:text-pink-300">
                            Selected: {efp.description || efp.value}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <span className="text-4xl mb-2 block opacity-50">👥</span>
            <p className="text-sm">No social requirements yet</p>
            <p className="text-xs">Click &quot;Add Social Rule&quot; to get started</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Export the renderer instance
export const ethereumProfileRenderer = new EthereumProfileRenderer(); 
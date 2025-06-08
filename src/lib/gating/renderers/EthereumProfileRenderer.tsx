/**
 * Ethereum Profile Category Renderer
 * 
 * Implements the CategoryRenderer interface for Ethereum Profile gating
 * Encapsulates all Ethereum-specific verification and UI logic
 */

import React, { ReactNode, useState, useEffect } from 'react';
import { 
  CategoryRenderer, 
  CategoryRendererProps, 
  CategoryConfigProps, 
  GatingCategoryMetadata, 
  VerificationResult,
  EthereumGatingRequirements
} from '@/types/gating';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Coins, 
  CheckCircle, 
  AlertTriangle, 
  Users, 
  ChevronDown,
  ChevronUp,
  User
} from 'lucide-react';

import { ethers } from 'ethers';

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
   * Client-side verification (placeholder for now)
   */
  async verify(): Promise<VerificationResult> {
    // TODO: Implement client-side verification
    // This would call Ethereum RPC and EFP API for verification
    return {
      isValid: true,
      missingRequirements: [],
      errors: []
    };
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

    // Validate ERC-1155 requirements
    if (req.requiredERC1155Tokens && Array.isArray(req.requiredERC1155Tokens)) {
      for (const token of req.requiredERC1155Tokens) {
        const tokenObj = token as Record<string, unknown>;
        if (!tokenObj.contractAddress || !/^0x[a-fA-F0-9]{40}$/.test(tokenObj.contractAddress as string)) {
          errors.push('Invalid ERC-1155 contract address');
        }
        if (!tokenObj.tokenId) {
          errors.push('ERC-1155 token ID is required');
        }
        if (!tokenObj.minimum) {
          errors.push('ERC-1155 minimum balance is required');
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
  isExpanded,
  onToggleExpanded,
  metadata,
  onConnect,
  onDisconnect // eslint-disable-line @typescript-eslint/no-unused-vars
}) => {
  const [ensProfile, setEnsProfile] = useState<{ name?: string; avatar?: string }>();
  const [efpStats, setEfpStats] = useState<{ followers: number; following: number }>();
  
  // TODO: Implement ENS and EFP data fetching
  useEffect(() => {
    if (userStatus.connected) {
      // Fetch ENS profile and EFP stats when connected
      // This will be implemented when we create the EthereumProfileContext
      setEnsProfile(undefined); // Placeholder to avoid unused variable error
      setEfpStats(undefined); // Placeholder to avoid unused variable error
    }
  }, [userStatus.connected]);

  // Helper functions
  const formatETHAmount = (weiAmount: string): string => {
    try {
      return ethers.utils.formatEther(weiAmount);
    } catch {
      return weiAmount;
    }
  };

  return (
    <div 
      className="border-l-4 rounded-lg p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20"
      style={{ borderLeftColor: metadata.brandColor }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{metadata.icon}</span>
          <span className="font-medium text-sm">{metadata.name}</span>
          {userStatus.connected && (
            <Badge variant={userStatus.verified ? "default" : "secondary"} className="text-xs">
              {userStatus.verified ? "Verified" : "Connected"}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleExpanded}
          className="h-auto p-1"
        >
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </Button>
      </div>

      {/* Requirements Summary */}
      <div className="space-y-3">
        {/* ETH Balance */}
        {requirements.minimumETHBalance && (
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-800">
              <Coins size={10} className="mr-1" />
              {formatETHAmount(requirements.minimumETHBalance)} ETH
            </Badge>
            <span className="text-xs text-muted-foreground">minimum balance required</span>
          </div>
        )}

        {/* ENS Requirement */}
        {requirements.requiresENS && (
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs bg-purple-50 border-purple-200 text-purple-800">
              <User size={10} className="mr-1" />
              ENS Name
            </Badge>
            <span className="text-xs text-muted-foreground">
              {requirements.ensDomainPatterns?.length 
                ? `matching: ${requirements.ensDomainPatterns.join(', ')}`
                : 'any domain required'
              }
            </span>
            {ensProfile?.name && (
              <span className="text-xs font-medium text-blue-600">{ensProfile.name}</span>
            )}
          </div>
        )}

        {/* EFP Requirements */}
        {requirements.efpRequirements && requirements.efpRequirements.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">EFP Social Requirements:</div>
            {requirements.efpRequirements.map((efp, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs bg-green-50 border-green-200 text-green-800">
                  <Users size={10} className="mr-1" />
                  {efp.type === 'minimum_followers' 
                    ? `${efp.value} followers` 
                    : efp.type === 'must_follow' 
                    ? 'Must follow' 
                    : 'Must be followed by'
                  }
                </Badge>
                {efp.description && (
                  <span className="text-xs text-muted-foreground">{efp.description}</span>
                )}
              </div>
            ))}
            {efpStats && (
              <div className="text-xs text-muted-foreground">
                Current: {efpStats.followers} followers, {efpStats.following} following
              </div>
            )}
          </div>
        )}

        {/* Token Requirements */}
        {requirements.requiredERC20Tokens && requirements.requiredERC20Tokens.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Required ERC-20 Tokens:</div>
            {requirements.requiredERC20Tokens.map((token, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs bg-yellow-50 border-yellow-200 text-yellow-800">
                  <span className="mr-1">🪙</span>
                  {token.symbol || token.name || 'Token'}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {token.minimum ? ethers.utils.formatUnits(token.minimum, token.decimals || 18) : '1'} minimum
                </span>
              </div>
            ))}
          </div>
        )}

        {/* NFT Requirements */}
        {requirements.requiredERC721Collections && requirements.requiredERC721Collections.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Required NFT Collections:</div>
            {requirements.requiredERC721Collections.map((nft, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs bg-pink-50 border-pink-200 text-pink-800">
                  <span className="mr-1">🖼️</span>
                  {nft.name || nft.symbol || 'NFT'}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {nft.minimumCount || 1} NFT{(nft.minimumCount || 1) !== 1 ? 's' : ''} required
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ERC-1155 Requirements */}
        {requirements.requiredERC1155Tokens && requirements.requiredERC1155Tokens.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Required ERC-1155 Tokens:</div>
            {requirements.requiredERC1155Tokens.map((token, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs bg-indigo-50 border-indigo-200 text-indigo-800">
                  <span className="mr-1">🎨</span>
                  {token.name || `Token #${token.tokenId}`}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {token.minimum} minimum balance
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Connection Controls */}
      {!userStatus.connected && (
        <div className="mt-4">
          <Button onClick={onConnect} size="sm" className="w-full">
            <Shield size={14} className="mr-2" />
            Connect Ethereum Wallet
          </Button>
        </div>
      )}

      {userStatus.connected && !userStatus.verified && (
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center space-x-2">
            <AlertTriangle size={14} className="text-yellow-600" />
            <span className="text-xs font-medium text-yellow-800 dark:text-yellow-200">
              Requirements not met
            </span>
          </div>
          {userStatus.requirements.length > 0 && (
            <div className="mt-2 text-xs text-yellow-700 dark:text-yellow-300">
              Missing: {userStatus.requirements.filter(r => !r.satisfied).map(r => r.name).join(', ')}
            </div>
          )}
        </div>
      )}

      {userStatus.connected && userStatus.verified && (
        <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center space-x-2">
            <CheckCircle size={14} className="text-green-600" />
            <span className="text-xs font-medium text-green-800 dark:text-green-200">
              All requirements satisfied
            </span>
          </div>
        </div>
      )}
    </div>
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

  return (
    <div className="space-y-4">
      {/* ETH Balance Requirement */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Coins className="h-4 w-4 text-blue-500" />
          <Label className="text-sm font-medium">Minimum ETH Balance</Label>
        </div>
        <div className="flex space-x-2">
          <Input
            type="number"
            placeholder="e.g., 1.5"
            value={requirements.minimumETHBalance ? getETHDisplayAmount(requirements.minimumETHBalance) : ''}
            onChange={(e) => handleETHBalanceChange(e.target.value)}
            disabled={disabled}
            className="text-sm"
          />
          <div className="flex items-center px-3 bg-muted rounded-md">
            <span className="text-sm text-muted-foreground">ETH</span>
          </div>
        </div>
      </div>

      {/* ENS Requirements */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={requirements.requiresENS || false}
            onChange={(e) => onChange({ ...requirements, requiresENS: e.target.checked })}
            disabled={disabled}
            className="h-4 w-4"
          />
          <Label className="text-sm font-medium">Require ENS Name</Label>
        </div>
        {requirements.requiresENS && (
          <Input
            type="text"
            placeholder="e.g., *.eth, *.xyz (comma-separated)"
            value={requirements.ensDomainPatterns?.join(', ') || ''}
            onChange={(e) => {
              const patterns = e.target.value.split(',').map(s => s.trim()).filter(s => s);
              onChange({ ...requirements, ensDomainPatterns: patterns.length ? patterns : undefined });
            }}
            disabled={disabled}
            className="text-sm ml-6"
          />
        )}
      </div>

      {/* Placeholder for other requirements */}
      <div className="text-sm text-muted-foreground italic">
        Additional configuration for ERC-20, ERC-721, ERC-1155, and EFP requirements coming soon...
      </div>
    </div>
  );
};

// Export the renderer instance
export const ethereumProfileRenderer = new EthereumProfileRenderer(); 
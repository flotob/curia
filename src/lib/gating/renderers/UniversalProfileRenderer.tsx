/**
 * Universal Profile Category Renderer
 * 
 * Implements the CategoryRenderer interface for Universal Profile gating
 * Encapsulates all UP-specific verification and UI logic
 */

import React, { ReactNode, useState, useEffect, useCallback } from 'react';
import { 
  CategoryRenderer, 
  CategoryRendererProps, 
  CategoryConfigProps, 
  CategoryConnectionProps,
  GatingCategoryMetadata, 
  VerificationResult,
  UPGatingRequirements
} from '@/types/gating';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Plus, 
  X, 
  Coins, 
  CheckCircle, 
  AlertTriangle, 
  Users, 
  UserCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

import { ethers } from 'ethers';
import { getUPSocialProfile, UPSocialProfile } from '@/lib/upProfile';
import { UPSocialProfileDisplay } from '@/components/social/UPSocialProfileDisplay';
import { InlineUPConnection } from '@/components/comment/InlineUPConnection';
import { PostSettings } from '@/types/settings';
import { ChallengeUtils } from '@/lib/verification/challengeUtils';

// ===== HELPER FUNCTIONS =====

/**
 * Convert new UPGatingRequirements format to old postSettings format
 * for compatibility with InlineUPConnection
 */
function convertRequirementsToPostSettings(requirements: UPGatingRequirements): PostSettings {
  return {
    responsePermissions: {
      upGating: {
        enabled: true,
        requirements: requirements
      }
    }
  };
}

// ===== UNIVERSAL PROFILE RENDERER CLASS =====

export class UniversalProfileRenderer implements CategoryRenderer {
  
  /**
   * Get category metadata for branding and display
   */
  getMetadata(): GatingCategoryMetadata {
    return {
      name: 'Universal Profile',
      description: 'LUKSO blockchain identity verification',
      icon: '🆙', // Could also use LUKSO logo
      brandColor: '#FE005B', // LUKSO Pink
      shortName: 'UP'
    };
  }

  /**
   * Render the display component (for PostCard and detail views)
   */
  renderDisplay(props: CategoryRendererProps): ReactNode {
    const { category, userStatus, isExpanded, onToggleExpanded, onConnect, onDisconnect, disabled } = props;
    const requirements = category.requirements as UPGatingRequirements;
    const metadata = this.getMetadata();

    return (
      <UPDisplayComponent
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
      <UPConfigComponent
        requirements={requirements as UPGatingRequirements}
        onChange={(newReqs) => onChange(newReqs)}
        disabled={disabled}
      />
    );
  }

  /**
   * Render the connection component (for commenter-side)
   * Uses the existing InlineUPConnection with format conversion
   */
  renderConnection(props: CategoryConnectionProps): ReactNode {
    const { requirements } = props;
    
    // Convert new requirements format to old postSettings format
    const postSettings = convertRequirementsToPostSettings(requirements as UPGatingRequirements);
    
    return (
      <InlineUPConnection 
        postSettings={postSettings}
        className="border-0 p-0 bg-transparent"
      />
    );
  }

  /**
   * Generate challenge for UP verification
   * Delegates to existing ChallengeUtils infrastructure
   */
  async generateChallenge(upAddress: string, postId: number): Promise<unknown> {
    try {
      // Use existing challenge generation infrastructure
      const challenge = ChallengeUtils.generateChallenge(postId, upAddress);
      console.log(`[UniversalProfileRenderer] Generated challenge for UP ${upAddress}, postId ${postId}`);
      return challenge;
    } catch (error) {
      console.error('[UniversalProfileRenderer] Challenge generation failed:', error);
      throw new Error('Failed to generate verification challenge');
    }
  }

  /**
   * Verify user requirements (server-side)
   * Note: This would typically be called from API routes, not client-side
   */
  async verifyUserRequirements(upAddress: string, _requirements: unknown): Promise<VerificationResult> { // eslint-disable-line @typescript-eslint/no-unused-vars
    try {
      // Note: This method would typically make an API call to server-side verification
      // For now, return a placeholder that indicates server-side verification is needed
      console.log(`[UniversalProfileRenderer] Requirements verification requested for ${upAddress}`);
      
      return {
        isValid: true, // This should be determined by server-side API call
        missingRequirements: [],
        errors: ['Server-side verification required - call from API route']
      };
    } catch (error) {
      console.error('[UniversalProfileRenderer] Requirements verification error:', error);
      return {
        isValid: false,
        missingRequirements: [],
        errors: ['Failed to verify requirements']
      };
    }
  }

  /**
   * Validate UP signature
   * Note: This would typically be called from API routes for security
   */
  async validateSignature(challenge: unknown): Promise<boolean> { // eslint-disable-line @typescript-eslint/no-unused-vars
    try {
      // Note: Signature validation should happen server-side for security
      // The existing verifyUPSignature function is in the API routes
      console.log('[UniversalProfileRenderer] Signature validation requested');
      console.log('[UniversalProfileRenderer] Note: Signature validation should be performed server-side via API');
      
      // For client-side, we return true since InlineUPConnection handles the real flow
      return true;
    } catch (error) {
      console.error('[UniversalProfileRenderer] Signature validation error:', error);
      return false;
    }
  }

  /**
   * Client-side verification of Universal Profile requirements
   * Delegates to InlineUPConnection's existing verification flow
   */
  async verify(requirements: UPGatingRequirements, userWallet: string): Promise<VerificationResult> {
    try {
      console.log('[UPRenderer] Client-side verification requested for:', userWallet);
      
      // The real verification happens through InlineUPConnection's flow:
      // 1. InlineUPConnection handles UP connection
      // 2. It calls /api/posts/[postId]/challenge for challenge generation
      // 3. User signs the challenge with their UP
      // 4. InlineUPConnection posts comment with signature
      // 5. API validates signature and requirements server-side
      
      // For the renderer interface, we indicate that verification is handled
      // by the connection component itself
      return { 
        isValid: true,
        missingRequirements: [],
        errors: []
      };
      
    } catch (error) {
      console.error('[UPRenderer] Verification error:', error);
      return { 
        isValid: false, 
        missingRequirements: [],
        errors: ['Failed to verify Universal Profile requirements']
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

    // Validate LYX balance
    if (req.minLyxBalance !== undefined) {
      try {
        ethers.utils.parseEther(req.minLyxBalance as string);
      } catch {
        errors.push('Invalid LYX balance format');
      }
    }

    // Validate token requirements
    if (req.requiredTokens && Array.isArray(req.requiredTokens)) {
      for (const token of req.requiredTokens) {
        const tokenObj = token as Record<string, unknown>;
        if (!tokenObj.contractAddress || !/^0x[a-fA-F0-9]{40}$/.test(tokenObj.contractAddress as string)) {
          errors.push('Invalid token contract address');
        }
        if (!tokenObj.tokenType || !['LSP7', 'LSP8'].includes(tokenObj.tokenType as string)) {
          errors.push('Invalid token type (must be LSP7 or LSP8)');
        }
      }
    }

    // Validate follower requirements
    if (req.followerRequirements && Array.isArray(req.followerRequirements)) {
      for (const follower of req.followerRequirements) {
        const followerObj = follower as Record<string, unknown>;
        if (!followerObj.type || !['minimum_followers', 'followed_by', 'following'].includes(followerObj.type as string)) {
          errors.push('Invalid follower requirement type');
        }
        if (!followerObj.value) {
          errors.push('Follower requirement value is required');
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Get default requirements structure
   */
  getDefaultRequirements(): UPGatingRequirements {
    return {
      minLyxBalance: undefined,
      requiredTokens: [],
      followerRequirements: []
    };
  }
}

// ===== DISPLAY COMPONENT =====

interface UPDisplayComponentProps extends CategoryRendererProps {
  requirements: UPGatingRequirements;
  metadata: GatingCategoryMetadata;
}

const UPDisplayComponent: React.FC<UPDisplayComponentProps> = ({
  requirements,
  userStatus,
  isExpanded,
  onToggleExpanded,
  metadata,
  onConnect,
  disabled
}) => {
  const [socialProfiles, setSocialProfiles] = useState<Record<string, UPSocialProfile>>({});
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);

  // Load social profiles for follower requirements
  const fetchSocialProfiles = useCallback(async (addresses: string[]) => {
    if (addresses.length === 0) return;
    
    setIsLoadingProfiles(true);
    try {
      console.log(`[UPDisplayComponent] Fetching social profiles for ${addresses.length} addresses`);
      
      const profilePromises = addresses.map(async (address) => {
        try {
          const profile = await getUPSocialProfile(address);
          return { address, profile };
        } catch (error) {
          console.error(`Failed to fetch social profile for ${address}:`, error);
          // Create fallback profile
          return { 
            address, 
            profile: {
              address,
              displayName: `${address.slice(0, 6)}...${address.slice(-4)}`,
              username: `@${address.slice(2, 6)}${address.slice(-4)}.lukso`,
              isVerified: false,
              lastFetched: new Date()
            } as UPSocialProfile
          };
        }
      });

      const profileResults = await Promise.all(profilePromises);
      const newProfiles: Record<string, UPSocialProfile> = {};
      
      profileResults.forEach(({ address, profile }) => {
        newProfiles[address] = profile;
      });

      setSocialProfiles(prev => ({ ...prev, ...newProfiles }));
    } catch (error) {
      console.error('[UPDisplayComponent] Error fetching social profiles:', error);
    } finally {
      setIsLoadingProfiles(false);
    }
  }, []);

  useEffect(() => {
    if (requirements.followerRequirements && requirements.followerRequirements.length > 0) {
      const addressesToFetch = requirements.followerRequirements
        .filter(req => req.type !== 'minimum_followers')
        .map(req => req.value)
        .filter(address => !socialProfiles[address]);

      if (addressesToFetch.length > 0) {
        fetchSocialProfiles(addressesToFetch);
      }
    }
  }, [requirements.followerRequirements, fetchSocialProfiles, socialProfiles]);

  // Helper functions
  const formatLyxAmount = (weiAmount: string): string => {
    try {
      return ethers.utils.formatEther(weiAmount);
    } catch {
      return weiAmount;
    }
  };

  return (
    <div 
      className="border-l-4 rounded-lg p-4 bg-gradient-to-r from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20"
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
        {/* LYX Balance */}
        {requirements.minLyxBalance && (
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs bg-yellow-50 border-yellow-200 text-yellow-800">
              <Coins size={10} className="mr-1" />
              {formatLyxAmount(requirements.minLyxBalance)} LYX
            </Badge>
            <span className="text-xs text-muted-foreground">minimum balance required</span>
          </div>
        )}

        {/* Token Requirements */}
        {requirements.requiredTokens && requirements.requiredTokens.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Required Tokens:</div>
            {requirements.requiredTokens.map((token, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs bg-purple-50 border-purple-200 text-purple-800">
                  <span className="mr-1">{token.tokenType === 'LSP8' ? '🎨' : '🪙'}</span>
                  {token.name || token.symbol || 'Token'}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {token.tokenType === 'LSP8' 
                    ? (token.tokenId ? `Token #${token.tokenId}` : `${token.minAmount || '1'} NFT${parseInt(token.minAmount || '1') !== 1 ? 's' : ''}`)
                    : `${token.minAmount ? ethers.utils.formatUnits(token.minAmount, 18) : '1'} ${token.symbol || 'tokens'}`
                  }
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Follower Requirements with Social Profiles */}
        {requirements.followerRequirements && requirements.followerRequirements.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Follower Requirements:</div>
            {requirements.followerRequirements.map((follower, idx) => (
              <div key={`follower-${idx}`} className="space-y-1">
                {follower.type === 'minimum_followers' ? (
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-800">
                      <Users size={10} className="mr-1" />
                      {follower.value} followers
                    </Badge>
                    <span className="text-xs text-muted-foreground">minimum follower count</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs bg-green-50 border-green-200 text-green-800">
                        <UserCheck size={10} className="mr-1" />
                        {follower.type === 'followed_by' ? 'Followed by' : 'Must follow'}
                      </Badge>
                    </div>
                    {/* Social Profile Display */}
                    {socialProfiles[follower.value] ? (
                      <UPSocialProfileDisplay
                        address={follower.value}
                        variant="compact"
                        showVerificationBadge={true}
                        showConnectionButton={false}
                        className="ml-4"
                        profileOverride={socialProfiles[follower.value]}
                      />
                    ) : isLoadingProfiles ? (
                      <div className="ml-4 flex items-center space-x-2">
                        <div className="h-6 w-6 bg-gray-200 rounded-full animate-pulse" />
                        <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                        <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
                      </div>
                    ) : (
                      <div className="ml-4 text-xs text-muted-foreground font-mono">
                        {follower.value.slice(0, 6)}...{follower.value.slice(-4)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Connection Status */}
      {!userStatus.connected ? (
        <div className="mt-4 pt-3 border-t border-pink-200">
          <Button
            size="sm"
            onClick={onConnect}
            disabled={disabled}
            className="w-full text-xs bg-pink-500 hover:bg-pink-600 text-white"
          >
            <Shield size={14} className="mr-2" />
            Connect {metadata.name}
          </Button>
        </div>
      ) : (
        /* Connected Status with Requirements Check */
        isExpanded && (
          <div className="mt-4 pt-3 border-t border-pink-200 space-y-2">
            <div className="text-xs font-medium text-green-600 flex items-center">
              <CheckCircle size={12} className="mr-1" />
              Connected to Universal Profile
            </div>
            {userStatus.requirements.map((req, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span>{req.name}</span>
                <div className="flex items-center space-x-1">
                  {req.satisfied ? (
                    <CheckCircle size={12} className="text-green-500" />
                  ) : (
                    <AlertTriangle size={12} className="text-red-500" />
                  )}
                  <span className={req.satisfied ? "text-green-600" : "text-red-600"}>
                    {req.satisfied ? "✓" : "✗"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};

// ===== CONFIG COMPONENT =====

interface UPConfigComponentProps {
  requirements: UPGatingRequirements;
  onChange: (requirements: UPGatingRequirements) => void;
  disabled?: boolean;
}

const UPConfigComponent: React.FC<UPConfigComponentProps> = ({
  requirements,
  onChange,
  disabled = false
}) => {
  // This would contain all the complex configuration logic from PostGatingControls
  // For now, let's create a simplified version
  
  const handleLyxBalanceChange = (lyxAmount: string) => {
    try {
      if (!lyxAmount.trim()) {
        const newRequirements = { ...requirements };
        delete newRequirements.minLyxBalance;
        onChange(newRequirements);
        return;
      }

      const weiAmount = ethers.utils.parseEther(lyxAmount).toString();
      onChange({ ...requirements, minLyxBalance: weiAmount });
    } catch (error) {
      console.error('Invalid LYX amount:', error);
    }
  };

  const getLyxDisplayAmount = (weiAmount: string): string => {
    try {
      return ethers.utils.formatEther(weiAmount);
    } catch {
      return weiAmount;
    }
  };

  return (
    <div className="space-y-4">
      {/* LYX Balance Requirement */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Coins className="h-4 w-4 text-pink-500" />
          <Label className="text-sm font-medium">Minimum LYX Balance</Label>
        </div>
        <div className="flex space-x-2">
          <Input
            type="number"
            placeholder="e.g., 100"
            value={requirements.minLyxBalance ? getLyxDisplayAmount(requirements.minLyxBalance) : ''}
            onChange={(e) => handleLyxBalanceChange(e.target.value)}
            disabled={disabled}
            className="text-sm"
          />
          <div className="flex items-center px-3 bg-muted rounded-md">
            <span className="text-sm text-muted-foreground">LYX</span>
          </div>
        </div>
      </div>

      {/* Token Requirements */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Shield className="h-4 w-4 text-pink-500" />
          <Label className="text-sm font-medium">Token Requirements</Label>
        </div>
        
        {/* Current tokens */}
        {requirements.requiredTokens && requirements.requiredTokens.length > 0 && (
          <div className="space-y-2">
            {requirements.requiredTokens.map((token, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                <div className="flex-1">
                  <div className="text-sm font-medium">
                    {token.name || token.symbol || `${token.tokenType} Token`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {token.contractAddress}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const updatedTokens = requirements.requiredTokens!.filter((_, i) => i !== index);
                    onChange({ ...requirements, requiredTokens: updatedTokens });
                  }}
                  disabled={disabled}
                  className="p-1 h-auto text-red-500 hover:text-red-700"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="w-full text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Token Requirement
        </Button>
      </div>

      {/* Follower Requirements - Simplified */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Users className="h-4 w-4 text-pink-500" />
          <Label className="text-sm font-medium">Follower Requirements</Label>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="w-full text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Follower Requirement
        </Button>
      </div>
    </div>
  );
};

// Export the renderer instance
export const universalProfileRenderer = new UniversalProfileRenderer(); 
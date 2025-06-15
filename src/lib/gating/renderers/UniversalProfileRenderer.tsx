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
  VerificationStatus,
  UPGatingRequirements,
  TokenRequirement,
  FollowerRequirement
} from '@/types/gating';

import { useAuth } from '@/contexts/AuthContext';
import { authFetchJson } from '@/utils/authFetch';
import { VerificationChallenge } from '@/lib/verification/types';
import { Loader2, CheckCircle, AlertTriangle, Coins, Users, UserCheck, ChevronDown, ChevronUp, Shield, Plus, X, Search } from 'lucide-react';

import { ethers } from 'ethers';
import { getUPSocialProfile, UPSocialProfile } from '@/lib/upProfile';
import { UPSocialProfileDisplay } from '@/components/social/UPSocialProfileDisplay';
import { RichRequirementsDisplay, ExtendedVerificationStatus } from '@/components/gating/RichRequirementsDisplay';
import { ChallengeUtils } from '@/lib/verification/challengeUtils';
import { useUniversalProfile } from '@/contexts/UniversalProfileContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
   * Uses the rich requirements display with real UP context data
   */
  renderConnection(props: CategoryConnectionProps): ReactNode {
    const { requirements, onConnect, onDisconnect, userStatus, disabled, postId, isPreviewMode } = props;
    const metadata = this.getMetadata();
    
    // This will be rendered within GatingRequirementsPanel which has UP context
    return (
      <UPConnectionComponent
        requirements={requirements as UPGatingRequirements}
        userStatus={userStatus}
        metadata={metadata}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
        disabled={disabled}
        postId={postId}
        isPreviewMode={isPreviewMode}
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

// ===== CONNECTION COMPONENT (uses real UP context) =====

interface UPConnectionComponentProps {
  requirements: UPGatingRequirements;
  userStatus?: VerificationStatus;
  metadata: GatingCategoryMetadata;
  onConnect: () => Promise<void>;
  onDisconnect: () => void;
  disabled?: boolean;
  postId?: number;
  isPreviewMode?: boolean;
}

const UPConnectionComponent: React.FC<UPConnectionComponentProps> = ({
  requirements,
  userStatus,
  metadata,
  onConnect,
  onDisconnect,
  disabled,
  postId,
  isPreviewMode = false
}) => {
  // ===== HOOKS =====

  const { token } = useAuth();
  // const invalidateVerificationStatus = useInvalidateVerificationStatus();
  // Removed useConditionalUniversalProfile as wagmi hooks now provide the state

  // ===== STATE =====

  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationState, setVerificationState] = useState<'idle' | 'success_pending' | 'error_pending'>('idle');
  const [error, setError] = useState<string | null>(null);

  // NOTE: All balance/follower state is now derived from the userStatus prop
  // which is fed by the wagmi provider in GatingRequirementsPreview.
  // This component is now stateless regarding on-chain data.

  // Check if all requirements are met for auto-verification
  const allRequirementsMet = true; // Simplified: verification button always active if connected

  // Verification function
  const handleVerify = useCallback(async (overridePostId?: number) => {
    // In preview mode, don't allow backend verification
    if (isPreviewMode) {
      console.log('[UPConnectionComponent] Preview mode - backend verification disabled');
      return false;
    }

    if (!userStatus?.connected || !userStatus?.upAddress || !token) {
      setError('Please connect your Universal Profile first');
      return false;
    }

    const targetPostId = overridePostId || postId;
    if (!targetPostId) {
      setError('No post ID available for verification');
      return false;
    }

    setIsVerifying(true);
    setError(null);

    try {
      console.log(`[UPConnectionComponent] Starting verification for post ${targetPostId}`);

      // Generate challenge
      await authFetchJson<{
        challenge: VerificationChallenge;
        message: string;
      }>(`/api/posts/${targetPostId}/challenge`, {
        method: 'POST',
        token,
        body: JSON.stringify({ upAddress: userStatus.upAddress }),
      });

      // Signing is now handled by the wagmi connector, but we need a provider instance
      // to call it. This part of the logic needs to be revisited if full verification
      // is to be triggered from here. For now, we focus on the preview display.
      // const signature = await ...;

      throw new Error('Signing and backend verification from here is not yet implemented with the new connector.');

    } catch (err) {
      console.error('[UPConnectionComponent] Verification error:', err);

      setVerificationState('error_pending');
      setError(err instanceof Error ? err.message : 'Verification failed');

      // Reset error state after delay
      setTimeout(() => {
        setVerificationState('idle');
      }, 3000);

      return false;
    } finally {
      setIsVerifying(false);
    }
  }, [userStatus, token, postId, isPreviewMode]);


  // ===== BUILD RICH PREVIEW DATA =====
  // Build token balances map for rich display
  const previewTokenBalances: Record<string, {
    raw: string;
    formatted: string;
    decimals?: number;
    name?: string;
    symbol?: string;
    iconUrl?: string;
  }> = {};

  if (userStatus?.tokenBalances && requirements?.requiredTokens?.length) {
    const balancesArr = userStatus.tokenBalances as unknown as { status: string; result?: unknown }[];
    requirements.requiredTokens.forEach((req, idx) => {
      const erc20Res = balancesArr[idx * 2];
      const erc721Res = balancesArr[idx * 2 + 1];

      let bal: bigint = BigInt(0);
      if (req.tokenType === 'LSP7' && erc20Res?.status === 'success') {
        bal = erc20Res.result as bigint;
      } else if (req.tokenType === 'LSP8' && erc721Res?.status === 'success') {
        bal = erc721Res.result as bigint;
      }

      previewTokenBalances[req.contractAddress] = {
        raw: bal.toString(),
        formatted: ethers.utils.formatUnits(bal, 18),
        decimals: 18,
        name: req.name,
        symbol: req.symbol,
      };
    });
  }

  // Followers status comes directly from userStatus (populated in preview provider)
  const previewFollowerStatus = userStatus?.followerStatus ?? {};

  // Create ExtendedVerificationStatus with real data from props
  const extendedUserStatus: ExtendedVerificationStatus = {
    connected: userStatus?.connected || false,
    verified: userStatus?.verified || false,
    requirements: userStatus?.requirements || [],
    address: userStatus?.upAddress || undefined,
    balances: {
      lyx: userStatus?.lyxBalance,
      tokens: previewTokenBalances,
    },
    followerStatus: previewFollowerStatus,
  };

  return (
    <div className="space-y-4">
      <RichRequirementsDisplay
        requirements={requirements}
        userStatus={extendedUserStatus}
        metadata={metadata}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
        disabled={disabled || isVerifying}
        className="border-0"
        isPreviewMode={isPreviewMode}
      />

      {/* Manual verification button */}
      {userStatus?.connected && (
        <div className="border-t pt-4">
          <Button
            onClick={() => handleVerify()}
            disabled={isVerifying || !allRequirementsMet}
            className="w-full"
            size="sm"
            variant={
              (isPreviewMode && allRequirementsMet) ? 'secondary' :
              verificationState === 'success_pending' ? 'default' :
              verificationState === 'error_pending' ? 'destructive' :
              allRequirementsMet ? 'default' : 'secondary'
            }
          >
            {(isPreviewMode && allRequirementsMet) ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Preview Complete ✓
              </>
            ) : verificationState === 'success_pending' ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Verification Submitted ✓
              </>
            ) : verificationState === 'error_pending' ? (
              <>
                <AlertTriangle className="h-4 w-4 mr-2" />
                {error || 'Verification Failed'}
              </>
            ) : isVerifying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verifying Requirements...
              </>
            ) : allRequirementsMet ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete Verification
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 mr-2" />
                Requirements Not Met
              </>
            )}
          </Button>

          {!allRequirementsMet && verificationState === 'idle' && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Meet all requirements above to enable verification.
            </p>
          )}
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

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
          type="button"
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
            type="button"
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
                  {req.isMet ? (
                    <CheckCircle size={12} className="text-green-500" />
                  ) : (
                    <AlertTriangle size={12} className="text-red-500" />
                  )}
                  <span className={req.isMet ? "text-green-600" : "text-red-600"}>
                    {req.isMet ? "✓" : "✗"}
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

// ===== SAFE UNIVERSAL PROFILE HOOK =====

// Custom hook to safely use UniversalProfile context with fallback
const useSafeUniversalProfile = () => {
  try {
    return useUniversalProfile();
  } catch {
    // Context not available - return null to indicate fallback should be used
    return null;
  }
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
  // ===== UNIVERSAL PROFILE CONTEXT (SAFE) =====
  
  // Safely attempt to use UP context - will be null if context not available
  const upContext = useSafeUniversalProfile();

  // ===== STATE =====
  
  // Local state for adding new token requirements
  const [newTokenRequirement, setNewTokenRequirement] = useState<{
    contractAddress: string;
    tokenType: 'LSP7' | 'LSP8';
    minAmount: string;
    tokenId: string;
    name: string;
    symbol: string;
  }>({
    contractAddress: '',
    tokenType: 'LSP7',
    minAmount: '',
    tokenId: '',
    name: '',
    symbol: ''
  });
  
  // State for metadata fetching process
  const [contractAddress, setContractAddress] = useState('');
  const [fetchedMetadata, setFetchedMetadata] = useState<{
    name: string;
    symbol: string;
    decimals?: number;
    tokenType: 'LSP7' | 'LSP8';
    contractAddress: string;
    iconUrl?: string; // Add icon URL to fetched metadata
  } | null>(null);
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Local state for adding new follower requirements
  const [newFollowerRequirement, setNewFollowerRequirement] = useState<{
    type: 'minimum_followers' | 'followed_by' | 'following';
    value: string;
    description: string;
  }>({
    type: 'minimum_followers',
    value: '',
    description: ''
  });
  const [showFollowerForm, setShowFollowerForm] = useState(false);

  // ===== UP PROFILE FETCHING FOR FOLLOWER REQUIREMENTS =====
  
  const [followerProfilePreview, setFollowerProfilePreview] = useState<UPSocialProfile | null>(null);
  const [isFetchingFollowerProfile, setIsFetchingFollowerProfile] = useState(false);
  const [followerProfileError, setFollowerProfileError] = useState<string | null>(null);
  const [attemptedProfileFetches, setAttemptedProfileFetches] = useState<Record<string, boolean>>({});

  // Fetch UP profile preview when user types an address
  const fetchFollowerProfilePreview = useCallback(async (address: string) => {
    if (!isValidAddress(address)) {
      setFollowerProfilePreview(null);
      setFollowerProfileError(null);
      return;
    }

    setIsFetchingFollowerProfile(true);
    setFollowerProfileError(null);

    try {
      console.log(`[UP Renderer] Fetching profile preview for ${address}`);
      const profile = await getUPSocialProfile(address);
      setFollowerProfilePreview(profile);
      console.log(`[UP Renderer] ✅ Profile preview fetched:`, profile);
    } catch (error) {
      console.error(`[UP Renderer] Failed to fetch profile preview:`, error);
      setFollowerProfileError('Unable to fetch profile. Address may not be a Universal Profile.');
      setFollowerProfilePreview(null);
    } finally {
      setIsFetchingFollowerProfile(false);
    }
  }, []);

  // Debounced profile fetching
  useEffect(() => {
    if (newFollowerRequirement.type !== 'minimum_followers' && newFollowerRequirement.value.trim()) {
      const timeoutId = setTimeout(() => {
        fetchFollowerProfilePreview(newFollowerRequirement.value.trim());
      }, 500); // 500ms debounce
      
      return () => clearTimeout(timeoutId);
    } else {
      setFollowerProfilePreview(null);
      setFollowerProfileError(null);
    }
  }, [newFollowerRequirement.value, newFollowerRequirement.type, fetchFollowerProfilePreview]);

  // ===== EXISTING FOLLOWER PROFILE FETCHING =====
  
  const [existingFollowerProfiles, setExistingFollowerProfiles] = useState<Record<string, UPSocialProfile>>({});
  const [isLoadingExistingProfiles, setIsLoadingExistingProfiles] = useState(false);

  // ===== EXISTING TOKEN ICON FETCHING =====
  
  const [existingTokenIcons, setExistingTokenIcons] = useState<Record<string, string>>({});
  const [isLoadingExistingTokenIcons, setIsLoadingExistingTokenIcons] = useState(false);
  const [attemptedIconFetches, setAttemptedIconFetches] = useState<Record<string, boolean>>({});



  // Fetch profiles for existing follower requirements
  const fetchExistingFollowerProfiles = useCallback(async (addresses: string[]) => {
    if (addresses.length === 0) return;
    
    setIsLoadingExistingProfiles(true);
    
    // Mark these addresses as attempted to prevent infinite retries
    const attemptedAddresses: Record<string, boolean> = {};
    addresses.forEach(address => {
      attemptedAddresses[address] = true;
    });
    setAttemptedProfileFetches(prev => ({ ...prev, ...attemptedAddresses }));
    
    try {
      console.log(`[UP Renderer Config] Fetching profiles for ${addresses.length} existing follower requirements`);
      
      const profilePromises = addresses.map(async (address) => {
        try {
          const profile = await getUPSocialProfile(address);
          return { address, profile };
        } catch (error) {
          console.error(`Failed to fetch profile for ${address}:`, error);
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

      setExistingFollowerProfiles(prev => ({ ...prev, ...newProfiles }));
    } catch (error) {
      console.error('[UP Renderer Config] Error fetching existing follower profiles:', error);
    } finally {
      setIsLoadingExistingProfiles(false);
    }
  }, []);

  // Load profiles for existing follower requirements on mount and when requirements change
  useEffect(() => {
    if (requirements.followerRequirements && requirements.followerRequirements.length > 0) {
      const addressesToFetch = requirements.followerRequirements
        .filter(req => req.type !== 'minimum_followers')
        .map(req => req.value)
        .filter(address => 
          isValidAddress(address) && 
          !existingFollowerProfiles[address] && 
          !attemptedProfileFetches[address]
        );

      if (addressesToFetch.length > 0) {
        fetchExistingFollowerProfiles(addressesToFetch);
      }
    }
  }, [requirements.followerRequirements, fetchExistingFollowerProfiles]);

  // ===== HELPER FUNCTIONS =====
  
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

  const getTokenDisplayAmount = (weiAmount: string): string => {
    try {
      return ethers.utils.formatUnits(weiAmount, 18);
    } catch {
      return weiAmount;
    }
  };

  // Validate contract address format
  const isValidContractAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  // Validate address format for follower requirements
  const isValidAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  // ===== TOKEN METADATA FETCHING =====
  
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
      console.log(`[UP Renderer] Fetching metadata for contract: ${contractAddress}`);

      // Try LSP7 first, then LSP8
      let tokenMetadata: { name: string; symbol: string; decimals?: number } | null = null;
      let detectedTokenType: 'LSP7' | 'LSP8' = 'LSP7';

      // Check if UP context is available for advanced metadata fetching
      if (upContext && upContext.getTokenMetadata) {
        console.log(`[UP Renderer] Using UniversalProfile context for ERC725Y metadata fetching`);
        
        try {
          // First try as LSP7
          console.log(`[UP Renderer] Trying LSP7 metadata for ${contractAddress}`);
          const lsp7Metadata = await upContext.getTokenMetadata(contractAddress, 'LSP7');
          if (lsp7Metadata) {
            tokenMetadata = lsp7Metadata;
            detectedTokenType = 'LSP7';
            console.log(`[UP Renderer] ✅ Successfully detected as LSP7:`, tokenMetadata);
          }
        } catch (lsp7Error) {
          console.log(`[UP Renderer] LSP7 failed, trying LSP8:`, lsp7Error);
          
          try {
            // Try as LSP8
            const lsp8Metadata = await upContext.getTokenMetadata(contractAddress, 'LSP8');
            if (lsp8Metadata) {
              tokenMetadata = lsp8Metadata;
              detectedTokenType = 'LSP8';
              console.log(`[UP Renderer] ✅ Successfully detected as LSP8:`, tokenMetadata);
            }
          } catch (lsp8Error) {
            console.error(`[UP Renderer] Both LSP7 and LSP8 failed:`, { lsp7Error, lsp8Error });
            throw new Error('Contract does not appear to be a valid LUKSO LSP7 or LSP8 token');
          }
        }

        // Additional validation - check if we can actually get balance/interface
        if (tokenMetadata && upContext && upContext.checkTokenBalance && upContext.isConnected && upContext.upAddress) {
          try {
            console.log(`[UP Renderer] Validating token type with balance check...`);
            const balanceData = await upContext.checkTokenBalance(contractAddress, detectedTokenType);
            if (balanceData) {
              console.log(`[UP Renderer] ✅ Balance check successful:`, balanceData);
              
              // Use the metadata from balance check if it's more complete
              if (balanceData.name && balanceData.name !== 'Unknown') {
                tokenMetadata.name = balanceData.name;
              }
              if (balanceData.symbol && balanceData.symbol !== 'UNK') {
                tokenMetadata.symbol = balanceData.symbol;
              }
              if (balanceData.decimals !== undefined) {
                tokenMetadata.decimals = balanceData.decimals;
              }
            }
          } catch (balanceError) {
            console.log(`[UP Renderer] Balance check failed (non-critical):`, balanceError);
            // Continue with metadata we have - balance check failure doesn't mean metadata is invalid
          }
        }
      } else {
        // Fallback: Use direct RPC calls when UP context is not available
        console.log(`[UP Renderer] UniversalProfile context not available, using fallback metadata fetching`);
        
        const rpcUrl = process.env.NEXT_PUBLIC_LUKSO_MAINNET_RPC_URL || 'https://rpc.mainnet.lukso.network';
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

        // Check for LSP7/LSP8 interfaces
        const contract = new ethers.Contract(contractAddress, [
          'function supportsInterface(bytes4) view returns (bool)',
          'function name() view returns (string)',
          'function symbol() view returns (string)',
          'function decimals() view returns (uint8)'
        ], provider);

        // LUKSO interface IDs
        const LSP7_INTERFACE_ID_NEW = '0xc52d6008'; // Latest
        const LSP7_INTERFACE_ID_LEGACY = '0xb3c4928f'; // Legacy for older tokens
        const LSP8_INTERFACE_ID = '0x3a271706'; // LSP8

        let isLSP7 = false, isLSP8 = false;
        try {
          const [newLSP7, legacyLSP7, lsp8] = await Promise.all([
            contract.supportsInterface(LSP7_INTERFACE_ID_NEW).catch(() => false),
            contract.supportsInterface(LSP7_INTERFACE_ID_LEGACY).catch(() => false),
            contract.supportsInterface(LSP8_INTERFACE_ID).catch(() => false)
          ]);
          
          isLSP7 = newLSP7 || legacyLSP7;
          isLSP8 = lsp8;
          
          console.log(`[UP Renderer] Interface check: LSP7=${isLSP7}, LSP8=${isLSP8}`);
        } catch (error) {
          console.log(`[UP Renderer] Interface check failed:`, error);
        }

        if (!isLSP7 && !isLSP8) {
          throw new Error('Contract does not appear to be a valid LUKSO LSP7 or LSP8 token.');
        }

        detectedTokenType = isLSP7 ? 'LSP7' : 'LSP8';
        console.log(`[UP Renderer] ✅ Detected as ${detectedTokenType} token`);

        // ✅ FIXED: Use proper LSP4 metadata fetching (same approach as UniversalProfileContext)
        let name = 'Unknown Token';
        let symbol = 'UNK';
        let decimals: number | undefined;

        if (detectedTokenType === 'LSP7') {
          // LSP7 might use ERC725Y data keys for name/symbol but standard decimals()
          try {
            // First try ERC725Y data keys
            const lsp7Contract = new ethers.Contract(contractAddress, [
              'function getData(bytes32) view returns (bytes)',
              'function getDataBatch(bytes32[]) view returns (bytes[])',
              'function decimals() view returns (uint8)'
            ], provider);

            // LSP4 metadata data keys
            const LSP4_TOKEN_NAME_KEY = '0xdeba1e292f8ba88238e10ab3c7f88bd4be4fac56cad5194b6ecceaf653468af1';
            const LSP4_TOKEN_SYMBOL_KEY = '0x2f0a68ab07768e01943a599e73362a0e17a63a72e94dd2e384d2c1d4db932756';
            
            const dataKeys = [LSP4_TOKEN_NAME_KEY, LSP4_TOKEN_SYMBOL_KEY];
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
            
            console.log(`[UP Renderer] ✅ LSP7 metadata via ERC725Y: name=${name}, symbol=${symbol}, decimals=${decimals}`);
          } catch (erc725yError) {
            console.log(`[UP Renderer] ⚠️ LSP7 ERC725Y metadata failed, trying fallback:`, erc725yError);
            
            // Fallback: try standard ERC20-like functions
            try {
              [name, symbol] = await Promise.all([
                contract.name().catch(() => 'Unknown Token'),
                contract.symbol().catch(() => 'UNK')
              ]);
              decimals = await contract.decimals().catch(() => 18);
              
              console.log(`[UP Renderer] ⚠️ LSP7 fallback to standard functions: name=${name}, symbol=${symbol}, decimals=${decimals}`);
            } catch (metadataError) {
              console.log(`[UP Renderer] ❌ LSP7 standard functions also failed:`, metadataError);
              decimals = 18;
            }
          }
        } else {
          // LSP8 uses ERC725Y data keys for metadata
          try {
            const lsp8Contract = new ethers.Contract(contractAddress, [
              'function getData(bytes32) view returns (bytes)',
              'function getDataBatch(bytes32[]) view returns (bytes[])'
            ], provider);

            // LSP4 metadata data keys
            const LSP4_TOKEN_NAME_KEY = '0xdeba1e292f8ba88238e10ab3c7f88bd4be4fac56cad5194b6ecceaf653468af1';
            const LSP4_TOKEN_SYMBOL_KEY = '0x2f0a68ab07768e01943a599e73362a0e17a63a72e94dd2e384d2c1d4db932756';
            
            const dataKeys = [LSP4_TOKEN_NAME_KEY, LSP4_TOKEN_SYMBOL_KEY];
            const [nameBytes, symbolBytes] = await lsp8Contract.getDataBatch(dataKeys);
            
            // Decode the bytes data
            if (nameBytes && nameBytes !== '0x') {
              name = ethers.utils.toUtf8String(nameBytes);
            }
            if (symbolBytes && symbolBytes !== '0x') {
              symbol = ethers.utils.toUtf8String(symbolBytes);
            }
            
            console.log(`[UP Renderer] ✅ LSP8 metadata via ERC725Y: name=${name}, symbol=${symbol}`);
          } catch (lsp8Error) {
            console.log(`[UP Renderer] ❌ LSP8 ERC725Y metadata failed:`, lsp8Error);
            
            // Fallback: try standard name()/symbol() functions in case it's a hybrid
            try {
              [name, symbol] = await Promise.all([
                contract.name().catch(() => 'Unknown Token'),
                contract.symbol().catch(() => 'UNK')
              ]);
              console.log(`[UP Renderer] ⚠️ LSP8 fallback to standard functions: name=${name}, symbol=${symbol}`);
            } catch (fallbackError) {
              console.log(`[UP Renderer] ❌ LSP8 fallback also failed:`, fallbackError);
            }
          }
        }

        tokenMetadata = {
          name,
          symbol,
          decimals: detectedTokenType === 'LSP7' ? decimals : undefined
        };
      }

      if (!tokenMetadata) {
        throw new Error('Failed to fetch token metadata');
      }

      // ===== FETCH TOKEN ICON =====
      
      let iconUrl: string | undefined;
      try {
        console.log(`[UP Renderer] Attempting to fetch token icon...`);
        
        if (upContext && upContext.isConnected) {
          // Use UP context provider if available
          const provider = new ethers.providers.Web3Provider((window as typeof window & { ethereum: unknown }).ethereum);
          iconUrl = await fetchTokenIcon(contractAddress, provider) || undefined;
        } else {
          // Use fallback RPC provider
          const rpcUrl = process.env.NEXT_PUBLIC_LUKSO_MAINNET_RPC_URL || 'https://rpc.mainnet.lukso.network';
          const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
          iconUrl = await fetchTokenIcon(contractAddress, provider) || undefined;
        }
        
        if (iconUrl) {
          console.log(`[UP Renderer] ✅ Token icon fetched successfully`);
        } else {
          console.log(`[UP Renderer] ⚠️ No token icon available`);
        }
      } catch (iconError) {
        console.log(`[UP Renderer] Icon fetch failed (non-critical):`, iconError);
      }

      const metadata = {
        name: tokenMetadata.name,
        symbol: tokenMetadata.symbol,
        decimals: tokenMetadata.decimals,
        tokenType: detectedTokenType,
        contractAddress,
        iconUrl
      };

      console.log(`[UP Renderer] ✅ Final token metadata:`, metadata);
      setFetchedMetadata(metadata);
      setFetchError(null);

    } catch (error) {
      console.error('[UP Renderer] Failed to fetch token metadata:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch token metadata. Please check the contract address and try again.';
      setFetchError(errorMessage);
    } finally {
      setIsFetchingMetadata(false);
    }
  };

  // ===== TOKEN ICON FETCHING =====

  // Helper to fetch LSP4Metadata and extract icon
  const fetchTokenIcon = useCallback(async (contractAddress: string, provider: ethers.providers.JsonRpcProvider | ethers.providers.Web3Provider): Promise<string | null> => {
    try {
      console.log(`[UP Renderer] Fetching LSP4Metadata icon for ${contractAddress}`);
      
      // Use ERC725Y to fetch LSP4Metadata
      const contract = new ethers.Contract(contractAddress, [
        'function getData(bytes32) view returns (bytes)'
      ], provider);

      // LSP4Metadata data key from LUKSO standards
      const LSP4_METADATA_KEY = '0x9afb95cacc9f95858ec44aa8c3b685511002e30ae54415823f406128b85b238e';
      
      try {
        const metadataBytes = await contract.getData(LSP4_METADATA_KEY);
        
        if (!metadataBytes || metadataBytes === '0x') {
          console.log(`[UP Renderer] No LSP4Metadata found for ${contractAddress}`);
          return null;
        }

        // Decode the metadata URL (VerifiableURI format)
        // First 4 bytes = verification method, next 32 bytes = hash, rest = URL
        const urlStart = 4 + 32; // Skip verification method (4) + hash (32)
        const urlLength = parseInt(metadataBytes.slice(2 + urlStart * 2, 2 + urlStart * 2 + 4), 16);
        const urlHex = metadataBytes.slice(2 + urlStart * 2 + 4, 2 + urlStart * 2 + 4 + urlLength * 2);
        const metadataUrl = ethers.utils.toUtf8String('0x' + urlHex);
        
        console.log(`[UP Renderer] Found metadata URL: ${metadataUrl}`);

        // Fetch the JSON metadata
        const ipfsUrl = metadataUrl.replace('ipfs://', 'https://api.universalprofile.cloud/ipfs/');
        const response = await fetch(ipfsUrl);
        const metadata = await response.json();

        // Extract icon from LSP4Metadata
        if (metadata.LSP4Metadata && metadata.LSP4Metadata.icon && metadata.LSP4Metadata.icon.length > 0) {
          const iconUrl = metadata.LSP4Metadata.icon[0].url;
          const resolvedIconUrl = iconUrl.replace('ipfs://', 'https://api.universalprofile.cloud/ipfs/');
          console.log(`[UP Renderer] ✅ Found token icon: ${resolvedIconUrl}`);
          return resolvedIconUrl;
        }

        console.log(`[UP Renderer] No icon found in LSP4Metadata`);
        return null;
        
      } catch (lsp4Error) {
        console.log(`[UP Renderer] LSP4Metadata fetch failed:`, lsp4Error);
        return null;
      }
      
    } catch (error) {
      console.error(`[UP Renderer] Token icon fetch failed:`, error);
      return null;
    }
  }, []);

  // Fetch icons for existing token requirements
  const fetchExistingTokenIcons = useCallback(async (contractAddresses: string[]) => {
    if (contractAddresses.length === 0) return;
    
    setIsLoadingExistingTokenIcons(true);
    
    // Mark these addresses as attempted to prevent infinite retries
    const attemptedAddresses: Record<string, boolean> = {};
    contractAddresses.forEach(address => {
      attemptedAddresses[address] = true;
    });
    setAttemptedIconFetches(prev => ({ ...prev, ...attemptedAddresses }));
    
    try {
      console.log(`[UP Renderer Config] Fetching icons for ${contractAddresses.length} existing token requirements`);
      
      // Use appropriate provider
      let provider: ethers.providers.JsonRpcProvider | ethers.providers.Web3Provider;
      if (upContext && upContext.isConnected && (window as typeof window & { ethereum?: unknown }).ethereum) {
        provider = new ethers.providers.Web3Provider((window as typeof window & { ethereum: unknown }).ethereum);
      } else {
        const rpcUrl = process.env.NEXT_PUBLIC_LUKSO_MAINNET_RPC_URL || 'https://rpc.mainnet.lukso.network';
        provider = new ethers.providers.JsonRpcProvider(rpcUrl);
      }
      
      const iconPromises = contractAddresses.map(async (contractAddress) => {
        try {
          const iconUrl = await fetchTokenIcon(contractAddress, provider);
          return { contractAddress, iconUrl };
        } catch (error) {
          console.error(`Failed to fetch icon for ${contractAddress}:`, error);
          return { contractAddress, iconUrl: null };
        }
      });

      const iconResults = await Promise.all(iconPromises);
      const newIcons: Record<string, string> = {};
      
      iconResults.forEach(({ contractAddress, iconUrl }) => {
        if (iconUrl) {
          newIcons[contractAddress] = iconUrl;
        }
      });

      setExistingTokenIcons(prev => ({ ...prev, ...newIcons }));
    } catch (error) {
      console.error('[UP Renderer Config] Error fetching existing token icons:', error);
    } finally {
      setIsLoadingExistingTokenIcons(false);
    }
  }, [fetchTokenIcon, upContext]);

  // Load icons for existing token requirements on mount and when requirements change
  useEffect(() => {
    if (requirements.requiredTokens && requirements.requiredTokens.length > 0) {
      const addressesToFetch = requirements.requiredTokens
        .map(token => token.contractAddress)
        .filter(address => 
          address.trim() && 
          !existingTokenIcons[address] && 
          !attemptedIconFetches[address]
        );

      if (addressesToFetch.length > 0) {
        fetchExistingTokenIcons(addressesToFetch);
      }
    }
  }, [requirements.requiredTokens, fetchExistingTokenIcons]);

  // ===== TOKEN REQUIREMENT HANDLERS =====
  
  const resetFetchState = () => {
    setContractAddress('');
    setFetchedMetadata(null);
    setFetchError(null);
    setNewTokenRequirement({
      contractAddress: '',
      tokenType: 'LSP7',
      minAmount: '',
      tokenId: '',
      name: '',
      symbol: ''
    });
  };

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
        tokenReq.tokenId = newTokenRequirement.tokenId;
      } else if (newTokenRequirement.minAmount) {
        tokenReq.minAmount = newTokenRequirement.minAmount;
      } else {
        tokenReq.minAmount = '1';
      }
    }

    const updatedTokens = [...(requirements.requiredTokens || []), tokenReq];
    onChange({ ...requirements, requiredTokens: updatedTokens });
    resetFetchState();
  };

  const handleRemoveTokenRequirement = (index: number) => {
    const updatedTokens = requirements.requiredTokens!.filter((_, i) => i !== index);
    onChange({ ...requirements, requiredTokens: updatedTokens });
  };

  // ===== FOLLOWER REQUIREMENT HANDLERS =====
  
  const handleAddFollowerRequirement = () => {
    if (!newFollowerRequirement.value.trim()) return;

    const followerReq: FollowerRequirement = {
      type: newFollowerRequirement.type,
      value: newFollowerRequirement.value.trim(),
      description: newFollowerRequirement.description.trim() || undefined
    };

    const updatedFollowerRequirements = [...(requirements.followerRequirements || []), followerReq];
    onChange({ ...requirements, followerRequirements: updatedFollowerRequirements });
    
    // Reset form state including profile preview
    setNewFollowerRequirement({
      type: 'minimum_followers',
      value: '',
      description: ''
    });
    setFollowerProfilePreview(null);
    setFollowerProfileError(null);
    setShowFollowerForm(false);
  };

  const handleRemoveFollowerRequirement = (index: number) => {
    const updatedFollowerRequirements = requirements.followerRequirements!.filter((_, i) => i !== index);
    onChange({ ...requirements, followerRequirements: updatedFollowerRequirements });
  };

  // ===== RENDER =====
  
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

      {/* Current Token Requirements */}
      {requirements.requiredTokens && requirements.requiredTokens.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Required Tokens</Label>
          <div className="space-y-2">
            {requirements.requiredTokens.map((token, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    {/* Token Icon */}
                    {existingTokenIcons[token.contractAddress] ? (
                      <img 
                        src={existingTokenIcons[token.contractAddress]} 
                        alt={`${token.name || 'Token'} icon`}
                        className="h-5 w-5 rounded-full object-cover border border-gray-300"
                        onError={(e) => {
                          // Hide image if it fails to load
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : isLoadingExistingTokenIcons ? (
                      <div className="h-5 w-5 rounded-full bg-gray-200 animate-pulse" />
                    ) : (
                      <div className="h-5 w-5 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                        {token.tokenType === 'LSP8' ? '🎨' : '🪙'}
                      </div>
                    )}
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
                  type="button"
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
                  type="button"
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
                <div className="flex items-center space-x-2">
                  {/* Token Icon */}
                  {fetchedMetadata.iconUrl ? (
                    <img 
                      src={fetchedMetadata.iconUrl} 
                      alt={`${fetchedMetadata.name} icon`}
                      className="h-6 w-6 rounded-full object-cover border border-emerald-300"
                      onError={(e) => {
                        // Hide image if it fails to load
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                      {fetchedMetadata.tokenType === 'LSP8' ? '🎨' : '🪙'}
                    </div>
                  )}
                  <div className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                    {fetchedMetadata.name} ({fetchedMetadata.symbol})
                  </div>
                </div>
                <div className="text-xs text-emerald-700 dark:text-emerald-300 ml-8">
                  {fetchedMetadata.tokenType} Token • {fetchedMetadata.contractAddress.slice(0, 10)}...{fetchedMetadata.contractAddress.slice(-8)}
                  {fetchedMetadata.decimals && (
                    <span> • {fetchedMetadata.decimals} decimals</span>
                  )}
                  {fetchedMetadata.iconUrl && (
                    <span> • Icon loaded from IPFS</span>
                  )}
                </div>
              </div>
              <Button
                type="button"
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
              type="button"
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

      {/* Follower Requirements Section */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Users className="h-4 w-4 text-primary" />
          <Label className="text-sm font-medium">Follower Requirements</Label>
        </div>

        {/* Current Follower Requirements */}
        {requirements.followerRequirements && requirements.followerRequirements.length > 0 && (
          <div className="space-y-2">
            {requirements.followerRequirements.map((followerReq, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      {followerReq.type === 'minimum_followers' ? (
                        <Users className="h-3 w-3 text-purple-500" />
                      ) : followerReq.type === 'followed_by' ? (
                        <UserCheck className="h-3 w-3 text-green-500" />
                      ) : (
                        <UserCheck className="h-3 w-3 text-blue-500" />
                      )}
                      <Badge variant="outline" className="text-xs">
                        {followerReq.type.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    
                    {/* Enhanced requirement display with profile names */}
                    {followerReq.type === 'minimum_followers' ? (
                      <span className="text-sm font-medium">
                        Minimum {followerReq.value} followers
                      </span>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">
                          {followerReq.type === 'followed_by' ? 'Must be followed by:' : 'Must follow:'}
                        </span>
                        
                        {/* Show profile if loaded, otherwise show loading or address */}
                        {existingFollowerProfiles[followerReq.value] ? (
                          <div className="flex items-center space-x-1">
                            <span className="text-sm font-semibold text-primary">
                              {existingFollowerProfiles[followerReq.value].username}
                            </span>
                            {existingFollowerProfiles[followerReq.value].isVerified && (
                              <CheckCircle className="h-3 w-3 text-blue-500" />
                            )}
                          </div>
                        ) : isLoadingExistingProfiles ? (
                          <div className="flex items-center space-x-1">
                            <div className="h-3 w-12 bg-gray-200 rounded animate-pulse" />
                            <div className="h-2 w-8 bg-gray-200 rounded animate-pulse" />
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground font-mono">
                            {followerReq.value.slice(0, 6)}...{followerReq.value.slice(-4)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Profile display name and address for non-minimum followers */}
                  {followerReq.type !== 'minimum_followers' && (
                    <div className="text-xs text-muted-foreground mt-1 ml-4">
                      {existingFollowerProfiles[followerReq.value] ? (
                        <div className="space-y-1">
                          <div>{existingFollowerProfiles[followerReq.value].displayName}</div>
                          <div className="font-mono">{followerReq.value}</div>
                        </div>
                      ) : (
                        <div className="font-mono">{followerReq.value}</div>
                      )}
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveFollowerRequirement(index)}
                  disabled={disabled}
                  className="p-1 h-auto"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add New Follower Requirement */}
        {!showFollowerForm ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowFollowerForm(true)}
            disabled={disabled}
            className="w-full text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Follower Requirement
          </Button>
        ) : (
          <div className="space-y-3 p-3 border border-dashed border-muted rounded-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Plus className="h-4 w-4 text-primary" />
                <Label className="text-sm font-medium">New Follower Requirement</Label>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowFollowerForm(false);
                  setNewFollowerRequirement({
                    type: 'minimum_followers',
                    value: '',
                    description: ''
                  });
                  setFollowerProfilePreview(null);
                  setFollowerProfileError(null);
                }}
                disabled={disabled}
                className="p-1 h-auto"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>

            {/* Requirement Type Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Requirement Type</Label>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="min-followers"
                    name="follower-type"
                    checked={newFollowerRequirement.type === 'minimum_followers'}
                    onChange={() => setNewFollowerRequirement(prev => ({ ...prev, type: 'minimum_followers', value: '' }))}
                    disabled={disabled}
                    className="h-3 w-3"
                  />
                  <div className="flex items-center space-x-1">
                    <Users className="h-3 w-3 text-purple-500" />
                    <Label htmlFor="min-followers" className="text-xs cursor-pointer">
                      Minimum follower count
                    </Label>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="followed-by"
                    name="follower-type"
                    checked={newFollowerRequirement.type === 'followed_by'}
                    onChange={() => setNewFollowerRequirement(prev => ({ ...prev, type: 'followed_by', value: '' }))}
                    disabled={disabled}
                    className="h-3 w-3"
                  />
                  <div className="flex items-center space-x-1">
                    <UserCheck className="h-3 w-3 text-green-500" />
                    <Label htmlFor="followed-by" className="text-xs cursor-pointer">
                      Must be followed by specific profile
                    </Label>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="following"
                    name="follower-type"
                    checked={newFollowerRequirement.type === 'following'}
                    onChange={() => setNewFollowerRequirement(prev => ({ ...prev, type: 'following', value: '' }))}
                    disabled={disabled}
                    className="h-3 w-3"
                  />
                  <div className="flex items-center space-x-1">
                    <UserCheck className="h-3 w-3 text-blue-500" />
                    <Label htmlFor="following" className="text-xs cursor-pointer">
                      Must follow specific profile
                    </Label>
                  </div>
                </div>
              </div>
            </div>

            {/* Value Input */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">
                {newFollowerRequirement.type === 'minimum_followers' 
                  ? 'Minimum Follower Count' 
                  : 'Universal Profile Address'}
              </Label>
              <Input
                type={newFollowerRequirement.type === 'minimum_followers' ? 'number' : 'text'}
                placeholder={
                  newFollowerRequirement.type === 'minimum_followers' 
                    ? 'e.g., 100' 
                    : '0x... (Universal Profile address)'
                }
                value={newFollowerRequirement.value}
                onChange={(e) => setNewFollowerRequirement(prev => ({ ...prev, value: e.target.value }))}
                disabled={disabled}
                className="text-sm"
                min={newFollowerRequirement.type === 'minimum_followers' ? "1" : undefined}
              />
              
              {/* Profile Preview for UP addresses */}
              {newFollowerRequirement.type !== 'minimum_followers' && newFollowerRequirement.value.trim() && (
                <div className="space-y-2">
                  {/* Loading state */}
                  {isFetchingFollowerProfile && (
                    <div className="flex items-center space-x-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
                      <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full text-blue-600" />
                      <span className="text-xs text-blue-600">Fetching profile...</span>
                    </div>
                  )}
                  
                  {/* Success - Profile Found */}
                  {followerProfilePreview && !isFetchingFollowerProfile && (
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800">
                      <div className="flex items-center space-x-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-xs font-medium text-green-700 dark:text-green-300">
                          Universal Profile Found
                        </span>
                      </div>
                      <UPSocialProfileDisplay
                        address={followerProfilePreview.address}
                        variant="compact"
                        showVerificationBadge={true}
                        showConnectionButton={false}
                        profileOverride={followerProfilePreview}
                      />
                    </div>
                  )}
                  
                  {/* Error state */}
                  {followerProfileError && !isFetchingFollowerProfile && (
                    <div className="flex items-center space-x-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="text-xs text-red-600">{followerProfileError}</span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Address validation error for invalid format */}
              {newFollowerRequirement.type !== 'minimum_followers' && newFollowerRequirement.value && !isValidAddress(newFollowerRequirement.value) && !isFetchingFollowerProfile && (
                <div className="flex items-center space-x-1 text-xs text-red-600">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Please enter a valid address (0x...)</span>
                </div>
              )}
            </div>

            {/* Optional Description */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Custom Description (Optional)</Label>
              <Input
                type="text"
                placeholder={
                  followerProfilePreview 
                    ? `e.g., Only followers of ${followerProfilePreview.username} can comment`
                    : "e.g., Only followers of @InfluencerAccount can comment"
                }
                value={newFollowerRequirement.description}
                onChange={(e) => setNewFollowerRequirement(prev => ({ ...prev, description: e.target.value }))}
                disabled={disabled}
                className="text-sm"
              />
            </div>

            {/* Add Button */}
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleAddFollowerRequirement}
              disabled={
                disabled || 
                !newFollowerRequirement.value.trim() ||
                (newFollowerRequirement.type === 'minimum_followers' && (isNaN(Number(newFollowerRequirement.value)) || Number(newFollowerRequirement.value) < 1)) ||
                (newFollowerRequirement.type !== 'minimum_followers' && !isValidAddress(newFollowerRequirement.value))
              }
              className="w-full text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Follower Requirement
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// Export the renderer instance
export const universalProfileRenderer = new UniversalProfileRenderer(); 
/**
 * Gating Requirements Panel
 * 
 * Displays verification "slots" for each required gating category.
 * Users fill slots by providing signatures/verifications before they can comment.
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

import { ensureRegistered } from '@/lib/gating/categoryRegistry';
import { ensureCategoriesRegistered } from '@/lib/gating/registerCategories';
import { VerificationStatus } from '@/types/gating';
import { useGatingRequirements, useVerificationStatus, useInvalidateVerificationStatus, CategoryStatus } from '@/hooks/useGatingData';
import { useEthereumProfile } from '@/contexts/EthereumProfileContext';
import { RichCategoryHeader } from './RichCategoryHeader';

// --- NEW WAGMI IMPORTS FOR LIVE COMPONENT ---
import {
  WagmiProvider,
  createConfig,
  http,
  useAccount,
  useBalance,
  useConnect,
  useDisconnect,
  useReadContracts,
  createStorage,
} from 'wagmi';
import { lukso, luksoTestnet } from 'viem/chains';
import { universalProfileConnector } from '@/lib/wagmi/connectors/universalProfile';
import { UPGatingRequirements } from '@/types/gating';
import { lsp26Registry } from '@/lib/lsp26';
import { erc20Abi, erc721Abi } from 'viem';
// --- END NEW WAGMI IMPORTS ---

// Ensure categories are registered when this module loads
ensureCategoriesRegistered();

// --- START NEW WAGMI CONFIG & MANAGER ---
const noopStorage = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getItem: (_key: string): string | null => null,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setItem: (_key: string, _value: string): void => {},
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  removeItem: (_key: string): void => {},
};

const upConfig = createConfig({
  chains: [lukso, luksoTestnet],
  connectors: [universalProfileConnector()],
  storage: createStorage({
    storage: typeof window !== 'undefined' ? window.localStorage : noopStorage,
    key: 'wagmi_up_live', // Use a different key than preview
  }),
  transports: {
    [lukso.id]: http(),
    [luksoTestnet.id]: http(),
  },
  ssr: true, // Enable SSR support for better hydration
});

interface UPConnectionManagerForPanelProps {
  requirements: UPGatingRequirements;
  onVerificationComplete: () => void;
  postId: number;
}

const UPConnectionManagerForPanel: React.FC<UPConnectionManagerForPanelProps> = ({ requirements, postId, onVerificationComplete }) => {
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { address, isConnected, status } = useAccount();
  const { data: balance } = useBalance({ address });

  // Fetch token balances
  const { data: tokenResults, isLoading: isLoadingTokens } = useReadContracts({
    contracts: requirements.requiredTokens?.flatMap(token => [
      { address: token.contractAddress as `0x{string}`, abi: erc20Abi, functionName: 'balanceOf', args: [address!] },
      { address: token.contractAddress as `0x{string}`, abi: erc721Abi, functionName: 'balanceOf', args: [address!] }
    ]) ?? [],
    query: { enabled: isConnected && !!address && (requirements.requiredTokens?.length ?? 0) > 0 }
  });

  // Fetch follower statuses
  const [followerStatus, setFollowerStatus] = useState<Record<string, boolean>>({});
  const [isLoadingFollowers, setIsLoadingFollowers] = useState(false);

  useEffect(() => {
    const fetchFollowers = async () => {
      if (!isConnected || !address || !requirements.followerRequirements?.length) {
        setFollowerStatus({});
        return;
      }
      setIsLoadingFollowers(true);
      const newStatus: Record<string, boolean> = {};
      for (const req of requirements.followerRequirements) {
        const key = `${req.type}-${req.value}`;
        try {
          if (req.type === 'minimum_followers') {
            const count = await lsp26Registry.getFollowerCount(address);
            newStatus[key] = count >= parseInt(req.value);
          } else if (req.type === 'followed_by') {
            newStatus[key] = await lsp26Registry.isFollowing(req.value, address);
          } else if (req.type === 'following') {
            newStatus[key] = await lsp26Registry.isFollowing(address, req.value);
          }
        } catch (e) {
          console.error(`Failed to check follower status for ${key}`, e);
          newStatus[key] = false;
        }
      }
      setFollowerStatus(newStatus);
      setIsLoadingFollowers(false);
    };
    fetchFollowers();
  }, [isConnected, address, requirements.followerRequirements]);

  const renderer = ensureRegistered('universal_profile');

  const handleConnect = async (event?: React.MouseEvent) => {
    event?.stopPropagation();
    event?.preventDefault();
    
    // Enhanced connection state checks
    if (isConnected) {
      console.log('[GatingRequirementsPanel] Already connected to:', address);
      return;
    }
    
    if (status === 'connecting' || status === 'reconnecting') {
      console.log('[GatingRequirementsPanel] Connection already in progress:', status);
      return;
    }
    
    const upConnector = connectors.find(c => c.id === 'universalProfile');
    if (!upConnector) {
      console.error('[GatingRequirementsPanel] Universal Profile connector not found');
      return;
    }
    
    try {
      console.log('[GatingRequirementsPanel] Initiating UP connection...');
      await connect({ connector: upConnector });
    } catch (error) {
      console.error('[GatingRequirementsPanel] Connection failed:', error);
    }
  };

  const userStatus: VerificationStatus = {
    connected: isConnected,
    verified: false,
    requirements: [],
    address: address,
    upAddress: address,
    lyxBalance: balance?.value,
    tokenBalances: tokenResults,
    followerStatus: followerStatus,
  };

  return renderer.renderConnection({
    requirements,
    onConnect: handleConnect,
    onDisconnect: disconnect,
    userStatus,
    disabled: status === 'connecting' || status === 'reconnecting' || isLoadingTokens || isLoadingFollowers,
    postId: postId,
    isPreviewMode: false,
    onVerificationComplete: onVerificationComplete,
  });
};
// --- END NEW WAGMI CONFIG & MANAGER ---

interface GatingRequirementsPanelProps {
  postId: number;
  onVerificationComplete?: (canComment: boolean) => void;
  className?: string;
}

export const GatingRequirementsPanel: React.FC<GatingRequirementsPanelProps> = ({
  postId,
  onVerificationComplete,
  className = ''
}) => {
  
  // ===== REACT QUERY HOOKS =====
  
  const { 
    data: gatingData, 
    isLoading: gatingLoading, 
    error: gatingError,
    refetch: refetchGating 
  } = useGatingRequirements(postId);
  
  const { 
    data: verificationStatus, 
    isLoading: statusLoading, 
    error: statusError,
    refetch: refetchStatus 
  } = useVerificationStatus(postId);
  
  // Hook to invalidate verification status after user actions
  const invalidateVerificationStatus = useInvalidateVerificationStatus();
  
  // ===== PROFILE CONTEXTS =====
  
  const ethereumProfile = useEthereumProfile();
  
  // ===== LOCAL STATE =====
  
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  
  // ===== AUTO-EXPAND LOGIC =====
  
  // Auto-expand first category that needs verification (accordion pattern)
  React.useEffect(() => {
    if (gatingData?.categories && expandedCategory === null) {
      const needsVerification = gatingData.categories
        .filter(cat => cat.enabled && cat.verificationStatus === 'not_started')
        .sort((a, b) => {
          // Priority: UP > Ethereum > Others
          const priority: Record<string, number> = { 
            universal_profile: 0, 
            ethereum_profile: 1 
          };
          return (priority[a.type] ?? 99) - (priority[b.type] ?? 99);
        });
      
      if (needsVerification.length > 0) {
        setExpandedCategory(needsVerification[0].type);
      }
    }
  }, [gatingData?.categories, expandedCategory]);
  
  // ===== PARENT NOTIFICATION =====
  
  // Notify parent component when verification status changes
  React.useEffect(() => {
    if (verificationStatus && onVerificationComplete) {
      onVerificationComplete(verificationStatus.canComment);
    }
  }, [verificationStatus?.canComment, onVerificationComplete]);

  // ===== HANDLERS =====

  const toggleCategoryExpanded = useCallback((categoryType: string) => {
    setExpandedCategory(prev => {
      // If clicking already expanded category → collapse it
      if (prev === categoryType) {
        return null;
      }
      // If clicking different category → expand that one (closes others)
      return categoryType;
    });
  }, []);

  const refreshData = useCallback(async () => {
    await Promise.all([
      refetchGating(),
      refetchStatus()
    ]);
  }, [refetchGating, refetchStatus]);

  // ===== RENDER HELPERS =====
  // Note: Status rendering moved to RichCategoryHeader component

  const renderCategorySlot = (category: CategoryStatus) => {
    const isExpanded = expandedCategory === category.type;
    
    return (
      <div key={category.type} className="border rounded-lg overflow-hidden">
        {/* Rich Category Header */}
        <RichCategoryHeader
          category={category}
          isExpanded={isExpanded}
          onToggle={() => toggleCategoryExpanded(category.type)}
        />

        {/* Category Content (Expanded) */}
        {isExpanded && (
          <div className="border-t bg-muted/20">
            <div className="p-4">
              {(() => {
                if (category.type === 'universal_profile') {
                  return (
                    <WagmiProvider config={upConfig}>
                      <UPConnectionManagerForPanel
                        requirements={category.requirements as UPGatingRequirements}
                        postId={postId}
                        onVerificationComplete={() => invalidateVerificationStatus(postId)}
                      />
                    </WagmiProvider>
                  );
                }

                if (category.type === 'ethereum_profile') {
                  const renderer = ensureRegistered(category.type);
                  return renderer.renderConnection({
                    requirements: category.requirements,
                    onConnect: ethereumProfile?.connect,
                    onDisconnect: ethereumProfile?.disconnect,
                    userStatus: {
                      connected: ethereumProfile?.isConnected || false,
                      verified: category.verificationStatus === 'verified',
                      requirements: [],
                    },
                    disabled: false,
                    postId: postId,
                    onVerificationComplete: () => invalidateVerificationStatus(postId),
                  });
                }

                // Fallback for other category types if any
                return (
                  <div className="text-sm text-muted-foreground">
                    Live verification for this category type is not available.
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ===== RENDER =====

  const loading = gatingLoading || statusLoading;
  const error = gatingError || statusError;

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-6">
          <div className="flex items-center space-x-2 text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading requirements...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`border-red-200 ${className}`}>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="h-4 w-4" />
            <span>{error instanceof Error ? error.message : 'Failed to load gating data'}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!gatingData || gatingData.categories.length === 0) {
    return null; // No gating requirements
  }

  const enabledCategories = gatingData.categories.filter(cat => cat.enabled);
  
  return (
    <Card className={`border-2 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center text-base">
              <Shield className="h-5 w-5 mr-2" />
              Verification Required
            </CardTitle>
            <CardDescription className="text-sm">
              {gatingData.requireAll 
                ? `Complete ALL ${enabledCategories.length} verification requirements to comment`
                : `Complete ANY of the ${enabledCategories.length} verification requirements to comment`
              }
            </CardDescription>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshData}
              disabled={loading}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Overall Status */}
        {verificationStatus && (
          <div className="mt-3 p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <div className="font-medium">
                  {verificationStatus.verifiedCategories} of {verificationStatus.totalCategories} completed
                </div>
                <div className="text-muted-foreground text-xs">
                  {verificationStatus.message}
                </div>
              </div>
              
              {verificationStatus.canComment ? (
                <Badge className="bg-green-100 text-green-800">
                  ✓ Ready to Comment
                </Badge>
              ) : (
                <Badge variant="outline">
                  Verification Needed
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {enabledCategories.map(renderCategorySlot)}
        
        {/* Help Text */}
        <Separator />
        <div className="text-center">
          <div className="text-xs text-muted-foreground">
            {gatingData.requireAll 
              ? "Connect and verify all categories above to unlock commenting"
              : "Connect and verify any one category above to unlock commenting"
            }
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 
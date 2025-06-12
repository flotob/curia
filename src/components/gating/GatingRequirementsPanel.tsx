/**
 * Gating Requirements Panel
 * 
 * Displays verification "slots" for each required gating category.
 * Users fill slots by providing signatures/verifications before they can comment.
 */

'use client';

import React, { useState, useCallback } from 'react';
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
import { useConditionalUniversalProfile, useUPActivation } from '@/contexts/ConditionalUniversalProfileProvider';
import { useEthereumProfile } from '@/contexts/EthereumProfileContext';
import { RichCategoryHeader } from './RichCategoryHeader';

// Ensure categories are registered when this module loads
ensureCategoriesRegistered();

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
  
  const universalProfile = useConditionalUniversalProfile();
  const upActivation = useUPActivation();
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
  
  // ===== UP ACTIVATION LOGIC =====
  
  // Activate Universal Profile when UP gating is detected
  React.useEffect(() => {
    if (gatingData?.categories) {
      const hasUPCategory = gatingData.categories.some(cat => 
        cat.enabled && cat.type === 'universal_profile'
      );
      
      if (hasUPCategory) {
        console.log('[GatingRequirementsPanel] UP gating detected, activating UP functionality');
        upActivation.activateUP();
      }
    }
  }, [gatingData?.categories, upActivation]);
  
  // Auto-trigger UP connection once Web3-Onboard is initialized
  React.useEffect(() => {
    if (upActivation.hasUserTriggeredConnection && 
        universalProfile?.isInitialized && 
        !universalProfile?.isConnected && 
        !universalProfile?.isConnecting) {
      console.log('[GatingRequirementsPanel] Web3-Onboard initialized, auto-triggering UP connection');
      universalProfile.connect().catch((error) => {
        console.error('[GatingRequirementsPanel] Auto-connection failed:', error);
      });
    }
  }, [upActivation.hasUserTriggeredConnection, universalProfile?.isInitialized, universalProfile?.isConnected, universalProfile?.isConnecting, universalProfile]);
  
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
                const renderer = ensureRegistered(category.type);
                
                // Create VerificationStatus based on actual connection state
                const mockUserStatus: VerificationStatus = (() => {
                  if (category.type === 'universal_profile') {
                    return {
                      connected: universalProfile?.isConnected || false,
                      verified: category.verificationStatus === 'verified',
                      requirements: []
                    };
                  } else if (category.type === 'ethereum_profile') {
                    return {
                      connected: ethereumProfile?.isConnected || false,
                      verified: category.verificationStatus === 'verified',
                      requirements: []
                    };
                  } else {
                    return {
                      connected: category.verificationStatus !== 'not_started',
                      verified: category.verificationStatus === 'verified',
                      requirements: []
                    };
                  }
                })();

                // Real connection handlers based on category type
                const handleConnect = async () => {
                  console.log(`[GatingRequirementsPanel] Connect triggered for ${category.type}`);
                  
                  try {
                    if (category.type === 'universal_profile') {
                      // Only initialize UP context - actual connection handled by effect
                      console.log('[GatingRequirementsPanel] Initializing Universal Profile connection...');
                      upActivation.initializeConnection();
                    } else if (category.type === 'ethereum_profile') {
                      // Use Ethereum Profile connection directly (no timing issues)
                      if (ethereumProfile?.connect) {
                        await ethereumProfile.connect();
                      } else {
                        console.warn('[GatingRequirementsPanel] Ethereum Profile context not available');
                      }
                    } else {
                      console.warn(`[GatingRequirementsPanel] Unknown category type: ${category.type}`);
                    }
                  } catch (error) {
                    console.error(`[GatingRequirementsPanel] Connection failed for ${category.type}:`, error);
                  }
                };

                const handleDisconnect = () => {
                  console.log(`[GatingRequirementsPanel] Disconnect triggered for ${category.type}`);
                  
                  try {
                    if (category.type === 'universal_profile') {
                      // Use Universal Profile disconnection
                      if (universalProfile?.disconnect) {
                        universalProfile.disconnect();
                      }
                    } else if (category.type === 'ethereum_profile') {
                      // Use Ethereum Profile disconnection
                      if (ethereumProfile?.disconnect) {
                        ethereumProfile.disconnect();
                      }
                    }
                  } catch (error) {
                    console.error(`[GatingRequirementsPanel] Disconnection failed for ${category.type}:`, error);
                  }
                };

                // Use the category renderer for connection UI
                return renderer.renderConnection({
                  requirements: category.requirements,
                  onConnect: handleConnect,
                  onDisconnect: handleDisconnect,
                  userStatus: mockUserStatus,
                  disabled: false,
                  postId: postId,
                  onVerificationComplete: () => {
                    console.log(`[GatingRequirementsPanel] Verification completed for ${category.type}, invalidating cache`);
                    invalidateVerificationStatus(postId);
                  }
                });
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
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
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { ensureRegistered } from '@/lib/gating/categoryRegistry';
import { ensureCategoriesRegistered } from '@/lib/gating/registerCategories';
import { useGatingRequirements, CategoryStatus } from '@/hooks/useGatingData';
import { useContextualVerificationStatus, useContextualInvalidateVerificationStatus } from '@/hooks/useContextualGatingData';
import { useEthereumProfile } from '@/contexts/EthereumProfileContext';
import { RichCategoryHeader } from './RichCategoryHeader';
import { UPVerificationWrapper } from '../verification/UPVerificationWrapper';
import { UPGatingRequirements } from '@/types/gating';

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
    error: gatingError
  } = useGatingRequirements(postId);
  
  // Posts with locks use lock verification, posts without locks have no gating
  const hasLockId = !!gatingData?.lockId;
  const verificationContext = hasLockId ? { type: 'post' as const, postId } : null;
  
  // Only use verification for posts with locks
  const contextualVerification = useContextualVerificationStatus(
    gatingData?.lockId || 0,
    verificationContext!
  );
  
  // For posts without locks, create a mock "no verification needed" response
  const noVerificationResponse = {
    data: {
      canComment: true,
      requireAll: false,
      totalCategories: 0,
      verifiedCategories: 0,
      categories: [],
      message: 'No verification required',
    },
    isLoading: false,
    error: null,
    refetch: () => Promise.resolve(),
  };
  
  const { 
    data: verificationStatus, 
    isLoading: statusLoading, 
    error: statusError
  } = hasLockId ? contextualVerification : noVerificationResponse;
  
  // Hook to invalidate verification status after user actions
  const contextualInvalidate = useContextualInvalidateVerificationStatus();
  
  // ===== PROFILE CONTEXTS =====
  
  const ethereumProfile = useEthereumProfile();
  
  // ===== LOCAL STATE =====
  
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(true); // Default collapsed
  
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
  
  // Create a combined verification complete handler that calls both React Query invalidation AND parent callback
  const handleVerificationComplete = useCallback(() => {
    console.log('[GatingRequirementsPanel] Verification completed - triggering both invalidation and parent callback');
    
    // 1. Invalidate React Query cache to refetch verification status
    if (hasLockId && gatingData?.lockId) {
      contextualInvalidate(gatingData.lockId, verificationContext!);
    }
    // Posts without locks don't need invalidation since there's no verification
    
    // 2. IMMEDIATELY notify parent component (don't wait for React Query)
    if (onVerificationComplete) {
      console.log('[GatingRequirementsPanel] Calling parent onVerificationComplete with true');
      onVerificationComplete(true);
    }
  }, [hasLockId, gatingData?.lockId, contextualInvalidate, verificationContext, onVerificationComplete]);

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

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

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
                    <UPVerificationWrapper
                      requirements={category.requirements as UPGatingRequirements}
                      fulfillment={category.fulfillment || 'all'}
                      onStatusUpdate={() => {}} // TODO: Implement status handling if needed for this panel
                      postId={postId}
                      isPreviewMode={false}
                      onVerificationComplete={handleVerificationComplete}
                      storageKey="wagmi_up_panel"
                      verificationContext={hasLockId ? {
                        type: 'post' as const,
                        postId: postId,
                        lockId: gatingData?.lockId,
                      } : undefined}
                    />
                  );
                }

                if (category.type === 'ethereum_profile') {
                  const renderer = ensureRegistered(category.type);
                  return renderer.renderConnection({
                    requirements: category.requirements,
                    fulfillment: category.fulfillment || 'all',
                    onConnect: ethereumProfile?.connect,
                    onDisconnect: ethereumProfile?.disconnect,
                    userStatus: {
                      connected: ethereumProfile?.isConnected || false,
                      verified: category.verificationStatus === 'verified',
                      requirements: [],
                    },
                    disabled: false,
                    postId: postId,
                    onVerificationComplete: handleVerificationComplete,
                    verificationContext: hasLockId ? {
                      type: 'post' as const,
                      postId: postId,
                      lockId: gatingData?.lockId,
                    } : undefined,
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
      <CardHeader 
        className={cn(
          "pb-3",
          isCollapsed && "cursor-pointer hover:bg-muted/30 transition-colors duration-200"
        )}
        onClick={isCollapsed ? toggleCollapsed : undefined}
      >
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
              onClick={(e) => {
                e.stopPropagation(); // Prevent header click when clicking chevron
                toggleCollapsed();
              }}
              className="h-8 w-8 p-0"
              title={isCollapsed ? "Show verification details" : "Hide verification details"}
            >
              {isCollapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
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

      {/* Collapsible Content */}
      {!isCollapsed && (
        <CardContent className="space-y-3 animate-in slide-in-from-top-1 duration-200">
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
      )}
    </Card>
  );
}; 
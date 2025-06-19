/**
 * Generic Lock Verification Panel
 * 
 * A clean, reusable component for verifying any lock in any context.
 * Doesn't care if it's verifying for a post, board, or preview - 
 * just verifies the lock using the provided context.
 */

'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, RefreshCw } from 'lucide-react';
import { 
  useContextualGatingRequirements, 
  useContextualVerificationStatus, 
  useContextualInvalidateVerificationStatus,
  ContextualCategoryStatus 
} from '@/hooks/useContextualGatingData';
import { ensureRegistered } from '@/lib/gating/categoryRegistry';
import { ensureCategoriesRegistered } from '@/lib/gating/registerCategories';
import { useEthereumProfile } from '@/contexts/EthereumProfileContext';
import { useUniversalProfile } from '@/contexts/UniversalProfileContext';

import { RichCategoryHeader } from '@/components/gating/RichCategoryHeader';

// ===== TYPES =====

export type VerificationContext = 
  | { type: 'board'; communityId: string; boardId: number }
  | { type: 'post'; postId: number }
  | { type: 'preview' };

export interface LockVerificationPanelProps {
  lockId: number;
  verificationContext?: VerificationContext;
  onVerificationComplete?: (success: boolean) => void;
  className?: string;
}

// Ensure categories are registered when this module loads
ensureCategoriesRegistered();

// ===== COMPONENT =====

export const LockVerificationPanel: React.FC<LockVerificationPanelProps> = ({
  lockId,
  verificationContext,
  onVerificationComplete,
  className = ''
}) => {
  // Default to preview mode if no context provided (backwards compatibility)
  const context: VerificationContext = verificationContext || { type: 'preview' };

  // ===== REACT QUERY HOOKS =====
  
  const { 
    data: gatingData, 
    isLoading: gatingLoading, 
    error: gatingError
  } = useContextualGatingRequirements(lockId, context);
  
  const { 
    data: verificationStatus, 
    isLoading: statusLoading, 
    error: statusError
  } = useContextualVerificationStatus(lockId, context);
  
  // Hook to invalidate verification status after user actions
  const invalidateVerificationStatus = useContextualInvalidateVerificationStatus();
  
  // ===== PROFILE CONTEXTS =====
  
  const ethereumProfile = useEthereumProfile();
  const universalProfile = useUniversalProfile();
  
  // ===== LOCAL STATE =====
  
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // ===== AUTO-EXPAND LOGIC =====
  
  React.useEffect(() => {
    if (gatingData?.categories && expandedCategory === null) {
      const enabledCategories = gatingData.categories.filter(cat => cat.enabled);
      if (enabledCategories.length > 0) {
        setExpandedCategory(enabledCategories[0].type);
      }
    }
  }, [gatingData?.categories, expandedCategory]);
  
  // ===== PARENT NOTIFICATION =====
  
  React.useEffect(() => {
    if (verificationStatus && onVerificationComplete) {
      onVerificationComplete(verificationStatus.canComment);
    }
  }, [verificationStatus?.canComment, onVerificationComplete]);

  // ===== HANDLERS =====
  
  const handleVerificationComplete = useCallback(() => {
    console.log('[LockVerificationPanel] Verification completed');
    
    invalidateVerificationStatus(lockId, context);
    
    if (onVerificationComplete) {
      onVerificationComplete(true);
    }
  }, [invalidateVerificationStatus, lockId, context, onVerificationComplete]);

  const toggleCategoryExpanded = useCallback((categoryType: string) => {
    setExpandedCategory(prev => prev === categoryType ? null : categoryType);
  }, []);

  // ===== RENDER HELPERS =====

  const renderCategorySlot = (category: ContextualCategoryStatus) => {
    const isExpanded = expandedCategory === category.type;
    
    const categoryStatus = {
      type: category.type,
      enabled: category.enabled,
      requirements: category.requirements,
      verificationStatus: category.verificationStatus,
      metadata: category.metadata ? {
        ...category.metadata,
        description: `${category.metadata.name} verification requirements`
      } : undefined,
    };
    
    return (
      <div key={category.type} className="border rounded-lg overflow-hidden">
        <RichCategoryHeader
          category={categoryStatus}
          isExpanded={isExpanded}
          onToggle={() => toggleCategoryExpanded(category.type)}
        />

        {isExpanded && (
          <div className="border-t bg-muted/20">
            <div className="p-4">
              {category.type === 'universal_profile' ? (
                (() => {
                  const renderer = ensureRegistered(category.type);
                  return renderer.renderConnection({
                    requirements: category.requirements,
                    onConnect: universalProfile?.connect || (() => Promise.resolve()),
                    onDisconnect: universalProfile?.disconnect || (() => {}),
                    userStatus: {
                      connected: universalProfile?.isConnected || false,
                      verified: false,
                      requirements: [],
                      upAddress: universalProfile?.upAddress,
                    },
                    disabled: false,
                    postId: context.type === 'post' ? context.postId : undefined,
                    onVerificationComplete: handleVerificationComplete,
                    isPreviewMode: context.type === 'preview',
                    verificationContext: {
                      ...context,
                      lockId,
                    },
                  });
                })()
              ) : category.type === 'ethereum_profile' ? (
                (() => {
                  const renderer = ensureRegistered(category.type);
                  return renderer.renderConnection({
                    requirements: category.requirements,
                    onConnect: ethereumProfile?.connect || (() => Promise.resolve()),
                    onDisconnect: ethereumProfile?.disconnect || (() => {}),
                    userStatus: {
                      connected: ethereumProfile?.isConnected || false,
                      verified: false,
                      requirements: [],
                      address: ethereumProfile?.ethAddress,
                    },
                    disabled: false,
                    postId: context.type === 'post' ? context.postId : undefined,
                    onVerificationComplete: handleVerificationComplete,
                    isPreviewMode: context.type === 'preview',
                    verificationContext: {
                      ...context,
                      lockId,
                    },
                  });
                })()
              ) : (
                <div className="text-sm text-muted-foreground">
                  Verification for this category type is not available.
                </div>
              )}
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
            <span>Loading lock requirements...</span>
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
            <span>
              {error instanceof Error ? error.message : 'Failed to load lock requirements'}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!gatingData || gatingData.categories.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-6">
          <div className="text-center space-y-2">
            <Shield className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No verification requirements configured for this lock
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const enabledCategories = gatingData.categories.filter(cat => cat.enabled);

    return (
    <Card className={`border-2 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center text-base">
              <Shield className="h-5 w-5 mr-2" />
              Lock Verification
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                Lock #{lockId}
              </Badge>
              <Badge variant="outline" className="text-xs capitalize">
                {context.type} Context
              </Badge>
              {gatingData.requireAll ? (
                <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                  Requires ALL {enabledCategories.length}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                  Requires ANY of {enabledCategories.length}
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="text-xs">
              {verificationStatus?.verifiedCategories || 0} of {verificationStatus?.totalCategories || enabledCategories.length} Complete
            </Badge>
          </div>
        </div>

        {/* Overall Status */}
        {verificationStatus && (
          <div className="mt-3 p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <div className="font-medium">
                  {verificationStatus.message || 'Complete verification to proceed'}
                </div>
              </div>
              
              {verificationStatus.canComment ? (
                <Badge className="bg-green-100 text-green-800">
                  ✓ Verified
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
        
        {/* Context Info */}
        <div className="mt-4 pt-4 border-t">
          <div className="text-xs text-muted-foreground text-center">
            {context.type === 'board' && (
              <>Verifying for board access • Longer verification duration (4 hours)</>
            )}
            {context.type === 'post' && (
              <>Verifying for post commenting • Standard verification duration (30 minutes)</>
            )}
            {context.type === 'preview' && (
              <>Preview mode • Connect wallets to test requirements without saving</>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 
'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  RefreshCw
} from 'lucide-react';

import { ensureRegistered } from '@/lib/gating/categoryRegistry';
import { ensureCategoriesRegistered } from '@/lib/gating/registerCategories';
import { VerificationStatus } from '@/types/gating';
import { LockGatingConfig } from '@/types/locks';
import { CategoryStatus } from '@/hooks/useGatingData';
import { useConditionalUniversalProfile, useUPActivation } from '@/contexts/ConditionalUniversalProfileProvider';
import { useEthereumProfile } from '@/contexts/EthereumProfileContext';
import { RichCategoryHeader } from '@/components/gating/RichCategoryHeader';
import { cn } from '@/lib/utils';

// Ensure categories are registered when this module loads
ensureCategoriesRegistered();

interface GatingRequirementsPreviewProps {
  gatingConfig: LockGatingConfig;
  className?: string;
}

export const GatingRequirementsPreview: React.FC<GatingRequirementsPreviewProps> = ({
  gatingConfig,
  className = ''
}) => {
  
  // ===== PROFILE CONTEXTS =====
  
  const universalProfile = useConditionalUniversalProfile();
  const upActivation = useUPActivation();
  const ethereumProfile = useEthereumProfile();
  
  // ===== LOCAL STATE =====
  
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // ===== DERIVED DATA =====
  
  // Convert lock gating config to category status format
  const categories: CategoryStatus[] = gatingConfig.categories?.map(category => ({
    type: category.type,
    enabled: category.enabled,
    requirements: category.requirements,
    verificationStatus: 'not_started' as const // Always start as not started in preview
  })) || [];
  
  const enabledCategories = categories.filter(cat => cat.enabled);
  const requireAll = gatingConfig.requireAll || false;
  
  // ===== AUTO-EXPAND LOGIC =====
  
  // Auto-expand first category that needs verification (accordion pattern)
  React.useEffect(() => {
    if (enabledCategories.length > 0 && expandedCategory === null) {
      const needsVerification = enabledCategories
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
  }, [enabledCategories, expandedCategory]);
  
  // ===== UP ACTIVATION LOGIC =====
  
  // Activate Universal Profile when UP gating is detected
  React.useEffect(() => {
    const hasUPCategory = enabledCategories.some(cat => cat.type === 'universal_profile');
    
    if (hasUPCategory) {
      console.log('[GatingRequirementsPreview] UP gating detected, activating UP functionality');
      upActivation.activateUP();
    }
  }, [enabledCategories, upActivation]);
  
  // Auto-trigger UP connection once Web3-Onboard is initialized
  React.useEffect(() => {
    if (upActivation.hasUserTriggeredConnection && 
        universalProfile?.isInitialized && 
        !universalProfile?.isConnected && 
        !universalProfile?.isConnecting) {
      console.log('[GatingRequirementsPreview] Web3-Onboard initialized, auto-triggering UP connection');
      universalProfile.connect().catch((error) => {
        console.error('[GatingRequirementsPreview] Auto-connection failed:', error);
      });
    }
  }, [upActivation.hasUserTriggeredConnection, universalProfile?.isInitialized, universalProfile?.isConnected, universalProfile?.isConnecting, universalProfile]);

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
    setRefreshing(true);
    // Simulate refresh delay for preview
    await new Promise(resolve => setTimeout(resolve, 500));
    setRefreshing(false);
  }, []);

  // ===== RENDER HELPERS =====

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
                      verified: false, // Always false in preview
                      requirements: []
                    };
                  } else if (category.type === 'ethereum_profile') {
                    return {
                      connected: ethereumProfile?.isConnected || false,
                      verified: false, // Always false in preview
                      requirements: []
                    };
                  } else {
                    return {
                      connected: false,
                      verified: false,
                      requirements: []
                    };
                  }
                })();

                // Render the connection component with preview data
                return renderer.renderConnection({
                  requirements: category.requirements,
                  onConnect: async () => {
                    console.log('[GatingRequirementsPreview] Connect triggered for', category.type);
                    // In preview mode, connection logic is handled by the contexts
                  },
                  onDisconnect: () => {
                    console.log('[GatingRequirementsPreview] Disconnect triggered for', category.type);
                  },
                  userStatus: mockUserStatus,
                  disabled: false,
                  postId: -1 // Preview mode indicator
                });
              })()}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ===== RENDER =====

  if (!gatingConfig || enabledCategories.length === 0) {
    return (
      <Card className={cn("border-2", className)}>
        <CardContent className="flex items-center justify-center p-6">
          <div className="text-center space-y-2">
            <Shield className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No gating requirements configured</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={cn("border-2", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center text-base">
              <Shield className="h-5 w-5 mr-2" />
              Verification Required
              <Badge variant="secondary" className="ml-2 text-xs">
                Preview Mode
              </Badge>
            </CardTitle>
            <CardDescription className="text-sm">
              {requireAll 
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
              disabled={refreshing}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Overall Status - Preview Mode */}
        <div className="mt-3 p-3 rounded-lg bg-muted/50">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <div className="font-medium">
                Preview Mode - No verification saved
              </div>
              <div className="text-muted-foreground text-xs">
                Connect your wallets to test the verification flow
              </div>
            </div>
            
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              Testing Only
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {enabledCategories.map(renderCategorySlot)}
        
        {/* Help Text */}
        <Separator />
        <div className="text-center">
          <div className="text-xs text-muted-foreground">
            {requireAll 
              ? "Connect and verify all categories above to unlock commenting"
              : "Connect and verify any one category above to unlock commenting"
            }
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 
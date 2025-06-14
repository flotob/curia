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
  const [isConnectingUP, setIsConnectingUP] = useState(false);
  
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
      // SIMPLIFIED: Always expand first enabled category to show connection UI
      setExpandedCategory(enabledCategories[0].type);
    }
  }, [enabledCategories, expandedCategory]);
  
  // ===== UP ACTIVATION LOGIC =====
  
  // Activate Universal Profile when UP gating is detected
  React.useEffect(() => {
    const hasUPCategory = enabledCategories.some(cat => cat.type === 'universal_profile');
    
    if (hasUPCategory) {
      upActivation.activateUP();
    }
  }, [enabledCategories, upActivation]);

  // Effect to handle the connection process for UP after initialization
  React.useEffect(() => {
    // Check if we are in the process of connecting and if the UP context is now initialized
    if (isConnectingUP && universalProfile.isInitialized) {
      const performConnect = async () => {
        try {
          await universalProfile.connect();
        } catch (error) {
          console.error("Failed to connect Universal Profile:", error);
        } finally {
          // Reset the connecting flag regardless of outcome
          setIsConnectingUP(false);
        }
      };
      performConnect();
    }
  }, [isConnectingUP, universalProfile.isInitialized, universalProfile.connect]);
  
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
                    const status = {
                      connected: universalProfile?.isConnected || false,
                      verified: false,
                      requirements: [],
                      address: universalProfile?.upAddress,
                      lyxBalance: 0, // This is a placeholder, renderer will show real data
                      upAddress: universalProfile?.upAddress
                    };
                    return status;
                  } else if (category.type === 'ethereum_profile') {
                    const status = {
                      connected: ethereumProfile?.isConnected || false,
                      verified: false, // Always false in preview
                      requirements: []
                    };
                    return status;
                  } else {
                    const status = {
                      connected: false,
                      verified: false,
                      requirements: []
                    };
                    return status;
                  }
                })();

                // Real connection handlers based on category type (same as GatingRequirementsPanel)
                const handleConnect = async (event?: React.MouseEvent) => {
                  // Prevent modal closing when clicking wallet connection buttons
                  if (event) {
                    event.stopPropagation();
                    event.preventDefault();
                  }
                  
                  try {
                    if (category.type === 'universal_profile') {
                      // First, initialize the connection context
                      if (!upActivation.hasUserTriggeredConnection) {
                        upActivation.initializeConnection();
                      }
                      // Then, set the flag to trigger the connection effect
                      setIsConnectingUP(true);
                    } else if (category.type === 'ethereum_profile') {
                      if (ethereumProfile?.connect) {
                        await ethereumProfile.connect();
                      }
                    } else {
                      console.warn(`[GatingRequirementsPreview] Unknown category type: ${category.type}`);
                    }
                  } catch (error) {
                    console.error(`[GatingRequirementsPreview] Connection failed for ${category.type}:`, error);
                    // Ensure the connecting flag is reset on error
                    if (category.type === 'universal_profile') {
                      setIsConnectingUP(false);
                    }
                  }
                };

                const handleDisconnect = () => {
                  try {
                    if (category.type === 'universal_profile') {
                      if (universalProfile?.disconnect) {
                        universalProfile.disconnect();
                      }
                    } else if (category.type === 'ethereum_profile') {
                      if (ethereumProfile?.disconnect) {
                        ethereumProfile.disconnect();
                      }
                    }
                  } catch (error) {
                    console.error(`[GatingRequirementsPreview] Disconnection failed for ${category.type}:`, error);
                  }
                };
                
                // Render the connection component with preview data
                return renderer.renderConnection({
                  requirements: category.requirements,
                  onConnect: handleConnect,
                  onDisconnect: handleDisconnect,
                  userStatus: mockUserStatus,
                  disabled: false,
                  postId: -1, // Preview mode indicator (legacy)
                  isPreviewMode: true 
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
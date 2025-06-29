'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  RefreshCw,
  CheckCircle,
  XCircle,
  CircleDashed
} from 'lucide-react';

import { ensureRegistered } from '@/lib/gating/categoryRegistry';
import { ensureCategoriesRegistered } from '@/lib/gating/registerCategories';
import { VerificationStatus, UPGatingRequirements, GatingCategoryStatus } from '@/types/gating';
import { LockGatingConfig } from '@/types/locks';
import { CategoryStatus } from '@/hooks/useGatingData';
import { useEthereumProfile } from '@/contexts/EthereumProfileContext';
import { useUniversalProfile } from '@/contexts/UniversalProfileContext';
import { getUPSocialProfile, UPSocialProfile } from '@/lib/upProfile';
import { RichCategoryHeader } from '@/components/gating/RichCategoryHeader';
import { cn } from '@/lib/utils';
import { UPVerificationWrapper } from '../verification/UPVerificationWrapper';

// Ensure categories are registered when this module loads
ensureCategoriesRegistered();

interface GatingRequirementsPreviewProps {
  gatingConfig: LockGatingConfig;
  className?: string;
}

const GatingRequirementsPreview: React.FC<GatingRequirementsPreviewProps> = ({
  gatingConfig,
  className = ''
}) => {
  // ===== PROFILE CONTEXTS =====
  const ethereumProfile = useEthereumProfile();
  const { upAddress, disconnect: disconnectUP } = useUniversalProfile();

  // ===== LOCAL STATE =====
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [userProfile, setUserProfile] = useState<UPSocialProfile | null>(null);
  const [categoryStatuses, setCategoryStatuses] = useState<Record<string, GatingCategoryStatus>>({});

  // Fetch UP social profile when address is available
  useEffect(() => {
    if (upAddress) {
      getUPSocialProfile(upAddress).then(setUserProfile);
    } else {
      setUserProfile(null);
      // Clear status on disconnect
      setCategoryStatuses(prev => ({...prev, universal_profile: { met: 0, total: 0, isMet: false}}));
    }
  }, [upAddress]);

  // Clear ethereum status on disconnect
  useEffect(() => {
    if (!ethereumProfile.isConnected) {
      setCategoryStatuses(prev => ({ ...prev, ethereum_profile: { met: 0, total: 0, isMet: false }}));
    }
  }, [ethereumProfile.isConnected]);

  // ===== DERIVED DATA =====
  const categories: CategoryStatus[] = useMemo(() => gatingConfig.categories?.map(category => {
    let verificationData: CategoryStatus['verificationData'] = undefined;
    if (category.type === 'universal_profile' && upAddress && userProfile) {
      verificationData = {
        walletAddress: upAddress,
        verifiedProfiles: {
          displayName: userProfile.displayName,
          username: userProfile.username,
          avatar: userProfile.profileImage,
          isVerified: userProfile.isVerified,
        }
      };
    }
    
    return {
      type: category.type,
      enabled: category.enabled,
      fulfillment: category.fulfillment,
      requirements: category.requirements,
      verificationStatus: 'not_started' as const,
      verificationData,
    };
  }) || [], [gatingConfig.categories, upAddress, userProfile]);

  const enabledCategories = categories.filter(cat => cat.enabled);

  // Backward compatibility for top-level fulfillment
  const requireAll = gatingConfig.requireAll ?? !gatingConfig.requireAny ?? false;

  // ===== OVERALL STATUS CALCULATION =====
  const overallStatus = useMemo(() => {
    const statuses = Object.values(categoryStatuses);
    if (statuses.length < enabledCategories.length) {
      // Not all categories have reported their status yet
      const unverifiedCount = enabledCategories.length - statuses.length;
      return { 
        isMet: false, 
        message: `Waiting for ${unverifiedCount} more category checks...`,
        Icon: CircleDashed,
        color: 'text-muted-foreground',
        bgColor: 'bg-muted/50',
      };
    }

    const finalChecks = statuses.map(s => s.isMet);
    const isMet = requireAll ? finalChecks.every(c => c) : finalChecks.some(c => c);
    
    if (isMet) {
      return { 
        isMet: true, 
        message: 'Preview verification passed!',
        Icon: CheckCircle,
        color: 'text-green-700',
        bgColor: 'bg-green-50',
      };
    }
    
    const metCount = statuses.filter(s => s.isMet).length;
    const totalCount = enabledCategories.length;
    return {
      isMet: false,
      message: `Verification incomplete (${metCount}/${totalCount} categories met)`,
      Icon: XCircle,
      color: 'text-red-700',
      bgColor: 'bg-red-50',
    };
  }, [categoryStatuses, enabledCategories, requireAll]);

  // ===== AUTO-EXPAND LOGIC =====
  useEffect(() => {
    if (enabledCategories.length > 0 && expandedCategory === null) {
      setExpandedCategory(enabledCategories[0].type);
    }
  }, [enabledCategories, expandedCategory]);

  // ===== HANDLERS =====
  const handleUPStatusUpdate = useCallback((status: GatingCategoryStatus) => {
    setCategoryStatuses(prev => ({ ...prev, universal_profile: status }));
  }, []);

  const handleEthStatusUpdate = useCallback((status: GatingCategoryStatus) => {
    setCategoryStatuses(prev => ({ ...prev, ethereum_profile: status }));
  }, []);

  const toggleCategoryExpanded = useCallback((categoryType: string) => {
    setExpandedCategory(prev => (prev === categoryType ? null : categoryType));
  }, []);

  const refreshData = useCallback(async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setRefreshing(false);
  }, []);

  // ===== RENDER HELPERS =====
  const renderCategorySlot = (category: CategoryStatus) => {
    const isExpanded = expandedCategory === category.type;
    return (
      <div key={category.type} className="border rounded-lg overflow-hidden">
        <RichCategoryHeader
          category={category}
          isExpanded={isExpanded}
          onToggle={() => toggleCategoryExpanded(category.type)}
          onDisconnect={category.type === 'universal_profile' ? disconnectUP : undefined}
        />
        {isExpanded && (
          <div className="border-t bg-muted/20">
            <div className="p-4">
              {(() => {
                if (category.type === 'universal_profile') {
                  // Use existing UP verification wrapper - it manages its own wagmi context
                  return (
                    <UPVerificationWrapper
                      requirements={category.requirements as UPGatingRequirements}
                      fulfillment={category.fulfillment || 'all'}
                      onStatusUpdate={handleUPStatusUpdate}
                      postId={-1}
                      isPreviewMode={true}
                      storageKey="wagmi_up_preview"
                    />
                  );
                }
                if (category.type === 'ethereum_profile') {
                  const renderer = ensureRegistered(category.type);
                  const userStatus: VerificationStatus = {
                    connected: ethereumProfile?.isConnected || false,
                    verified: false,
                    requirements: [],
                  };

                  const handleConnect = async (event?: React.MouseEvent) => {
                    event?.stopPropagation();
                    event?.preventDefault();
                    ethereumProfile?.connect?.();
                  };

                  const handleDisconnect = () => {
                    ethereumProfile?.disconnect?.();
                  };

                  // Ethereum renderer will create its own wagmi context via EthereumProfileProvider
                  return renderer.renderConnection({
                    requirements: category.requirements,
                    fulfillment: category.fulfillment,
                    onStatusUpdate: handleEthStatusUpdate,
                    onConnect: handleConnect,
                    onDisconnect: handleDisconnect,
                    userStatus,
                    disabled: false,
                    postId: -1,
                    isPreviewMode: true,
                  });
                }
                return (
                  <div className="text-sm text-muted-foreground">
                    Preview for this category type is not available.
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
        <div className={cn("mt-3 p-3 rounded-lg", overallStatus.bgColor)}>
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <div className={cn("font-medium flex items-center", overallStatus.color)}>
                <overallStatus.Icon className="h-4 w-4 mr-2" />
                {overallStatus.message}
              </div>
              <div className="text-muted-foreground text-xs pl-6">
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

export { GatingRequirementsPreview }; 
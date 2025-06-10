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
  CheckCircle, 
  Clock, 
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

import { EthereumVerificationSlot } from './EthereumVerificationSlot';
import { LUKSOVerificationSlot } from './LUKSOVerificationSlot';
import { useGatingRequirements, useVerificationStatus, useInvalidateVerificationStatus, CategoryStatus } from '@/hooks/useGatingData';

// Types are now imported from the hooks file

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
  
  const invalidateVerificationStatus = useInvalidateVerificationStatus();
  
  // ===== LOCAL STATE =====
  
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  // ===== AUTO-EXPAND LOGIC =====
  
  // Auto-expand categories that need verification when data changes
  React.useEffect(() => {
    if (gatingData?.categories) {
      const needsVerification = gatingData.categories
        .filter(cat => cat.enabled && cat.verificationStatus === 'not_started')
        .map(cat => cat.type);
      
      setExpandedCategories(new Set(needsVerification));
    }
  }, [gatingData?.categories]);
  
  // ===== PARENT NOTIFICATION =====
  
  // Notify parent component when verification status changes
  React.useEffect(() => {
    if (verificationStatus && onVerificationComplete) {
      onVerificationComplete(verificationStatus.canComment);
    }
  }, [verificationStatus?.canComment, onVerificationComplete]);

  // ===== HANDLERS =====

  const toggleCategoryExpanded = useCallback((categoryType: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryType)) {
        newSet.delete(categoryType);
      } else {
        newSet.add(categoryType);
      }
      return newSet;
    });
  }, []);

  const handleCategoryVerificationComplete = useCallback(() => {
    // Invalidate verification status to trigger smooth React Query refetch
    invalidateVerificationStatus(postId);
  }, [invalidateVerificationStatus, postId]);

  const refreshData = useCallback(async () => {
    await Promise.all([
      refetchGating(),
      refetchStatus()
    ]);
  }, [refetchGating, refetchStatus]);

  // ===== RENDER HELPERS =====

  const getStatusIcon = (status: 'not_started' | 'pending' | 'verified' | 'expired') => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'expired':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Shield className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: 'not_started' | 'pending' | 'verified' | 'expired') => {
    switch (status) {
      case 'verified':
        return <Badge variant="default" className="bg-green-100 text-green-800">Verified</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      default:
        return <Badge variant="outline">Not Started</Badge>;
    }
  };

  const renderCategorySlot = (category: CategoryStatus) => {
    const isExpanded = expandedCategories.has(category.type);
    
    return (
      <div key={category.type} className="border rounded-lg">
        {/* Category Header */}
        <div 
          className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => toggleCategoryExpanded(category.type)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getStatusIcon(category.verificationStatus)}
              <div>
                <div className="font-medium text-sm">
                  {category.metadata?.name || category.type}
                </div>
                <div className="text-xs text-muted-foreground">
                  {category.metadata?.description || `Verify your ${category.type}`}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {getStatusBadge(category.verificationStatus)}
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
          
          {/* Expiry info for verified slots */}
          {category.verificationStatus === 'verified' && category.expiresAt && (
            <div className="mt-2 text-xs text-muted-foreground">
              Expires: {new Date(category.expiresAt).toLocaleString()}
            </div>
          )}
        </div>

        {/* Category Content (Expanded) */}
        {isExpanded && (
          <div className="border-t bg-muted/20">
            <div className="p-4">
              {category.type === 'ethereum_profile' && (
                <EthereumVerificationSlot
                  postId={postId}
                  requirements={category.requirements}
                  currentStatus={category.verificationStatus}
                  onVerificationComplete={handleCategoryVerificationComplete}
                />
              )}
              
              {category.type === 'universal_profile' && (
                <LUKSOVerificationSlot
                  postId={postId}
                  requirements={category.requirements}
                  currentStatus={category.verificationStatus}
                  onVerificationComplete={handleCategoryVerificationComplete}
                />
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
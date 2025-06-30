'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Shield, 
  AlertCircle,
  Lock
} from 'lucide-react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

// Lazy import heavy gating components
const GatingRequirementsPanel = React.lazy(() => 
  import('./GatingRequirementsPanel').then(module => ({ default: module.GatingRequirementsPanel }))
);

interface LazyGatingRequirementsPanelProps {
  postId: number;
  onVerificationComplete?: (canComment: boolean) => void;
  className?: string;
  lazy?: boolean; // Whether to use lazy loading
  showPreview?: boolean; // Show preview before full load
}

// Lightweight gating preview component
const GatingPreview: React.FC<{
  postId: number;
  onLoadFull: () => void;
  className?: string;
}> = React.memo(({ postId, onLoadFull, className }) => {
  const [previewData, setPreviewData] = useState<{
    hasGating: boolean;
    categoryCount: number;
    requireAll: boolean;
    loading: boolean;
  }>({
    hasGating: false,
    categoryCount: 0,
    requireAll: false,
    loading: true,
  });

  // Fetch lightweight gating preview
  React.useEffect(() => {
    const fetchPreview = async () => {
      try {
        // This would be a lightweight endpoint that only returns basic gating info
        const response = await fetch(`/api/posts/${postId}/gating-preview`);
        if (response.ok) {
          const data = await response.json();
          setPreviewData({
            hasGating: data.hasGating || false,
            categoryCount: data.categoryCount || 0,
            requireAll: data.requireAll || false,
            loading: false,
          });
        } else {
          setPreviewData(prev => ({ ...prev, loading: false }));
        }
      } catch (error) {
        console.error('Failed to fetch gating preview:', error);
        setPreviewData(prev => ({ ...prev, loading: false }));
      }
    };

    fetchPreview();
  }, [postId]);

  if (previewData.loading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 animate-pulse">
            <div className="h-4 w-4 bg-gray-300 rounded"></div>
            <div className="h-4 bg-gray-300 rounded w-32"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!previewData.hasGating) {
    return null; // No gating requirements
  }

  return (
    <Card className={`border-2 border-dashed border-gray-300 hover:border-primary transition-colors ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-base">
          <Lock className="h-5 w-5 mr-2 text-muted-foreground" />
          Verification Required
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {previewData.categoryCount} verification requirement{previewData.categoryCount !== 1 ? 's' : ''}
            {previewData.categoryCount > 1 && (
              <span className="ml-1">
                ({previewData.requireAll ? 'All required' : 'Any one required'})
              </span>
            )}
          </div>
          <Badge variant="outline" className="text-xs">
            <AlertCircle className="h-3 w-3 mr-1" />
            Not verified
          </Badge>
        </div>
        
        <Button
          onClick={onLoadFull}
          variant="outline"
          className="w-full"
        >
          <Shield className="h-4 w-4 mr-2" />
          Load Verification Panel
        </Button>
        
        <div className="text-xs text-muted-foreground text-center">
          Click to load full verification interface
        </div>
      </CardContent>
    </Card>
  );
});

GatingPreview.displayName = 'GatingPreview';

// Gating skeleton for loading state
const GatingSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <Card className={className}>
    <CardHeader className="pb-3">
      <div className="flex items-center space-x-2 animate-pulse">
        <div className="h-5 w-5 bg-gray-300 rounded"></div>
        <div className="h-5 bg-gray-300 rounded w-40"></div>
      </div>
    </CardHeader>
    <CardContent className="space-y-3">
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
      </div>
      <div className="space-y-2">
        {[1, 2].map(i => (
          <div key={i} className="p-3 border rounded-lg animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-6 bg-gray-200 rounded w-full"></div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

export const LazyGatingRequirementsPanel: React.FC<LazyGatingRequirementsPanelProps> = ({
  postId,
  onVerificationComplete,
  className = '',
  lazy = true,
  showPreview = true
}) => {
  const [shouldLoadFull, setShouldLoadFull] = useState(!lazy);
  const [isInView, setIsInView] = useState(false);

  // Intersection observer for lazy loading
  const observerRef = useIntersectionObserver(
    useCallback(() => {
      setIsInView(true);
    }, []),
    {
      threshold: 0.1,
      rootMargin: '100px',
      enabled: lazy && !isInView
    }
  );

  // Load full panel handler
  const handleLoadFull = useCallback(() => {
    setShouldLoadFull(true);
  }, []);

  // Auto-load when in view (if not using preview)
  React.useEffect(() => {
    if (isInView && !showPreview && !shouldLoadFull) {
      setShouldLoadFull(true);
    }
  }, [isInView, showPreview, shouldLoadFull]);

  // If not lazy loading, load immediately
  if (!lazy || shouldLoadFull) {
    return (
      <React.Suspense fallback={<GatingSkeleton className={className} />}>
        <GatingRequirementsPanel
          postId={postId}
          onVerificationComplete={onVerificationComplete}
          className={className}
        />
      </React.Suspense>
    );
  }

  // Show preview or skeleton based on whether in view
  return (
    <div ref={observerRef}>
      {isInView && showPreview ? (
        <GatingPreview
          postId={postId}
          onLoadFull={handleLoadFull}
          className={className}
        />
      ) : (
        <GatingSkeleton className={className} />
      )}
    </div>
  );
};
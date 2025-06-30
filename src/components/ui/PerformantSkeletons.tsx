'use client';

import React from 'react';
import { cn } from '@/lib/utils';

// Base skeleton component with optimized animations
const Skeleton = React.memo<React.HTMLAttributes<HTMLDivElement>>(({ 
  className, 
  ...props 
}) => {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted/60 dark:bg-muted/40",
        className
      )}
      {...props}
    />
  );
});

Skeleton.displayName = 'Skeleton';

// Comment skeleton for comment lists
export const CommentSkeleton: React.FC<{ 
  depth?: number;
  showAvatar?: boolean;
  lines?: number;
}> = React.memo(({ depth = 0, showAvatar = true, lines = 2 }) => {
  const indentClass = depth > 0 ? `ml-${Math.min(depth, 5) * 2}` : '';
  
  return (
    <div className={cn("flex items-start space-x-3 py-3", indentClass)}>
      {showAvatar && (
        <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
      )}
      <div className="flex-grow space-y-2">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="space-y-1">
          {Array.from({ length: lines }).map((_, i) => (
            <Skeleton 
              key={i} 
              className={cn(
                "h-4",
                i === lines - 1 ? "w-3/4" : "w-full"
              )} 
            />
          ))}
        </div>
      </div>
    </div>
  );
});

CommentSkeleton.displayName = 'CommentSkeleton';

// Post skeleton for post lists
export const PostSkeleton: React.FC<{
  showImage?: boolean;
  showFooter?: boolean;
  showReactions?: boolean;
}> = React.memo(({ showImage = false, showFooter = true, showReactions = true }) => {
  return (
    <div className="border rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-1 flex-grow">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      
      {/* Title */}
      <div className="space-y-2">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
      
      {/* Image placeholder */}
      {showImage && (
        <Skeleton className="h-48 w-full rounded-lg" />
      )}
      
      {/* Footer */}
      {showFooter && (
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-12" />
          </div>
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      )}
      
      {/* Reactions */}
      {showReactions && (
        <div className="flex items-center space-x-2 pt-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-7 w-12 rounded-full" />
          ))}
          <Skeleton className="h-7 w-7 rounded-full" />
        </div>
      )}
    </div>
  );
});

PostSkeleton.displayName = 'PostSkeleton';

// Reaction bar skeleton
export const ReactionBarSkeleton: React.FC = React.memo(() => {
  return (
    <div className="flex items-center gap-2 py-2">
      <div className="flex gap-1">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-7 w-12 rounded-full" />
        ))}
      </div>
      <Skeleton className="h-7 w-7 rounded-full" />
    </div>
  );
});

ReactionBarSkeleton.displayName = 'ReactionBarSkeleton';

// Gating panel skeleton
export const GatingPanelSkeleton: React.FC = React.memo(() => {
  return (
    <div className="border-2 rounded-lg p-4 space-y-4">
      <div className="flex items-center space-x-2">
        <Skeleton className="h-5 w-5" />
        <Skeleton className="h-5 w-40" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="p-3 border rounded-lg space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-8 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
});

GatingPanelSkeleton.displayName = 'GatingPanelSkeleton';

// Thread skeleton for comment threads
export const CommentThreadSkeleton: React.FC<{
  count?: number;
  maxDepth?: number;
}> = React.memo(({ count = 5, maxDepth = 3 }) => {
  const renderComments = (depth: number, remaining: number): React.ReactNode[] => {
    if (remaining <= 0 || depth > maxDepth) return [];
    
    const commentsAtThisLevel = Math.max(1, Math.floor(remaining / (depth + 1)));
    const comments: React.ReactNode[] = [];
    
    for (let i = 0; i < commentsAtThisLevel && remaining > 0; i++) {
      const hasChildren = depth < maxDepth && remaining > 1 && Math.random() > 0.6;
      const childrenCount = hasChildren ? Math.floor(Math.random() * 2) + 1 : 0;
      
      comments.push(
        <div key={`${depth}-${i}`} className="space-y-3">
          <CommentSkeleton 
            depth={depth} 
            lines={Math.floor(Math.random() * 3) + 1}
          />
          {hasChildren && (
            <div className="ml-4 space-y-3">
              {renderComments(depth + 1, childrenCount)}
            </div>
          )}
        </div>
      );
      
      remaining--;
    }
    
    return comments;
  };
  
  return (
    <div className="space-y-3">
      {renderComments(0, count)}
    </div>
  );
});

CommentThreadSkeleton.displayName = 'CommentThreadSkeleton';

// Smart skeleton that adapts based on content type
export const SmartContentSkeleton: React.FC<{
  type: 'post' | 'comment' | 'thread' | 'gating' | 'reactions';
  count?: number;
  variant?: 'compact' | 'full' | 'minimal';
}> = React.memo(({ type, count = 3, variant = 'full' }) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'post':
        return Array.from({ length: count }).map((_, i) => (
          <PostSkeleton 
            key={i}
            showImage={variant === 'full' && Math.random() > 0.7}
            showFooter={variant !== 'minimal'}
            showReactions={variant === 'full'}
          />
        ));
        
      case 'comment':
        return Array.from({ length: count }).map((_, i) => (
          <CommentSkeleton 
            key={i}
            lines={variant === 'minimal' ? 1 : Math.floor(Math.random() * 3) + 1}
          />
        ));
        
      case 'thread':
        return <CommentThreadSkeleton count={count} />;
        
      case 'gating':
        return <GatingPanelSkeleton />;
        
      case 'reactions':
        return <ReactionBarSkeleton />;
        
      default:
        return null;
    }
  };
  
  return (
    <div className="space-y-4 animate-in fade-in-50 duration-300">
      {renderSkeleton()}
    </div>
  );
});

SmartContentSkeleton.displayName = 'SmartContentSkeleton';

// Export base skeleton for custom use
export { Skeleton };
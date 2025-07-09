'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { authFetchJson } from '@/utils/authFetch';
import { ApiPost } from '@/app/api/posts/route';
import { PostCard } from '@/components/voting/PostCard';
import { cn } from '@/lib/utils';
import { createPortal } from 'react-dom';

interface PostPreviewPopoverProps {
  postId: number;
  children: React.ReactNode;
  enabled?: boolean;
  className?: string;
}

// Skeleton component for loading state
const PostPreviewSkeleton = () => (
  <div className="p-4 space-y-3 animate-pulse">
    <div className="flex items-center space-x-3">
      <div className="h-6 w-6 rounded-full bg-muted" />
      <div className="h-4 w-24 bg-muted rounded" />
      <div className="h-3 w-12 bg-muted rounded" />
    </div>
    <div className="space-y-2">
      <div className="h-5 bg-muted rounded w-3/4" />
      <div className="h-5 bg-muted rounded w-1/2" />
    </div>
    <div className="space-y-2">
      <div className="h-3 bg-muted rounded w-full" />
      <div className="h-3 bg-muted rounded w-5/6" />
      <div className="h-3 bg-muted rounded w-2/3" />
    </div>
    <div className="flex items-center space-x-4 pt-2">
      <div className="h-3 w-8 bg-muted rounded" />
      <div className="h-3 w-12 bg-muted rounded" />
      <div className="h-3 w-10 bg-muted rounded" />
    </div>
  </div>
);

export const PostPreviewPopover: React.FC<PostPreviewPopoverProps> = ({
  postId,
  children,
  enabled = true,
  className
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { token } = useAuth();

  // Smart data fetching - only when hovering
  const { data: post, isLoading, error } = useQuery({
    queryKey: ['post', postId],
    queryFn: async () => {
      if (!token) throw new Error('No auth token');
      return authFetchJson<ApiPost>(`/api/posts/${postId}`, { token });
    },
    enabled: isVisible && !!token && !!postId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const showPopover = () => {
    if (!enabled || !triggerRef.current) return;
    
    const rect = triggerRef.current.getBoundingClientRect();
    setPosition({
      top: rect.top + window.scrollY,
      left: rect.left - 520 // 500px width + 20px margin
    });
    setIsVisible(true);
  };

  const hidePopover = () => {
    setIsVisible(false);
  };

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(showPopover, 200);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(hidePopover, 150);
  };

  const handlePopoverMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const handlePopoverMouseLeave = () => {
    hidePopover();
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <>
      <div
        ref={triggerRef}
        className={cn("cursor-pointer", className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>

      {isVisible && createPortal(
        <div
          ref={popoverRef}
          className="fixed z-50 w-[500px] bg-background border border-border rounded-lg shadow-xl"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
          }}
          onMouseEnter={handlePopoverMouseEnter}
          onMouseLeave={handlePopoverMouseLeave}
        >
          {isLoading ? (
            <PostPreviewSkeleton />
          ) : error ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Failed to load post preview
            </div>
          ) : post ? (
            <div className="p-0">
              <PostCard 
                post={post} 
                showFullContent={false}
                showBoardContext={true}
                isPreviewMode={true}
              />
            </div>
          ) : null}
        </div>,
        document.body
      )}
    </>
  );
}; 
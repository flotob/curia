'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

// Lazy import TipTap components for better performance
const TipTapEditor = React.lazy(() => import('./TipTapCommentRenderer'));

interface LazyCommentContentProps {
  content: string;
}

// Simple markdown-like content renderer for initial display
const SimpleContentRenderer: React.FC<{ content: string }> = React.memo(({ content }) => {
  // Basic markdown parsing for initial display (lightweight)
  const processedContent = useMemo(() => {
    let processed = content;
    
    // Convert basic markdown to HTML-safe text
    processed = processed
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
      .replace(/`(.*?)`/g, '<code>$1</code>') // Inline code
      .replace(/\n/g, '<br>'); // Line breaks
    
    return processed;
  }, [content]);

  return (
    <div 
      className="prose dark:prose-invert prose-sm max-w-none break-words"
      dangerouslySetInnerHTML={{ __html: processedContent }}
    />
  );
});

SimpleContentRenderer.displayName = 'SimpleContentRenderer';

// Skeleton loader for comment content
const CommentContentSkeleton: React.FC = () => (
  <div className="space-y-2 animate-pulse">
    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5"></div>
    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/5"></div>
  </div>
);

export const LazyCommentContent: React.FC<LazyCommentContentProps> = ({ content }) => {
  const [shouldLoadFullEditor, setShouldLoadFullEditor] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Helper function to build URLs while preserving current parameters
  const buildInternalUrl = useCallback((path: string, additionalParams: Record<string, string> = {}) => {
    const params = new URLSearchParams();
    
    // Preserve existing params
    if (searchParams) {
      searchParams.forEach((value, key) => {
        params.set(key, value);
      });
    }
    
    // Add/override with new params
    Object.entries(additionalParams).forEach(([key, value]) => {
      params.set(key, value);
    });
    
    return `${path}?${params.toString()}`;
  }, [searchParams]);

  // Check if content needs full TipTap rendering (has complex markdown/mentions)
  const needsFullEditor = useMemo(() => {
    return content.includes('```') || // Code blocks
           content.includes('[') || // Links or images
           content.includes('@{') || // Mentions
           content.includes('|') || // Tables
           content.length > 500; // Long content
  }, [content]);

  // Intersection observer to load full editor when in view
  const observerRef = useIntersectionObserver(
    useCallback(() => {
      setIsInView(true);
      if (needsFullEditor) {
        setShouldLoadFullEditor(true);
      }
    }, [needsFullEditor]),
    {
      threshold: 0.1,
      rootMargin: '50px',
      enabled: !isInView
    }
  );

  // Force load full editor when user interacts
  const handleInteraction = useCallback(() => {
    if (!shouldLoadFullEditor && needsFullEditor) {
      setShouldLoadFullEditor(true);
    }
  }, [shouldLoadFullEditor, needsFullEditor]);

  // If content doesn't need full editor, use simple renderer
  if (!needsFullEditor) {
    return <SimpleContentRenderer content={content} />;
  }

  // If full editor should be loaded
  if (shouldLoadFullEditor) {
    return (
      <React.Suspense fallback={<CommentContentSkeleton />}>
        <TipTapEditor 
          content={content}
          buildInternalUrl={buildInternalUrl}
          router={router}
        />
      </React.Suspense>
    );
  }

  // Default: Show simple content with click-to-load full editor
  return (
    <div ref={observerRef}>
      <div 
        onClick={handleInteraction}
        onFocus={handleInteraction}
        onMouseEnter={handleInteraction}
        className="cursor-pointer hover:bg-muted/20 rounded p-1 transition-colors"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleInteraction();
          }
        }}
      >
        <SimpleContentRenderer content={content} />
        {!isInView && (
          <div className="text-xs text-muted-foreground mt-1">
            Click to load full content
          </div>
        )}
      </div>
    </div>
  );
};
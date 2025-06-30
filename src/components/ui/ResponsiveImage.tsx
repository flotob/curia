'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ZoomIn, AlertCircle } from 'lucide-react';

interface ResponsiveImageProps {
  src: string;
  alt?: string;
  caption?: string;
  className?: string;
  onClick?: () => void;
  lazy?: boolean;
  showZoomIndicator?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'full';
  aspectRatio?: 'auto' | 'square' | 'video' | 'wide';
}

export const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  src,
  alt = '',
  caption,
  className,
  onClick,
  lazy = true,
  showZoomIndicator = true,
  maxWidth = 'lg',
  aspectRatio = 'auto',
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(!lazy);
  const [naturalDimensions, setNaturalDimensions] = useState<{width: number; height: number} | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [lazy, isInView]);

  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    setNaturalDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight,
    });
    setIsLoaded(true);
    setHasError(false);
  };

  const handleImageError = () => {
    setIsLoaded(false);
    setHasError(true);
  };

  // Calculate responsive sizing based on natural dimensions and container
  const getResponsiveClasses = () => {
    const baseClasses = 'block rounded-lg transition-all duration-300 ease-out';
    
    // Max width constraints based on prop
    const maxWidthClasses = {
      sm: 'max-w-sm',    // 384px
      md: 'max-w-md',    // 448px  
      lg: 'max-w-lg',    // 512px
      full: 'max-w-full'
    };

    // Aspect ratio constraints
    const aspectRatioClasses = {
      auto: '',
      square: 'aspect-square object-cover',
      video: 'aspect-video object-cover', 
      wide: 'aspect-[16/9] object-cover'
    };

    // Responsive behavior using container queries and breakpoints
    const responsiveClasses = cn(
      // Mobile-first: full width on small screens
      'w-full',
      // Tablet and up: apply max-width constraints
      'sm:max-w-[60%]',
      'md:max-w-[50%]',
      // Desktop: use specified max-width
      'lg:' + maxWidthClasses[maxWidth],
      // Height constraints to prevent overly tall images
      'max-h-[60vh] object-contain',
      // Ensure good quality
      'object-contain'
    );

    return cn(
      baseClasses,
      responsiveClasses,
      aspectRatioClasses[aspectRatio],
      // Interactive states
      onClick && 'cursor-pointer hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]',
      // Loading state
      !isLoaded && !hasError && 'bg-muted animate-pulse',
      className
    );
  };

  // Get container classes for layout
  const getContainerClasses = () => {
    return cn(
      'relative group',
      // Center the image in comment content
      'flex justify-start', // Left-align for natural text flow
      // Add some spacing
      'my-3 first:mt-0 last:mb-0'
    );
  };

  return (
    <div ref={containerRef} className={getContainerClasses()}>
      {/* Image container with loading state */}
      <div className="relative">
        {/* Loading placeholder */}
        {!isLoaded && !hasError && isInView && (
          <div className={cn(
            getResponsiveClasses(),
            "bg-muted animate-pulse flex items-center justify-center min-h-[200px]"
          )}>
            <div className="text-muted-foreground text-sm">Loading...</div>
          </div>
        )}

        {/* Error state */}
        {hasError && (
          <div className={cn(
            getResponsiveClasses(),
            "bg-muted border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center min-h-[200px] text-muted-foreground"
          )}>
            <AlertCircle className="h-8 w-8 mb-2" />
            <p className="text-sm text-center px-4">
              Failed to load image
            </p>
            {alt && (
              <p className="text-xs text-center px-4 mt-1 opacity-75">
                {alt}
              </p>
            )}
          </div>
        )}

        {/* Actual image */}
        {isInView && (
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            className={cn(
              getResponsiveClasses(),
              // Hide until loaded to prevent layout shift
              !isLoaded && 'opacity-0 absolute inset-0',
              // Show when loaded
              isLoaded && 'opacity-100',
              // Error state
              hasError && 'hidden'
            )}
            onLoad={handleImageLoad}
            onError={handleImageError}
            onClick={onClick}
            loading={lazy ? 'lazy' : 'eager'}
          />
        )}

        {/* Zoom indicator */}
        {showZoomIndicator && onClick && isLoaded && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <div className="bg-black/50 backdrop-blur-sm text-white p-2 rounded-full">
              <ZoomIn className="h-5 w-5" />
            </div>
          </div>
        )}

        {/* Image info overlay (for debugging/development) */}
        {naturalDimensions && process.env.NODE_ENV === 'development' && (
          <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
            {naturalDimensions.width} × {naturalDimensions.height}
          </div>
        )}
      </div>

      {/* Caption */}
      {caption && isLoaded && !hasError && (
        <div className="mt-2 text-sm text-muted-foreground italic text-center max-w-full">
          {caption}
        </div>
      )}
    </div>
  );
};
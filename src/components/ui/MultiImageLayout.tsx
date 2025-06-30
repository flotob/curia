'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { ResponsiveImage } from './ResponsiveImage';

interface ImageData {
  src: string;
  alt?: string;
  caption?: string;
}

interface MultiImageLayoutProps {
  images: ImageData[];
  onImageClick?: (index: number) => void;
  className?: string;
  lazy?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'full';
}

export const MultiImageLayout: React.FC<MultiImageLayoutProps> = ({
  images,
  onImageClick,
  className,
  lazy = true,
  maxWidth = 'lg',
}) => {
  if (!images || images.length === 0) return null;

  // Single image - use full responsive image component
  if (images.length === 1) {
    return (
      <div className={cn('my-3', className)}>
        <ResponsiveImage
          src={images[0].src}
          alt={images[0].alt}
          caption={images[0].caption}
          onClick={onImageClick ? () => onImageClick(0) : undefined}
          lazy={lazy}
          maxWidth={maxWidth}
        />
      </div>
    );
  }

  // Multiple images - smart grid layout
  const getGridLayout = () => {
    const count = images.length;

    if (count === 2) {
      return {
        containerClass: 'grid grid-cols-1 sm:grid-cols-2 gap-3',
        imageClass: 'aspect-square object-cover',
        imageMaxWidth: 'full' as const,
      };
    }

    if (count === 3) {
      return {
        containerClass: 'grid grid-cols-1 sm:grid-cols-3 gap-3',
        imageClass: 'aspect-square object-cover',
        imageMaxWidth: 'full' as const,
      };
    }

    if (count === 4) {
      return {
        containerClass: 'grid grid-cols-2 gap-3',
        imageClass: 'aspect-square object-cover',
        imageMaxWidth: 'full' as const,
      };
    }

    if (count <= 6) {
      return {
        containerClass: 'grid grid-cols-2 sm:grid-cols-3 gap-3',
        imageClass: 'aspect-square object-cover',
        imageMaxWidth: 'full' as const,
      };
    }

    // More than 6 images - show first 5 and a "+X more" indicator
    return {
      containerClass: 'grid grid-cols-2 sm:grid-cols-3 gap-3',
      imageClass: 'aspect-square object-cover',
      imageMaxWidth: 'full' as const,
      showMore: true,
    };
  };

  const layout = getGridLayout();
  const visibleImages = layout.showMore ? images.slice(0, 5) : images;
  const remainingCount = images.length - 5;

  // Container max width based on content
  const getContainerMaxWidth = () => {
    const maxWidthClasses = {
      sm: 'max-w-sm',    // 384px
      md: 'max-w-md',    // 448px  
      lg: 'max-w-2xl',   // Larger for multi-image grid
      full: 'max-w-full'
    };
    return maxWidthClasses[maxWidth];
  };

  return (
    <div className={cn(
      'my-3 w-full',
      getContainerMaxWidth(),
      className
    )}>
      <div className={layout.containerClass}>
        {visibleImages.map((image, index) => (
          <div key={index} className="relative group">
            {/* Show "+X more" overlay on last image if there are more */}
            {layout.showMore && index === 4 && remainingCount > 0 && (
              <div 
                className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center text-white font-semibold text-lg z-10 rounded-lg cursor-pointer hover:bg-black/60 transition-colors"
                onClick={onImageClick ? () => onImageClick(index) : undefined}
              >
                +{remainingCount} more
              </div>
            )}
            
            <ResponsiveImage
              src={image.src}
              alt={image.alt}
              caption={undefined} // Don't show individual captions in grid
              onClick={onImageClick ? () => onImageClick(index) : undefined}
              lazy={lazy}
              maxWidth={layout.imageMaxWidth}
              aspectRatio="square"
              className={cn(
                'w-full h-full',
                layout.imageClass
              )}
            />
          </div>
        ))}
      </div>

      {/* Grid caption - show if any image has a caption */}
      {images.some(img => img.caption) && (
        <div className="mt-3 space-y-1">
          {images.map((image, index) => {
            if (!image.caption) return null;
            return (
              <div key={index} className="text-sm text-muted-foreground italic">
                <span className="font-medium">Image {index + 1}:</span> {image.caption}
              </div>
            );
          })}
        </div>
      )}

      {/* Image count indicator for grids */}
      {images.length > 1 && (
        <div className="mt-2 text-xs text-muted-foreground text-center">
          {images.length} image{images.length === 1 ? '' : 's'}
          {onImageClick && ' • Click to view full size'}
        </div>
      )}
    </div>
  );
};
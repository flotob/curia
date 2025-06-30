'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  RotateCw,
  Share2,
  AlertCircle 
} from 'lucide-react';
import { ImageAttributes } from '@/components/tiptap/EnhancedImageExtension';

interface ImageLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: ImageAttributes[];
  initialIndex?: number;
}

interface ImageTransform {
  scale: number;
  rotation: number;
  translateX: number;
  translateY: number;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  isOpen,
  onClose,
  images,
  initialIndex = 0
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [transform, setTransform] = useState<ImageTransform>({
    scale: 1,
    rotation: 0,
    translateX: 0,
    translateY: 0
  });
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [hasImageError, setHasImageError] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showControls, setShowControls] = useState(true);
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });

  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentImage = images[currentIndex];
  const hasMultipleImages = images.length > 1;

  // Reset transform when image changes
  useEffect(() => {
    setTransform({ scale: 1, rotation: 0, translateX: 0, translateY: 0 });
    setIsImageLoading(true);
    setHasImageError(false);
  }, [currentIndex]);

  // Reset index when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
    }
  }, [isOpen, initialIndex]);

  // Keyboard controls
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (hasMultipleImages) navigateToPrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (hasMultipleImages) navigateToNext();
          break;
        case ' ':
          e.preventDefault();
          toggleZoom();
          break;
        case '+':
        case '=':
          e.preventDefault();
          handleZoom(0.2);
          break;
        case '-':
          e.preventDefault();
          handleZoom(-0.2);
          break;
        case 'r':
          e.preventDefault();
          handleRotate();
          break;
        case '0':
          e.preventDefault();
          resetTransform();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, hasMultipleImages, transform.scale]);

  // Auto-hide controls
  useEffect(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    if (showControls && !isDragging) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls, isDragging]);

  // Navigation functions
  const navigateToNext = useCallback(() => {
    if (hasMultipleImages) {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }
  }, [hasMultipleImages, images.length]);

  const navigateToPrevious = useCallback(() => {
    if (hasMultipleImages) {
      setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    }
  }, [hasMultipleImages, images.length]);

  // Transform functions
  const handleZoom = useCallback((delta: number) => {
    setTransform(prev => ({
      ...prev,
      scale: Math.max(0.1, Math.min(5, prev.scale + delta))
    }));
  }, []);

  const toggleZoom = useCallback(() => {
    setTransform(prev => ({
      ...prev,
      scale: prev.scale === 1 ? 2 : 1,
      translateX: prev.scale === 1 ? 0 : prev.translateX,
      translateY: prev.scale === 1 ? 0 : prev.translateY
    }));
  }, []);

  const handleRotate = useCallback(() => {
    setTransform(prev => ({
      ...prev,
      rotation: (prev.rotation + 90) % 360
    }));
  }, []);

  const resetTransform = useCallback(() => {
    setTransform({ scale: 1, rotation: 0, translateX: 0, translateY: 0 });
  }, []);

  // Mouse drag handling
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (transform.scale <= 1) return;
    
    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.translateX, y: e.clientY - transform.translateY });
    e.preventDefault();
  }, [transform]);

  const handleMouseDrag = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    setTransform(prev => ({
      ...prev,
      translateX: e.clientX - dragStart.x,
      translateY: e.clientY - dragStart.y
    }));
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch handling for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!e.changedTouches[0]) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touchStart.x - touch.clientX;
    const deltaY = Math.abs(touchStart.y - touch.clientY);

    // Horizontal swipe detection
    if (Math.abs(deltaX) > 50 && deltaY < 100) {
      if (deltaX > 0) {
        navigateToNext();
      } else {
        navigateToPrevious();
      }
    }
  }, [touchStart, navigateToNext, navigateToPrevious]);

  // Mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseDrag);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseDrag);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseDrag, handleMouseUp]);

  // Download image
  const handleDownload = useCallback(async () => {
    if (!currentImage.src) return;
    
    try {
      const response = await fetch(currentImage.src);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = currentImage.alt || `image-${currentIndex + 1}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download image:', error);
    }
  }, [currentImage, currentIndex]);

  // Share image
  const handleShare = useCallback(async () => {
    if (navigator.share && currentImage.src) {
      try {
        await navigator.share({
          title: currentImage.alt || 'Shared Image',
          url: currentImage.src
        });
              } catch {
          // Fallback to copying URL
          navigator.clipboard?.writeText(currentImage.src);
        }
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(currentImage.src);
    }
  }, [currentImage]);

  // Show controls on mouse move
  const handleShowControls = useCallback(() => {
    setShowControls(true);
  }, []);

  if (!currentImage) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-none w-screen h-screen p-0 bg-black/95 border-none"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">
          Image viewer - {currentImage.alt || `Image ${currentIndex + 1} of ${images.length}`}
        </DialogTitle>

        {/* Main image container */}
        <div 
          ref={containerRef}
          className="relative w-full h-full flex items-center justify-center overflow-hidden"
          onMouseMove={handleShowControls}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Loading state */}
          {isImageLoading && !hasImageError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}

          {/* Error state */}
          {hasImageError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
              <AlertCircle className="h-12 w-12 mb-4 text-white/70" />
              <p className="text-lg font-medium">Failed to load image</p>
              <p className="text-sm text-white/70 mt-2 text-center px-4 break-all">
                {currentImage.src}
              </p>
            </div>
          )}

          {/* Main image */}
          <img
            ref={imageRef}
            src={currentImage.src}
            alt={currentImage.alt || 'Image'}
            className={cn(
              "max-w-full max-h-full object-contain cursor-grab transition-transform duration-300",
              isDragging && "cursor-grabbing",
              transform.scale > 1 && "cursor-move"
            )}
            style={{
              transform: `scale(${transform.scale}) rotate(${transform.rotation}deg) translate(${transform.translateX}px, ${transform.translateY}px)`,
              transformOrigin: 'center'
            }}
            onLoad={() => {
              setIsImageLoading(false);
              setHasImageError(false);
            }}
            onError={() => {
              setIsImageLoading(false);
              setHasImageError(true);
            }}
            onMouseDown={handleMouseDown}
            draggable={false}
          />

          {/* Navigation arrows */}
          {hasMultipleImages && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 bg-black/50 hover:bg-black/70 text-white border-white/20 transition-opacity duration-300",
                  showControls ? "opacity-100" : "opacity-0"
                )}
                onClick={navigateToPrevious}
                disabled={!hasMultipleImages}
              >
                <ChevronLeft className="h-6 w-6" />
                <span className="sr-only">Previous image</span>
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 bg-black/50 hover:bg-black/70 text-white border-white/20 transition-opacity duration-300",
                  showControls ? "opacity-100" : "opacity-0"
                )}
                onClick={navigateToNext}
                disabled={!hasMultipleImages}
              >
                <ChevronRight className="h-6 w-6" />
                <span className="sr-only">Next image</span>
              </Button>
            </>
          )}

          {/* Top controls */}
          <div className={cn(
            "absolute top-4 left-4 right-4 flex items-center justify-between transition-opacity duration-300",
            showControls ? "opacity-100" : "opacity-0"
          )}>
            <div className="flex items-center gap-2">
              {hasMultipleImages && (
                <div className="bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                  {currentIndex + 1} / {images.length}
                </div>
              )}
              {currentImage.alt && (
                <div className="bg-black/50 text-white px-3 py-1 rounded-full text-sm max-w-md truncate">
                  {currentImage.alt}
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 bg-black/50 hover:bg-black/70 text-white border-white/20"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </Button>
          </div>

          {/* Bottom controls */}
          <div className={cn(
            "absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 transition-opacity duration-300",
            showControls ? "opacity-100" : "opacity-0"
          )}>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 bg-black/50 hover:bg-black/70 text-white border-white/20"
              onClick={() => handleZoom(-0.2)}
              disabled={transform.scale <= 0.2}
            >
              <ZoomOut className="h-4 w-4" />
              <span className="sr-only">Zoom out</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 bg-black/50 hover:bg-black/70 text-white border-white/20"
              onClick={() => handleZoom(0.2)}
              disabled={transform.scale >= 5}
            >
              <ZoomIn className="h-4 w-4" />
              <span className="sr-only">Zoom in</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 bg-black/50 hover:bg-black/70 text-white border-white/20"
              onClick={handleRotate}
            >
              <RotateCw className="h-4 w-4" />
              <span className="sr-only">Rotate</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 bg-black/50 hover:bg-black/70 text-white border-white/20"
              onClick={resetTransform}
            >
              <span className="text-xs font-mono">1:1</span>
              <span className="sr-only">Reset zoom and rotation</span>
            </Button>

            <div className="w-px h-6 bg-white/20" />

            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 bg-black/50 hover:bg-black/70 text-white border-white/20"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
              <span className="sr-only">Download image</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 bg-black/50 hover:bg-black/70 text-white border-white/20"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4" />
              <span className="sr-only">Share image</span>
            </Button>
          </div>

          {/* Touch indicators for mobile */}
          {hasMultipleImages && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-white/60 text-xs text-center md:hidden">
              Swipe left or right to navigate
            </div>
          )}

          {/* Keyboard shortcuts hint */}
          <div className="absolute bottom-4 right-4 text-white/40 text-xs hidden md:block">
            Press ? for shortcuts
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogOverlay,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageModalProps {
  images: Array<{
    src: string;
    alt?: string;
    caption?: string;
  }>;
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({
  images,
  initialIndex = 0,
  isOpen,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const currentImage = images[currentIndex];
  const hasMultipleImages = images.length > 1;

  // Reset state when modal opens or index changes
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setZoom(1);
      setRotation(0);
      setImageLoaded(false);
      setImageError(false);
    }
  }, [isOpen, initialIndex]);

  // Reset state when image changes
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setImageLoaded(false);
    setImageError(false);
  }, [currentIndex]);

  // Navigation functions
  const goToPrevious = useCallback(() => {
    if (hasMultipleImages) {
      setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    }
  }, [images.length, hasMultipleImages]);

  const goToNext = useCallback(() => {
    if (hasMultipleImages) {
      setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    }
  }, [images.length, hasMultipleImages]);

  // Zoom functions
  const zoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev * 1.5, 5));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev / 1.5, 0.5));
  }, []);

  const resetZoom = useCallback(() => {
    setZoom(1);
    setRotation(0);
  }, []);

  const rotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  // Download function
  const downloadImage = useCallback(async () => {
    if (!currentImage?.src) return;
    
    try {
      const response = await fetch(currentImage.src);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = currentImage.alt || `image-${currentIndex + 1}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download image:', error);
    }
  }, [currentImage, currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          goToPrevious();
          break;
        case 'ArrowRight':
          event.preventDefault();
          goToNext();
          break;
        case '+':
        case '=':
          event.preventDefault();
          zoomIn();
          break;
        case '-':
          event.preventDefault();
          zoomOut();
          break;
        case '0':
          event.preventDefault();
          resetZoom();
          break;
        case 'r':
        case 'R':
          event.preventDefault();
          rotate();
          break;
        case 's':
        case 'S':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            downloadImage();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, goToPrevious, goToNext, zoomIn, zoomOut, resetZoom, rotate, downloadImage]);

  // Touch/swipe support for mobile
  useEffect(() => {
    if (!isOpen || !hasMultipleImages) return;

    let touchStartX = 0;
    let touchEndX = 0;

    const handleTouchStart = (event: TouchEvent) => {
      touchStartX = event.changedTouches[0].screenX;
    };

    const handleTouchEnd = (event: TouchEvent) => {
      touchEndX = event.changedTouches[0].screenX;
      handleSwipe();
    };

    const handleSwipe = () => {
      const swipeThreshold = 50;
      const diff = touchStartX - touchEndX;

      if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
          goToNext();
        } else {
          goToPrevious();
        }
      }
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isOpen, hasMultipleImages, goToNext, goToPrevious]);

  if (!currentImage) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogOverlay className="bg-black/95" />
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-fit h-fit p-0 border-0 bg-transparent focus:outline-none">
        {/* Header with controls */}
        <div className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between pointer-events-none">
          <div className="flex items-center space-x-2 pointer-events-auto">
            {hasMultipleImages && (
              <div className="bg-black/50 text-white px-3 py-1 rounded-md text-sm backdrop-blur-sm">
                {currentIndex + 1} / {images.length}
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2 pointer-events-auto">
            {/* Zoom controls */}
            <Button
              size="sm"
              variant="ghost"
              onClick={zoomOut}
              className="bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm border-0"
              title="Zoom out (-)"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={resetZoom}
              className="bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm border-0"
              title="Reset zoom (0)"
            >
              {Math.round(zoom * 100)}%
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={zoomIn}
              className="bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm border-0"
              title="Zoom in (+)"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            
            {/* Rotate button */}
            <Button
              size="sm"
              variant="ghost"
              onClick={rotate}
              className="bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm border-0"
              title="Rotate (R)"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
            
            {/* Download button */}
            <Button
              size="sm"
              variant="ghost"
              onClick={downloadImage}
              className="bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm border-0"
              title="Download (Ctrl+S)"
            >
              <Download className="h-4 w-4" />
            </Button>
            
            {/* Close button */}
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm border-0"
              title="Close (Esc)"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Navigation arrows */}
        {hasMultipleImages && (
          <>
            <Button
              size="lg"
              variant="ghost"
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm border-0 h-12 w-12 rounded-full"
              title="Previous image (←)"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-50 bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm border-0 h-12 w-12 rounded-full"
              title="Next image (→)"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </>
        )}

        {/* Main image container */}
        <div 
          className="flex items-center justify-center min-h-[60vh] max-h-[90vh] overflow-hidden cursor-pointer"
          onClick={resetZoom}
          title="Click to reset zoom"
        >
          {!imageLoaded && !imageError && (
            <div className="flex items-center justify-center text-white">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          )}
          
          {imageError && (
            <div className="flex flex-col items-center justify-center text-white p-8">
              <X className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg">Failed to load image</p>
              <p className="text-sm opacity-75 mt-2">The image could not be displayed</p>
            </div>
          )}
          
          <img
            src={currentImage.src}
            alt={currentImage.alt || `Image ${currentIndex + 1}`}
            className={cn(
              "max-w-full max-h-full object-contain transition-all duration-300 ease-out",
              imageLoaded ? "opacity-100" : "opacity-0"
            )}
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
            }}
            onLoad={() => {
              setImageLoaded(true);
              setImageError(false);
            }}
            onError={() => {
              setImageLoaded(false);
              setImageError(true);
            }}
            draggable={false}
          />
        </div>

        {/* Caption */}
        {currentImage.caption && (
          <div className="absolute bottom-4 left-4 right-4 z-50">
            <div className="bg-black/50 text-white p-3 rounded-md backdrop-blur-sm">
              <p className="text-sm text-center">{currentImage.caption}</p>
            </div>
          </div>
        )}
        
        {/* Keyboard shortcuts hint */}
        <div className="absolute bottom-4 left-4 z-40 opacity-0 hover:opacity-100 transition-opacity">
          <div className="bg-black/50 text-white text-xs p-2 rounded backdrop-blur-sm max-w-xs">
            <p className="font-medium mb-1">Keyboard shortcuts:</p>
            <p>← → Navigate • + - Zoom • 0 Reset • R Rotate • Esc Close</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
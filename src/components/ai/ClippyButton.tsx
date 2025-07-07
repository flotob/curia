'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ClippyButtonProps {
  isOpen: boolean;
  onClick: () => void;
  className?: string;
  hasNewMessage?: boolean;
}

// Animation state interface
interface AnimationState {
  mouseRotation: { horizontal: number; vertical: number };
  scrollRotation: { vertical: number };
  scrollInfluence: number;
  isScrolling: boolean;
  mouseDistance: number;
  scrollIntensity: number;
}

// Linear interpolation helper
const lerp = (a: number, b: number, t: number): number => {
  return a + (b - a) * t;
};

export function ClippyButton({ isOpen, onClick, className, hasNewMessage }: ClippyButtonProps) {
  const modelRef = useRef<HTMLDivElement>(null);
  const [isClicked, setIsClicked] = useState(false);
  const [currentModelViewer, setCurrentModelViewer] = useState<HTMLElement | null>(null);
  
  // Animation state for blended system
  const [animationState, setAnimationState] = useState<AnimationState>({
    mouseRotation: { horizontal: 0, vertical: 0 },
    scrollRotation: { vertical: 0 },
    scrollInfluence: 0,
    isScrolling: false,
    mouseDistance: 0,
    scrollIntensity: 0
  });

  // Refs for scroll handling
  const lastScrollY = useRef(window.scrollY);
  const scrollResetTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
  const scrollInfluenceFadeInterval = useRef<NodeJS.Timeout | undefined>(undefined);
  
  // Responsive size: smaller on mobile, larger on desktop
  const getClippySize = () => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768 ? 180 : 234; // 180px on mobile, 234px on desktop
    }
    return 234; // Default size for SSR
  };
  
  const [CLIPPY_SIZE_PX, setClippySize] = useState(getClippySize());

  // Update size on window resize
  useEffect(() => {
    const handleResize = () => {
      setClippySize(getClippySize());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isOpen || !modelRef.current) return;

    let retryCount = 0;
    const maxRetries = 50; // 5 seconds total

    // Wait for model-viewer custom element to be defined
    const createModelViewer = () => {
      if (typeof window === 'undefined') return;

      if (window.customElements && window.customElements.get('model-viewer')) {
        try {
          console.log('Creating model-viewer element');
          const modelViewer = document.createElement('model-viewer');
          modelViewer.setAttribute('src', '/clippy.glb');
          modelViewer.setAttribute('alt', 'AI Assistant Clippy - Click to open chat');
          modelViewer.setAttribute('autoplay', '');
          modelViewer.setAttribute('interaction-prompt', 'none');
          modelViewer.setAttribute('camera-orbit', '0deg 75deg 105%');
          modelViewer.setAttribute('camera-target', '0m 0m 0m');
          modelViewer.setAttribute('disable-zoom', '');
          modelViewer.setAttribute('disable-pan', '');
          modelViewer.setAttribute('disable-tap', '');
          modelViewer.setAttribute('loading', 'eager');

          modelViewer.setAttribute('environment-image', 'neutral');
          modelViewer.setAttribute('shadow-intensity', '0');
          modelViewer.style.width = `${CLIPPY_SIZE_PX}px`;
          modelViewer.style.height = `${CLIPPY_SIZE_PX}px`;
          modelViewer.style.background = 'transparent';
          modelViewer.style.pointerEvents = 'none';
          modelViewer.style.transition = 'transform 0.3s ease-out, filter 0.3s ease-out';
          
          // Clear any existing content and add the model
          if (modelRef.current) {
            modelRef.current.innerHTML = '';
            modelRef.current.appendChild(modelViewer);
            setCurrentModelViewer(modelViewer);
            console.log('Model-viewer element added successfully');
          }
        } catch (error) {
          console.error('Error creating model-viewer:', error);
          // Fallback to simple 3D icon
          if (modelRef.current) {
            modelRef.current.innerHTML = `<div style="width: ${CLIPPY_SIZE_PX}px; height: ${CLIPPY_SIZE_PX}px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; border-radius: 50%; color: white; font-weight: bold; font-size: 24px; pointer-events: none;">3D</div>`;
          }
        }
      } else if (retryCount < maxRetries) {
        // If model-viewer isn't loaded yet, try again after a short delay
        retryCount++;
        console.log(`Waiting for model-viewer... attempt ${retryCount}/${maxRetries}`);
        setTimeout(createModelViewer, 100);
      } else {
        console.error('Model-viewer failed to load after timeout');
        // Fallback to simple 3D icon
        if (modelRef.current) {
          modelRef.current.innerHTML = `<div style="width: ${CLIPPY_SIZE_PX}px; height: ${CLIPPY_SIZE_PX}px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; border-radius: 50%; color: white; font-weight: bold; font-size: 24px; pointer-events: none;">3D</div>`;
        }
      }
    };

    createModelViewer();
  }, [isOpen, CLIPPY_SIZE_PX]);

  // Mouse movement handler for blended system
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!currentModelViewer || isClicked || isOpen) return;
    
    const buttonRect = modelRef.current?.getBoundingClientRect();
    if (!buttonRect) return;
    
    const centerX = buttonRect.left + buttonRect.width / 2;
    const centerY = buttonRect.top + buttonRect.height / 2;
    
    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;
    
    // Calculate distance from center for more realistic movement
    const distance = Math.sqrt(mouseX * mouseX + mouseY * mouseY);
    const maxDistance = Math.sqrt(window.innerWidth * window.innerWidth + window.innerHeight * window.innerHeight) / 4;
    
    // Normalize to get realistic rotation ranges
    const normalizedX = Math.max(-1, Math.min(1, mouseX / (buttonRect.width * 2)));
    const normalizedY = Math.max(-1, Math.min(1, mouseY / (buttonRect.height * 2)));
    
    // Realistic head rotation: horizontal follows more than vertical
    const horizontalRotation = -normalizedX * 25; // -25 to +25 degrees (flipped to look toward mouse)
    const verticalAdjustment = -normalizedY * 10; // -10 to +10 degrees (flipped to look toward mouse)
    
    // Distance affects how much Clippy "leans" toward the cursor
    const distanceEffect = Math.min(distance / maxDistance, 0.5); // Max 50% effect
    const mouseDistanceValue = distanceEffect * 15; // 0 to 15 for camera distance
    
    setAnimationState(prev => ({
      ...prev,
      mouseRotation: { horizontal: horizontalRotation, vertical: verticalAdjustment },
      mouseDistance: mouseDistanceValue
    }));
  }, [currentModelViewer, isClicked, isOpen]);

  // Scroll handler for blended system
  const handleScrollWithBlending = useCallback(() => {
    if (!currentModelViewer || isClicked || isOpen) return;
    
    const currentScrollY = window.scrollY;
    const deltaY = currentScrollY - lastScrollY.current;
    
    // Calculate scroll velocity (positive = scrolling down, negative = scrolling up)
    const scrollVelocity = Math.max(-1, Math.min(1, deltaY / 50)); // Divide by 50 for sensitivity
    
    // Convert to camera angles
    // When scrolling down (positive velocity), Clippy looks up (negative vertical adjustment)
    // When scrolling up (negative velocity), Clippy looks down (positive vertical adjustment)
    const verticalAdjustment = -scrollVelocity * 20; // -20 to +20 degrees (reversed)
    const scrollIntensityValue = Math.abs(scrollVelocity);
    
    setAnimationState(prev => ({
      ...prev,
      scrollRotation: { vertical: verticalAdjustment },
      scrollIntensity: scrollIntensityValue,
      isScrolling: true,
      scrollInfluence: Math.min(prev.scrollInfluence + 0.1, 0.8) // Ramp up to 80% influence
    }));
    
    lastScrollY.current = currentScrollY;
    
    // Reset scroll influence after scrolling stops
    if (scrollResetTimeout.current) clearTimeout(scrollResetTimeout.current);
    scrollResetTimeout.current = setTimeout(() => {
      setAnimationState(prev => ({
        ...prev,
        isScrolling: false
      }));
      
      // Gradual fade out of scroll influence
      if (scrollInfluenceFadeInterval.current) clearInterval(scrollInfluenceFadeInterval.current);
      scrollInfluenceFadeInterval.current = setInterval(() => {
        setAnimationState(prev => {
          const newInfluence = Math.max(prev.scrollInfluence - 0.05, 0);
          if (newInfluence === 0) {
            if (scrollInfluenceFadeInterval.current) clearInterval(scrollInfluenceFadeInterval.current);
          }
          return { ...prev, scrollInfluence: newInfluence };
        });
      }, 16); // 60fps fade out
    }, 150); // Wait 150ms after scrolling stops
  }, [currentModelViewer, isClicked, isOpen]);

  // Apply blended rotation based on animation state
  useEffect(() => {
    if (!currentModelViewer || isClicked || isOpen) return;
    
    const { mouseRotation, scrollRotation, scrollInfluence, mouseDistance, scrollIntensity } = animationState;
    
    // Blend vertical rotation: mouse baseline + scroll override
    const finalVertical = lerp(mouseRotation.vertical, scrollRotation.vertical, scrollInfluence);
    
    // Horizontal always from mouse (no scroll interference)
    const finalHorizontal = mouseRotation.horizontal;
    
    // Distance effect: combines mouse distance and scroll intensity
    const baseDistance = 105;
    const scrollDistance = scrollIntensity * 15; // 0 to 15 based on scroll intensity
    const combinedDistance = Math.max(mouseDistance, scrollDistance);
    const finalDistance = baseDistance - combinedDistance;
    
    const orbit = `${finalHorizontal}deg ${75 + finalVertical}deg ${finalDistance}%`;
    currentModelViewer.setAttribute('camera-orbit', orbit);
  }, [animationState, currentModelViewer, isClicked, isOpen]);

  // Enhanced animation system: both scroll and mouse on desktop, scroll-only on mobile
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    
    if (isMobile) {
      // Mobile: use scroll-based head movement only (existing behavior)
      window.addEventListener('scroll', handleScrollWithBlending, { passive: true });
    } else {
      // Desktop: use BOTH mouse movement AND scroll blending
      document.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('scroll', handleScrollWithBlending, { passive: true });
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScrollWithBlending);
      if (scrollResetTimeout.current) clearTimeout(scrollResetTimeout.current);
      if (scrollInfluenceFadeInterval.current) clearInterval(scrollInfluenceFadeInterval.current);
    };
  }, [handleMouseMove, handleScrollWithBlending]);

  // Handle state changes: brightness and camera position
  useEffect(() => {
    if (!currentModelViewer) return;

    if (isOpen) {
      // Chat is open: face user directly and brighten
      currentModelViewer.style.filter = 'brightness(1.1) saturate(1.2)';
      currentModelViewer.setAttribute('camera-orbit', '0deg 70deg 100%');
    } else {
      // Chat is closed: normal brightness, return to blended animation
      currentModelViewer.style.filter = 'brightness(1) saturate(1)';
      // Don't override here - let the blended animation system handle it
    }
  }, [isOpen, currentModelViewer]);

  // Click reaction effect
  const handleClippyClick = () => {
    setIsClicked(true);
    
    if (currentModelViewer) {
      // Brief zoom and face-forward effect
      currentModelViewer.style.transform = 'scale(1.1)';
      currentModelViewer.setAttribute('camera-orbit', '0deg 65deg 95%'); // Face user directly
      
      setTimeout(() => {
        currentModelViewer.style.transform = 'scale(1)';
        // Return to blended animation system
        setIsClicked(false);
      }, 150);
    }
    
    onClick();
  };

  return (
    <div className={cn("relative z-50", className)}>
      <div className="relative">
        {/* Clickable wrapper for the 3D model */}
        <div
          onClick={handleClippyClick}
          className="cursor-pointer flex items-center justify-center relative"
          style={{ width: `${CLIPPY_SIZE_PX}px`, height: `${CLIPPY_SIZE_PX}px` }}
        >
          {/* 3D Clippy Model Container */}
          <div 
            ref={modelRef}
            className="flex items-center justify-center"
            style={{ width: `${CLIPPY_SIZE_PX}px`, height: `${CLIPPY_SIZE_PX}px` }}
          />

          {/* New message indicator */}
          {hasNewMessage && !isOpen && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full z-10"
            />
          )}
        </div>
      </div>
    </div>
  );
} 
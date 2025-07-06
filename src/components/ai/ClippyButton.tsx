'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ClippyButtonProps {
  isOpen: boolean;
  onClick: () => void;
  className?: string;
  hasNewMessage?: boolean;
}

export function ClippyButton({ isOpen, onClick, className, hasNewMessage }: ClippyButtonProps) {
  const modelRef = useRef<HTMLDivElement>(null);
  const [isClicked, setIsClicked] = useState(false);
  const [currentModelViewer, setCurrentModelViewer] = useState<HTMLElement | null>(null);
  
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
  }, [isOpen]);

  // Smooth mouse following with realistic head movement
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
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
      const cameraDistance = 105 - (distanceEffect * 15); // Gets closer when mouse is closer
      
      const orbit = `${horizontalRotation}deg ${75 + verticalAdjustment}deg ${cameraDistance}%`;
      currentModelViewer.setAttribute('camera-orbit', orbit);
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [currentModelViewer, isClicked, isOpen]);

  // Handle state changes: brightness and camera position
  useEffect(() => {
    if (!currentModelViewer) return;

    if (isOpen) {
      // Chat is open: face user directly and brighten
      currentModelViewer.style.filter = 'brightness(1.1) saturate(1.2)';
      currentModelViewer.setAttribute('camera-orbit', '0deg 70deg 100%');
    } else {
      // Chat is closed: normal brightness, return to mouse following
      currentModelViewer.style.filter = 'brightness(1) saturate(1)';
      currentModelViewer.setAttribute('camera-orbit', '0deg 75deg 105%');
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
        // Return to mouse following or face user if chat opens
        if (!isOpen) {
          currentModelViewer.setAttribute('camera-orbit', '0deg 75deg 105%');
        }
        setIsClicked(false);
      }, 150);
    }
    
    onClick();
  };

  // Always show Clippy, but with different states when chat is open/closed

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
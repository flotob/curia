'use client';

import React, { useEffect, useRef } from 'react';
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
          modelViewer.style.width = '180px';
          modelViewer.style.height = '180px';
          modelViewer.style.background = 'transparent';
          modelViewer.style.pointerEvents = 'none';
          
          // Clear any existing content and add the model
          if (modelRef.current) {
            modelRef.current.innerHTML = '';
            modelRef.current.appendChild(modelViewer);
            console.log('Model-viewer element added successfully');
          }
        } catch (error) {
          console.error('Error creating model-viewer:', error);
          // Fallback to simple 3D icon
          if (modelRef.current) {
            modelRef.current.innerHTML = '<div style="width: 180px; height: 180px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; border-radius: 50%; color: white; font-weight: bold; font-size: 24px; pointer-events: none;">3D</div>';
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
          modelRef.current.innerHTML = '<div style="width: 180px; height: 180px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; border-radius: 50%; color: white; font-weight: bold; font-size: 24px; pointer-events: none;">3D</div>';
        }
      }
    };

    createModelViewer();
  }, [isOpen]);

  // Show simple X when chat is open, 3D Clippy when closed
  if (isOpen) {
    return (
      <div className={cn("fixed bottom-6 right-6 z-50", className)}>
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <button
            onClick={onClick}
            className={cn(
              "w-14 h-14 rounded-full shadow-lg",
              "bg-primary hover:bg-primary/90",
              "text-primary-foreground border-0",
              "flex items-center justify-center"
            )}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={cn("fixed bottom-6 right-6 z-50", className)}>
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative"
      >
        {/* Clickable wrapper for the 3D model */}
        <div
          onClick={onClick}
          className="cursor-pointer flex items-center justify-center relative"
          style={{ width: '180px', height: '180px' }}
        >
          {/* 3D Clippy Model Container */}
          <div 
            ref={modelRef}
            className="flex items-center justify-center"
            style={{ width: '180px', height: '180px' }}
          />

          {/* New message indicator */}
          {hasNewMessage && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full z-10"
            />
          )}

          {/* Subtle shadow for grounding */}
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-32 h-3 bg-black/10 rounded-full blur-sm -z-10" />
        </div>

        {/* Sparkle animation for attention (similar to original) */}
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          animate={{
            boxShadow: [
              '0 0 0 0 rgba(59, 130, 246, 0.7)',
              '0 0 0 20px rgba(59, 130, 246, 0)',
              '0 0 0 0 rgba(59, 130, 246, 0)'
            ]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 4
          }}
        />
      </motion.div>
    </div>
  );
} 
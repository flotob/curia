'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { AIChatInterface } from './AIChatInterface';
import { ClippyButton } from './ClippyButton';
import { motion, AnimatePresence } from 'framer-motion';
import { useCardStyling } from '@/hooks/useCardStyling';

interface AIChatBubbleProps {
  className?: string;
  context?: {
    type: 'post' | 'comment' | 'general' | 'onboarding';
    boardId?: number;
    postId?: number;
  };
}

export function AIChatBubble({ className, context }: AIChatBubbleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const { isAuthenticated, user } = useAuth();
  
  // Get card styling for background-aware gradients (same as PostCard)
  const { hasActiveBackground } = useCardStyling();

  // Only show for authenticated users
  if (!isAuthenticated || !user) {
    return null;
  }

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setHasNewMessage(false);
    }
  };

  return (
    <>
      {/* Chat Window - Positioned independently */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "fixed bottom-20 right-6 z-40",
              "w-80 sm:w-96 md:w-[420px] rounded-lg overflow-hidden",
              "h-[80vh] max-h-[800px] min-h-[400px]",
              hasActiveBackground 
                ? 'backdrop-blur-md bg-white/20 border-white/30 shadow-xl dark:bg-black/20 dark:border-black/30'
                : 'bg-card border border-border shadow-2xl'
            )}
          >
            {/* Chat Interface - no duplicate header */}
            <AIChatInterface
              context={context ? {
                boardId: context.boardId?.toString(),
                postId: context.postId?.toString()
              } : undefined}
              className="h-full"
              onClose={toggleChat}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3D Clippy Button - Positioned independently, always in same spot */}
      <ClippyButton 
        isOpen={isOpen}
        onClick={toggleChat}
        hasNewMessage={hasNewMessage}
        className={className}
      />
    </>
  );
}
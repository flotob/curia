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
    <div className={cn("fixed bottom-0 right-2 md:right-6 z-40 -mr-8 -mb-8", className)}>
      <div className="relative">
        {/* Chat Window - Positioned absolutely */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              style={{ transformOrigin: 'bottom right' }}
              className={cn(
                "absolute bottom-[170px] right-12 mb-2 md:bottom-[234px] md:right-[130px]",
                "w-[90vw] sm:w-[85vw] md:w-80 lg:w-96 xl:w-[420px] rounded-lg overflow-hidden",
                "h-[80vh] max-h-[800px] min-h-[400px]",
                hasActiveBackground
                  ? 'backdrop-blur-md bg-white/20 border-white/30 shadow-xl dark:bg-black/20 dark:border-black/30'
                  : 'bg-card border border-border shadow-2xl'
              )}
            >
              {/* Chat Interface - no duplicate header */}
              <AIChatInterface
                context={
                  context
                    ? {
                        boardId: context.boardId?.toString(),
                        postId: context.postId?.toString(),
                      }
                    : undefined
                }
                className="h-full"
                onClose={toggleChat}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3D Clippy Button - Positioned absolutely */}
        <div className="absolute bottom-0 right-0">
          <ClippyButton
            isOpen={isOpen}
            onClick={toggleChat}
            hasNewMessage={hasNewMessage}
          />
        </div>
      </div>
    </div>
  );
}
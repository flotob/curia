'use client';

import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { AIChatInterface } from './AIChatInterface';
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

      {/* Floating Button - Positioned independently, always in same spot */}
      <div className={cn("fixed bottom-6 right-6 z-50", className)}>
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            onClick={toggleChat}
            className={cn(
              "w-14 h-14 rounded-full shadow-lg relative",
              "bg-primary hover:bg-primary/90",
              "text-primary-foreground border-0"
            )}
          >
            {isOpen ? (
              <X size={20} />
            ) : (
              <div className="relative">
                <MessageCircle size={20} />
                {hasNewMessage && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"
                  />
                )}
              </div>
            )}

            {/* Sparkle animation for attention */}
            {!isOpen && (
              <motion.div
                className="absolute inset-0 rounded-full"
                animate={{
                  boxShadow: [
                    '0 0 0 0 rgba(59, 130, 246, 0.7)',
                    '0 0 0 10px rgba(59, 130, 246, 0)',
                    '0 0 0 0 rgba(59, 130, 246, 0)'
                  ]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatDelay: 3
                }}
              />
            )}
          </Button>
        </motion.div>
      </div>
    </>
  );
}
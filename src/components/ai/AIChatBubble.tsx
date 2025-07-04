'use client';

import React, { useState } from 'react';
import { MessageCircle, X, Sparkles } from 'lucide-react';
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
    <div className={cn("fixed bottom-6 right-6 z-50", className)}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "mb-4 w-96 h-[600px] rounded-lg overflow-hidden",
              hasActiveBackground 
                ? 'backdrop-blur-md bg-white/20 border-white/30 shadow-xl dark:bg-black/20 dark:border-black/30'
                : 'bg-card border border-border shadow-2xl'
            )}
          >
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 bg-primary text-primary-foreground">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">AI Writing Assistant</h3>
                  <p className="text-xs opacity-90">
                    {context?.type === 'post' ? 'Help with your post' :
                     context?.type === 'comment' ? 'Help with your comment' :
                     'Writing help'}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleChat}
                className="text-white hover:bg-white/20 p-1 h-auto"
              >
                <X size={16} />
              </Button>
            </div>

            {/* Chat Interface */}
            <AIChatInterface
              context={context ? {
                boardId: context.boardId?.toString(),
                postId: context.postId?.toString()
              } : undefined}
              className="h-[calc(600px-80px)]"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
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
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <X size={20} />
              </motion.div>
            ) : (
              <motion.div
                key="open"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="relative"
              >
                <MessageCircle size={20} />
                {hasNewMessage && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>

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
  );
}
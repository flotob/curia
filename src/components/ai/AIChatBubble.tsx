'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { AIChatInterface, AIChatInterfaceRef } from './AIChatInterface';
import { ClippyButton } from './ClippyButton';
import ClippySpeechBubble from './ClippySpeechBubble';
import { motion, AnimatePresence } from 'framer-motion';
import { useCardStyling } from '@/hooks/useCardStyling';
import { authFetch } from '@/utils/authFetch';
import { useRouter } from 'next/navigation';
import { useGlobalSearch } from '@/contexts/GlobalSearchContext';

interface AIChatBubbleProps {
  className?: string;
  context?: {
    type: 'post' | 'comment' | 'general' | 'onboarding';
    boardId?: number;
    postId?: number;
  };
}

interface WelcomeResponse {
  message: string;
  tone: 'welcoming' | 'helpful' | 'encouraging' | 'admin-focused';
  duration: number;
  hasCallToAction: boolean;
}

// ActionButton interface to match ClippySpeechBubble
interface ActionButton {
  id: string;
  label: string;
  icon: React.ReactNode;
  message?: string;
  action?: 'chat' | 'navigate' | 'modal';
  navigationPath?: string;
  adminOnly?: boolean;
}

export function AIChatBubble({ className, context }: AIChatBubbleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [speechBubbleVisible, setSpeechBubbleVisible] = useState(false);
  const [speechMessage, setSpeechMessage] = useState('');
  const [speechTone, setSpeechTone] = useState<'welcoming' | 'helpful' | 'encouraging' | 'admin-focused'>('welcoming');
  const [welcomeLoading, setWelcomeLoading] = useState(false);
  const [welcomeLoaded, setWelcomeLoaded] = useState(false);
  const chatInterfaceRef = useRef<AIChatInterfaceRef | null>(null);
  const { isAuthenticated, user, token } = useAuth();
  const router = useRouter();
  const { openSearch } = useGlobalSearch();
  
  // Get card styling for background-aware gradients (same as PostCard)
  const { hasActiveBackground } = useCardStyling();

  const getTimeOfDay = (): 'morning' | 'afternoon' | 'evening' => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  };

  const showFallbackWelcome = () => {
    const isAdmin = user?.isAdmin || false;
    const welcomeMessage = isAdmin 
      ? "Welcome back! Ready to check your community analytics or manage settings?"
      : "Hi there! I can help you explore discussions, create posts, or answer questions.";
    const tone = isAdmin ? 'admin-focused' : 'welcoming';
    
    setSpeechMessage(welcomeMessage);
    setSpeechTone(tone);
    setWelcomeLoaded(true);
    
    setTimeout(() => {
      setSpeechBubbleVisible(true);
    }, 1000);
  };

  const loadWelcomeMessage = useCallback(async () => {
    setWelcomeLoading(true);
    
    try {
      const response = await authFetch('/api/ai/welcome', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context: {
            isFirstVisit: true,
            timeOfDay: getTimeOfDay(),
            boardId: context?.boardId?.toString()
          }
        }),
        token
      });

      if (response.ok) {
        const data: WelcomeResponse = await response.json();
        setSpeechMessage(data.message);
        setSpeechTone(data.tone);
        setWelcomeLoaded(true);
        
        // Show speech bubble after a brief delay for smooth UX
        setTimeout(() => {
          setSpeechBubbleVisible(true);
        }, 1000);
      } else {
        console.error('Failed to load welcome message:', response.status);
        // Show fallback message
        showFallbackWelcome();
      }
    } catch (error) {
      console.error('Error loading welcome message:', error);
      // Show fallback message
      showFallbackWelcome();
    } finally {
      setWelcomeLoading(false);
    }
  }, [token, context?.boardId]);

  // Auto-load welcome message on component mount
  useEffect(() => {
    if (isAuthenticated && user && token && !welcomeLoaded && !welcomeLoading) {
      loadWelcomeMessage();
    }
  }, [isAuthenticated, user, token, welcomeLoaded, welcomeLoading, loadWelcomeMessage]);

  // Only show for authenticated users
  if (!isAuthenticated || !user) {
    return null;
  }

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setHasNewMessage(false);
      // Hide speech bubble when chat opens
      setSpeechBubbleVisible(false);
    }
  };

  // Handle action button clicks from speech bubble
  const handleActionClick = (button: ActionButton) => {
    // Hide speech bubble
    setSpeechBubbleVisible(false);
    
    switch (button.action) {
      case 'chat':
        // Send message to chat interface and open modal
        if (button.message && chatInterfaceRef.current) {
          chatInterfaceRef.current.sendMessage(button.message);
        }
        setIsOpen(true);
        setHasNewMessage(false);
        break;
        
      case 'navigate':
        // Navigate to the specified path
        if (button.navigationPath) {
          router.push(button.navigationPath);
        }
        break;
        
      case 'modal':
        // Open search modal with new post mode
        if (button.id === 'create-post') {
          openSearch({
            initialQuery: 'Share your thoughts',
            autoExpandForm: true,
            initialTitle: 'Share your thoughts'
          });
        }
        break;
        
      default:
        // Fallback to chat behavior for backward compatibility
        if (button.message && chatInterfaceRef.current) {
          chatInterfaceRef.current.sendMessage(button.message);
        }
        setIsOpen(true);
        setHasNewMessage(false);
        break;
    }
  };

  return (
    <div className={cn("fixed bottom-0 right-2 md:right-6 z-40 -mr-8 -mb-8", className)}>
      <div className="relative">
        {/* Speech Bubble */}
        <ClippySpeechBubble
          message={speechMessage}
          isVisible={speechBubbleVisible}
          onClose={() => setSpeechBubbleVisible(false)}
          onActionClick={handleActionClick}
          tone={speechTone}
        />

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
                ref={chatInterfaceRef}
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
            onClick={toggleChat} // Always toggle chat, no special speech bubble logic
            hasNewMessage={hasNewMessage}
          />
        </div>
      </div>
    </div>
  );
}
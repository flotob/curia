'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSocket } from '@/contexts/SocketContext';

// Simple debounce implementation
function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): T & { cancel: () => void } {
  let timeout: NodeJS.Timeout | null = null;
  
  const debounced = ((...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T & { cancel: () => void };
  
  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };
  
  return debounced;
}

// Configuration constants
const TYPING_DEBOUNCE_MS = 300;      // Delay before sending typing event
const TYPING_STOP_DELAY_MS = 2000;   // Delay before sending stop typing when input stops
const TYPING_HEARTBEAT_MS = 8000;    // Send heartbeat to keep typing alive

// Typing events hook interface
interface UseTypingEventsOptions {
  boardId: number;
  postId?: number;
  enabled?: boolean;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
}

interface UseTypingEventsReturn {
  isCurrentlyTyping: boolean;
  handleInputChange: (value: string) => void;
  handleFocus: () => void;
  handleBlur: () => void;
  handleSubmit: () => void;
  startTyping: () => void;
  stopTyping: () => void;
}

export const useTypingEvents = ({
  boardId,
  postId,
  enabled = true,
  onTypingStart,
  onTypingStop
}: UseTypingEventsOptions): UseTypingEventsReturn => {
  const { sendTyping, isConnected } = useSocket();
  const [isCurrentlyTyping, setIsCurrentlyTyping] = useState(false);
  
  // Refs to manage timers and prevent memory leaks
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastValueRef = useRef<string>('');
  const isTypingRef = useRef<boolean>(false);

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // Send typing start event
  const startTyping = useCallback(() => {
    if (!enabled || !isConnected || isTypingRef.current) return;
    
    console.log(`[TypingEvents] Starting typing (board: ${boardId}, post: ${postId || 'none'})`);
    sendTyping(boardId, postId, true);
    setIsCurrentlyTyping(true);
    isTypingRef.current = true;
    onTypingStart?.();
    
    // Set up heartbeat to keep typing alive
    heartbeatIntervalRef.current = setInterval(() => {
      if (isTypingRef.current && enabled && isConnected) {
        console.log(`[TypingEvents] Typing heartbeat (board: ${boardId}, post: ${postId || 'none'})`);
        sendTyping(boardId, postId, true);
      }
    }, TYPING_HEARTBEAT_MS);
  }, [enabled, isConnected, boardId, postId, sendTyping, onTypingStart]);

  // Send typing stop event
  const stopTyping = useCallback(() => {
    if (!enabled || !isConnected || !isTypingRef.current) return;
    
    console.log(`[TypingEvents] Stopping typing (board: ${boardId}, post: ${postId || 'none'})`);
    sendTyping(boardId, postId, false);
    setIsCurrentlyTyping(false);
    isTypingRef.current = false;
    clearTimers();
    onTypingStop?.();
  }, [enabled, isConnected, boardId, postId, sendTyping, clearTimers, onTypingStop]);

  // Debounced typing start function
  const debouncedStartTyping = useCallback(() => {
    const debouncedFn = debounce(() => {
      startTyping();
    }, TYPING_DEBOUNCE_MS);
    return debouncedFn;
  }, [startTyping])();

  // Debounced typing stop function  
  const debouncedStopTyping = useCallback(() => {
    const debouncedFn = debounce(() => {
      stopTyping();
    }, TYPING_STOP_DELAY_MS);
    return debouncedFn;
  }, [stopTyping])();

  // Handle input value changes
  const handleInputChange = useCallback((value: string) => {
    if (!enabled || !isConnected) return;
    
    const trimmedValue = value.trim();
    const hadContent = lastValueRef.current.trim().length > 0;
    const hasContent = trimmedValue.length > 0;
    
    lastValueRef.current = value;
    
    // If user started typing (went from empty to having content)
    if (!hadContent && hasContent) {
      debouncedStartTyping();
      debouncedStopTyping.cancel(); // Cancel any pending stop
    }
    // If user is still typing (has content and is modifying)
    else if (hasContent && isTypingRef.current) {
      debouncedStopTyping.cancel(); // Cancel stop since user is still typing
      debouncedStopTyping(); // Schedule new stop
    }
    // If user cleared all content
    else if (hadContent && !hasContent) {
      debouncedStartTyping.cancel(); // Cancel any pending start
      debouncedStopTyping.cancel(); // Cancel delayed stop
      stopTyping(); // Stop immediately
    }
  }, [enabled, isConnected, debouncedStartTyping, debouncedStopTyping, stopTyping]);

  // Handle input focus
  const handleFocus = useCallback(() => {
    if (!enabled || !isConnected) return;
    
    // Only start typing if there's content in the input
    const hasContent = lastValueRef.current.trim().length > 0;
    if (hasContent && !isTypingRef.current) {
      debouncedStartTyping();
    }
  }, [enabled, isConnected, debouncedStartTyping]);

  // Handle input blur
  const handleBlur = useCallback(() => {
    if (!enabled || !isConnected) return;
    
    // Stop typing when input loses focus
    if (isTypingRef.current) {
      debouncedStartTyping.cancel();
      debouncedStopTyping.cancel();
      stopTyping();
    }
  }, [enabled, isConnected, debouncedStartTyping, debouncedStopTyping, stopTyping]);

  // Handle form submission
  const handleSubmit = useCallback(() => {
    if (!enabled || !isConnected) return;
    
    // Immediately stop typing on submit
    debouncedStartTyping.cancel();
    debouncedStopTyping.cancel();
    stopTyping();
    lastValueRef.current = ''; // Reset for next input
  }, [enabled, isConnected, debouncedStartTyping, debouncedStopTyping, stopTyping]);

  // Cleanup on unmount or when dependencies change
  useEffect(() => {
    return () => {
      if (isTypingRef.current) {
        // Send final stop event on cleanup
        sendTyping(boardId, postId, false);
      }
      clearTimers();
      debouncedStartTyping.cancel();
      debouncedStopTyping.cancel();
    };
  }, [boardId, postId, sendTyping, clearTimers, debouncedStartTyping, debouncedStopTyping]);

  // Stop typing when socket disconnects
  useEffect(() => {
    if (!isConnected && isTypingRef.current) {
      setIsCurrentlyTyping(false);
      isTypingRef.current = false;
      clearTimers();
    }
  }, [isConnected, clearTimers]);

  return {
    isCurrentlyTyping,
    handleInputChange,
    handleFocus,
    handleBlur,
    handleSubmit,
    startTyping,
    stopTyping
  };
};

export default useTypingEvents; 
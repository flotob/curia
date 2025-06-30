'use client';

import React, { createContext, useContext, useCallback, useRef, ReactNode } from 'react';

// ===== TYPES =====

export interface VerificationEvent {
  type: 'verification_complete' | 'verification_failed' | 'verification_started';
  context?: {
    type: 'board' | 'post' | 'preview';
    lockId?: number;
    postId?: number;
    boardId?: number;
    communityId?: string;
  };
  data?: {
    canComment?: boolean;
    success?: boolean;
    message?: string;
    error?: string;
  };
  timestamp: number;
}

export type VerificationEventHandler = (event: VerificationEvent) => void;

interface VerificationEventContextType {
  // Emit verification events
  emitVerificationComplete: (context?: VerificationEvent['context'], data?: VerificationEvent['data']) => void;
  emitVerificationFailed: (context?: VerificationEvent['context'], error?: string) => void;
  emitVerificationStarted: (context?: VerificationEvent['context']) => void;
  
  // Subscribe to verification events
  onVerificationEvent: (handler: VerificationEventHandler) => () => void;
  onVerificationComplete: (handler: (event: VerificationEvent) => void) => () => void;
  onVerificationFailed: (handler: (event: VerificationEvent) => void) => () => void;
  onVerificationStarted: (handler: (event: VerificationEvent) => void) => () => void;
}

// ===== CONTEXT =====

const VerificationEventContext = createContext<VerificationEventContextType | undefined>(undefined);

// ===== PROVIDER =====

interface VerificationEventProviderProps {
  children: ReactNode;
}

export const VerificationEventProvider: React.FC<VerificationEventProviderProps> = ({ children }) => {
  const handlersRef = useRef<Set<VerificationEventHandler>>(new Set());

  // ===== EVENT EMISSION =====

  const emitEvent = useCallback((event: VerificationEvent) => {
    console.log('[VerificationEventContext] Emitting event:', event);
    handlersRef.current.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('[VerificationEventContext] Error in event handler:', error);
      }
    });
  }, []);

  const emitVerificationComplete = useCallback((context?: VerificationEvent['context'], data?: VerificationEvent['data']) => {
    emitEvent({
      type: 'verification_complete',
      context,
      data: { canComment: true, success: true, ...data },
      timestamp: Date.now()
    });
  }, [emitEvent]);

  const emitVerificationFailed = useCallback((context?: VerificationEvent['context'], error?: string) => {
    emitEvent({
      type: 'verification_failed',
      context,
      data: { canComment: false, success: false, error },
      timestamp: Date.now()
    });
  }, [emitEvent]);

  const emitVerificationStarted = useCallback((context?: VerificationEvent['context']) => {
    emitEvent({
      type: 'verification_started',
      context,
      data: { success: false },
      timestamp: Date.now()
    });
  }, [emitEvent]);

  // ===== EVENT SUBSCRIPTION =====

  const onVerificationEvent = useCallback((handler: VerificationEventHandler) => {
    handlersRef.current.add(handler);
    
    // Return unsubscribe function
    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  const onVerificationComplete = useCallback((handler: (event: VerificationEvent) => void) => {
    const wrappedHandler: VerificationEventHandler = (event) => {
      if (event.type === 'verification_complete') {
        handler(event);
      }
    };
    return onVerificationEvent(wrappedHandler);
  }, [onVerificationEvent]);

  const onVerificationFailed = useCallback((handler: (event: VerificationEvent) => void) => {
    const wrappedHandler: VerificationEventHandler = (event) => {
      if (event.type === 'verification_failed') {
        handler(event);
      }
    };
    return onVerificationEvent(wrappedHandler);
  }, [onVerificationEvent]);

  const onVerificationStarted = useCallback((handler: (event: VerificationEvent) => void) => {
    const wrappedHandler: VerificationEventHandler = (event) => {
      if (event.type === 'verification_started') {
        handler(event);
      }
    };
    return onVerificationEvent(wrappedHandler);
  }, [onVerificationEvent]);

  // ===== CONTEXT VALUE =====

  const contextValue: VerificationEventContextType = {
    emitVerificationComplete,
    emitVerificationFailed,
    emitVerificationStarted,
    onVerificationEvent,
    onVerificationComplete,
    onVerificationFailed,
    onVerificationStarted,
  };

  return (
    <VerificationEventContext.Provider value={contextValue}>
      {children}
    </VerificationEventContext.Provider>
  );
};

// ===== HOOK =====

export const useVerificationEvents = (): VerificationEventContextType => {
  const context = useContext(VerificationEventContext);
  if (context === undefined) {
    throw new Error('useVerificationEvents must be used within a VerificationEventProvider');
  }
  return context;
};

// ===== CONVENIENCE HOOKS =====

export const useVerificationComplete = (handler: (event: VerificationEvent) => void) => {
  const { onVerificationComplete } = useVerificationEvents();
  
  React.useEffect(() => {
    const unsubscribe = onVerificationComplete(handler);
    return unsubscribe;
  }, [onVerificationComplete, handler]);
};

export const useVerificationFailed = (handler: (event: VerificationEvent) => void) => {
  const { onVerificationFailed } = useVerificationEvents();
  
  React.useEffect(() => {
    const unsubscribe = onVerificationFailed(handler);
    return unsubscribe;
  }, [onVerificationFailed, handler]);
};

export const useVerificationStarted = (handler: (event: VerificationEvent) => void) => {
  const { onVerificationStarted } = useVerificationEvents();
  
  React.useEffect(() => {
    const unsubscribe = onVerificationStarted(handler);
    return unsubscribe;
  }, [onVerificationStarted, handler]);
};
'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { LockBuilderState, LockBuilderStep, CreateLockRequest, LockGatingConfig, LockValidationResult } from '@/types/locks';

// Initial state for the lock builder
const initialState: LockBuilderState = {
  step: 'metadata',
  selectedTemplate: null,
  metadata: {
    name: '',
    description: '',
    icon: '🔒',
    color: '#3b82f6',
    tags: [],
    isPublic: true
  },
  requirements: {
    categories: [],
    requireAny: true
  },
  validation: {
    isValid: false,
    errors: [],
    warnings: []
  },
  previewMode: false
};

// Context type
interface LockBuilderContextType {
  state: LockBuilderState;
  setState: React.Dispatch<React.SetStateAction<LockBuilderState>>;
  updateMetadata: (metadata: Partial<CreateLockRequest>) => void;
  updateRequirements: (requirements: Partial<LockGatingConfig>) => void;
  updateValidation: (validation: Partial<LockValidationResult>) => void;
  setStep: (step: LockBuilderStep) => void;
  setPreviewMode: (enabled: boolean) => void;
  resetState: () => void;
}

// Create the context
const LockBuilderContext = createContext<LockBuilderContextType | null>(null);

// Hook to use the context
export const useLockBuilder = (): LockBuilderContextType => {
  const context = useContext(LockBuilderContext);
  if (!context) {
    throw new Error('useLockBuilder must be used within a LockBuilderProvider');
  }
  return context;
};

// Provider props
interface LockBuilderProviderProps {
  children: ReactNode;
  initialData?: Partial<LockBuilderState>;
}

// Provider component
export const LockBuilderProvider: React.FC<LockBuilderProviderProps> = ({
  children,
  initialData
}) => {
  const [state, setState] = useState<LockBuilderState>({
    ...initialState,
    ...initialData
  });

  // Helper functions for updating specific parts of state
  const updateMetadata = useCallback((metadata: Partial<CreateLockRequest>) => {
    setState(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        ...metadata
      }
    }));
  }, []);

  const updateRequirements = useCallback((requirements: Partial<LockGatingConfig>) => {
    setState(prev => ({
      ...prev,
      requirements: {
        ...prev.requirements,
        ...requirements
      }
    }));
  }, []);

  const updateValidation = useCallback((validation: Partial<LockValidationResult>) => {
    setState(prev => ({
      ...prev,
      validation: {
        ...prev.validation,
        ...validation
      }
    }));
  }, []);

  const setStep = useCallback((step: LockBuilderStep) => {
    setState(prev => ({
      ...prev,
      step
    }));
  }, []);

  const setPreviewMode = useCallback((enabled: boolean) => {
    setState(prev => ({
      ...prev,
      previewMode: enabled
    }));
  }, []);

  const resetState = useCallback(() => {
    setState(initialState);
  }, []);

  const contextValue: LockBuilderContextType = {
    state,
    setState,
    updateMetadata,
    updateRequirements,
    updateValidation,
    setStep,
    setPreviewMode,
    resetState
  };

  return (
    <LockBuilderContext.Provider value={contextValue}>
      {children}
    </LockBuilderContext.Provider>
  );
}; 
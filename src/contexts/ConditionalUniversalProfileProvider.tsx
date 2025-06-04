'use client';

import React, { createContext, useContext, useState } from 'react';
import { UniversalProfileProvider, useUniversalProfile, type UniversalProfileContextType } from './UniversalProfileContext';

// Context to track if Universal Profile functionality is needed
interface UPActivationContextType {
  isUPNeeded: boolean;
  activateUP: () => void;
  deactivateUP: () => void;
}

const UPActivationContext = createContext<UPActivationContextType | undefined>(undefined);

export const useUPActivation = () => {
  const context = useContext(UPActivationContext);
  if (context === undefined) {
    throw new Error('useUPActivation must be used within a ConditionalUniversalProfileProvider');
  }
  return context;
};

// Create a separate context for the activation state
const ConditionalUPContext = createContext<{ isActive: boolean; context: UniversalProfileContextType | null }>({
  isActive: false,
  context: null
});

// Hook that components can use to get UP functionality conditionally
export const useConditionalUniversalProfile = (): UniversalProfileContextType => {
  const { isActive, context } = useContext(ConditionalUPContext);
  
  // Default/mock functionality when UP is not activated
  const defaultContext: UniversalProfileContextType = {
    isConnected: false,
    upAddress: null,
    isConnecting: false,
    connectionError: null,
    isCorrectChain: false,
    connect: async () => {
      throw new Error('Universal Profile not activated. Call activateUP() first.');
    },
    disconnect: () => {},
    switchToLukso: async () => {},
    verifyLyxBalance: async () => false,
    verifyTokenRequirements: async () => ({ isValid: false, missingRequirements: [], errors: ['UP not activated'] }),
    verifyPostRequirements: async () => ({ isValid: false, missingRequirements: [], errors: ['UP not activated'] }),
    getLyxBalance: async () => { throw new Error('Universal Profile not activated'); },
    getTokenBalances: async () => [],
    checkTokenBalance: async () => { throw new Error('Universal Profile not activated'); },
    getTokenMetadata: async () => { throw new Error('Universal Profile not activated'); },
    signMessage: async () => { throw new Error('Universal Profile not activated'); }
  };
  
  return (isActive && context) ? context : defaultContext;
};

// Component that provides real UP context (always calls the hook)
const ActiveUPContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const realContext = useUniversalProfile();
  
  const value = {
    isActive: true,
    context: realContext
  };
  
  return (
    <ConditionalUPContext.Provider value={value}>
      {children}
    </ConditionalUPContext.Provider>
  );
};

// Component that provides inactive UP context (no hook calls)
const InactiveUPContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const value = {
    isActive: false,
    context: null
  };
  
  return (
    <ConditionalUPContext.Provider value={value}>
      {children}
    </ConditionalUPContext.Provider>
  );
};

interface ConditionalUniversalProfileProviderProps {
  children: React.ReactNode;
}

export const ConditionalUniversalProfileProvider: React.FC<ConditionalUniversalProfileProviderProps> = ({ children }) => {
  const [isUPNeeded, setIsUPNeeded] = useState(false);
  
  const activateUP = () => {
    console.log('[ConditionalUP] Activating Universal Profile functionality');
    setIsUPNeeded(true);
  };
  
  const deactivateUP = () => {
    console.log('[ConditionalUP] Deactivating Universal Profile functionality');
    setIsUPNeeded(false);
  };
  
  const activationContextValue: UPActivationContextType = {
    isUPNeeded,
    activateUP,
    deactivateUP
  };
  
  return (
    <UPActivationContext.Provider value={activationContextValue}>
      {isUPNeeded ? (
        <UniversalProfileProvider>
          <ActiveUPContextProvider>
            {children}
          </ActiveUPContextProvider>
        </UniversalProfileProvider>
      ) : (
        <InactiveUPContextProvider>
          {children}
        </InactiveUPContextProvider>
      )}
    </UPActivationContext.Provider>
  );
}; 
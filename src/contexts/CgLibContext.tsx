'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { CgPluginLib } from '@common-ground-dao/cg-plugin-lib';

// Define the shape of the context data
interface CgLibContextType {
  cgInstance: CgPluginLib | null;
  isInitializing: boolean;
  initError: Error | null;
  iframeUid: string | null;
}

// Create the context with a default value
const CgLibContext = createContext<CgLibContextType | undefined>(undefined);

// Get the public key from environment variables
const publicKey = process.env.NEXT_PUBLIC_PUBKEY as string;

// Provider component
export function CgLibProvider({ children }: { children: React.ReactNode }) {
  const [cgInstance, setCgInstance] = useState<CgPluginLib | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [initError, setInitError] = useState<Error | null>(null);
  const [iframeUid, setIframeUid] = useState<string | null>(null);

  const searchParams = useSearchParams();

  // Effect to update iframeUid state from searchParams
  useEffect(() => {
    const uidFromParams = searchParams.get('iframeUid');
    if (uidFromParams) {
      if (iframeUid !== uidFromParams) {
        console.log(`[CgLibContext] Setting iframeUid from params: ${uidFromParams}`);
        setIframeUid(uidFromParams);
      }
    } else {
      if (iframeUid !== null) {
        console.log("[CgLibContext] iframeUid removed from params or became null.");
        setIframeUid(null);
      }
    }
  }, [searchParams, iframeUid]);

  // Effect to initialize CgPluginLib once iframeUid (from state) and publicKey are available
  useEffect(() => {
    console.log(`[CgLibContext] Initialize effect triggered. Current iframeUid: ${iframeUid}, publicKey set: ${!!publicKey}`);

    if (!publicKey) {
      console.error("[CgLibContext] Public key is not set. Cannot initialize.");
      setInitError(new Error("Public key is not set in the .env file."));
      setIsInitializing(false);
      return;
    }

    if (!iframeUid) {
      console.log("[CgLibContext] iframeUid is not yet available or is null. Waiting to initialize.");
      setIsInitializing(false); 
      return;
    }

    let isMounted = true;
    console.log(`[CgLibContext] Attempting to initialize CgPluginLib with iframeUid: ${iframeUid}`);
    setIsInitializing(true);
    setInitError(null);

    CgPluginLib.initialize(iframeUid, '/api/sign', publicKey)
      .then(instance => {
        if (isMounted) {
          console.log("[CgLibContext] CgPluginLib initialized successfully.");
          setCgInstance(instance);
          setIsInitializing(false);
        }
      })
      .catch(error => {
        if (isMounted) {
          console.error("[CgLibContext] CgPluginLib initialization failed:", error);
          setInitError(error);
          setIsInitializing(false);
          setCgInstance(null);
        }
      });

    return () => {
      isMounted = false;
      console.log("[CgLibContext] Cleanup from initialize effect for iframeUid:", iframeUid);
    };
  }, [iframeUid]);

  const value = useMemo(() => ({
    cgInstance,
    isInitializing,
    initError,
    iframeUid,
  }), [cgInstance, isInitializing, initError, iframeUid]);

  return (
    <CgLibContext.Provider value={value}>
      {children}
    </CgLibContext.Provider>
  );
}

export function useCgLib(): CgLibContextType {
  const context = useContext(CgLibContext);
  if (context === undefined) {
    throw new Error('useCgLib must be used within a CgLibProvider');
  }
  return context;
} 
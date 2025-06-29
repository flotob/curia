'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { CgPluginLib } from '@common-ground-dao/cg-plugin-lib';
import { lsp26Registry } from '@/lib/lsp26';

// Define the shape of the context data
export interface CgLibContextType {
  cgInstance: CgPluginLib | null;
  isInitializing: boolean;
  initError: Error | null;
  iframeUid: string | null;
  lsp26Registry: typeof lsp26Registry | null;
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

  // Effect to update iframeUid state from searchParams and handle redirect
  useEffect(() => {
    const uidFromParams = searchParams?.get('iframeUid');
    const pluginInstanceUrl = process.env.NEXT_PUBLIC_PLUGIN_INSTANCE_URL;

    if (!uidFromParams) {
      console.log("[CgLibContext] iframeUid is not present in URL parameters.");
      
      // Only do window checks after component has mounted to avoid hydration issues
      const checkWindowAndRedirect = () => {
        // Check if running in the top window (not in an iframe)
        if (window.top === window.self) {
          // Check if this is a shared link (has share context params)
          const hasShareToken = searchParams?.get('token');
          const hasCommunityShortId = searchParams?.get('communityShortId');
          const hasPluginId = searchParams?.get('pluginId');
          const isSharedLink = hasShareToken && hasCommunityShortId && hasPluginId;
          
          // Only redirect to plugin instance URL from root page, not shared links
          const isRootPage = window.location.pathname === '/';
          
          if (isSharedLink) {
            console.log("[CgLibContext] Shared link detected, skipping plugin instance redirect");
            // Don't redirect shared links - let them handle their own redirect logic
          } else if (isRootPage) {
            if (pluginInstanceUrl) {
              console.log(`[CgLibContext] Root page access without iframeUid. Redirecting to: ${pluginInstanceUrl}`);
              window.location.replace(pluginInstanceUrl);
              // Important: Return early to prevent further state updates in this render cycle while redirecting.
              // Setting isInitializing to true can also prevent rendering child components temporarily.
              setIsInitializing(true); 
              return; 
            } else {
              console.warn("[CgLibContext] Root page access without iframeUid, but NEXT_PUBLIC_PLUGIN_INSTANCE_URL is not set. Cannot redirect.");
            }
          } else {
            console.log("[CgLibContext] Non-root page access without iframeUid, skipping plugin instance redirect");
            // Allow non-root pages (like /board/123/post/456) to load normally
          }
        } else {
          console.warn("[CgLibContext] Running in an iframe but iframeUid is missing from URL. This is unexpected.");
          // Proceed to set iframeUid to null, which will likely cause an initError handled by UI.
        }
      };

      // Only run window checks on client-side
      if (typeof window !== 'undefined') {
        checkWindowAndRedirect();
      }

      // If not redirecting, and uidFromParams is not present, ensure iframeUid state is null.
      if (iframeUid !== null) {
         setIframeUid(null);
      }
    } else {
      // iframeUid is present in params, set it if different from current state
      if (iframeUid !== uidFromParams) {
        console.log(`[CgLibContext] Setting iframeUid from params: ${uidFromParams}`);
        setIframeUid(uidFromParams);
      }
    }
  }, [searchParams, iframeUid]); // iframeUid is in deps because we compare its current state

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
    lsp26Registry: lsp26Registry,
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
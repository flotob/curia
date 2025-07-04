import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

// Extend the global Window interface to include our theme state
declare global {
  interface Window {
    __EFFECTIVE_THEME__?: 'light' | 'dark';
  }
}

/**
 * useEffectiveTheme Hook
 * 
 * This hook replaces all direct URL theme reads throughout the app.
 * It provides the effective theme as determined by the CgThemeSynchronizer,
 * which considers both URL parameters and background-forced themes.
 * 
 * Usage:
 * Replace this pattern:
 *   const theme = searchParams?.get('cg_theme') || 'light';
 * 
 * With this:
 *   const theme = useEffectiveTheme();
 */
export const useEffectiveTheme = (): 'light' | 'dark' => {
  const searchParams = useSearchParams();
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>(() => {
    // Initial state: try to read from global state, fallback to URL
    if (typeof window !== 'undefined' && window.__EFFECTIVE_THEME__) {
      return window.__EFFECTIVE_THEME__;
    }
    return (searchParams?.get('cg_theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    // Listen for theme changes from the CgThemeSynchronizer
    const handleEffectiveThemeChange = (event: CustomEvent<'light' | 'dark'>) => {
      console.log('[useEffectiveTheme] Received theme change:', event.detail);
      setEffectiveTheme(event.detail);
    };

    // Set up event listener
    window.addEventListener('effective-theme-change', handleEffectiveThemeChange as EventListener);

    // Also check if global theme state is available on mount
    if (typeof window !== 'undefined' && window.__EFFECTIVE_THEME__) {
      const globalTheme = window.__EFFECTIVE_THEME__;
      if (globalTheme !== effectiveTheme) {
        console.log('[useEffectiveTheme] Syncing with global theme on mount:', globalTheme);
        setEffectiveTheme(globalTheme);
      }
    }

    return () => {
      window.removeEventListener('effective-theme-change', handleEffectiveThemeChange as EventListener);
    };
  }, [effectiveTheme]);

  // Fallback: if no global state available, read from URL
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.__EFFECTIVE_THEME__) {
      const urlTheme = (searchParams?.get('cg_theme') as 'light' | 'dark') || 'light';
      if (urlTheme !== effectiveTheme) {
        console.log('[useEffectiveTheme] Falling back to URL theme:', urlTheme);
        setEffectiveTheme(urlTheme);
      }
    }
  }, [searchParams, effectiveTheme]);

  return effectiveTheme;
}; 
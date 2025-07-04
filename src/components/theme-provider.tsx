'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes';
// Attempt to import ThemeProviderProps directly from 'next-themes'
// If this fails, it means it's not directly exported, and using a more general type might be needed.
import type { ThemeProviderProps as NextThemesProviderActualProps } from 'next-themes';
import { useSearchParams } from 'next/navigation';

// Props for our custom ThemeProvider
interface CustomThemeProviderProps extends Omit<NextThemesProviderActualProps, 'children'> {
  children: React.ReactNode;
}

// Utility to convert HEX to HSL (simplified version)
// Note: For full accuracy and edge cases, a more robust library might be preferred.
function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  let h = 0, s = 0;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

// Internal component to handle theme updates from URL parameters AND background forced themes
function CgThemeSynchronizer() {
  const { setTheme, theme } = useTheme();
  const searchParams = useSearchParams();
  const cgTheme = searchParams?.get('cg_theme');
  const cgBgColor = searchParams?.get('cg_bg_color'); // e.g., '%23161820'
  const cgFgColor = searchParams?.get('cg_fg_color'); // Optional, e.g., '%23ffffff'

  // Access background context for forced themes - but safely handle if not available
  const [backgroundForcedTheme, setBackgroundForcedTheme] = React.useState<'light' | 'dark' | null>(null);

  // Debug: Log when component mounts
  React.useEffect(() => {
    console.log('[CgThemeSynchronizer] Component mounted, initial state:', {
      theme,
      cgTheme,
      backgroundForcedTheme
    });
  }, []);

  // Listen for background forced theme changes via custom event
  React.useEffect(() => {
    const handleBackgroundThemeChange = (event: CustomEvent<'light' | 'dark' | null>) => {
      console.log('[CgThemeSynchronizer] Background forced theme changed:', event.detail);
      setBackgroundForcedTheme(event.detail);
    };

    console.log('[CgThemeSynchronizer] Setting up background theme event listener');
    window.addEventListener('background-theme-change', handleBackgroundThemeChange as EventListener);
    return () => {
      console.log('[CgThemeSynchronizer] Removing background theme event listener');
      window.removeEventListener('background-theme-change', handleBackgroundThemeChange as EventListener);
    };
  }, []);

  React.useEffect(() => {
    // Determine effective theme: background forced theme > URL theme
    const urlTheme = cgTheme === 'dark' || cgTheme === 'light' ? cgTheme : 'light';
    const effectiveTheme = backgroundForcedTheme || urlTheme;

    console.log(`[CgThemeSynchronizer] Theme calculation:`, {
      currentTheme: theme,
      urlTheme,
      backgroundForcedTheme,
      effectiveTheme,
      shouldChange: theme !== effectiveTheme
    });

    // Only set theme if it's different from current theme
    if (theme !== effectiveTheme) {
      console.log(`[CgThemeSynchronizer] Setting theme to: ${effectiveTheme} (was: ${theme}, url: ${urlTheme}, forced: ${backgroundForcedTheme})`);
      setTheme(effectiveTheme);
    } else {
      console.log(`[CgThemeSynchronizer] Theme already correct, no change needed`);
    }

    // Apply custom background color
    if (cgBgColor) {
      try {
        const decodedBgColor = decodeURIComponent(cgBgColor);
        const hslBg = hexToHsl(decodedBgColor);
        if (hslBg) {
          document.documentElement.style.setProperty('--background-hsl', `${hslBg.h} ${hslBg.s}% ${hslBg.l}%`);
          // For shadcn/ui, the CSS variables are usually named like --background, not --background-hsl
          // and they expect the H S L values directly, not the string "h s% l%".
          // Let's assume globals.css uses: --background: var(--background-h) var(--background-s) var(--background-l);
          // Or more commonly: --background: hsl(var(--background-h) var(--background-s) var(--background-l));
          // For direct HSL override as used by shadcn, it's typically: hsl(H S% L%)
          // So we need to set the --background variable to the HSL string parts.
          // Shadcn uses: :root { --background: 0 0% 100%; } .dark { --background: 0 0% 3.9%; }
          // The values are H S% L% without the hsl() wrapper for the variable itself.
          document.documentElement.style.setProperty('--background', `${hslBg.h} ${hslBg.s}% ${hslBg.l}%`);
        }
      } catch (e) {
        console.warn('[CgThemeSynchronizer] Invalid cg_bg_color:', cgBgColor, e);
      }
    }

    // Apply custom foreground color (if provided)
    if (cgFgColor) {
      try {
        const decodedFgColor = decodeURIComponent(cgFgColor);
        const hslFg = hexToHsl(decodedFgColor);
        if (hslFg) {
          document.documentElement.style.setProperty('--foreground', `${hslFg.h} ${hslFg.s}% ${hslFg.l}%`);
        }
      } catch (e) {
        console.warn('[CgThemeSynchronizer] Invalid cg_fg_color:', cgFgColor, e);
      }
    }
    // CRITICAL: Remove setTheme from dependencies to prevent infinite loop
  }, [cgTheme, cgBgColor, cgFgColor, backgroundForcedTheme, theme]);

  return null; // This component does not render anything itself
}

export function ThemeProvider({ children, ...props }: CustomThemeProviderProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch by not rendering theme-dependent content until mounted
  if (!mounted) {
    return (
      <NextThemesProvider {...props}>
        <div style={{ visibility: 'hidden' }}>
          {children}
        </div>
      </NextThemesProvider>
    );
  }

  return (
    <NextThemesProvider {...props}>
      <CgThemeSynchronizer />
      {children}
    </NextThemesProvider>
  );
} 
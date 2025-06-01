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

// Internal component to handle theme updates from URL parameters
function CgThemeSynchronizer() {
  const { setTheme, theme } = useTheme();
  const searchParams = useSearchParams();
  const cgTheme = searchParams?.get('cg_theme');
  const cgBgColor = searchParams?.get('cg_bg_color'); // e.g., '%23161820'
  const cgFgColor = searchParams?.get('cg_fg_color'); // Optional, e.g., '%23ffffff'

  React.useEffect(() => {
    // Set light/dark mode
    if (cgTheme === 'dark' || cgTheme === 'light') {
      if (theme !== cgTheme) {
        setTheme(cgTheme);
      }
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
    // Important: This effect should run when these params change.
    // It might also need to revert to default shadcn theme colors if params are removed.
  }, [cgTheme, cgBgColor, cgFgColor, setTheme, theme]);

  return null; // This component does not render anything itself
}

export function ThemeProvider({ children, ...props }: CustomThemeProviderProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // While not mounted, we might flicker if the server default is different from client-resolved.
  // next-themes handles this by setting the theme class ASAP.
  // The key is to ensure NextThemesProvider gets its props consistently.
  // Props like `attribute`, `defaultTheme`, `enableSystem` are passed from layout.tsx.

  if (!mounted && (props.forcedTheme || props.defaultTheme === 'system')) {
    // If not mounted and theme could change based on system, avoid rendering children
    // to prevent flash, allowing NextThemesProvider to set initial class correctly.
    // Or if a theme is forced, let it render.
    // This logic is tricky; for now, let's assume next-themes + suppressHydrationWarning handles class flicker.
  }

  return (
    <NextThemesProvider {...props}>
      <CgThemeSynchronizer />
      {children}
    </NextThemesProvider>
  );
} 
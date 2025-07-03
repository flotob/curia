'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from './AuthContext';
import { useQuery } from '@tanstack/react-query';
import { authFetchJson } from '@/utils/authFetch';
import { UserSettings } from '@/types/user';
import { CommunitySettings } from '@/types/settings';

// Background settings type (matching BackgroundCustomizer)
interface BackgroundSettings {
  imageUrl: string;
  repeat: 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y' | 'space' | 'round';
  size: 'auto' | 'cover' | 'contain' | string;
  position: string;
  attachment: 'scroll' | 'fixed' | 'local';
  opacity: number;
  overlayColor?: string;
  blendMode?: string;
  useThemeColor?: boolean; // Use theme background color instead of custom overlay
  disableCommunityBackground?: boolean; // Explicitly disable community background without setting custom image
}

interface BackgroundContextType {
  userBackground: BackgroundSettings | null;
  communityBackground: BackgroundSettings | null;
  activeBackground: BackgroundSettings | null;
  isLoading: boolean;
  refreshBackgrounds: () => void;
}

const BackgroundContext = createContext<BackgroundContextType | undefined>(undefined);

export const useBackground = () => {
  const context = useContext(BackgroundContext);
  if (context === undefined) {
    throw new Error('useBackground must be used within a BackgroundProvider');
  }
  return context;
};

interface BackgroundProviderProps {
  children: React.ReactNode;
}

export const BackgroundProvider: React.FC<BackgroundProviderProps> = ({ children }) => {
  const { user, token } = useAuth();
  const searchParams = useSearchParams();
  const [activeBackground, setActiveBackground] = useState<BackgroundSettings | null>(null);

  // Read theme from Common Ground URL parameters
  const cgTheme = searchParams?.get('cg_theme') || 'light';

  // Fetch user settings (including background) - now using correct endpoint
  const { data: userSettings, isLoading: userLoading, refetch: refetchUser } = useQuery<UserSettings>({
    queryKey: ['userSettings', user?.userId],
    queryFn: async () => {
      if (!token || !user?.userId) throw new Error('Authentication required');
      console.log(`[BackgroundContext] Fetching user settings for ${user.userId}`);
      const response = await authFetchJson<{ settings: UserSettings }>(`/api/me/settings`, { token });
      console.log(`[BackgroundContext] Got user settings:`, Object.keys(response.settings || {}));
      return response.settings;
    },
    enabled: !!token && !!user?.userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch community settings (including background) - now using correct response structure
  const { data: communitySettings, isLoading: communityLoading, refetch: refetchCommunity } = useQuery<CommunitySettings>({
    queryKey: ['backgroundCommunitySettings', user?.cid],
    queryFn: async () => {
      if (!token || !user?.cid) throw new Error('Community not available');
      console.log(`[BackgroundContext] Fetching community settings for ${user.cid}`);
      // Community endpoint returns full ApiCommunity object, not { settings: ... }
      const response = await authFetchJson<{ 
        id: string; 
        name: string; 
        settings: CommunitySettings; 
        created_at: string; 
        updated_at: string;
      }>(`/api/communities/${user.cid}`, { token });
      console.log(`[BackgroundContext] Got community response:`, response);
      console.log(`[BackgroundContext] Community settings:`, response.settings);
      console.log(`[BackgroundContext] Background field:`, response.settings?.background);
      return response.settings; // Extract settings from full community object
    },
    enabled: !!token && !!user?.cid,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Determine which background to use (user > community > none)
  useEffect(() => {
    const userBg = userSettings?.background;
    const communityBg = communitySettings?.background;
    
    console.log(`[BackgroundContext] Background priority check:`, {
      userBackground: userBg ? 'present' : 'none',
      communityBackground: communityBg ? 'present' : 'none',
      userDisablesCommunity: userBg?.disableCommunityBackground || false,
      cgTheme
    });
    
    // User background takes priority if they have a custom image
    if (userBg && userBg.imageUrl) {
      console.log(`[BackgroundContext] Using user background: ${userBg.imageUrl}`);
      setActiveBackground(userBg);
    } 
    // Check if user has explicitly disabled community backgrounds
    else if (userBg?.disableCommunityBackground) {
      console.log(`[BackgroundContext] User has disabled community backgrounds - using no background`);
      setActiveBackground(null);
    }
    // Fall back to community background if available
    else if (communityBg && communityBg.imageUrl) {
      console.log(`[BackgroundContext] Using community background: ${communityBg.imageUrl}`);
      setActiveBackground(communityBg);
    } else {
      console.log(`[BackgroundContext] No backgrounds available`);
      setActiveBackground(null);
    }
  }, [userSettings?.background, communitySettings?.background, cgTheme]);

  // Apply background styles to the document body
  useEffect(() => {
    const body = document.body;
    
    if (activeBackground && activeBackground.imageUrl) {
      console.log(`[BackgroundContext] Applying background to body:`, activeBackground.imageUrl, `(theme: ${cgTheme})`);
      
      // Apply background image properties directly to body
      body.style.backgroundImage = `url(${activeBackground.imageUrl})`;
      body.style.backgroundRepeat = activeBackground.repeat;
      body.style.backgroundSize = activeBackground.size;
      body.style.backgroundPosition = activeBackground.position;
      body.style.backgroundAttachment = activeBackground.attachment;
      
      // Handle overlay color and blend mode using Common Ground theme
      if (activeBackground.useThemeColor) {
        // Read theme color from CSS custom properties (set by theme-provider.tsx)
        const computedStyle = getComputedStyle(document.documentElement);
        const backgroundHsl = computedStyle.getPropertyValue('--background').trim();
        
        if (backgroundHsl) {
          // Convert HSL values to CSS color format
          const themeColor = `hsl(${backgroundHsl})`;
          body.style.backgroundColor = themeColor;
          console.log(`[BackgroundContext] Applied dynamic theme color: ${themeColor} (${backgroundHsl}) for theme: ${cgTheme}`);
        } else {
          // Fallback to hardcoded values if CSS variables not available
          const fallbackColor = cgTheme === 'dark' ? '#0f172a' : '#ffffff';
          body.style.backgroundColor = fallbackColor;
          console.log(`[BackgroundContext] CSS variables not found, using fallback: ${fallbackColor} for theme: ${cgTheme}`);
        }
        
        body.style.backgroundBlendMode = activeBackground.blendMode || 'normal';
      } else if (activeBackground.overlayColor) {
        // Apply custom overlay color and blend mode directly to body
        body.style.backgroundColor = activeBackground.overlayColor;
        body.style.backgroundBlendMode = activeBackground.blendMode || 'normal';
      } else {
        // Clear any existing overlay
        body.style.removeProperty('background-color');
        body.style.removeProperty('background-blend-mode');
      }
      
      // Handle opacity by creating a semi-transparent overlay using multiple backgrounds
      if (activeBackground.opacity < 1) {
        const opacityOverlay = `linear-gradient(rgba(0, 0, 0, ${1 - activeBackground.opacity}), rgba(0, 0, 0, ${1 - activeBackground.opacity}))`;
        
        if (activeBackground.overlayColor || activeBackground.useThemeColor) {
          // Combine image + opacity overlay + color overlay
          body.style.backgroundImage = `${opacityOverlay}, url(${activeBackground.imageUrl})`;
        } else {
          // Just image + opacity overlay
          body.style.backgroundImage = `${opacityOverlay}, url(${activeBackground.imageUrl})`;
        }
      }
      
      body.classList.add('has-custom-background');
    } else {
      // Clear background styles
      body.style.removeProperty('background-image');
      body.style.removeProperty('background-repeat');
      body.style.removeProperty('background-size');
      body.style.removeProperty('background-position');
      body.style.removeProperty('background-attachment');
      body.style.removeProperty('background-color');
      body.style.removeProperty('background-blend-mode');
      body.classList.remove('has-custom-background');
    }
  }, [activeBackground, cgTheme]);

  const refreshBackgrounds = () => {
    console.log(`[BackgroundContext] Refreshing backgrounds`);
    refetchUser();
    refetchCommunity();
  };

  const contextValue: BackgroundContextType = {
    userBackground: userSettings?.background || null,
    communityBackground: communitySettings?.background || null,
    activeBackground,
    isLoading: userLoading || communityLoading,
    refreshBackgrounds
  };

  return (
    <BackgroundContext.Provider value={contextValue}>
      {children}
    </BackgroundContext.Provider>
  );
};
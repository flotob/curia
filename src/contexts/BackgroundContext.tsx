'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
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
  const [activeBackground, setActiveBackground] = useState<BackgroundSettings | null>(null);

  // Fetch user settings (including background)
  const { data: userSettings, isLoading: userLoading, refetch: refetchUser } = useQuery<UserSettings>({
    queryKey: ['userSettings', user?.userId],
    queryFn: async () => {
      if (!token || !user?.userId) throw new Error('Authentication required');
      const response = await authFetchJson<{ settings: UserSettings }>(`/api/me/settings`, { token });
      return response.settings;
    },
    enabled: !!token && !!user?.userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch community settings (including background)
  const { data: communitySettings, isLoading: communityLoading, refetch: refetchCommunity } = useQuery<CommunitySettings>({
    queryKey: ['communitySettings', user?.cid],
    queryFn: async () => {
      if (!token || !user?.cid) throw new Error('Community not available');
      const response = await authFetchJson<{ settings: CommunitySettings }>(`/api/communities/${user.cid}`, { token });
      return response.settings;
    },
    enabled: !!token && !!user?.cid,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Determine which background to use (user > community > none)
  useEffect(() => {
    const userBg = userSettings?.background;
    const communityBg = communitySettings?.background;
    
    // User background takes priority
    if (userBg && userBg.imageUrl) {
      setActiveBackground(userBg);
    } else if (communityBg && communityBg.imageUrl) {
      setActiveBackground(communityBg);
    } else {
      setActiveBackground(null);
    }
  }, [userSettings?.background, communitySettings?.background]);

  // Apply background styles to the document body
  useEffect(() => {
    const body = document.body;
    
    if (activeBackground && activeBackground.imageUrl) {
      // Create background styles
      const backgroundStyle = `
        url(${activeBackground.imageUrl})
      `;
      
      // Apply all background properties
      body.style.backgroundImage = backgroundStyle;
      body.style.backgroundRepeat = activeBackground.repeat;
      body.style.backgroundSize = activeBackground.size;
      body.style.backgroundPosition = activeBackground.position;
      body.style.backgroundAttachment = activeBackground.attachment;
      
      // Handle overlay and opacity with a pseudo-element approach
      if (activeBackground.overlayColor) {
        body.style.setProperty('--bg-overlay-color', activeBackground.overlayColor);
        body.style.setProperty('--bg-opacity', activeBackground.opacity.toString());
        body.style.setProperty('--bg-blend-mode', activeBackground.blendMode || 'normal');
        
        // Add overlay class for CSS to handle the overlay
        body.classList.add('has-background-overlay');
      } else {
        body.style.setProperty('--bg-opacity', activeBackground.opacity.toString());
        body.style.opacity = activeBackground.opacity.toString();
        body.classList.remove('has-background-overlay');
      }
      
      body.classList.add('has-custom-background');
    } else {
      // Clear all background styles
      body.style.removeProperty('background-image');
      body.style.removeProperty('background-repeat');
      body.style.removeProperty('background-size');
      body.style.removeProperty('background-position');
      body.style.removeProperty('background-attachment');
      body.style.removeProperty('opacity');
      body.style.removeProperty('--bg-overlay-color');
      body.style.removeProperty('--bg-opacity');
      body.style.removeProperty('--bg-blend-mode');
      
      body.classList.remove('has-custom-background', 'has-background-overlay');
    }

    // Cleanup function
    return () => {
      // Only clean up if the component unmounts, not on every effect run
      // This prevents flickering
    };
  }, [activeBackground]);

  const refreshBackgrounds = () => {
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
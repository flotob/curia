'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Palette,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { BackgroundCustomizer, BackgroundSettings } from './BackgroundCustomizer';
import { UserSettings } from '@/types/user';
import { authFetchJson } from '@/utils/authFetch';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface UserBackgroundSettingsProps {
  currentSettings?: UserSettings;
  theme?: 'light' | 'dark';
  className?: string;
}

export const UserBackgroundSettings: React.FC<UserBackgroundSettingsProps> = ({
  currentSettings,
  theme = 'light',
  className
}) => {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);

  // Update user settings mutation
  const updateUserSettingsMutation = useMutation({
    mutationFn: async (backgroundSettings: BackgroundSettings | null) => {
      if (!token) {
        throw new Error('Authentication required');
      }
      
      let newSettings: UserSettings;
      
      if (backgroundSettings === null) {
        // When removing background, explicitly exclude it from settings
        const settingsWithoutBackground = { ...currentSettings };
        delete settingsWithoutBackground?.background;
        newSettings = {
          ...settingsWithoutBackground,
          background: undefined // Explicitly set to undefined for API removal
        };
      } else {
        // When updating background, include it in settings
        newSettings = {
          ...currentSettings,
          background: backgroundSettings
        };
      }

      // Use the new unified settings endpoint
      const response = await authFetchJson<{ settings: UserSettings }>(`/api/me/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings: newSettings }),
        token
      });
      
      return response;
    },
    onSuccess: () => {
      // Invalidate the EXACT same query keys that BackgroundContext uses
      if (user?.userId) {
        queryClient.invalidateQueries({ queryKey: ['userSettings', user.userId] });
      }
      queryClient.invalidateQueries({ queryKey: ['currentUserSettings', user?.userId] });
      
      // Also invalidate profile queries for the profile page
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      
      toast({
        title: "Background updated",
        description: "Your personal background has been saved successfully!",
      });
    },
    onError: (error: Error) => {
      console.error('Failed to update user background:', error);
      toast({
        title: "Update failed",
        description: `Failed to save your background settings: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleBackgroundChange = (settings: BackgroundSettings | null) => {
    updateUserSettingsMutation.mutate(settings);
  };

  const currentBackgroundSettings = currentSettings?.background;

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader 
        className="cursor-pointer hover:bg-muted/50 transition-colors touch-manipulation select-none"
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
        aria-expanded={isExpanded}
        aria-controls="background-customizer-content"
      >
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={20} />
            Customize Your CG Experience
          </div>
          <div className="flex items-center">
            {isExpanded ? 
              <ChevronUp size={20} className="text-muted-foreground hover:text-foreground transition-colors min-w-[24px]" /> : 
              <ChevronDown size={20} className="text-muted-foreground hover:text-foreground transition-colors min-w-[24px]" />
            }
          </div>
        </CardTitle>
        <p className={cn(
          "text-sm",
          theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
        )}>
          Personalize your Common Ground experience with a custom background image
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current Status */}
        {currentBackgroundSettings ? (
          <Alert>
            <Palette size={16} />
            <AlertDescription>
              You have a custom background set. It will appear across all Common Ground pages you visit.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <Info size={16} />
            <AlertDescription>
              Set a personal background image that will appear on all Common Ground pages when you&apos;re logged in.
            </AlertDescription>
          </Alert>
        )}

        {/* Background Customizer */}
        {isExpanded && (
          <div className="space-y-4" id="background-customizer-content">
            <BackgroundCustomizer
              title="Personal Background"
              description="This background will be visible to you across all Common Ground pages. Other users will see their own backgrounds or the community default."
              settings={currentBackgroundSettings}
              onSettingsChange={handleBackgroundChange}
              isLoading={updateUserSettingsMutation.isPending}
              theme={theme}
            />

            {/* Usage Tips */}
            <Alert>
              <Info size={16} />
              <AlertDescription>
                <strong>Tips:</strong> Use high-resolution images (1920x1080+) for best quality. 
                Keep opacity low (20-40%) so text remains readable. Your background is personal - 
                other users won&apos;t see it unless they also set their own.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
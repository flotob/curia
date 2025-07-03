'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Palette,
  Sparkles,
  Info,
  Eye,
  EyeOff
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
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);

  // Update user settings mutation
  const updateUserSettingsMutation = useMutation({
    mutationFn: async (backgroundSettings: BackgroundSettings | null) => {
      if (!token) throw new Error('Authentication required');
      
      const newSettings: UserSettings = {
        ...currentSettings,
        background: backgroundSettings || undefined
      };

      console.log(`[UserBackgroundSettings] Updating user settings:`, Object.keys(newSettings));

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
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      queryClient.invalidateQueries({ queryKey: ['userSettings'] });
      // Also refresh the background context
      queryClient.invalidateQueries({ queryKey: ['userSettings', token] });
      toast({
        title: "Background updated",
        description: "Your personal background has been saved successfully!",
      });
    },
    onError: (error: Error) => {
      console.error('Failed to update user background:', error);
      toast({
        title: "Update failed",
        description: "Failed to save your background settings. Please try again.",
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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles size={20} />
          Customize Your CG Experience
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

        {/* Expand/Collapse Button */}
        <Button
          variant={isExpanded ? "default" : "outline"}
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full gap-2"
          disabled={updateUserSettingsMutation.isPending}
        >
          {isExpanded ? <EyeOff size={16} /> : <Eye size={16} />}
          {isExpanded ? 'Hide Customization' : 'Customize Background'}
        </Button>

        {/* Background Customizer */}
        {isExpanded && (
          <div className="space-y-4">
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
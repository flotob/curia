'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Globe,
  Palette,
  Info,
  ChevronDown,
  ChevronUp,
  Users
} from 'lucide-react';
import { BackgroundCustomizer, BackgroundSettings } from './BackgroundCustomizer';
import { CommunitySettings } from '@/types/settings';
import { cn } from '@/lib/utils';

interface CommunityBackgroundSettingsProps {
  currentSettings?: CommunitySettings;
  onSettingsChange: (settings: CommunitySettings) => void;
  isLoading?: boolean;
  theme?: 'light' | 'dark';
  className?: string;
}

export const CommunityBackgroundSettings: React.FC<CommunityBackgroundSettingsProps> = ({
  currentSettings,
  onSettingsChange,
  isLoading = false,
  theme = 'light',
  className
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleBackgroundChange = (backgroundSettings: BackgroundSettings | null) => {
    const newSettings: CommunitySettings = {
      ...currentSettings,
      background: backgroundSettings || undefined
    };
    
    onSettingsChange(newSettings);
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
        aria-controls="community-background-customizer-content"
      >
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe size={20} />
            Community Background
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
          Set a default background image for all community members (users can override with their own)
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current Status */}
        {currentBackgroundSettings ? (
          <Alert>
            <Palette size={16} />
            <AlertDescription>
              <strong>Community background is active.</strong> All members will see this background 
              unless they have set their own personal background.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <Info size={16} />
            <AlertDescription>
              No community background is set. Members will see the default Common Ground background 
              or their personal backgrounds if they&apos;ve customized them.
            </AlertDescription>
          </Alert>
        )}

        {/* Background Customizer */}
        {isExpanded && (
          <div className="space-y-4" id="community-background-customizer-content">
            <BackgroundCustomizer
              title="Community Default Background"
              description="This background will be visible to all community members who haven&apos;t set their own personal background."
              settings={currentBackgroundSettings}
              onSettingsChange={handleBackgroundChange}
              isLoading={isLoading}
              theme={theme}
            />

            {/* Community Guidelines */}
            <Alert>
              <Users size={16} />
              <AlertDescription>
                <strong>Community Guidelines:</strong> Choose professional, appropriate images that 
                represent your community well. Consider using your community&apos;s brand colors or themes. 
                Keep opacity moderate (30-50%) to ensure readability for all users.
              </AlertDescription>
            </Alert>

            {/* Priority Information */}
            <Alert>
              <Info size={16} />
              <AlertDescription>
                <strong>Priority:</strong> Personal user backgrounds will always override the community 
                background. This setting provides a default for users who haven&apos;t customized their own experience.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Image as ImageIcon, 
  RotateCcw, 
  Info, 
  Check,
  X,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Background settings type (shared between user and community)
export interface BackgroundSettings {
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
  forceTheme?: 'light' | 'dark' | null; // Force specific theme mode when this background is active (null = respect system)
}

interface BackgroundCustomizerProps {
  title: string;
  description: string;
  settings?: BackgroundSettings;
  onSettingsChange: (settings: BackgroundSettings | null) => void;
  isLoading?: boolean;
  theme?: 'light' | 'dark';
  className?: string;
}

const DEFAULT_SETTINGS: BackgroundSettings = {
  imageUrl: '',
  repeat: 'no-repeat',
  size: 'cover',
  position: 'center center',
  attachment: 'scroll',
  opacity: 1,
  overlayColor: '#000000',
  blendMode: 'normal',
  useThemeColor: true,
  disableCommunityBackground: false,
  forceTheme: null, // Default: respect system theme
};

const BACKGROUND_SIZE_OPTIONS = [
  { value: 'cover', label: 'Cover (fill container)' },
  { value: 'contain', label: 'Contain (fit within container)' },
  { value: 'auto', label: 'Auto (original size)' },
  { value: '100% 100%', label: 'Stretch (may distort)' }
];

const BACKGROUND_REPEAT_OPTIONS = [
  { value: 'no-repeat', label: 'No repeat' },
  { value: 'repeat', label: 'Repeat both' },
  { value: 'repeat-x', label: 'Repeat horizontally' },
  { value: 'repeat-y', label: 'Repeat vertically' },
  { value: 'space', label: 'Space evenly' },
  { value: 'round', label: 'Round spacing' }
];

const BACKGROUND_POSITION_OPTIONS = [
  { value: 'center center', label: 'Center' },
  { value: 'top left', label: 'Top Left' },
  { value: 'top center', label: 'Top Center' },
  { value: 'top right', label: 'Top Right' },
  { value: 'center left', label: 'Center Left' },
  { value: 'center right', label: 'Center Right' },
  { value: 'bottom left', label: 'Bottom Left' },
  { value: 'bottom center', label: 'Bottom Center' },
  { value: 'bottom right', label: 'Bottom Right' }
];

const BACKGROUND_ATTACHMENT_OPTIONS = [
  { value: 'scroll', label: 'Scroll with content' },
  { value: 'fixed', label: 'Fixed to viewport' },
  { value: 'local', label: 'Fixed to element' }
];

export const BackgroundCustomizer: React.FC<BackgroundCustomizerProps> = ({
  title,
  description,
  settings,
  onSettingsChange,
  isLoading = false,
  theme = 'light',
  className
}) => {
  const [localSettings, setLocalSettings] = useState<BackgroundSettings>(
    settings || DEFAULT_SETTINGS
  );
  const [isValidUrl, setIsValidUrl] = useState(false);
  const [urlValidationLoading, setUrlValidationLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalSettings, setOriginalSettings] = useState<BackgroundSettings | undefined>(settings);

  // Validate image URL
  const validateImageUrl = useCallback(async (url: string) => {
    if (!url.trim()) {
      setIsValidUrl(false);
      return;
    }

    setUrlValidationLoading(true);
    try {
      const img = new Image();
      img.onload = () => {
        setIsValidUrl(true);
        setUrlValidationLoading(false);
      };
      img.onerror = () => {
        setIsValidUrl(false);
        setUrlValidationLoading(false);
      };
      img.src = url;
    } catch {
      setIsValidUrl(false);
      setUrlValidationLoading(false);
    }
  }, []);

  // Sync with external settings changes and validate existing URL
  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
      setOriginalSettings(settings);
      setHasChanges(false);
      
      // Validate existing URL if it exists
      if (settings.imageUrl?.trim()) {
        validateImageUrl(settings.imageUrl);
      } else {
        setIsValidUrl(false);
      }
    } else {
      // If no settings provided, initialize with defaults and mark originalSettings as defaults
      setLocalSettings(DEFAULT_SETTINGS);
      setOriginalSettings(DEFAULT_SETTINGS);
      setHasChanges(false);
      setIsValidUrl(false);
    }
  }, [settings, validateImageUrl]);

  // Detect changes by comparing with original settings
  useEffect(() => {
    if (!originalSettings) {
      setHasChanges(!!localSettings.imageUrl.trim());
      return;
    }

    const settingsChanged = 
      localSettings.imageUrl !== originalSettings.imageUrl ||
      localSettings.repeat !== originalSettings.repeat ||
      localSettings.size !== originalSettings.size ||
      localSettings.position !== originalSettings.position ||
      localSettings.attachment !== originalSettings.attachment ||
      localSettings.opacity !== originalSettings.opacity ||
      localSettings.overlayColor !== originalSettings.overlayColor ||
      localSettings.blendMode !== originalSettings.blendMode ||
      localSettings.useThemeColor !== originalSettings.useThemeColor ||
      localSettings.disableCommunityBackground !== originalSettings.disableCommunityBackground;

    setHasChanges(settingsChanged);
  }, [localSettings, originalSettings]);

  // Update local settings and validate URL
  const updateSetting = useCallback(<K extends keyof BackgroundSettings>(
    key: K,
    value: BackgroundSettings[K]
  ) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    
    if (key === 'imageUrl') {
      validateImageUrl(value as string);
    }
  }, [localSettings, validateImageUrl]);

  // Apply settings - now smarter about when it's enabled
  const handleApply = useCallback(() => {
    // Always save the current localSettings as-is, don't create new objects that lose data
    if ((isValidUrl && localSettings.imageUrl.trim()) || (originalSettings?.imageUrl && hasChanges) || 
        (hasChanges && (localSettings.disableCommunityBackground !== originalSettings?.disableCommunityBackground || 
                       localSettings.useThemeColor !== originalSettings?.useThemeColor))) {
      onSettingsChange(localSettings);
      setOriginalSettings(localSettings);
      setHasChanges(false);
    }
  }, [localSettings, isValidUrl, originalSettings, hasChanges, onSettingsChange]);

  // Clear settings and save to database
  const handleClear = useCallback(() => {
    setLocalSettings(DEFAULT_SETTINGS);
    setIsValidUrl(false);
    setOriginalSettings(undefined);
    setHasChanges(false);
    // Actually save the cleared state to database
    onSettingsChange(null);
  }, [onSettingsChange]);

  // Reset to defaults (form only, doesn't save)
  const handleReset = useCallback(() => {
    if (originalSettings) {
      // Reset to original settings
      setLocalSettings(originalSettings);
      setHasChanges(false);
      if (originalSettings.imageUrl?.trim()) {
        validateImageUrl(originalSettings.imageUrl);
      } else {
        setIsValidUrl(false);
      }
    } else {
      // Reset to default values
      setLocalSettings(DEFAULT_SETTINGS);
      setIsValidUrl(false);
      setHasChanges(true); // Mark as changed since we're resetting from nothing
    }
  }, [originalSettings, validateImageUrl]);

  // Check if apply button should be enabled
  const canApply = () => {
    // If user has changed the community background disable setting, allow saving
    if (hasChanges && localSettings.disableCommunityBackground !== originalSettings?.disableCommunityBackground) {
      return true;
    }
    
    // If user has changed the theme color setting, allow saving
    if (hasChanges && localSettings.useThemeColor !== originalSettings?.useThemeColor) {
      return true;
    }
    
    // If we have a valid URL and content, allow apply
    if (isValidUrl && localSettings.imageUrl.trim()) {
      return true;
    }
    
    // If we have existing settings and user made changes, allow apply (trust existing URL is valid)
    if (originalSettings?.imageUrl && hasChanges && localSettings.imageUrl.trim()) {
      return true;
    }
    
    return false;
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon size={20} />
          {title}
        </CardTitle>
        <p className={cn(
          "text-sm",
          theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
        )}>
          {description}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Community Background Override - Only show in user context - MOVED TO TOP */}
        {title.includes('Personal') && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Background Preference</Label>
                <p className={cn(
                  "text-sm mt-1",
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                )}>
                  Choose your background experience
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {/* Default/Clean Experience Button */}
              <Button
                variant={localSettings.disableCommunityBackground ? "default" : "outline"}
                className={cn(
                  "w-full justify-start h-auto p-4 text-left",
                  localSettings.disableCommunityBackground && "bg-primary text-primary-foreground"
                )}
                onClick={() => updateSetting('disableCommunityBackground', true)}
                disabled={isLoading}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-3 h-3 rounded-full border-2",
                    localSettings.disableCommunityBackground 
                      ? "bg-current border-current" 
                      : "border-muted-foreground"
                  )} />
                  <div>
                    <div className="font-medium">
                      {localSettings.disableCommunityBackground ? "✓ " : ""}Clean Common Ground Experience
                    </div>
                    <div className={cn(
                      "text-sm opacity-80",
                      localSettings.disableCommunityBackground ? "text-primary-foreground/80" : "text-muted-foreground"
                    )}>
                      Default background, no community or custom backgrounds
                    </div>
                  </div>
                </div>
              </Button>
              
              {/* Custom Background Button */}
              <Button
                variant={!localSettings.disableCommunityBackground && localSettings.imageUrl.trim() ? "default" : "outline"}
                className={cn(
                  "w-full justify-start h-auto p-4 text-left",
                  !localSettings.disableCommunityBackground && localSettings.imageUrl.trim() && "bg-primary text-primary-foreground"
                )}
                onClick={() => updateSetting('disableCommunityBackground', false)}
                disabled={isLoading}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-3 h-3 rounded-full border-2",
                    !localSettings.disableCommunityBackground && localSettings.imageUrl.trim()
                      ? "bg-current border-current" 
                      : "border-muted-foreground"
                  )} />
                  <div>
                    <div className="font-medium">
                      {!localSettings.disableCommunityBackground && localSettings.imageUrl.trim() ? "✓ " : ""}Custom Background Experience
                    </div>
                    <div className={cn(
                      "text-sm opacity-80",
                      !localSettings.disableCommunityBackground && localSettings.imageUrl.trim() ? "text-primary-foreground/80" : "text-muted-foreground"
                    )}>
                      Set your own background or see community backgrounds
                    </div>
                  </div>
                </div>
              </Button>
              
              {/* Reset to Default Button */}
              <Button
                variant={!localSettings.disableCommunityBackground && !localSettings.imageUrl.trim() ? "default" : "outline"}
                className={cn(
                  "w-full justify-start h-auto p-4 text-left",
                  !localSettings.disableCommunityBackground && !localSettings.imageUrl.trim() && "bg-primary text-primary-foreground"
                )}
                onClick={handleClear}
                disabled={isLoading}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-3 h-3 rounded-full border-2",
                    !localSettings.disableCommunityBackground && !localSettings.imageUrl.trim()
                      ? "bg-current border-current" 
                      : "border-muted-foreground"
                  )} />
                  <div>
                    <div className="font-medium">
                      {!localSettings.disableCommunityBackground && !localSettings.imageUrl.trim() ? "✓ " : ""}Default Community Experience
                    </div>
                    <div className={cn(
                      "text-sm opacity-80",
                      !localSettings.disableCommunityBackground && !localSettings.imageUrl.trim() ? "text-primary-foreground/80" : "text-muted-foreground"
                    )}>
                      See community backgrounds when available, default otherwise
                    </div>
                  </div>
                </div>
              </Button>
            </div>
            
            {/* Quick Save for Clean Experience */}
            {localSettings.disableCommunityBackground && hasChanges && (
              <div className="flex items-center justify-between p-3 rounded-lg border bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <p className={cn(
                  "text-sm",
                  theme === 'dark' ? 'text-green-300' : 'text-green-800'
                )}>
                  Ready to save your clean experience preference
                </p>
                <Button
                  size="sm"
                  onClick={handleApply}
                  disabled={!canApply() || isLoading}
                  className="gap-2"
                >
                  {isLoading && <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
                  Save Preference
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Show image customization section only when not using clean experience */}
        {(!title.includes('Personal') || !localSettings.disableCommunityBackground) && (
          <>
            {title.includes('Personal') && <Separator />}
            
            {/* Image URL Input */}
            <div className="space-y-2">
              <Label htmlFor="backgroundUrl">Background Image URL</Label>
              <div className="flex gap-2">
                <Input
                  id="backgroundUrl"
                  placeholder="https://example.com/your-background-image.jpg"
                  value={localSettings.imageUrl}
                  onChange={(e) => updateSetting('imageUrl', e.target.value)}
                  disabled={isLoading}
                  className={cn(
                    "flex-1",
                    isValidUrl && localSettings.imageUrl ? 'border-green-500' : '',
                    localSettings.imageUrl && !isValidUrl && !urlValidationLoading ? 'border-red-500' : ''
                  )}
                />
                
                {/* URL Status Indicator */}
                <div className="flex items-center justify-center w-10 h-10 border rounded-md">
                  {urlValidationLoading && <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />}
                  {!urlValidationLoading && isValidUrl && <Check size={16} className="text-green-500" />}
                  {!urlValidationLoading && localSettings.imageUrl && !isValidUrl && <X size={16} className="text-red-500" />}
                </div>
              </div>
              
              {/* URL Guidelines */}
              <Alert>
                <Info size={16} />
                <AlertDescription>
                  <strong>Recommended:</strong> 1920x1080px or higher resolution. Use JPG/PNG/WebP formats. 
                  Ensure the URL is publicly accessible and HTTPS for security.
                </AlertDescription>
              </Alert>
            </div>

            {/* Settings Grid */}
            {localSettings.imageUrl && (
              <>
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Background Size */}
                  <div className="space-y-2">
                    <Label>Background Size</Label>
                    <Select 
                      value={localSettings.size} 
                      onValueChange={(value: string) => updateSetting('size', value)}
                      disabled={isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BACKGROUND_SIZE_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Background Repeat */}
                  <div className="space-y-2">
                    <Label>Background Repeat</Label>
                    <Select 
                      value={localSettings.repeat} 
                      onValueChange={(value) => updateSetting('repeat', value as BackgroundSettings['repeat'])}
                      disabled={isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BACKGROUND_REPEAT_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Background Position */}
                  <div className="space-y-2">
                    <Label>Background Position</Label>
                    <Select 
                      value={localSettings.position} 
                      onValueChange={(value: string) => updateSetting('position', value)}
                      disabled={isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BACKGROUND_POSITION_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Background Attachment */}
                  <div className="space-y-2">
                    <Label>Background Attachment</Label>
                    <Select 
                      value={localSettings.attachment} 
                      onValueChange={(value) => updateSetting('attachment', value as BackgroundSettings['attachment'])}
                      disabled={isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BACKGROUND_ATTACHMENT_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Opacity Slider */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Background Opacity</Label>
                    <Badge variant="secondary">{Math.round(localSettings.opacity * 100)}%</Badge>
                  </div>
                  <div className="w-full">
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={localSettings.opacity}
                      onChange={(e) => updateSetting('opacity', parseFloat(e.target.value))}
                      disabled={isLoading}
                      className={cn(
                        "w-full h-2 rounded-lg appearance-none cursor-pointer",
                        theme === 'dark' 
                          ? 'bg-slate-700 [&::-webkit-slider-thumb]:bg-slate-300' 
                          : 'bg-slate-200 [&::-webkit-slider-thumb]:bg-slate-600',
                        "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer",
                        "[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0",
                        theme === 'dark' 
                          ? '[&::-moz-range-thumb]:bg-slate-300' 
                          : '[&::-moz-range-thumb]:bg-slate-600'
                      )}
                    />
                  </div>
                </div>

                {/* Overlay Settings */}
                <div className="space-y-4">
                  <Label className="text-sm font-medium">Overlay & Blend Mode</Label>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="useThemeColor"
                      checked={localSettings.useThemeColor || false}
                      onChange={(e) => updateSetting('useThemeColor', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="useThemeColor" className="text-sm">
                      Use dynamic theme color as overlay
                    </Label>
                  </div>

                  {!localSettings.useThemeColor && (
                    <div>
                      <Label htmlFor="overlayColor" className="text-sm">Custom Overlay Color</Label>
                      <Input
                        id="overlayColor"
                        type="color"
                        value={localSettings.overlayColor || '#000000'}
                        onChange={(e) => updateSetting('overlayColor', e.target.value)}
                        className="h-10 w-20"
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="blendMode" className="text-sm">Blend Mode</Label>
                    <Select 
                      value={localSettings.blendMode || 'normal'} 
                      onValueChange={(value) => updateSetting('blendMode', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="multiply">Multiply</SelectItem>
                        <SelectItem value="screen">Screen</SelectItem>
                        <SelectItem value="overlay">Overlay</SelectItem>
                        <SelectItem value="soft-light">Soft Light</SelectItem>
                        <SelectItem value="hard-light">Hard Light</SelectItem>
                        <SelectItem value="color-dodge">Color Dodge</SelectItem>
                        <SelectItem value="color-burn">Color Burn</SelectItem>
                        <SelectItem value="darken">Darken</SelectItem>
                        <SelectItem value="lighten">Lighten</SelectItem>
                        <SelectItem value="difference">Difference</SelectItem>
                        <SelectItem value="exclusion">Exclusion</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Theme Forcing Settings */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Monitor size={16} className="text-muted-foreground" />
                    <Label className="text-sm font-medium">Theme Control</Label>
                  </div>
                  
                  <div className="space-y-3">
                    <Label className="text-sm text-muted-foreground">
                      Choose how this background affects the interface theme
                    </Label>
                    
                    <div className="grid grid-cols-1 gap-2">
                      <button
                        type="button"
                        onClick={() => updateSetting('forceTheme', null)}
                        className={cn(
                          'flex items-center space-x-3 p-3 rounded-lg border text-left transition-colors',
                          (localSettings.forceTheme === null || localSettings.forceTheme === undefined)
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-muted hover:bg-muted/50'
                        )}
                      >
                        <Monitor size={16} />
                        <div>
                          <div className="font-medium text-sm">Respect System Theme</div>
                          <div className="text-xs text-muted-foreground">Follow user&apos;s light/dark mode preference</div>
                        </div>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => updateSetting('forceTheme', 'light')}
                        className={cn(
                          'flex items-center space-x-3 p-3 rounded-lg border text-left transition-colors',
                          localSettings.forceTheme === 'light'
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-muted hover:bg-muted/50'
                        )}
                      >
                        <Sun size={16} />
                        <div>
                          <div className="font-medium text-sm">Force Light Mode</div>
                          <div className="text-xs text-muted-foreground">Always use light theme with this background</div>
                        </div>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => updateSetting('forceTheme', 'dark')}
                        className={cn(
                          'flex items-center space-x-3 p-3 rounded-lg border text-left transition-colors',
                          localSettings.forceTheme === 'dark'
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-muted hover:bg-muted/50'
                        )}
                      >
                        <Moon size={16} />
                        <div>
                          <div className="font-medium text-sm">Force Dark Mode</div>
                          <div className="text-xs text-muted-foreground">Always use dark theme with this background</div>
                        </div>
                      </button>
                    </div>
                    
                    {localSettings.forceTheme && (
                      <Alert>
                        <Info size={16} />
                        <AlertDescription className="text-sm">
                          This background will override the system theme and force{' '}
                          <strong>{localSettings.forceTheme} mode</strong> for better visual consistency.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Action Buttons */}
                <div className="space-y-3">
                  <div>
                    <Label>Actions</Label>
                    <p className={cn(
                      "text-sm",
                      theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                    )}>
                      Apply your changes or remove your background completely
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReset}
                      disabled={isLoading}
                      className="gap-2"
                    >
                      <RotateCcw size={16} />
                      Reset Form
                    </Button>
                    
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleClear}
                      disabled={isLoading}
                      className="gap-2"
                    >
                      <X size={16} />
                      Remove Background
                    </Button>
                    
                    <Button
                      onClick={handleApply}
                      disabled={!canApply() || isLoading}
                      size="sm"
                      className="gap-2"
                    >
                      {isLoading && <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
                      {hasChanges ? 'Save Changes' : 'Save Background'}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
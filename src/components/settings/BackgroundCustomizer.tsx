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
  Eye, 
  EyeOff, 
  RotateCcw, 
  Info, 
  Check,
  X
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
  opacity: 0.3,
  overlayColor: '#000000',
  blendMode: 'normal'
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
  const [previewEnabled, setPreviewEnabled] = useState(false);
  const [isValidUrl, setIsValidUrl] = useState(false);
  const [urlValidationLoading, setUrlValidationLoading] = useState(false);

  // Sync with external settings changes
  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

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

  // Apply settings
  const handleApply = useCallback(() => {
    if (isValidUrl && localSettings.imageUrl.trim()) {
      onSettingsChange(localSettings);
    }
  }, [localSettings, isValidUrl, onSettingsChange]);

  // Clear settings
  const handleClear = useCallback(() => {
    setLocalSettings(DEFAULT_SETTINGS);
    onSettingsChange(null);
    setIsValidUrl(false);
  }, [onSettingsChange]);

  // Reset to defaults
  const handleReset = useCallback(() => {
    setLocalSettings(DEFAULT_SETTINGS);
    setIsValidUrl(false);
  }, []);

  // Generate preview styles
  const previewStyles = previewEnabled && isValidUrl ? {
    backgroundImage: `url(${localSettings.imageUrl})`,
    backgroundRepeat: localSettings.repeat,
    backgroundSize: localSettings.size,
    backgroundPosition: localSettings.position,
    backgroundAttachment: localSettings.attachment,
    opacity: localSettings.opacity,
    ...(localSettings.overlayColor && {
      backgroundColor: localSettings.overlayColor,
      backgroundBlendMode: localSettings.blendMode || 'normal'
    })
  } : {};

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

            {/* Overlay Color */}
            <div className="space-y-2">
              <Label htmlFor="overlayColor">Overlay Color (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="overlayColor"
                  type="color"
                  value={localSettings.overlayColor || '#000000'}
                  onChange={(e) => updateSetting('overlayColor', e.target.value)}
                  disabled={isLoading}
                  className="w-16 h-10 p-1 border rounded"
                />
                <Input
                  placeholder="#000000"
                  value={localSettings.overlayColor || ''}
                  onChange={(e) => updateSetting('overlayColor', e.target.value)}
                  disabled={isLoading}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Preview Toggle */}
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Live Preview</Label>
                <p className={cn(
                  "text-sm",
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                )}>
                  See how your background will look in real-time
                </p>
              </div>
              <Button
                variant={previewEnabled ? "default" : "outline"}
                size="sm"
                onClick={() => setPreviewEnabled(!previewEnabled)}
                disabled={!isValidUrl || isLoading}
                className="gap-2"
              >
                {previewEnabled ? <EyeOff size={16} /> : <Eye size={16} />}
                {previewEnabled ? 'Hide Preview' : 'Show Preview'}
              </Button>
            </div>

            {/* Preview Area */}
            {previewEnabled && isValidUrl && (
              <div className="relative">
                <div 
                  className={cn(
                    "h-32 rounded-lg border border-border/50 flex items-center justify-center relative overflow-hidden",
                    theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'
                  )}
                  style={previewStyles}
                >
                  <div className={cn(
                    "bg-card/90 backdrop-blur-sm px-3 py-2 rounded-md border",
                    theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
                  )}>
                    Preview of your background
                  </div>
                </div>
                <p className={cn(
                  "text-xs mt-2 text-center",
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                )}>
                  This is how your background will appear across the app
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <Separator />
            
            <div className="flex flex-wrap gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={isLoading}
                className="gap-2"
              >
                <RotateCcw size={16} />
                Reset
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                disabled={isLoading}
              >
                Clear Background
              </Button>
              
              <Button
                onClick={handleApply}
                disabled={!isValidUrl || !localSettings.imageUrl.trim() || isLoading}
                size="sm"
                className="gap-2"
              >
                {isLoading && <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
                Apply Background
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CommunitySettings, SettingsUtils } from '@/types/settings';
import { cn } from '@/lib/utils';
import { 
  Brain, 
  Shield, 
  AlertTriangle, 
  Info, 
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface CommunityAIAutoModerationSettingsProps {
  currentSettings: CommunitySettings;
  onSettingsChange: (settings: CommunitySettings) => void;
  isLoading?: boolean;
  theme?: 'light' | 'dark';
  className?: string;
}

export const CommunityAIAutoModerationSettings: React.FC<CommunityAIAutoModerationSettingsProps> = ({
  currentSettings,
  onSettingsChange,
  isLoading = false,
  theme = 'light',
  className
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localSettings, setLocalSettings] = useState<CommunitySettings>(currentSettings);
  
  // Get current AI auto-moderation config with defaults
  const currentConfig = SettingsUtils.getAIAutoModerationConfig(localSettings);
  
  // Character count for custom knowledge
  const customKnowledgeLength = currentConfig.customKnowledge.length;
  const estimatedTokens = Math.ceil(customKnowledgeLength / 4); // Rough token estimation
  const maxTokens = currentConfig.maxKnowledgeTokens;
  const isOverTokenLimit = estimatedTokens > maxTokens;

  // Update local settings when prop changes
  useEffect(() => {
    setLocalSettings(currentSettings);
  }, [currentSettings]);

  const handleSettingChange = (key: string, value: any) => {
    const newSettings: CommunitySettings = {
      ...localSettings,
      ai: {
        ...localSettings.ai,
        autoModeration: {
          ...localSettings.ai?.autoModeration,
          [key]: value,
          lastUpdatedAt: new Date().toISOString()
        }
      }
    };
    
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const getEnforcementLevelDescription = (level: string) => {
    switch (level) {
      case 'strict':
        return 'Aggressive optimization - suggests improvements for minor grammar, style, and clarity issues.';
      case 'moderate':
        return 'Balanced approach - focuses on meaningful improvements while preserving author voice.';
      case 'lenient':
        return 'Conservative optimization - only suggests improvements for significant clarity or engagement issues.';
      default:
        return '';
    }
  };

  const getEnforcementLevelColor = (level: string) => {
    switch (level) {
      case 'strict':
        return 'text-blue-600 dark:text-blue-400';
      case 'moderate':
        return 'text-green-600 dark:text-green-400';
      case 'lenient':
        return 'text-gray-600 dark:text-gray-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getSummaryDisplay = () => {
    if (!currentConfig.enabled) {
      return <span className="text-gray-600 dark:text-gray-400">Disabled</span>;
    }
    
    return (
      <div className="text-right">
        <div className={cn("font-medium", getEnforcementLevelColor(currentConfig.enforcementLevel))}>
          {currentConfig.enforcementLevel.charAt(0).toUpperCase() + currentConfig.enforcementLevel.slice(1)} Mode
        </div>
        <div className="text-xs opacity-75">
          {customKnowledgeLength > 0 ? `${customKnowledgeLength} chars custom context` : 'No custom context'}
        </div>
      </div>
    );
  };

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
        aria-controls="ai-automod-content"
      >
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain size={20} />
            AI Content Optimization
            {currentConfig.enabled && (
              <Badge variant="default" className="ml-2">
                Active
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            {getSummaryDisplay()}
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
          AI-powered content improvement with custom community context
        </p>
      </CardHeader>

      {isExpanded && (
        <CardContent id="ai-automod-content" className="space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Enable AI Content Optimization</Label>
              <p className="text-sm text-muted-foreground">
                Automatically improve posts and comments for clarity, engagement, and community fit
              </p>
            </div>
            <Checkbox
              checked={currentConfig.enabled}
              onCheckedChange={(checked: boolean) => handleSettingChange('enabled', checked)}
              disabled={isLoading}
            />
          </div>

          {currentConfig.enabled && (
            <>
              <Separator />

              {/* Optimization Level */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-base font-medium">Optimization Level</Label>
                  <p className="text-sm text-muted-foreground">Controls how aggressively the AI suggests content improvements</p>
                </div>
                
                <Select
                  value={currentConfig.enforcementLevel}
                  onValueChange={(value) => handleSettingChange('enforcementLevel', value)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="strict">
                      <div className="flex items-center gap-2">
                        <Shield size={16} className="text-blue-500" />
                        <span>Aggressive</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="moderate">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={16} className="text-green-500" />
                        <span>Balanced</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="lenient">
                      <div className="flex items-center gap-2">
                        <CheckCircle size={16} className="text-gray-500" />
                        <span>Conservative</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                
                <p className="text-sm text-muted-foreground">
                  {getEnforcementLevelDescription(currentConfig.enforcementLevel)}
                </p>
              </div>

              {/* Auto-Apply Suggestions Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base font-medium">Auto-Apply Suggestions</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically apply AI improvements to content (vs. showing suggestions for manual review)
                  </p>
                </div>
                <Checkbox
                  checked={currentConfig.blockViolations}
                  onCheckedChange={(checked: boolean) => handleSettingChange('blockViolations', checked)}
                  disabled={isLoading}
                />
              </div>

              <Separator />

              {/* Custom Knowledge Base */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-base font-medium">Community-Specific Context</Label>
                  <p className="text-sm text-muted-foreground">
                    Provide context about your community culture, tone, and preferences to help the AI make better content suggestions
                  </p>
                </div>
                
                <Textarea
                  placeholder="Describe your community culture, tone, and preferences to help the AI provide better content suggestions. For example: &apos;This is a friendly gaming community that values helpful, detailed explanations. We prefer casual but informative language, welcome technical discussions, and appreciate humor when appropriate.&apos;"
                  value={currentConfig.customKnowledge}
                  onChange={(e) => handleSettingChange('customKnowledge', e.target.value)}
                  rows={6}
                  disabled={isLoading}
                  className={cn(
                    "resize-none",
                    isOverTokenLimit && "border-red-500 focus:border-red-500"
                  )}
                />
                
                <div className="flex items-center justify-between text-sm">
                  <span className={cn(
                    "text-muted-foreground",
                    isOverTokenLimit && "text-red-500"
                  )}>
                    {customKnowledgeLength} characters • ~{estimatedTokens} tokens
                  </span>
                  
                  <div className="flex items-center gap-2">
                    {isOverTokenLimit ? (
                      <XCircle size={16} className="text-red-500" />
                    ) : (
                      <CheckCircle size={16} className="text-green-500" />
                    )}
                    <span className={cn(
                      isOverTokenLimit ? "text-red-500" : "text-green-500"
                    )}>
                      {maxTokens} token limit
                    </span>
                  </div>
                </div>
                
                {isOverTokenLimit && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                    <AlertTriangle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-red-700 dark:text-red-300">Content too long</p>
                      <p className="text-red-600 dark:text-red-400">
                        Please reduce the content to stay within the {maxTokens} token limit for optimal AI processing.
                      </p>
                    </div>
                  </div>
                )}
              </div>


              {/* Info Box */}
              <div className="flex items-start gap-2 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                <Info size={16} className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-blue-800 dark:text-blue-200">AI Content Optimization</p>
                  <p className="text-blue-700 dark:text-blue-300">
                    The AI will provide content suggestions based on your community context. Users can choose whether 
                    to accept, modify, or ignore these suggestions. All improvements preserve the author&apos;s original intent.
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
};
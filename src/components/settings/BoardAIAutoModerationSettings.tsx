import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BoardSettings, CommunitySettings, SettingsUtils } from '@/types/settings';
import { cn } from '@/lib/utils';
import { 
  Brain, 
  Shield, 
  AlertTriangle, 
  Info, 
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Building
} from 'lucide-react';

interface BoardAIAutoModerationSettingsProps {
  currentSettings: BoardSettings;
  communitySettings: CommunitySettings;
  onSettingsChange: (settings: BoardSettings) => void;
  isLoading?: boolean;
  theme?: 'light' | 'dark';
  className?: string;
}

export const BoardAIAutoModerationSettings: React.FC<BoardAIAutoModerationSettingsProps> = ({
  currentSettings,
  communitySettings,
  onSettingsChange,
  isLoading = false,
  theme = 'light',
  className
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localSettings, setLocalSettings] = useState<BoardSettings>(currentSettings);
  
  // Get current board and community AI auto-moderation config
  const boardConfig = SettingsUtils.getAIAutoModerationConfig(communitySettings, localSettings);
  const communityConfig = SettingsUtils.getAIAutoModerationConfig(communitySettings);
  const boardAIConfig = localSettings.ai?.autoModeration;
  
  // Check if board inherits community settings (default behavior)
  const inheritsFromCommunity = boardAIConfig?.inheritCommunitySettings !== false;
  
  // Character count for custom knowledge
  const customKnowledgeLength = boardAIConfig?.customKnowledge?.length || 0;
  const estimatedTokens = Math.ceil(customKnowledgeLength / 4); // Rough token estimation
  const maxTokens = boardAIConfig?.maxKnowledgeTokens || 2000;
  const isOverTokenLimit = estimatedTokens > maxTokens;

  // Update local settings when prop changes
  useEffect(() => {
    setLocalSettings(currentSettings);
  }, [currentSettings]);

  const handleSettingChange = (key: string, value: any) => {
    const newSettings: BoardSettings = {
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

  const handleInheritanceToggle = (inherit: boolean) => {
    if (inherit) {
      // Inherit from community - remove board-specific settings
      const newSettings: BoardSettings = {
        ...localSettings,
        ai: {
          ...localSettings.ai,
          autoModeration: {
            inheritCommunitySettings: true,
            lastUpdatedAt: new Date().toISOString()
          }
        }
      };
      setLocalSettings(newSettings);
      onSettingsChange(newSettings);
    } else {
      // Use board-specific settings - start with community defaults
      const newSettings: BoardSettings = {
        ...localSettings,
        ai: {
          ...localSettings.ai,
          autoModeration: {
            enabled: communityConfig.enabled,
            inheritCommunitySettings: false,
            enforcementLevel: communityConfig.enforcementLevel,
            customKnowledge: '',
            maxKnowledgeTokens: communityConfig.maxKnowledgeTokens,
            blockViolations: communityConfig.blockViolations,
            lastUpdatedAt: new Date().toISOString()
          }
        }
      };
      setLocalSettings(newSettings);
      onSettingsChange(newSettings);
    }
  };

  const getEnforcementLevelDescription = (level: string) => {
    switch (level) {
      case 'strict':
        return 'Blocks content with any potential policy violations. May have false positives.';
      case 'moderate':
        return 'Balanced approach - blocks clear violations while allowing borderline content.';
      case 'lenient':
        return 'Only blocks obvious violations. More permissive but may miss subtle issues.';
      default:
        return '';
    }
  };

  const getEnforcementLevelColor = (level: string) => {
    switch (level) {
      case 'strict':
        return 'text-red-600 dark:text-red-400';
      case 'moderate':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'lenient':
        return 'text-green-600 dark:text-green-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getSummaryDisplay = () => {
    if (!boardConfig.enabled) {
      return <span className="text-gray-600 dark:text-gray-400">Disabled</span>;
    }
    
    return (
      <div className="text-right">
        <div className={cn("font-medium", getEnforcementLevelColor(boardConfig.enforcementLevel))}>
          {boardConfig.enforcementLevel.charAt(0).toUpperCase() + boardConfig.enforcementLevel.slice(1)} Mode
        </div>
        <div className="text-xs opacity-75">
          {inheritsFromCommunity ? (
            <>Inherits from community</>
          ) : (
            <>Board-specific • {customKnowledgeLength > 0 ? `${customKnowledgeLength} chars` : 'No custom context'}</>
          )}
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
        aria-controls="board-ai-automod-content"
      >
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain size={20} />
            Board AI Auto-Moderation
            {boardConfig.enabled && (
              <Badge variant="default" className="ml-2">
                Active
              </Badge>
            )}
            {inheritsFromCommunity && (
              <Badge variant="outline" className="ml-1">
                <Building size={12} className="mr-1" />
                Inherited
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
          Board-specific AI moderation settings (can inherit from community or be customized)
        </p>
      </CardHeader>

      {isExpanded && (
        <CardContent id="board-ai-automod-content" className="space-y-6">
          {/* Community Status Info */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <Info size={16} className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-blue-800 dark:text-blue-200">Community Setting</p>
              <p className="text-blue-700 dark:text-blue-300">
                AI auto-moderation is {communityConfig.enabled ? 'enabled' : 'disabled'} at the community level
                {communityConfig.enabled && (
                  <span> with {communityConfig.enforcementLevel} enforcement</span>
                )}
              </p>
            </div>
          </div>

          {/* Inheritance Settings */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Configuration Source</Label>
            
            <div className="space-y-3">
              {/* Inherit from Community */}
              <div className="flex items-start space-x-3 p-4 rounded-lg border">
                <Checkbox
                  checked={inheritsFromCommunity}
                  onCheckedChange={(checked: boolean) => handleInheritanceToggle(checked)}
                  disabled={isLoading}
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label className="text-base font-medium cursor-pointer">
                    Inherit from Community Settings
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Use the same AI moderation settings as the community. Changes to community settings will automatically apply to this board.
                  </p>
                  {inheritsFromCommunity && (
                    <div className="mt-2 p-2 bg-muted rounded text-sm">
                      <strong>Current:</strong> {communityConfig.enabled ? 'Enabled' : 'Disabled'}
                      {communityConfig.enabled && (
                        <span> • {communityConfig.enforcementLevel} enforcement • {communityConfig.blockViolations ? 'Blocks violations' : 'Flags only'}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Custom Board Settings */}
              <div className="flex items-start space-x-3 p-4 rounded-lg border">
                <Checkbox
                  checked={!inheritsFromCommunity}
                  onCheckedChange={(checked: boolean) => handleInheritanceToggle(!checked)}
                  disabled={isLoading}
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label className="text-base font-medium cursor-pointer">
                    Use Board-Specific Settings
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Configure custom AI moderation settings for this board only. This board will have independent settings from the community.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Board-Specific Configuration */}
          {!inheritsFromCommunity && (
            <>
              <Separator />

              {/* Enable/Disable Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base font-medium">Enable AI Auto-Moderation for This Board</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically review posts and comments in this board for policy violations
                  </p>
                </div>
                <Checkbox
                  checked={boardAIConfig?.enabled || false}
                  onCheckedChange={(checked: boolean) => handleSettingChange('enabled', checked)}
                  disabled={isLoading}
                />
              </div>

              {boardAIConfig?.enabled && (
                <>
                  <Separator />

                  {/* Enforcement Level */}
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-base font-medium">Enforcement Level</Label>
                      <p className="text-sm text-muted-foreground">Controls how strict the AI moderation should be for this board</p>
                    </div>
                    
                    <Select
                      value={boardAIConfig?.enforcementLevel || 'moderate'}
                      onValueChange={(value) => handleSettingChange('enforcementLevel', value)}
                      disabled={isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="strict">
                          <div className="flex items-center gap-2">
                            <Shield size={16} className="text-red-500" />
                            <span>Strict</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="moderate">
                          <div className="flex items-center gap-2">
                            <AlertTriangle size={16} className="text-yellow-500" />
                            <span>Moderate</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="lenient">
                          <div className="flex items-center gap-2">
                            <CheckCircle size={16} className="text-green-500" />
                            <span>Lenient</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <p className="text-sm text-muted-foreground">
                      {getEnforcementLevelDescription(boardAIConfig?.enforcementLevel || 'moderate')}
                    </p>
                  </div>

                  {/* Block Violations Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-base font-medium">Block Violating Content</Label>
                      <p className="text-sm text-muted-foreground">
                        Prevent posts with violations from being published in this board (vs. just flagging them)
                      </p>
                    </div>
                    <Checkbox
                      checked={boardAIConfig?.blockViolations !== false}
                      onCheckedChange={(checked: boolean) => handleSettingChange('blockViolations', checked)}
                      disabled={isLoading}
                    />
                  </div>

                  <Separator />

                  {/* Board-Specific Knowledge Base */}
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-base font-medium">Board-Specific Knowledge</Label>
                      <p className="text-sm text-muted-foreground">
                        Additional context specific to this board that will be combined with community knowledge
                      </p>
                    </div>
                    
                    <Textarea
                      placeholder="Describe any board-specific rules, topics, or context that the AI should know when moderating content in this board. This will be added to the community knowledge. For example: 'This board is for technical discussions about React development. Code snippets and debugging questions are welcome.'"
                      value={boardAIConfig?.customKnowledge || ''}
                      onChange={(e) => handleSettingChange('customKnowledge', e.target.value)}
                      rows={4}
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

                  {/* Advanced Settings */}
                  <div className="space-y-3 pt-4 border-t">
                    <Label className="text-base font-medium">Advanced Settings</Label>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="boardMaxTokens">Maximum Knowledge Tokens</Label>
                        <Input
                          id="boardMaxTokens"
                          type="number"
                          min="500"
                          max="8000"
                          step="100"
                          value={boardAIConfig?.maxKnowledgeTokens || 2000}
                          onChange={(e) => handleSettingChange('maxKnowledgeTokens', parseInt(e.target.value))}
                          disabled={isLoading}
                        />
                        <p className="text-xs text-muted-foreground">
                          Token limit for this board's custom knowledge
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* Information Box */}
          <div className="flex items-start gap-2 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
            <Info size={16} className="text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800 dark:text-yellow-200">Board-Level AI Moderation</p>
              <p className="text-yellow-700 dark:text-yellow-300">
                {inheritsFromCommunity ? (
                  'This board inherits AI moderation settings from the community. Changes to community settings will automatically apply here.'
                ) : (
                  'This board uses independent AI moderation settings. Board-specific knowledge will be combined with community knowledge for better context.'
                )}
              </p>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};
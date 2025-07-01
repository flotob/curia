'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  MessageSquare,
  Settings,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { authFetchJson } from '@/utils/authFetch';
import { useToast } from '@/hooks/use-toast';
import { TelegramGroupResponse } from '@/app/api/telegram/groups/route';
import { ApiBoard } from '@/app/api/communities/[communityId]/boards/route';

interface BoardNotificationSettings {
  enabled: boolean;
  events: string[];
}

interface NotificationSettings {
  enabled: boolean;
  events: string[];
  boards?: Record<string, BoardNotificationSettings>;
  quiet_hours?: {
    start: string;
    end: string;
    timezone?: string;
  };
}

interface TelegramGroupSettingsModalProps {
  group: TelegramGroupResponse;
  communityId: string;
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
}

const eventTypeLabels = {
  new_post: 'New Posts',
  comment: 'Comments',
  upvote: 'Upvotes',
};

const eventTypeDescriptions = {
  new_post: 'Notify when someone creates a new post',
  comment: 'Notify when someone comments on a post',
  upvote: 'Notify when posts reach upvote milestones',
};

export function TelegramGroupSettingsModal({
  group,
  communityId,
  isOpen,
  onClose,
  theme
}: TelegramGroupSettingsModalProps) {
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Local state for managing changes
  const [localSettings, setLocalSettings] = useState<NotificationSettings>(group.notification_settings);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Reset local settings when group changes
  useEffect(() => {
    setLocalSettings(group.notification_settings);
    setHasUnsavedChanges(false);
  }, [group]);

  // Fetch boards for the community
  const { 
    data: boards = [], 
    isLoading: boardsLoading, 
    error: boardsError 
  } = useQuery<ApiBoard[]>({
    queryKey: ['boards', communityId],
    queryFn: async () => {
      if (!token) throw new Error('No authentication token');
      return authFetchJson<ApiBoard[]>(`/api/communities/${communityId}/boards`, { token });
    },
    enabled: !!token && !!communityId && isOpen,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: NotificationSettings) => {
      if (!token) throw new Error('No authentication token');
      return authFetchJson(`/api/telegram/groups/${group.id}/settings`, {
        token,
        method: 'PUT',
        body: JSON.stringify({ notification_settings: settings }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Settings Saved",
        description: "Board notification settings have been updated successfully.",
      });
      setHasUnsavedChanges(false);
      
      // Invalidate and refetch the groups list
      queryClient.invalidateQueries({ queryKey: ['telegramGroups', communityId] });
      
      onClose();
    },
    onError: (error: unknown) => {
      console.error('Error saving settings:', error);
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleGlobalSettingsChange = (field: 'enabled', value: boolean) => {
    const newSettings = { ...localSettings, [field]: value };
    setLocalSettings(newSettings);
    setHasUnsavedChanges(true);
  };

  const handleGlobalEventsChange = (eventType: string, enabled: boolean) => {
    const currentEvents = localSettings.events || [];
    const newEvents = enabled
      ? [...currentEvents, eventType]
      : currentEvents.filter(e => e !== eventType);
    
    const newSettings = { ...localSettings, events: newEvents };
    setLocalSettings(newSettings);
    setHasUnsavedChanges(true);
  };

  const handleBoardSettingsChange = (boardId: string, field: 'enabled', value: boolean) => {
    const currentBoards = localSettings.boards || {};
    const currentBoardSettings = currentBoards[boardId] || { enabled: true, events: ['new_post', 'comment', 'upvote'] };
    
    const newBoardSettings = { ...currentBoardSettings, [field]: value };
    const newSettings = {
      ...localSettings,
      boards: { ...currentBoards, [boardId]: newBoardSettings }
    };
    
    setLocalSettings(newSettings);
    setHasUnsavedChanges(true);
  };

  const handleBoardEventsChange = (boardId: string, eventType: string, enabled: boolean) => {
    const currentBoards = localSettings.boards || {};
    const currentBoardSettings = currentBoards[boardId] || { enabled: true, events: ['new_post', 'comment', 'upvote'] };
    const currentEvents = currentBoardSettings.events || [];
    
    const newEvents = enabled
      ? [...currentEvents, eventType]
      : currentEvents.filter(e => e !== eventType);
    
    const newBoardSettings = { ...currentBoardSettings, events: newEvents };
    const newSettings = {
      ...localSettings,
      boards: { ...currentBoards, [boardId]: newBoardSettings }
    };
    
    setLocalSettings(newSettings);
    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    saveSettingsMutation.mutate(localSettings);
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to close without saving?')) {
        setLocalSettings(group.notification_settings);
        setHasUnsavedChanges(false);
        onClose();
      }
    } else {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => handleCancel()}>
      <DialogContent className={cn(
        "max-w-4xl max-h-[90vh] overflow-y-auto",
        theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
      )}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings size={20} />
            Configure Notifications
          </DialogTitle>
          <DialogDescription>
            Configure notification settings for <strong>{group.chat_title}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Global Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare size={18} />
                Global Settings
              </CardTitle>
              <CardDescription>
                Default notification settings that apply to all boards
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Enable Notifications</label>
                  <p className="text-xs text-muted-foreground">
                    Master switch for all notifications to this group
                  </p>
                </div>
                                         <Switch
                           checked={localSettings.enabled}
                           onCheckedChange={(checked: boolean) => handleGlobalSettingsChange('enabled', checked)}
                         />
              </div>

              {localSettings.enabled && (
                <div className="space-y-3">
                  <label className="text-sm font-medium">Default Event Types</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {Object.entries(eventTypeLabels).map(([eventType, label]) => (
                      <div key={eventType} className="flex items-start space-x-2">
                        <Checkbox
                          id={`global-${eventType}`}
                          checked={localSettings.events.includes(eventType)}
                          onCheckedChange={(checked) => 
                            handleGlobalEventsChange(eventType, checked as boolean)
                          }
                        />
                        <div className="grid gap-1 leading-none">
                          <label
                            htmlFor={`global-${eventType}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {label}
                          </label>
                          <p className="text-xs text-muted-foreground">
                            {eventTypeDescriptions[eventType as keyof typeof eventTypeDescriptions]}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Board-Specific Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users size={18} />
                Board-Specific Settings
                <Badge variant="secondary" className="ml-auto">
                  {boards.length} boards
                </Badge>
              </CardTitle>
              <CardDescription>
                Override notification settings for specific boards
              </CardDescription>
            </CardHeader>
            <CardContent>
              {boardsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-3 text-muted-foreground">Loading boards...</span>
                </div>
              ) : boardsError ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Failed to load boards. Please refresh the page and try again.
                  </AlertDescription>
                </Alert>
              ) : boards.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No boards found in this community</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {boards.map((board) => {
                    const boardId = board.id.toString();
                    const boardSettings = localSettings.boards?.[boardId] || {
                      enabled: false,
                      events: []
                    };
                    const hasCustomSettings = localSettings.boards?.[boardId] !== undefined;

                    return (
                      <div
                        key={board.id}
                        className={cn(
                          "p-4 rounded-lg border",
                          hasCustomSettings
                            ? theme === 'dark'
                              ? 'border-blue-700 bg-blue-900/20'
                              : 'border-blue-200 bg-blue-50/50'
                            : theme === 'dark'
                              ? 'border-slate-700 bg-slate-800/50'
                              : 'border-slate-200 bg-slate-50/50'
                        )}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium truncate">{board.name}</h4>
                              {hasCustomSettings && (
                                <Badge variant="outline" className="text-xs">
                                  Custom
                                </Badge>
                              )}
                            </div>
                            {board.description && (
                              <p className="text-sm text-muted-foreground truncate">
                                {board.description}
                              </p>
                            )}
                          </div>
                                                     <Switch
                             checked={boardSettings.enabled}
                             onCheckedChange={(checked: boolean) => 
                               handleBoardSettingsChange(boardId, 'enabled', checked)
                             }
                           />
                        </div>

                        {boardSettings.enabled && (
                          <div className="space-y-3">
                            <label className="text-sm font-medium">Event Types for this Board</label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {Object.entries(eventTypeLabels).map(([eventType, label]) => (
                                <div key={eventType} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`board-${boardId}-${eventType}`}
                                    checked={boardSettings.events.includes(eventType)}
                                    onCheckedChange={(checked) => 
                                      handleBoardEventsChange(boardId, eventType, checked as boolean)
                                    }
                                  />
                                  <label
                                    htmlFor={`board-${boardId}-${eventType}`}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                  >
                                    {label}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Information Alert */}
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>How it works:</strong> Board-specific settings override global settings. 
              If a board has custom settings, those will be used. Otherwise, the global settings apply.
            </AlertDescription>
          </Alert>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock size={14} />
            {hasUnsavedChanges ? 'Unsaved changes' : 'All changes saved'}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              <X size={16} className="mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!hasUnsavedChanges || saveSettingsMutation.isPending}
            >
              <Save size={16} className="mr-2" />
              {saveSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  MessageSquare,
  Settings,
  Save,
  AlertCircle,
  Info,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { authFetchJson } from '@/utils/authFetch';
import { useToast } from '@/hooks/use-toast';
import { TelegramGroupResponse } from '@/app/api/telegram/groups/route';
import { ApiBoard } from '@/app/api/communities/[communityId]/boards/route';

interface TelegramGroupSettingsModalProps {
  group: TelegramGroupResponse;
  communityId: string;
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
}

interface BoardSettings {
  enabled: boolean;
  events: string[];
}

const AVAILABLE_EVENTS = [
  { id: 'new_post', label: 'New Posts', description: 'When new posts are created' },
  { id: 'new_comment', label: 'New Comments', description: 'When comments are added to posts' },
  { id: 'post_upvote', label: 'Post Upvotes', description: 'When posts receive upvotes' },
  { id: 'comment_upvote', label: 'Comment Upvotes', description: 'When comments receive upvotes' },
];

export function TelegramGroupSettingsModal({
  group,
  communityId,
  isOpen,
  onClose,
  theme,
}: TelegramGroupSettingsModalProps) {
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Local state for board settings
  const [boardSettings, setBoardSettings] = useState<Record<string, BoardSettings>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch boards for this community
  const { data: boards = [], isLoading: boardsLoading } = useQuery<ApiBoard[]>({
    queryKey: ['boards', communityId],
    queryFn: async () => {
      if (!token) throw new Error('No authentication token');
      return authFetchJson<ApiBoard[]>(`/api/communities/${communityId}/boards`, { token });
    },
    enabled: !!token && !!communityId && isOpen,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Initialize board settings when modal opens or group changes
  useEffect(() => {
    if (!isOpen || !group) return;

    const currentBoardSettings: Record<string, BoardSettings> = {};
    
    // Initialize with existing board settings from the group
    if (group.notification_settings.boards) {
      Object.entries(group.notification_settings.boards).forEach(([boardId, settings]) => {
        currentBoardSettings[boardId] = {
          enabled: settings.enabled,
          events: [...settings.events],
        };
      });
    }

    // Initialize any boards that don't have settings yet with global defaults
    boards.forEach((board) => {
      if (!currentBoardSettings[board.id.toString()]) {
        currentBoardSettings[board.id.toString()] = {
          enabled: group.notification_settings.enabled,
          events: [...group.notification_settings.events],
        };
      }
    });

    setBoardSettings(currentBoardSettings);
    setHasChanges(false);
  }, [isOpen, group, boards]);

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: Record<string, BoardSettings>) => {
      if (!token) throw new Error('No authentication token');
      
      const updatedNotificationSettings = {
        ...group.notification_settings,
        boards: settings,
      };

      const response = await fetch(`/api/telegram/groups/${group.id}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          notification_settings: updatedNotificationSettings,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save settings');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings Saved",
        description: "Board notification settings have been updated successfully.",
      });
      
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['telegramGroups', communityId] });
      setHasChanges(false);
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleBoardToggle = (boardId: string, enabled: boolean) => {
    setBoardSettings(prev => ({
      ...prev,
      [boardId]: {
        ...prev[boardId],
        enabled,
      },
    }));
    setHasChanges(true);
  };

  const handleEventToggle = (boardId: string, eventId: string, checked: boolean) => {
    setBoardSettings(prev => {
      const currentEvents = prev[boardId]?.events || [];
      const newEvents = checked
        ? [...currentEvents, eventId]
        : currentEvents.filter(e => e !== eventId);

      return {
        ...prev,
        [boardId]: {
          ...prev[boardId],
          events: newEvents,
        },
      };
    });
    setHasChanges(true);
  };

  const handleSave = () => {
    saveSettingsMutation.mutate(boardSettings);
  };

  const handleCancel = () => {
    if (hasChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to close without saving?'
      );
      if (!confirmed) return;
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings size={20} />
            Board Notification Settings
          </DialogTitle>
          <DialogDescription>
            Configure which boards should send notifications to{' '}
            <span className="font-medium">{group.chat_title}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Global Settings Info */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div>
                  <strong>Global Settings:</strong> Enabled: {group.notification_settings.enabled ? 'Yes' : 'No'}
                  {group.notification_settings.events.length > 0 && (
                    <span className="ml-2">
                      • Events: {group.notification_settings.events.join(', ')}
                    </span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  Board-specific settings below will override global settings for each board.
                </div>
              </div>
            </AlertDescription>
          </Alert>

          {/* Board Settings */}
          {boardsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-muted-foreground">Loading boards...</span>
            </div>
          ) : boards.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No boards found for this community. Create some boards first to configure notifications.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Board-Specific Settings</h3>
              
              <div className="grid gap-4">
                {boards.map((board) => {
                  const boardId = board.id.toString();
                  const settings = boardSettings[boardId] || {
                    enabled: group.notification_settings.enabled,
                    events: [...group.notification_settings.events],
                  };

                  return (
                    <Card key={board.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base">{board.name}</CardTitle>
                            {board.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {board.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`board-${boardId}-enabled`}
                              checked={settings.enabled}
                              onCheckedChange={(checked) => 
                                handleBoardToggle(boardId, checked as boolean)
                              }
                            />
                            <label
                              htmlFor={`board-${boardId}-enabled`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              Enable notifications
                            </label>
                          </div>
                        </div>
                      </CardHeader>
                      
                      {settings.enabled && (
                        <CardContent className="pt-0">
                          <div className="space-y-3">
                            <h4 className="text-sm font-medium">Notification Events</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {AVAILABLE_EVENTS.map((event) => (
                                <div key={event.id} className="flex items-start space-x-2">
                                  <Checkbox
                                    id={`board-${boardId}-event-${event.id}`}
                                    checked={settings.events.includes(event.id)}
                                    onCheckedChange={(checked) =>
                                      handleEventToggle(boardId, event.id, checked as boolean)
                                    }
                                  />
                                  <div className="flex-1 min-w-0">
                                    <label
                                      htmlFor={`board-${boardId}-event-${event.id}`}
                                      className="text-sm font-medium leading-none cursor-pointer"
                                    >
                                      {event.label}
                                    </label>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {event.description}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2">
              {hasChanges && (
                <Badge variant="outline" className="text-orange-600">
                  Unsaved changes
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={saveSettingsMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges || saveSettingsMutation.isPending}
                className="min-w-[100px]"
              >
                {saveSettingsMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    Saving...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Save size={16} />
                    Save Settings
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
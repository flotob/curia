'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  MessageSquare,
  Users,
  Clock,
  Settings,
  Copy,
  Check,
  AlertCircle,
  Plus,
  Bot,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { authFetchJson } from '@/utils/authFetch';
import { useToast } from '@/hooks/use-toast';
import { useTimeSince } from '@/utils/timeUtils';
import { TelegramGroupResponse } from '@/app/api/telegram/groups/route';
import { TelegramGroupSettingsModal } from './TelegramGroupSettingsModal';

interface TelegramGroupsSectionProps {
  communityId: string;
  theme: 'light' | 'dark';
}

export function TelegramGroupsSection({ communityId, theme }: TelegramGroupsSectionProps) {
  const { token } = useAuth();
  const { toast } = useToast();
  const [copiedBotName, setCopiedBotName] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<TelegramGroupResponse | null>(null);

  // Fetch Telegram groups with 3-second polling when page is active
  const { 
    data: telegramGroups = [], 
    isLoading, 
    error,
    refetch 
  } = useQuery<TelegramGroupResponse[]>({
    queryKey: ['telegramGroups', communityId],
    queryFn: async () => {
      if (!token) throw new Error('No authentication token');
      return authFetchJson<TelegramGroupResponse[]>('/api/telegram/groups', { token });
    },
    enabled: !!token && !!communityId,
    refetchInterval: 3000, // 3 seconds when page is active
    refetchIntervalInBackground: false, // Stop polling when tab inactive
    staleTime: 1000, // Keep data fresh
    retry: 2,
  });

  // Fetch bot information for registration instructions
  const { data: botInfo } = useQuery<{
    connectCode: string;
    formattedConnectCode: string;
    botName: string;
    botUsername: string;
  }>({
    queryKey: ['telegramBotInfo'],
    queryFn: async () => {
      if (!token) throw new Error('No authentication token');
      return authFetchJson('/api/telegram/connect-code', { token });
    },
    enabled: !!token,
    staleTime: 10 * 60 * 1000, // Bot info rarely changes
  });

  const handleCopyBotName = () => {
    if (botInfo?.botUsername) {
      navigator.clipboard.writeText(`@${botInfo.botUsername}`);
      setCopiedBotName(true);
      toast({
        title: "Copied!",
        description: "Bot username copied to clipboard",
      });
      setTimeout(() => setCopiedBotName(false), 2000);
    }
  };

  const handleRefresh = () => {
    refetch();
    toast({
      title: "Refreshed",
      description: "Group list updated",
    });
  };

  const handleGroupClick = (group: TelegramGroupResponse) => {
    setSelectedGroup(group);
  };

  const handleCloseModal = () => {
    setSelectedGroup(null);
    // Refresh the groups list to get updated settings
    refetch();
  };

  if (isLoading) {
    return (
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare size={20} />
            Telegram Notifications
          </CardTitle>
          <CardDescription>
            Manage Telegram groups receiving forum notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3 text-muted-foreground">Loading groups...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare size={20} />
            Telegram Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load Telegram groups. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare size={20} />
            Telegram Notifications
            <Badge variant="secondary" className="ml-auto">
              {telegramGroups.length} connected
            </Badge>
          </CardTitle>
          <CardDescription>
            Manage Telegram groups receiving forum notifications • Click groups to configure board settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Connected Groups List */}
          {telegramGroups.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className={cn(
                  "font-medium",
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                )}>
                  Connected Groups
                </h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  className="h-8"
                >
                  Refresh
                </Button>
              </div>
              
              <div className="grid gap-3">
                {telegramGroups.map((group) => (
                  <TelegramGroupCard
                    key={group.id}
                    group={group}
                    theme={theme}
                    onClick={() => handleGroupClick(group)}
                  />
                ))}
              </div>
            </div>
          ) : (
            /* Empty State */
            <div className="text-center py-8 space-y-4">
              <div className={cn(
                "mx-auto w-16 h-16 rounded-full flex items-center justify-center",
                theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'
              )}>
                <Bot size={32} className="text-muted-foreground" />
              </div>
              <div>
                <h3 className={cn(
                  "text-lg font-medium",
                  theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
                )}>
                  No Telegram Groups Connected
                </h3>
                <p className={cn(
                  "text-sm mt-1",
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                )}>
                  Connect your first Telegram group to start receiving notifications
                </p>
              </div>
            </div>
          )}

          {/* Registration Instructions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className={cn(
                "font-medium",
                theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
              )}>
                Add New Group
              </h4>
            </div>

            {!showInstructions ? (
              <Button
                onClick={() => setShowInstructions(true)}
                variant="outline"
                className="w-full"
              >
                <Plus size={16} className="mr-2" />
                Show Setup Instructions
              </Button>
            ) : (
                           <div className="space-y-4">
                 <Alert>
                   <Bot className="h-4 w-4" />
                   <AlertDescription className="space-y-3">
                     <div>
                       <strong>Step 1:</strong> Add our bot to your Telegram group
                     </div>
                     <div className="flex items-center gap-2">
                       <code className="px-2 py-1 bg-muted rounded text-sm">
                         @{botInfo?.botUsername || 'curiaforum_bot'}
                       </code>
                       <Button
                         variant="ghost"
                         size="sm"
                         onClick={handleCopyBotName}
                         className="h-6 px-2"
                       >
                         {copiedBotName ? (
                           <Check size={12} className="text-green-600" />
                         ) : (
                           <Copy size={12} />
                         )}
                       </Button>
                     </div>
                     <div>
                       <strong>Step 2:</strong> In your group, run the command:
                     </div>
                     <code className="block px-3 py-2 bg-muted rounded text-sm">
                       /register {botInfo?.formattedConnectCode || 'YOUR_CONNECT_CODE'}
                     </code>
                     <div className="text-sm text-muted-foreground">
                       The group will appear in the list above once successfully registered.
                     </div>
                   </AlertDescription>
                 </Alert>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowInstructions(false)}
                  >
                    Hide Instructions
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Settings Modal */}
      {selectedGroup && (
        <TelegramGroupSettingsModal
          group={selectedGroup}
          communityId={communityId}
          isOpen={!!selectedGroup}
          onClose={handleCloseModal}
          theme={theme}
        />
      )}
    </>
  );
}

// Individual group card component - now clickable
function TelegramGroupCard({ 
  group, 
  theme,
  onClick
}: { 
  group: TelegramGroupResponse; 
  theme: 'light' | 'dark'; 
  onClick: () => void;
}) {
  const registeredTime = useTimeSince(group.created_at);
  const updatedTime = useTimeSince(group.updated_at);

  // Check if group has board-specific settings
  const hasBoardSettings = group.notification_settings.boards && 
    Object.keys(group.notification_settings.boards).length > 0;

  return (
    <div 
      className={cn(
        "p-4 rounded-lg border cursor-pointer transition-colors hover:bg-opacity-80",
        theme === 'dark' 
          ? 'border-slate-700 bg-slate-800/50 hover:bg-slate-800/70' 
          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50/70'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h5 className={cn(
              "font-medium truncate",
              theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
            )}>
              {group.chat_title}
            </h5>
            <Badge 
              variant={group.is_active ? "default" : "secondary"}
              className="flex-shrink-0"
            >
              {group.is_active ? 'Active' : 'Inactive'}
            </Badge>
            {hasBoardSettings && (
              <Badge variant="outline" className="flex-shrink-0">
                Board Settings
              </Badge>
            )}
          </div>
          
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users size={12} />
              <span>Chat ID: {group.chat_id}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock size={12} />
              <span>Registered {registeredTime}</span>
            </div>
            {group.created_at !== group.updated_at && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Settings size={12} />
                <span>Updated {updatedTime}</span>
              </div>
            )}
          </div>

          {/* Notification Settings Summary */}
          <div className="mt-3 flex flex-wrap gap-1">
            {group.notification_settings.events?.map((event) => (
              <Badge key={event} variant="outline" className="text-xs">
                {event.replace('_', ' ')}
              </Badge>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-2 ml-4">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            <Settings size={16} />
          </Button>
          <ChevronRight size={16} className="text-muted-foreground" />
        </div>
      </div>
    </div>
  );
} 
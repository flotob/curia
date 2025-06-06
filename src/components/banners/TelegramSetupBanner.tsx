'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, MessageSquare, Settings, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { authFetchJson } from '@/utils/authFetch';
import { TelegramGroupResponse } from '@/app/api/telegram/groups/route';
import { TelegramBannerUtils } from '@/utils/telegramBannerUtils';

interface TelegramSetupBannerProps {
  communityId: string;
  theme: 'light' | 'dark';
  buildUrl: (path: string, additionalParams?: Record<string, string>) => string;
}

export function TelegramSetupBanner({ communityId, theme, buildUrl }: TelegramSetupBannerProps) {
  const { token, user } = useAuth();
  const [isLocallyDismissed, setIsLocallyDismissed] = useState(false);

  // Check if user is admin
  const isAdmin = user?.isAdmin || user?.userId === process.env.NEXT_PUBLIC_SUPERADMIN_ID;

  // Fetch Telegram groups to check if any are connected
  const { data: telegramGroups = [] } = useQuery<TelegramGroupResponse[]>({
    queryKey: ['telegramGroups', communityId],
    queryFn: async () => {
      if (!token) throw new Error('No authentication token');
      return authFetchJson<TelegramGroupResponse[]>('/api/telegram/groups', { token });
    },
    enabled: !!token && !!communityId && isAdmin,
    staleTime: 30 * 1000, // Cache for 30 seconds
    retry: 1, // Don't retry aggressively for banner
  });

  // Handle banner dismissal
  const handleDismiss = () => {
    TelegramBannerUtils.dismiss(communityId);
    setIsLocallyDismissed(true);
  };

  // Banner visibility logic
  const shouldShowBanner = 
    isAdmin && 
    telegramGroups.length === 0 && 
    !TelegramBannerUtils.isDismissed(communityId) &&
    !isLocallyDismissed;

  if (!shouldShowBanner) {
    return null;
  }

  return (
    <Card className={cn(
      "relative border-l-4 border-blue-500 mb-6",
      theme === 'dark' 
        ? 'bg-blue-900/20 border-blue-400' 
        : 'bg-blue-50 border-blue-500'
    )}>
      <div className="p-4">
        {/* Dismiss Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="absolute top-2 right-2 h-6 w-6 p-0 opacity-60 hover:opacity-100"
        >
          <X size={14} />
        </Button>

        <div className="flex items-start gap-4 pr-8">
          {/* Icon */}
          <div className={cn(
            "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
            theme === 'dark' ? 'bg-blue-800' : 'bg-blue-100'
          )}>
            <MessageSquare size={20} className="text-blue-600" />
          </div>

          {/* Content */}
          <div className="flex-1 space-y-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className={cn(
                  "font-semibold",
                  theme === 'dark' ? 'text-blue-200' : 'text-blue-900'
                )}>
                  Set up Telegram Notifications
                </h3>
                <Badge variant="outline" className="text-xs">
                  Admin Only
                </Badge>
              </div>
              <p className={cn(
                "text-sm",
                theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
              )}>
                Keep your community engaged by connecting Telegram groups to receive instant notifications about new posts, upvotes, and comments.
              </p>
            </div>

            {/* Action Button */}
            <div>
              <Link href={buildUrl('/community-settings')}>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Settings size={14} className="mr-2" />
                  Setup Telegram
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
} 
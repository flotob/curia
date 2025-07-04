'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCgLib } from '@/contexts/CgLibContext';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Settings,
  Shield,
  ArrowLeft,
  MessageSquare,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { CommunityInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib';
import { useAuth } from '@/contexts/AuthContext';
import { ApiCommunity } from '@/app/api/communities/[communityId]/route';
import { CommunitySettings } from '@/types/settings';
import { authFetchJson } from '@/utils/authFetch';
import { useToast } from '@/hooks/use-toast';
import { CommunityAccessForm } from '@/components/CommunityAccessForm';
import { TelegramGroupsSection } from '@/components/settings/TelegramGroupsSection';
import { CommunityBackgroundSettings } from '@/components/settings/CommunityBackgroundSettings';
import { useEffectiveTheme } from '@/hooks/useEffectiveTheme';
// Removed server-side import - now using API endpoint

export default function CommunitySettingsPage() {
  const { cgInstance, isInitializing } = useCgLib();
  const searchParams = useSearchParams();
  const [copiedConnectCode, setCopiedConnectCode] = useState(false);
  const connectCodeInputRef = useRef<HTMLInputElement>(null);
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Use the effective theme from our theme orchestrator
  const theme = useEffectiveTheme();

  // Initialize Common Ground compatibility parameters
  useEffect(() => {
    const cgBgColor = searchParams?.get('cg_bg_color') || '#ffffff';
    
    // Set CSS custom properties for dynamic theming
    document.documentElement.style.setProperty('--cg-bg', cgBgColor);
  }, [searchParams]);

  // Helper function to preserve existing URL params
  const buildUrl = (path: string, additionalParams: Record<string, string> = {}) => {
    const params = new URLSearchParams();
    
    // Preserve existing params
    if (searchParams) {
      searchParams.forEach((value, key) => {
        params.set(key, value);
      });
    }
    
    // Add/override with new params
    Object.entries(additionalParams).forEach(([key, value]) => {
      params.set(key, value);
    });
    
    return `${path}?${params.toString()}`;
  };

  // Fetch Telegram connect code data
  const { data: telegramData } = useQuery<{
    connectCode: string;
    formattedConnectCode: string;
    botName: string;
    botUsername: string;
  }>({
    queryKey: ['telegramConnectCode', user?.cid],
    queryFn: async () => {
      if (!user?.cid || !token) throw new Error('No community ID or token available');
      const response = await authFetchJson<{
        connectCode: string;
        formattedConnectCode: string;
        botName: string;
        botUsername: string;
      }>('/api/telegram/connect-code', { token });
      return response;
    },
    enabled: !!user?.cid && !!token && user.isAdmin,
  });

  // Auto-select connect code when it loads
  useEffect(() => {
    if (telegramData?.connectCode && connectCodeInputRef.current) {
      setTimeout(() => {
        connectCodeInputRef.current?.select();
        connectCodeInputRef.current?.focus();
      }, 100);
    }
  }, [telegramData?.connectCode]);

  // Copy connect code to clipboard (same approach as ShareModal)
  const copyConnectCode = async () => {
    if (!telegramData?.connectCode || !connectCodeInputRef.current) return;
    
    try {
      // First try to select text
      connectCodeInputRef.current.select();
      connectCodeInputRef.current.setSelectionRange(0, telegramData.connectCode.length);
      
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(telegramData.connectCode);
        console.log('[CommunitySettings] Connect code copied via Clipboard API');
        setCopiedConnectCode(true);
        toast({
          title: "Copied!",
          description: "Connect code copied to clipboard",
        });
        setTimeout(() => setCopiedConnectCode(false), 2000);
      } else {
        // Fallback to execCommand
        const success = document.execCommand('copy');
        if (success) {
          console.log('[CommunitySettings] Connect code copied via execCommand');
          setCopiedConnectCode(true);
          toast({
            title: "Copied!",
            description: "Connect code copied to clipboard",
          });
          setTimeout(() => setCopiedConnectCode(false), 2000);
        } else {
          console.log('[CommunitySettings] Copy failed, but text is selected for manual copy');
          toast({
            title: "Text selected",
            description: "Please copy manually with Ctrl+C or Cmd+C",
          });
        }
      }
    } catch {
      console.log('[CommunitySettings] Copy not available, but text is selected for manual copy');
      toast({
        title: "Text selected", 
        description: "Please copy manually with Ctrl+C or Cmd+C",
      });
    }
  };

  // Fetch community settings from our new API
  const { data: communitySettings, isLoading: isLoadingSettings } = useQuery<ApiCommunity>({
    queryKey: ['communitySettings', user?.cid],
    queryFn: async () => {
      if (!user?.cid || !token) throw new Error('No community ID or token available');
      console.log(`[CommunitySettingsPage] Fetching community settings for ${user.cid}`);
      const response = await authFetchJson<ApiCommunity>(`/api/communities/${user.cid}`, { token });
      console.log(`[CommunitySettingsPage] Got community response:`, response);
      console.log(`[CommunitySettingsPage] Community settings:`, response.settings);
      console.log(`[CommunitySettingsPage] Background field:`, response.settings?.background);
      return response;
    },
    enabled: !!user?.cid && !!token,
    staleTime: 0, // Always fetch fresh data for settings page
  });

  // Update community settings mutation
  const updateCommunityMutation = useMutation({
    mutationFn: async (settings: CommunitySettings) => {
      if (!user?.cid || !token) throw new Error('No community ID or token available');
      const response = await authFetchJson<ApiCommunity>(`/api/communities/${user.cid}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings }),
        token
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communitySettings'] });
      queryClient.invalidateQueries({ 
        queryKey: ['communitySettings', user?.cid],
        refetchType: 'active' // Force immediate refetch of active queries
      });
      // Also invalidate BackgroundContext cache
      queryClient.invalidateQueries({ 
        queryKey: ['backgroundCommunitySettings', user?.cid],
        refetchType: 'active'
      });
      toast({
        title: "Settings updated",
        description: "Community settings updated successfully!",
      });
    },
    onError: (error: Error) => {
      console.error('Failed to update community settings:', error);
      toast({
        title: "Update failed",
        description: "Failed to update community settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Fetch community info
  const { data: communityInfo, isLoading: isLoadingCommunityInfo } = useQuery<CommunityInfoResponsePayload | null>({
    queryKey: ['communityInfo', cgInstance?.getCommunityInfo !== undefined],
    queryFn: async () => {
      if (!cgInstance) throw new Error('CgInstance not available');
      const response = await cgInstance.getCommunityInfo();
      if (!response?.data) throw new Error('Failed to fetch community info data from CgLib.');
      return response.data;
    },
    enabled: !!cgInstance && !isInitializing,
  });

  // Admin access control
  if (user && !user.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card variant="content" className="text-center space-y-4 p-8">
          <h1 className="text-2xl font-semibold text-red-600 dark:text-red-400">
            Access Denied
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            You need admin permissions to access community settings.
          </p>
          <Link href={buildUrl('/')}>
            <Button variant="outline">
              <ArrowLeft size={16} className="mr-2" />
              Back to Home
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (isInitializing || isLoadingCommunityInfo) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Card variant="content" className="animate-pulse space-y-6 p-8">
              <div className="h-8 w-64 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-64 rounded-xl bg-slate-200 dark:bg-slate-700" />
                <div className="h-64 rounded-xl bg-slate-200 dark:bg-slate-700" />
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!communityInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card variant="content" className="text-center space-y-4 p-8">
          <div className="text-2xl font-semibold text-slate-700 dark:text-slate-300">
            Unable to load community information
          </div>
          <Link href={buildUrl('/')}>
            <Button variant="outline">
              <ArrowLeft size={16} className="mr-2" />
              Back to Home
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <Card variant="header" className="mb-8 p-6">
            <Link href={buildUrl('/')}>
              <Button variant="ghost" className="mb-4">
                <ArrowLeft size={16} className="mr-2" />
                Back to Home
              </Button>
            </Link>
            <div className="flex items-center gap-3 mb-2">
              <Settings size={28} className="text-primary" />
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                Community Settings
              </h1>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              View and manage your community configuration
            </p>
          </Card>

          {/* Telegram Notifications Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare size={20} />
                Telegram Notifications
              </CardTitle>
              <CardDescription>
                Connect your Telegram groups to receive real-time notifications about forum activity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Connect Code Section */}
              <div className="space-y-4">
                <div>
                  <h4 className={cn(
                    "font-medium mb-2",
                    theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                  )}>
                    Your Connect Code
                  </h4>
                  <div className="flex items-center gap-3">
                    <Input
                      ref={connectCodeInputRef}
                      value={telegramData?.formattedConnectCode || 'Loading...'}
                      readOnly
                      onClick={() => connectCodeInputRef.current?.select()}
                      className="flex-1 font-mono text-lg tracking-wider text-center"
                      placeholder="Loading connect code..."
                    />
                    <Button
                      onClick={copyConnectCode}
                      disabled={!telegramData?.connectCode}
                      variant={copiedConnectCode ? "default" : "outline"}
                      size="sm"
                      className="px-3 min-w-[80px]"
                      title={copiedConnectCode ? "Copied!" : "Copy to clipboard"}
                    >
                      {copiedConnectCode ? (
                        <>
                          <Check size={16} className="mr-1" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy size={16} className="mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <p className={cn(
                    "text-sm mt-2",
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                  )}>
                    This code rotates daily for security. Use it to register Telegram groups.
                  </p>
                </div>

                {/* Setup Instructions */}
                <div className={cn(
                  "p-4 rounded-lg border",
                  theme === 'dark' 
                    ? 'bg-blue-900/20 border-blue-800/30' 
                    : 'bg-blue-50 border-blue-200'
                )}>
                  <h5 className={cn(
                    "font-medium mb-3 flex items-center gap-2",
                    theme === 'dark' ? 'text-blue-300' : 'text-blue-800'
                  )}>
                    📱 How to Connect Your Telegram Group
                  </h5>
                  <div className={cn(
                    "space-y-2 text-sm",
                    theme === 'dark' ? 'text-blue-200' : 'text-blue-700'
                  )}>
                    <div className="flex items-start gap-2">
                      <span className="font-medium min-w-[20px]">1.</span>
                      <span>
                        Add <strong>@{telegramData?.botUsername || 'bot'}</strong> to your Telegram group
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-medium min-w-[20px]">2.</span>
                      <span>Copy the connect code above</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-medium min-w-[20px]">3.</span>
                      <span>
                        In your Telegram group, type: <code className={cn(
                          "px-1 py-0.5 rounded text-xs",
                          theme === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-white text-slate-700'
                        )}>
                          /register {telegramData?.connectCode || 'CODE'}
                        </code>
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-medium min-w-[20px]">4.</span>
                      <span>Start receiving notifications about posts, upvotes, and comments!</span>
                    </div>
                  </div>
                </div>

                {/* Bot Information */}
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'
                    )}>
                      <MessageSquare size={20} className="text-primary" />
                    </div>
                    <div>
                      <p className={cn(
                        "font-medium",
                        theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
                      )}>
                        {telegramData?.botName || 'Loading...'}
                      </p>
                      <p className={cn(
                        "text-sm",
                        theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                      )}>
                        @{telegramData?.botUsername || 'bot'}
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={async () => {
                      const telegramUrl = telegramData?.botUsername 
                        ? `https://t.me/${telegramData.botUsername}`
                        : null;

                      if (!telegramUrl) {
                        toast({
                          title: "Navigation Error",
                          description: "Bot username is not available. Please try refreshing the page.",
                          variant: "destructive"
                        });
                        return;
                      }

                      if (!cgInstance) {
                        console.error('[CommunitySettings] Cannot navigate: CgPluginLib instance not available');
                        toast({
                          title: "Navigation Error",
                          description: "Unable to navigate to Telegram. The plugin is not fully initialized.",
                          variant: "destructive"
                        });
                        return;
                      }

                      try {
                        console.log('[CommunitySettings] Navigating to Telegram bot:', telegramUrl);
                        console.log('[CommunitySettings] CgInstance available:', !!cgInstance);
                        console.log('[CommunitySettings] CgInstance navigate function:', typeof cgInstance.navigate);
                        
                        await cgInstance.navigate(telegramUrl);
                        
                        console.log('[CommunitySettings] Navigation successful');
                        toast({
                          title: "Opening Telegram",
                          description: "Redirecting to bot chat...",
                        });
                      } catch (error) {
                        console.error('[CommunitySettings] Navigation failed:', error);
                        
                        toast({
                          title: "Navigation Failed",
                          description: error instanceof Error ? error.message : "Failed to open Telegram. Please try manually.",
                          variant: "destructive",
                          action: (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(telegramUrl);
                                toast({ title: "Copied!", description: "URL copied to clipboard" });
                              }}
                            >
                              Copy URL
                            </Button>
                          ),
                        });
                      }
                    }}
                  >
                    <ExternalLink size={16} className="mr-1" />
                    Open Bot
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Connected Telegram Groups Management */}
          <div className="mb-6">
            <TelegramGroupsSection 
              communityId={user?.cid || ''} 
              theme={theme} 
            />
          </div>

          {/* Community Background Customization */}
          <div className="mb-6">
            <CommunityBackgroundSettings 
              currentSettings={communitySettings?.settings || {}}
              onSettingsChange={(settings: CommunitySettings) => updateCommunityMutation.mutate(settings)}
              isLoading={updateCommunityMutation.isPending}
              theme={theme}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Community Overview - HIDDEN FOR NOW
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe size={20} />
                  Community Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  {communityInfo.smallLogoUrl ? (
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden shadow-lg">
                      <Image
                        src={communityInfo.smallLogoUrl}
                        alt={`${communityInfo.title} logo`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                      <span className="text-2xl font-bold text-primary">
                        {communityInfo.title.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div>
                    <h3 className={cn(
                      "text-xl font-semibold",
                      theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
                    )}>
                      {communityInfo.title}
                    </h3>
                    <p className={cn(
                      "text-sm",
                      theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                    )}>
                      Community ID: {communityInfo.id}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className={cn(
                    "font-medium",
                    theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                  )}>
                    Assets
                  </h4>
                  <div className="space-y-2 text-sm">
                    {communityInfo.largeLogoUrl && (
                      <div className="flex justify-between">
                        <span className={cn(
                          theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                        )}>
                          Logo URL:
                        </span>
                        <a 
                          href={communityInfo.largeLogoUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline truncate max-w-48"
                        >
                          View Logo
                        </a>
                      </div>
                    )}
                    {communityInfo.headerImageUrl && (
                      <div className="flex justify-between">
                        <span className={cn(
                          theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                        )}>
                          Header URL:
                        </span>
                        <a 
                          href={communityInfo.headerImageUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline truncate max-w-48"
                        >
                          View Header
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4">
                  <Button variant="outline" disabled className="w-full">
                    <Edit size={16} className="mr-2" />
                    Edit Community Info (Coming Soon)
                  </Button>
                </div>
              </CardContent>
            </Card>
            */}

            {/* Roles & Permissions - HIDDEN FOR NOW
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield size={20} />
                  Roles & Permissions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {communityInfo.roles && communityInfo.roles.length > 0 ? (
                  <div className="space-y-3">
                    {communityInfo.roles.map((role) => (
                      <div key={role.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-primary/10">
                            {role.title.toLowerCase().includes('admin') ? (
                              <Crown size={16} className="text-primary" />
                            ) : (
                              <UserCheck size={16} className="text-slate-500" />
                            )}
                          </div>
                          <div>
                            <h5 className={cn(
                              "font-medium",
                              theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
                            )}>
                              {role.title}
                            </h5>
                            <p className={cn(
                              "text-xs",
                              theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                            )}>
                              Role ID: {role.id}
                            </p>
                          </div>
                        </div>
                        <Badge variant={role.title.toLowerCase().includes('admin') ? 'default' : 'secondary'}>
                          {role.title.toLowerCase().includes('admin') ? 'Admin' : 'Member'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={cn(
                    "text-center py-6",
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                  )}>
                    <Users size={32} className="mx-auto mb-2 opacity-50" />
                    <p>No roles configured</p>
                  </div>
                )}
              </CardContent>
            </Card>
            */}

            {/* Community Access Control */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield size={20} />
                  Plugin Access Control
                </CardTitle>
                <CardDescription>
                  Control who can access this community&apos;s forum plugin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {isLoadingSettings ? (
                  <div className="space-y-4">
                    <div className={cn(
                      "h-4 w-48 rounded animate-pulse",
                      theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'
                    )} />
                    <div className={cn(
                      "h-20 w-full rounded animate-pulse",
                      theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'
                    )} />
                  </div>
                ) : (
                  <CommunityAccessForm
                    currentSettings={communitySettings?.settings || {}}
                    communityRoles={communityInfo.roles || []}
                    onSave={(settings: CommunitySettings) => updateCommunityMutation.mutate(settings)}
                    isLoading={updateCommunityMutation.isPending}
                    theme={theme}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Additional Settings - HIDDEN FOR NOW
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Additional Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" disabled className="h-20 flex-col">
                  <Users size={20} className="mb-2" />
                  <span className="text-sm">Member Management</span>
                </Button>
                <Button variant="outline" disabled className="h-20 flex-col">
                  <Globe size={20} className="mb-2" />
                  <span className="text-sm">Integrations</span>
                </Button>
                <Button variant="outline" disabled className="h-20 flex-col">
                  <Settings size={20} className="mb-2" />
                  <span className="text-sm">Advanced Settings</span>
                </Button>
              </div>
              <p className={cn(
                "text-center text-sm mt-4",
                theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
              )}>
                More configuration options coming soon...
              </p>
            </CardContent>
          </Card>
          */}
        </div>
      </div>
    </div>
  );
} 
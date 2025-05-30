'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCgLib } from '@/contexts/CgLibContext';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Settings,
  Shield,
  ArrowLeft,
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

export default function CommunitySettingsPage() {
  const { cgInstance, isInitializing } = useCgLib();
  const searchParams = useSearchParams();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [bgColor, setBgColor] = useState('#ffffff');
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Initialize theme from URL params
  useEffect(() => {
    const cgTheme = searchParams?.get('cg_theme') || 'light';
    const cgBgColor = searchParams?.get('cg_bg_color') || '#ffffff';
    
    setTheme(cgTheme as 'light' | 'dark');
    setBgColor(cgBgColor);
    
    // Set CSS custom properties for dynamic theming
    document.documentElement.style.setProperty('--cg-bg', cgBgColor);
    document.documentElement.setAttribute('data-cg-theme', cgTheme);
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

  // Fetch community settings from our new API
  const { data: communitySettings, isLoading: isLoadingSettings } = useQuery<ApiCommunity>({
    queryKey: ['communitySettings', user?.cid],
    queryFn: async () => {
      if (!user?.cid || !token) throw new Error('No community ID or token available');
      const response = await authFetchJson<ApiCommunity>(`/api/communities/${user.cid}`, { token });
      return response;
    },
    enabled: !!user?.cid && !!token,
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
  if (user && !user.isAdmin && user.userId !== process.env.NEXT_PUBLIC_SUPERADMIN_ID) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: bgColor }}
      >
        <div className="text-center space-y-4">
          <h1 className={cn(
            "text-2xl font-semibold text-red-600",
            theme === 'dark' && "text-red-400"
          )}>
            Access Denied
          </h1>
          <p className={cn(
            "text-slate-600",
            theme === 'dark' && "text-slate-400"
          )}>
            You need admin permissions to access community settings.
          </p>
          <Link href={buildUrl('/')}>
            <Button variant="outline">
              <ArrowLeft size={16} className="mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isInitializing || isLoadingCommunityInfo) {
    return (
      <div 
        className="min-h-screen"
        style={{ backgroundColor: bgColor }}
      >
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse space-y-6">
              <div className={cn(
                "h-8 w-64 rounded",
                theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'
              )} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={cn(
                  "h-64 rounded-xl",
                  theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'
                )} />
                <div className={cn(
                  "h-64 rounded-xl", 
                  theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'
                )} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!communityInfo) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: bgColor }}
      >
        <div className="text-center space-y-4">
          <div className={cn(
            "text-2xl font-semibold",
            theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
          )}>
            Unable to load community information
          </div>
          <Link href={buildUrl('/')}>
            <Button variant="outline">
              <ArrowLeft size={16} className="mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Dynamic theme styles
  const pageBackground = theme === 'dark' 
    ? 'bg-gradient-to-br from-slate-900/95 via-slate-900 to-slate-800/95'
    : 'bg-gradient-to-br from-white/95 via-white to-slate-50/95';

  return (
    <div 
      className={cn("min-h-screen", pageBackground)}
      style={{ backgroundColor: bgColor }}
    >
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link href={buildUrl('/')}>
              <Button variant="ghost" className="mb-4">
                <ArrowLeft size={16} className="mr-2" />
                Back to Home
              </Button>
            </Link>
            <div className="flex items-center gap-3 mb-2">
              <Settings size={28} className="text-primary" />
              <h1 className={cn(
                "text-3xl font-bold",
                theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
              )}>
                Community Settings
              </h1>
            </div>
            <p className={cn(
              theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
            )}>
              View and manage your community configuration
            </p>
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
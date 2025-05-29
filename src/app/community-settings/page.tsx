'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCgLib } from '@/contexts/CgLibContext';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Settings, 
  Users, 
  Shield, 
  Globe, 
  ArrowLeft, 
  Edit, 
  UserCheck,
  Crown
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { CommunityInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib';

export default function CommunitySettingsPage() {
  const { cgInstance, isInitializing } = useCgLib();
  const searchParams = useSearchParams();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Initialize theme from URL params
  useEffect(() => {
    const cgTheme = searchParams?.get('cg_theme') || 'light';
    setTheme(cgTheme as 'light' | 'dark');
  }, [searchParams]);

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

  if (isInitializing || isLoadingCommunityInfo) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse space-y-6">
              <div className="h-8 w-64 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-xl" />
                <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!communityInfo) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-2xl font-semibold text-slate-700 dark:text-slate-300">
            Unable to load community information
          </div>
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft size={16} className="mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link href="/">
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
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Community Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe size={20} />
                  Community Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Community Logo & Name */}
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
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                      {communityInfo.title}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Community ID: {communityInfo.id}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Community URLs */}
                <div className="space-y-3">
                  <h4 className="font-medium text-slate-700 dark:text-slate-300">Assets</h4>
                  <div className="space-y-2 text-sm">
                    {communityInfo.largeLogoUrl && (
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Logo URL:</span>
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
                        <span className="text-slate-500 dark:text-slate-400">Header URL:</span>
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

                {/* Settings Placeholder */}
                <div className="pt-4">
                  <Button variant="outline" disabled className="w-full">
                    <Edit size={16} className="mr-2" />
                    Edit Community Info (Coming Soon)
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Roles & Permissions */}
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
                            <h5 className="font-medium text-slate-900 dark:text-slate-100">
                              {role.title}
                            </h5>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
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
                  <div className="text-center py-6 text-slate-500 dark:text-slate-400">
                    <Users size={32} className="mx-auto mb-2 opacity-50" />
                    <p>No roles configured</p>
                  </div>
                )}

                <div className="pt-4">
                  <Button variant="outline" disabled className="w-full">
                    <Shield size={16} className="mr-2" />
                    Manage Permissions (Coming Soon)
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Coming Soon Section */}
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
              <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-4">
                More configuration options coming soon...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 
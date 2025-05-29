'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { authFetchJson } from '@/utils/authFetch';
import { useCgLib } from '@/contexts/CgLibContext';
import { CommunityInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib';
import { ApiCommunity } from '@/app/api/communities/[communityId]/route';
import { BoardSettings } from '@/types/settings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Loader2, Shield } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { BoardAccessForm } from '@/components/BoardAccessForm';

export default function CreateBoardPage() {
  const { user, token } = useAuth();
  const { cgInstance } = useCgLib();
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [boardName, setBoardName] = useState('');
  const [boardDescription, setBoardDescription] = useState('');
  const [boardSettings, setBoardSettings] = useState<BoardSettings>({});
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [bgColor, setBgColor] = useState('#ffffff');

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

  // Fetch community info for role data
  const { data: communityInfo } = useQuery<CommunityInfoResponsePayload | null>({
    queryKey: ['communityInfo', cgInstance?.getCommunityInfo !== undefined],
    queryFn: async () => {
      if (!cgInstance) throw new Error('CgInstance not available');
      const response = await cgInstance.getCommunityInfo();
      if (!response?.data) throw new Error('Failed to fetch community info data from CgLib.');
      return response.data;
    },
    enabled: !!cgInstance,
  });

  // Fetch community settings
  const { data: communitySettings } = useQuery<ApiCommunity>({
    queryKey: ['communitySettings', user?.cid],
    queryFn: async () => {
      if (!user?.cid || !token) throw new Error('No community ID or token available');
      const response = await authFetchJson<ApiCommunity>(`/api/communities/${user.cid}`, { token });
      return response;
    },
    enabled: !!user?.cid && !!token,
  });

  const createBoardMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; settings: BoardSettings }) => {
      if (!token || !user?.cid) throw new Error('Authentication required');
      
      const response = await authFetchJson(`/api/communities/${user.cid}/boards`, {
        method: 'POST',
        token,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: () => {
      // Invalidate boards list to refresh sidebar
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      // Redirect to home with preserved params
      router.push(buildUrl('/'));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!boardName.trim()) return;
    
    createBoardMutation.mutate({
      name: boardName.trim(),
      description: boardDescription.trim() || '',
      settings: boardSettings,
    });
  };

  // Redirect if not admin
  if (!user?.isAdmin && user?.userId !== process.env.NEXT_PUBLIC_SUPERADMIN_ID) {
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
            You need admin permissions to create boards.
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
            <h1 className={cn(
              "text-3xl font-bold",
              theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
            )}>
              Create New Board
            </h1>
            <p className={cn(
              "mt-2",
              theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
            )}>
              Create a new discussion board for your community
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Plus size={20} className="mr-2" />
                  Board Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="boardName">Board Name</Label>
                  <Input
                    id="boardName"
                    placeholder="e.g., General Discussion, Announcements, Support"
                    value={boardName}
                    onChange={(e) => setBoardName(e.target.value)}
                    required
                    disabled={createBoardMutation.isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="boardDescription">Description (Optional)</Label>
                  <Textarea
                    id="boardDescription"
                    placeholder="Briefly describe what this board is for..."
                    value={boardDescription}
                    onChange={(e) => setBoardDescription(e.target.value)}
                    rows={3}
                    disabled={createBoardMutation.isPending}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Permission Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield size={20} className="mr-2" />
                  Board Access Permissions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {communityInfo?.roles && communitySettings ? (
                  <BoardAccessForm
                    currentSettings={boardSettings}
                    communitySettings={communitySettings.settings}
                    communityRoles={communityInfo.roles}
                    onSave={setBoardSettings}
                    isLoading={false}
                    theme={theme}
                    showSaveButton={false}
                    autoSave={true}
                  />
                ) : (
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
                )}
              </CardContent>
            </Card>

            {/* Error Display */}
            {createBoardMutation.error && (
              <div className={cn(
                "p-4 border rounded-lg",
                theme === 'dark' 
                  ? 'bg-red-950 border-red-800' 
                  : 'bg-red-50 border-red-200'
              )}>
                <p className={cn(
                  "text-sm",
                  theme === 'dark' ? 'text-red-400' : 'text-red-600'
                )}>
                  Error: {createBoardMutation.error.message}
                </p>
              </div>
            )}

            {/* Submit Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={!boardName.trim() || createBoardMutation.isPending}
                className="flex-1"
              >
                {createBoardMutation.isPending ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus size={16} className="mr-2" />
                    Create Board
                  </>
                )}
              </Button>
              <Link href={buildUrl('/')}>
                <Button variant="outline" disabled={createBoardMutation.isPending}>
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 
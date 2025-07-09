'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useCgLib } from '@/contexts/CgLibContext';
import { useEffectiveTheme } from '@/hooks/useEffectiveTheme';
import { authFetchJson } from '@/utils/authFetch';
import { CommunityInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib';
import { ApiCommunity } from '@/app/api/communities/[communityId]/route';
import { ApiBoard } from '@/app/api/communities/[communityId]/boards/route';
import { BoardSettings, SettingsUtils } from '@/types/settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Loader2, Shield, Settings, Lock, Brain } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { BoardAccessForm } from '@/components/BoardAccessForm';
import { BoardLockGatingForm } from '@/components/BoardLockGatingForm';
import { BoardAIAutoModerationSettings } from '@/components/settings/BoardAIAutoModerationSettings';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { useToast } from '@/hooks/use-toast';

export default function CreateBoardPage() {
  const { user, token } = useAuth();
  const { cgInstance } = useCgLib();
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [boardName, setBoardName] = useState('');
  const [boardDescription, setBoardDescription] = useState('');
  const [boardSettings, setBoardSettings] = useState<BoardSettings>({});
  const theme = useEffectiveTheme();

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

  // Helper functions for generating section summaries - memoized to prevent re-render issues
  const getBoardDetailsSummary = React.useMemo(() => {
    if (!boardName) return 'Not configured';
    const descPreview = boardDescription ? 
      (boardDescription.length > 40 ? `${boardDescription.slice(0, 40)}...` : boardDescription) 
      : 'No description';
    return (
      <div className="text-right">
        <div className="font-medium">{boardName}</div>
        <div className="text-xs opacity-75">{descPreview}</div>
      </div>
    );
  }, [boardName, boardDescription]);

  const getVisibilityAccessSummary = React.useMemo(() => {
    const hasRoleRestrictions = SettingsUtils.hasPermissionRestrictions(boardSettings);
    if (!hasRoleRestrictions) {
      return <span className="text-emerald-600 dark:text-emerald-400">All members</span>;
    }
    
    const roleCount = boardSettings.permissions?.allowedRoles?.length || 0;
    return (
      <span className="text-amber-600 dark:text-amber-400">
        {roleCount === 1 ? '1 role only' : `${roleCount} roles only`}
      </span>
    );
  }, [boardSettings]);

  const getWriteAccessSummary = React.useMemo(() => {
    const hasLockGating = SettingsUtils.hasBoardLockGating(boardSettings);
    if (!hasLockGating) {
      return <span className="text-emerald-600 dark:text-emerald-400">No restrictions</span>;
    }
    
    const lockGating = SettingsUtils.getBoardLockGating(boardSettings);
    if (!lockGating) return <span className="text-emerald-600 dark:text-emerald-400">No restrictions</span>;
    
    const lockCount = lockGating.lockIds.length;
    const fulfillmentText = lockGating.fulfillment === 'any' ? 'ANY' : 'ALL';
    const durationText = `${lockGating.verificationDuration || 4}h`;
    
    return (
      <span className="text-amber-600 dark:text-amber-400">
        {lockCount} lock{lockCount !== 1 ? 's' : ''} ({fulfillmentText}) • {durationText}
      </span>
    );
  }, [boardSettings]);

  const getAIOptimizationSummary = React.useMemo(() => {
    const boardAIConfig = boardSettings.ai?.autoModeration;
    const inheritsFromCommunity = boardAIConfig?.inheritCommunitySettings !== false;
    
    if (inheritsFromCommunity) {
      const communityAIConfig = SettingsUtils.getAIAutoModerationConfig(communitySettings?.settings || {});
      if (!communityAIConfig.enabled) {
        return <span className="text-gray-600 dark:text-gray-400">Inherits (Disabled)</span>;
      }
      return (
        <span className="text-blue-600 dark:text-blue-400">
          Inherits ({communityAIConfig.enforcementLevel})
        </span>
      );
    }
    
    if (!boardAIConfig?.enabled) {
      return <span className="text-gray-600 dark:text-gray-400">Disabled</span>;
    }
    
    const level = boardAIConfig.enforcementLevel || 'moderate';
    const customContext = (boardAIConfig.customKnowledge?.length || 0) > 0;
    
    return (
      <span className="text-green-600 dark:text-green-400">
        {level.charAt(0).toUpperCase() + level.slice(1)} 
        {customContext && ' • Custom context'}
      </span>
    );
  }, [boardSettings, communitySettings]);

  const createBoardMutation = useMutation<
    ApiBoard,
    Error, 
    { name: string; description: string; settings: BoardSettings }
  >({
    mutationFn: async (data: { name: string; description: string; settings: BoardSettings }) => {
      if (!token || !user?.cid) throw new Error('Authentication required');
      
      const response = await authFetchJson<ApiBoard>(`/api/communities/${user.cid}/boards`, {
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
      queryClient.invalidateQueries({ queryKey: ['boards', user?.cid] });
      
      // Invalidate all access-related queries to refresh UI filtering
      queryClient.invalidateQueries({ queryKey: ['accessibleBoards'] });
      queryClient.invalidateQueries({ queryKey: ['accessibleBoardsNewPost'] });
      queryClient.invalidateQueries({ queryKey: ['accessibleBoardsMove'] });
      
      // Remove cached data completely to force fresh queries
      queryClient.removeQueries({ queryKey: ['accessibleBoards'] });
      
      // Force refresh with a small delay to ensure proper sequencing
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['boards'] });
        queryClient.refetchQueries({ queryKey: ['accessibleBoards'] });
      }, 100);
      
      // Show success toast
      toast({
        title: "Board created",
        description: "Board has been created successfully.",
      });
      // Redirect to home with preserved params
      router.push(buildUrl('/'));
    },
    onError: (error: Error) => {
      toast({
        title: "Creation failed",
        description: error.message || "Failed to create board.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Enhanced form validation
    if (!boardName.trim()) {
      toast({
        title: "Validation Error",
        description: "Board name is required.",
        variant: "destructive",
      });
      return;
    }

    if (boardName.trim().length < 2) {
      toast({
        title: "Validation Error", 
        description: "Board name must be at least 2 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (boardName.trim().length > 100) {
      toast({
        title: "Validation Error",
        description: "Board name must be less than 100 characters long.",
        variant: "destructive", 
      });
      return;
    }

    // Check if description is too long
    if (boardDescription.trim().length > 500) {
      toast({
        title: "Validation Error",
        description: "Board description must be less than 500 characters long.",
        variant: "destructive",
      });
      return;
    }
    
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

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8 create-board-page">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href={buildUrl('/')}>
              <Button variant="ghost" size="sm">
                <ArrowLeft size={16} className="mr-2" />
                Back to Home
              </Button>
            </Link>
            <div>
              <h1 className={cn(
                'text-2xl font-bold',
                theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
              )}>
                Create New Board
              </h1>
              <p className={cn(
                'text-sm',
                theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
              )}>
                Create a new discussion board for your community
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Board Details */}
          <CollapsibleSection
            title="Board Details"
            subtitle="Name, description, and basic information"
            icon={<Settings size={20} className="text-primary" />}
            defaultExpanded={false}
            summary={getBoardDetailsSummary}
          >
            <div className="space-y-6">
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
            </div>
          </CollapsibleSection>

          {/* Board Visibility & Access */}
          <CollapsibleSection
            title="Who Can See This Board"
            subtitle="Control board visibility using role-based permissions"
            icon={<Shield size={20} className="text-primary" />}
            defaultExpanded={false}
            summary={getVisibilityAccessSummary}
          >
            {communityInfo?.roles && communitySettings ? (
              <BoardAccessForm
                currentSettings={boardSettings}
                communitySettings={communitySettings.settings}
                communityRoles={communityInfo.roles}
                onSave={setBoardSettings}
                isLoading={createBoardMutation.isPending}
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
          </CollapsibleSection>

          {/* Lock-Based Write Access Requirements */}
          <CollapsibleSection
            title="Write Access Requirements"
            subtitle="Control who can post and comment using blockchain verification"
            icon={<Lock size={20} className="text-primary" />}
            defaultExpanded={false}
            summary={getWriteAccessSummary}
          >
            <BoardLockGatingForm
              currentSettings={boardSettings}
              onSave={setBoardSettings}
              isLoading={createBoardMutation.isPending}
              theme={theme}
              showSaveButton={false}
              autoSave={true}
            />
          </CollapsibleSection>

          {/* AI Content Optimization */}
          <CollapsibleSection
            title="AI Content Optimization"
            subtitle="Configure AI-based content moderation settings"
            icon={<Brain size={20} className="text-primary" />}
            defaultExpanded={false}
            summary={getAIOptimizationSummary}
          >
            {communitySettings ? (
              <BoardAIAutoModerationSettings
                currentSettings={boardSettings}
                communitySettings={communitySettings.settings}
                onSettingsChange={setBoardSettings}
                isLoading={createBoardMutation.isPending}
                theme={theme}
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
          </CollapsibleSection>

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
  );
} 
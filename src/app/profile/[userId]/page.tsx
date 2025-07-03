'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, MessageSquare, Heart, FileText, Users, Eye, EyeOff, ChevronDown, ChevronRight, Filter, Globe, User } from 'lucide-react';
import { formatTimeSinceLastVisit } from '@/utils/dateUtils';
import { authFetchJson } from '@/utils/authFetch';
import { buildHomeUrl, buildPostUrl } from '@/utils/urlBuilder';
import { extractDescription } from '@/utils/metadataUtils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CommunitySelector } from '@/components/whats-new/CommunitySelector';
import { UserBackgroundSettings } from '@/components/settings/UserBackgroundSettings';
import { UserSettings } from '@/types/user';
import { useCrossCommunityNavigation } from '@/hooks/useCrossCommunityNavigation';

// Enhanced interfaces adapted for user activity
interface ActivityCounts {
  postsByUser: number;
  commentsByUser: number;
  reactionsByUser: number;
  postsUserCommentedOn: number;
}

interface ActivitySummary {
  newCounts: ActivityCounts;
  totalCounts: ActivityCounts;
}

interface ActivityItem {
  // Common fields
  is_new: boolean;
  
  // Comment-specific fields
  comment_id?: number;
  comment_content?: string;
  comment_created_at?: string;
  commenter_id?: string;
  commenter_name?: string;
  commenter_avatar?: string;
  
  // Post-specific fields
  post_id: number;
  post_title: string;
  post_content?: string;
  post_created_at?: string;
  author_user_id?: string;
  author_name?: string;
  author_avatar?: string;
  upvote_count?: number;
  comment_count?: number;
  
  // Reaction-specific fields
  reaction_id?: number;
  emoji?: string;
  reaction_created_at?: string;
  reactor_id?: string;
  reactor_name?: string;
  reactor_avatar?: string;
  content_type?: 'post' | 'comment';
  comment_preview?: string;
  
  // Board info
  board_id: number;
  board_name: string;
  
  // Community info for cross-community navigation
  community_id: string;
  community_short_id?: string;
  plugin_id?: string;
}

interface UserActivityResponse {
  userId: string;
  currentUserId: string;
  lastVisit: string;
  summary?: ActivitySummary;
  type?: string;
  showOnlyNew?: boolean;
  data?: ActivityItem[];
  pagination?: {
    limit: number;
    offset: number;
    totalCount: number;
    hasMore: boolean;
  };
}

interface UserProfile {
  id: string;
  name: string;
  profile_picture_url: string | null;
  source: 'friend' | 'user';
  friendship_status?: string;
  communities?: Array<{
    id: string;
    name: string;
    logo_url?: string;
  }>;
  stats?: {
    posts_count: number;
    comments_count: number;
    joined_date: string;
  };
}

export default function UserProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { token, user } = useAuth();
  const [showOnlyNew, setShowOnlyNew] = useState(false);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string>(user?.cid || '');
  
  // Extract userId from async params
  const [userId, setUserId] = useState<string>('');
  
  React.useEffect(() => {
    params.then(p => setUserId(p.userId));
  }, [params]);
  
  // Update selected community when user data loads
  React.useEffect(() => {
    if (user?.cid && !selectedCommunityId) {
      setSelectedCommunityId(user.cid);
    }
  }, [user?.cid, selectedCommunityId]);
  
  // Collapse state for each category
  const [collapsedCategories, setCollapsedCategories] = useState({
    posts_by_user: true,
    comments_by_user: true,
    reactions_by_user: true,
    posts_user_commented_on: true,
  });
  
  // Pagination state for each category
  const [categoryPagination, setCategoryPagination] = useState({
    posts_by_user: { page: 0, limit: 10 },
    comments_by_user: { page: 0, limit: 10 },
    reactions_by_user: { page: 0, limit: 10 },
    posts_user_commented_on: { page: 0, limit: 10 },
  });
  
  // Category-specific filter state
  const [categoryFilters, setCategoryFilters] = useState({
    posts_by_user: false,
    comments_by_user: false,
    reactions_by_user: false,
    posts_user_commented_on: false,
  });

  // Fetch user profile data
  const { data: userProfile, isLoading: profileLoading } = useQuery<{ user: UserProfile }>({
    queryKey: ['userProfile', userId],
    queryFn: async () => {
      if (!token) throw new Error('Authentication required');
      return authFetchJson<{ user: UserProfile }>(`/api/users/${userId}?detailed=true`, { token });
    },
    enabled: !!token && !!userId,
    staleTime: 30000, // 30 seconds
  });

  // Fetch current user settings (only when viewing own profile)
  const { data: currentUserSettings, isLoading: userSettingsLoading } = useQuery<{ settings: UserSettings }>({
    queryKey: ['currentUserSettings', user?.userId],
    queryFn: async () => {
      if (!token) throw new Error('Authentication required');
      console.log(`[ProfilePage] Fetching current user settings for background form`);
      return authFetchJson<{ settings: UserSettings }>(`/api/me/settings`, { token });
    },
    enabled: !!token && !!user?.userId && userId === user?.userId, // Only fetch for own profile
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch summary data
  const { data: summaryData, isLoading: summaryLoading } = useQuery<UserActivityResponse>({
    queryKey: ['userActivitySummary', userId, selectedCommunityId],
    queryFn: async () => {
      if (!selectedCommunityId || !token) {
        throw new Error('Authentication required');
      }
      const params_url = new URLSearchParams();
      if (selectedCommunityId !== user?.cid) {
        params_url.set('communityId', selectedCommunityId);
      }
      const url = `/api/users/${userId}/activity${params_url.toString() ? `?${params_url.toString()}` : ''}`;
      return authFetchJson<UserActivityResponse>(url, { token });
    },
    enabled: !!(selectedCommunityId && token && userId),
    staleTime: 30000, // 30 seconds
  });

  // Fetch detailed data for all categories with per-category pagination
  const postsByUserQuery = useQuery<UserActivityResponse>({
    queryKey: ['userActivityDetail', 'posts_by_user', userId, selectedCommunityId, categoryPagination.posts_by_user, categoryFilters.posts_by_user],
    queryFn: async () => {
      if (!selectedCommunityId || !token) {
        throw new Error('Authentication required');
      }
      const pagination = categoryPagination.posts_by_user;
      const params_url = new URLSearchParams({
        type: 'posts_by_user',
        limit: pagination.limit.toString(),
        offset: (pagination.page * pagination.limit).toString(),
        ...(categoryFilters.posts_by_user && { showOnlyNew: 'true' }),
        ...(selectedCommunityId !== user?.cid && { communityId: selectedCommunityId })
      });
      return authFetchJson<UserActivityResponse>(`/api/users/${userId}/activity?${params_url}`, { token });
    },
    enabled: !!(selectedCommunityId && token && userId),
    staleTime: 30000,
  });
  
  const commentsByUserQuery = useQuery<UserActivityResponse>({
    queryKey: ['userActivityDetail', 'comments_by_user', userId, selectedCommunityId, categoryPagination.comments_by_user, categoryFilters.comments_by_user],
    queryFn: async () => {
      if (!selectedCommunityId || !token) {
        throw new Error('Authentication required');
      }
      const pagination = categoryPagination.comments_by_user;
      const params_url = new URLSearchParams({
        type: 'comments_by_user',
        limit: pagination.limit.toString(),
        offset: (pagination.page * pagination.limit).toString(),
        ...(categoryFilters.comments_by_user && { showOnlyNew: 'true' }),
        ...(selectedCommunityId !== user?.cid && { communityId: selectedCommunityId })
      });
      return authFetchJson<UserActivityResponse>(`/api/users/${userId}/activity?${params_url}`, { token });
    },
    enabled: !!(selectedCommunityId && token && userId),
    staleTime: 30000,
  });
  
  const reactionsByUserQuery = useQuery<UserActivityResponse>({
    queryKey: ['userActivityDetail', 'reactions_by_user', userId, selectedCommunityId, categoryPagination.reactions_by_user, categoryFilters.reactions_by_user],
    queryFn: async () => {
      if (!selectedCommunityId || !token) {
        throw new Error('Authentication required');
      }
      const pagination = categoryPagination.reactions_by_user;
      const params_url = new URLSearchParams({
        type: 'reactions_by_user',
        limit: pagination.limit.toString(),
        offset: (pagination.page * pagination.limit).toString(),
        ...(categoryFilters.reactions_by_user && { showOnlyNew: 'true' }),
        ...(selectedCommunityId !== user?.cid && { communityId: selectedCommunityId })
      });
      return authFetchJson<UserActivityResponse>(`/api/users/${userId}/activity?${params_url}`, { token });
    },
    enabled: !!(selectedCommunityId && token && userId),
    staleTime: 30000,
  });
  
  const postsUserCommentedOnQuery = useQuery<UserActivityResponse>({
    queryKey: ['userActivityDetail', 'posts_user_commented_on', userId, selectedCommunityId, categoryPagination.posts_user_commented_on, categoryFilters.posts_user_commented_on],
    queryFn: async () => {
      if (!selectedCommunityId || !token) {
        throw new Error('Authentication required');
      }
      const pagination = categoryPagination.posts_user_commented_on;
      const params_url = new URLSearchParams({
        type: 'posts_user_commented_on',
        limit: pagination.limit.toString(),
        offset: (pagination.page * pagination.limit).toString(),
        ...(categoryFilters.posts_user_commented_on && { showOnlyNew: 'true' }),
        ...(selectedCommunityId !== user?.cid && { communityId: selectedCommunityId })
      });
      return authFetchJson<UserActivityResponse>(`/api/users/${userId}/activity?${params_url}`, { token });
    },
    enabled: !!(selectedCommunityId && token && userId),
    staleTime: 30000,
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center overflow-x-hidden px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>
              Please sign in to view user profiles.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center overflow-x-hidden px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
            <CardDescription>
              Loading user profile...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isLoading = profileLoading || summaryLoading || userSettingsLoading || postsByUserQuery.isLoading || commentsByUserQuery.isLoading || reactionsByUserQuery.isLoading || postsUserCommentedOnQuery.isLoading;

  const summary = summaryData?.summary;
  const profile = userProfile?.user;

  // Helper functions for category management (same as What's New)
  const toggleCategory = (categoryKey: keyof typeof collapsedCategories) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [categoryKey]: !prev[categoryKey]
    }));
  };

  const updateCategoryFilter = (categoryKey: keyof typeof categoryFilters, showOnlyNew: boolean) => {
    setCategoryFilters(prev => ({
      ...prev,
      [categoryKey]: showOnlyNew
    }));
  };

  const updateCategoryPage = (categoryKey: keyof typeof categoryPagination, page: number) => {
    setCategoryPagination(prev => ({
      ...prev,
      [categoryKey]: { ...prev[categoryKey], page }
    }));
  };

  // Collapsible category header with counts and controls (adapted from What's New)
  const CollapsibleCategoryHeader = ({ 
    title, 
    icon: Icon, 
    newCount, 
    totalCount, 
    color, 
    categoryKey,
    query
  }: { 
    title: string; 
    icon: React.ElementType; 
    newCount: number; 
    totalCount: number; 
    color: string; 
    categoryKey: keyof typeof collapsedCategories;
    query: { data?: UserActivityResponse; isLoading: boolean };
  }) => {
    const isCollapsed = collapsedCategories[categoryKey];
    const isFiltered = categoryFilters[categoryKey];
    const pagination = categoryPagination[categoryKey];
    
    return (
      <Card className="overflow-hidden">
        {/* Header */}
        <div 
          className={`flex items-center justify-between py-4 border-l-4 pl-4 cursor-pointer hover:bg-muted/50 transition-colors ${color}`}
          onClick={() => toggleCategory(categoryKey)}
        >
          <div className="flex items-center gap-3">
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            <Icon className="h-5 w-5" />
            <h2 className="text-xl font-semibold">{title}</h2>
          </div>
          <div className="text-right">
            {newCount > 0 ? (
              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                {newCount} NEW
              </div>
            ) : (
              <div className="text-lg font-bold text-muted-foreground">
                0 new
              </div>
            )}
            <div className="text-sm text-muted-foreground">
              {totalCount} total
            </div>
          </div>
        </div>

        {/* Filter and Pagination Controls */}
        {!isCollapsed && (
          <div className="px-4 py-2 bg-muted/30 border-t space-y-3">
            {/* Filter Controls */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Button
                variant={isFiltered ? "default" : "outline"}
                size="sm"
                onClick={() => updateCategoryFilter(categoryKey, !isFiltered)}
                className="gap-2 flex-shrink-0"
              >
                {isFiltered ? (
                  <>
                    <Eye size={14} />
                    All
                  </>
                ) : (
                  <>
                    <EyeOff size={14} />
                    New
                  </>
                )}
              </Button>
            </div>
            
            {/* Pagination Controls */}
            {query.data?.pagination && (
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === 0}
                  onClick={() => updateCategoryPage(categoryKey, pagination.page - 1)}
                  className="flex-shrink-0"
                >
                  Prev
                </Button>
                <span className="text-sm text-muted-foreground px-1 text-center flex-shrink-0">
                  Page {pagination.page + 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!query.data?.pagination?.hasMore}
                  onClick={() => updateCategoryPage(categoryKey, pagination.page + 1)}
                  className="flex-shrink-0"
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>
    );
  };

  // Activity item component (reused from What's New but adapted)
  const ActivityItem = ({ item }: { item: ActivityItem }) => {
    const { navigateToPost } = useCrossCommunityNavigation();
    const [isNavigating, setIsNavigating] = useState(false);
    const isNew = item.is_new;
    
    const isCrossCommunity = item.community_id !== user?.cid;
    
    // Build URL for same-community navigation
    let postUrl = buildPostUrl(item.post_id, item.board_id);
    if (item.comment_id) {
      postUrl += `#comment-${item.comment_id}`;
    }
    
    // Handle click - either cross-community navigation or normal Link
    const handleClick = async (e: React.MouseEvent) => {
      if (!isCrossCommunity) {
        return;
      }
      
      e.preventDefault();
      
      if (!item.community_short_id || !item.plugin_id) {
        console.warn('Missing metadata for cross-community navigation:', item);
        return;
      }
      
      setIsNavigating(true);
      
      await navigateToPost(
        item.community_short_id,
        item.plugin_id,
        item.post_id,
        item.board_id
      );
      
      setIsNavigating(false);
    };
    
    // Determine the main user and avatar for this activity
    let actorName = '';
    let actorAvatar = '';
    let actorFallback = '';
    let activityText = '';
    let contentPreview = '';
    
    if (item.comment_id) {
      // Comment activity
      actorName = item.commenter_name || 'Unknown User';
      actorAvatar = item.commenter_avatar || '';
      actorFallback = actorName.substring(0, 2).toUpperCase();
      activityText = 'commented on';
      contentPreview = item.comment_content ? extractDescription(item.comment_content, 100) : '';
    } else if (item.reaction_id) {
      // Reaction activity  
      actorName = item.reactor_name || 'Unknown User';
      actorAvatar = item.reactor_avatar || '';
      actorFallback = actorName.substring(0, 2).toUpperCase();
      const emoji = item.emoji || '👍';
      activityText = `reacted ${emoji} to`;
      contentPreview = item.content_type === 'comment' && item.comment_preview 
                 ? `"${item.comment_preview}..."` 
                 : '';
    } else {
      // New post activity
      actorName = item.author_name || 'Unknown User';
      actorAvatar = item.author_avatar || '';
      actorFallback = actorName.substring(0, 2).toUpperCase();
      activityText = 'created';
      contentPreview = item.post_content ? extractDescription(item.post_content, 100) : '';
    }
    
    const timestamp = item.comment_created_at || item.post_created_at || item.reaction_created_at || '';
    
    const cardContent = (
      <div className={`p-4 border rounded-lg transition-all duration-200 hover:shadow-md cursor-pointer overflow-hidden ${
        isNew 
          ? 'bg-white dark:bg-slate-800 border-green-200 dark:border-green-800 shadow-sm hover:border-green-300 dark:hover:border-green-700' 
          : 'bg-gray-50 dark:bg-slate-900/50 border-gray-200 dark:border-gray-700 opacity-60 hover:opacity-80'
      }`}>
        <div className="flex items-start gap-3 min-w-0">
          {/* Profile Picture */}
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={actorAvatar} alt={actorName} />
            <AvatarFallback className="text-xs bg-muted">
              {actorFallback}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            {/* Header with NEW badge, cross-community indicator, and board */}
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {isNew && (
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 text-xs px-2 py-0.5 flex-shrink-0">
                  NEW
                </Badge>
              )}
              {isCrossCommunity && (
                <Badge variant="outline" className="text-xs flex-shrink-0">
                  {item.community_short_id && item.plugin_id ? 'External Community' : 'External (Limited)'}
                </Badge>
              )}
              {isNavigating && (
                <div className="inline-flex items-center gap-1 text-xs text-blue-600 flex-shrink-0">
                  <div className="animate-spin h-3 w-3 border-2 border-blue-500 border-t-transparent rounded-full" />
                  Opening...
                </div>
              )}
              <span className={`text-sm ${isNew ? 'text-muted-foreground' : 'text-muted-foreground/70'} truncate`}>
                in {item.board_name}
              </span>
            </div>
            
            {/* Main activity description */}
            <div className={`text-sm ${isNew ? 'text-foreground' : 'text-muted-foreground'} mb-1 overflow-hidden`}>
              <span className="mx-1">{activityText}</span>
              {item.reaction_id ? (
                <span className="font-medium">{item.content_type === 'post' ? 'post' : 'comment'}</span>
              ) : (
                <span className="font-medium truncate inline-block max-w-[120px] sm:max-w-[180px] md:max-w-[200px] align-bottom">
                  &quot;{item.post_title}&quot;
                </span>
              )}
            </div>
            
            {/* Content preview */}
            {contentPreview && (
              <p className={`text-sm ${isNew ? 'text-muted-foreground' : 'text-muted-foreground/70'} line-clamp-2 italic`}>
                {contentPreview}
              </p>
            )}
            
            {/* Timestamp */}
            <div className="mt-2 text-xs text-muted-foreground">
              {formatTimeSinceLastVisit(timestamp)}
            </div>
          </div>
        </div>
      </div>
    );
    
    // Conditional wrapper - Link for same community, div for cross-community
    if (isCrossCommunity) {
      return <div onClick={handleClick}>{cardContent}</div>;
    } else {
      return <Link href={postUrl}>{cardContent}</Link>;
    }
  };

  // Smart item filtering: when collapsed, show only NEW items; when expanded, show all
  const getFilteredItems = (items: ActivityItem[] | undefined, isCollapsed: boolean): ActivityItem[] => {
    if (!items) return [];
    
    if (isCollapsed) {
      // When collapsed, only show NEW items (first 5 for preview)
      return items.filter(item => item.is_new).slice(0, 5);
    }
    
    // When expanded, show all items (already limited by pagination)
    return items;
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href={buildHomeUrl()}>
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft size={16} />
                Back to Home
              </Button>
            </Link>
          </div>

          {/* Profile Header */}
          {profile && (
            <Card variant="header" className="p-4 sm:p-6 mb-6 overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start space-y-4 sm:space-y-0 sm:space-x-4">
                <Avatar className="h-16 w-16 flex-shrink-0">
                  <AvatarImage 
                    src={profile.profile_picture_url || undefined} 
                    alt={profile.name}
                  />
                  <AvatarFallback className="text-lg font-medium">
                    {profile.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-2">
                    <h1 className="text-xl sm:text-2xl font-bold truncate">{profile.name}</h1>
                    {profile.source === 'friend' && (
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 self-start sm:self-auto flex-shrink-0">
                        <Users className="h-3 w-3 mr-1" />
                        Friend
                      </Badge>
                    )}
                  </div>
                  
                  {profile.stats && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <FileText className="h-4 w-4 flex-shrink-0" />
                        <span>{profile.stats.posts_count} posts</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MessageSquare className="h-4 w-4 flex-shrink-0" />
                        <span>{profile.stats.comments_count} comments</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <User className="h-4 w-4 flex-shrink-0" />
                        <span>Joined {formatDate(profile.stats.joined_date)}</span>
                      </div>
                    </div>
                  )}
                  
                  {profile.communities && profile.communities.length > 0 && (
                    <div className="mt-3">
                      <div className="text-sm text-muted-foreground mb-1">
                        Member of {profile.communities.length} {profile.communities.length === 1 ? 'community' : 'communities'}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {profile.communities.slice(0, 3).map((community) => (
                          <Badge key={community.id} variant="outline" className="text-xs">
                            {community.name}
                          </Badge>
                        ))}
                        {profile.communities.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{profile.communities.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Background Customization - Only visible on own profile */}
          {profile && userId === user?.userId && (
            <div className="mb-6">
              <UserBackgroundSettings 
                currentSettings={currentUserSettings?.settings}
              />
            </div>
          )}

          <Card variant="header" className="p-4 sm:p-6">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 lg:gap-6">
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                  {profile ? `${profile.name}'s Activity` : 'User Activity'}
                </h2>
                <p className="text-muted-foreground mb-4">
                  Activity across communities
                </p>
                
                {/* Community Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <span className="text-sm font-medium text-muted-foreground flex-shrink-0">Community:</span>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 min-w-0">
                    <CommunitySelector
                      currentCommunityId={selectedCommunityId}
                      onCommunityChange={setSelectedCommunityId}
                      className="w-full sm:w-auto"
                    />
                    
                    {/* Cross-Community Indicator */}
                    {selectedCommunityId !== user?.cid && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 flex-shrink-0">
                        <Globe className="h-3 w-3 mr-1" />
                        Cross-Community View
                      </Badge>
                    )}
                    
                    {/* Loading Indicator */}
                    {isLoading && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-shrink-0">
                        <div className="h-3 w-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        Loading activity...
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowOnlyNew(!showOnlyNew)}
                className="gap-2 self-start flex-shrink-0"
              >
                {showOnlyNew ? (
                  <>
                    <Eye size={16} />
                    Show All
                  </>
                ) : (
                  <>
                    <EyeOff size={16} />
                    New Only
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>

        {isLoading ? (
          <div className="space-y-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-4">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse w-64" />
                <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
              </div>
            ))}
          </div>
        ) : summary && Object.values(summary.totalCounts).every(count => count === 0) ? (
          /* Empty State */
          <div className="text-center py-16">
            <div className="mx-auto w-32 h-32 mb-6 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 flex items-center justify-center">
              <User className="h-16 w-16 text-blue-500 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Activity Yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {/* eslint-disable-next-line react/no-unescaped-entities */}
              {profile?.name || 'This user'} hasn't posted, commented, or reacted in this community yet.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href={buildHomeUrl()}>
                <Button className="gap-2">
                  <MessageSquare size={16} />
                  Browse Discussions
                </Button>
              </Link>
              {selectedCommunityId !== user?.cid && (
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedCommunityId(user?.cid || '')}
                  className="gap-2"
                >
                  <ArrowLeft size={16} />
                  Return to My Community
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className={`space-y-8 transition-all duration-300 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
            {/* Posts by User */}
            {summary && (
              <div>
                <CollapsibleCategoryHeader
                  title="Posts"
                  icon={FileText}
                  newCount={summary.newCounts.postsByUser}
                  totalCount={summary.totalCounts.postsByUser}
                  color="border-l-blue-500"
                  categoryKey="posts_by_user"
                  query={postsByUserQuery}
                />
                {(!collapsedCategories.posts_by_user || summary.newCounts.postsByUser > 0) && (
                  <div className="mt-4">
                    {(() => {
                      const filteredItems = getFilteredItems(
                        postsByUserQuery.data?.data, 
                        collapsedCategories.posts_by_user
                      );
                      
                      return filteredItems.length > 0 ? (
                        <div className="space-y-3">
                          {filteredItems.map((item: ActivityItem, index: number) => (
                            <ActivityItem key={`${item.post_id}-${item.comment_id || item.reaction_id || index}`} item={item} />
                          ))}
                        </div>
                      ) : (
                        <Card>
                          <CardContent className="py-8 text-center">
                            <p className="text-muted-foreground">
                              {categoryFilters.posts_by_user ? 'No new posts' : 'No posts yet'}
                            </p>
                          </CardContent>
                        </Card>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            <Separator />

            {/* Comments by User */}
            {summary && (
              <div>
                <CollapsibleCategoryHeader
                  title="Comments"
                  icon={MessageSquare}
                  newCount={summary.newCounts.commentsByUser}
                  totalCount={summary.totalCounts.commentsByUser}
                  color="border-l-green-500"
                  categoryKey="comments_by_user"
                  query={commentsByUserQuery}
                />
                {(!collapsedCategories.comments_by_user || summary.newCounts.commentsByUser > 0) && (
                  <div className="mt-4">
                    {(() => {
                      const filteredItems = getFilteredItems(
                        commentsByUserQuery.data?.data, 
                        collapsedCategories.comments_by_user
                      );
                      
                      return filteredItems.length > 0 ? (
                        <div className="space-y-3">
                          {filteredItems.map((item: ActivityItem, index: number) => (
                            <ActivityItem key={`${item.post_id}-${item.comment_id || item.reaction_id || index}`} item={item} />
                          ))}
                        </div>
                      ) : (
                        <Card>
                          <CardContent className="py-8 text-center">
                            <p className="text-muted-foreground">
                              {categoryFilters.comments_by_user ? 'No new comments' : 'No comments yet'}
                            </p>
                          </CardContent>
                        </Card>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            <Separator />

            {/* Reactions by User */}
            {summary && (
              <div>
                <CollapsibleCategoryHeader
                  title="Reactions"
                  icon={Heart}
                  newCount={summary.newCounts.reactionsByUser}
                  totalCount={summary.totalCounts.reactionsByUser}
                  color="border-l-pink-500"
                  categoryKey="reactions_by_user"
                  query={reactionsByUserQuery}
                />
                {(!collapsedCategories.reactions_by_user || summary.newCounts.reactionsByUser > 0) && (
                  <div className="mt-4">
                    {(() => {
                      const filteredItems = getFilteredItems(
                        reactionsByUserQuery.data?.data, 
                        collapsedCategories.reactions_by_user
                      );
                      
                      return filteredItems.length > 0 ? (
                        <div className="space-y-3">
                          {filteredItems.map((item: ActivityItem, index: number) => (
                            <ActivityItem key={`${item.post_id}-${item.comment_id || item.reaction_id || index}`} item={item} />
                          ))}
                        </div>
                      ) : (
                        <Card>
                          <CardContent className="py-8 text-center">
                            <p className="text-muted-foreground">
                              {categoryFilters.reactions_by_user ? 'No new reactions' : 'No reactions yet'}
                            </p>
                          </CardContent>
                        </Card>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            <Separator />

            {/* Posts User Commented On */}
            {summary && (
              <div>
                <CollapsibleCategoryHeader
                  title="Participated In"
                  icon={Users}
                  newCount={summary.newCounts.postsUserCommentedOn}
                  totalCount={summary.totalCounts.postsUserCommentedOn}
                  color="border-l-purple-500"
                  categoryKey="posts_user_commented_on"
                  query={postsUserCommentedOnQuery}
                />
                {(!collapsedCategories.posts_user_commented_on || summary.newCounts.postsUserCommentedOn > 0) && (
                  <div className="mt-4">
                    {(() => {
                      const filteredItems = getFilteredItems(
                        postsUserCommentedOnQuery.data?.data, 
                        collapsedCategories.posts_user_commented_on
                      );
                      
                      return filteredItems.length > 0 ? (
                        <div className="space-y-3">
                          {filteredItems.map((item: ActivityItem, index: number) => (
                            <ActivityItem key={`${item.post_id}-${item.comment_id || item.reaction_id || index}`} item={item} />
                          ))}
                        </div>
                      ) : (
                        <Card>
                          <CardContent className="py-8 text-center">
                            <p className="text-muted-foreground">
                              {categoryFilters.posts_user_commented_on ? 'No new participated posts' : 'No participated posts yet'}
                            </p>
                          </CardContent>
                        </Card>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 
'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, MessageSquare, Heart, FileText, Users, Eye, EyeOff, ChevronDown, ChevronRight, Filter } from 'lucide-react';
import { formatTimeSinceLastVisit, getWelcomeMessage } from '@/utils/dateUtils';
import { authFetchJson } from '@/utils/authFetch';
import { buildHomeUrl, preserveCgParams, buildPostUrl } from '@/utils/urlBuilder';
import { extractDescription } from '@/utils/metadataUtils';
import { MarkdownUtils } from '@/utils/markdownUtils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Enhanced interfaces for new API structure
interface ActivityCounts {
  commentsOnMyPosts: number;
  commentsOnPostsICommented: number;
  reactionsOnMyContent: number;
  newPostsInActiveBoards: number;
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
}

interface WhatsNewResponse {
  isFirstTimeUser: boolean;
  previousVisit?: string;
  message?: string;
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

export default function WhatsNewPage() {
  const { token, user } = useAuth();
  const [showOnlyNew, setShowOnlyNew] = useState(false);
  
  // Collapse state for each category
  const [collapsedCategories, setCollapsedCategories] = useState({
    comments_on_my_posts: true,
    comments_on_posts_i_commented: true,
    reactions_on_my_content: true,
    new_posts_in_active_boards: true,
  });
  
  // Pagination state for each category
  const [categoryPagination, setCategoryPagination] = useState({
    comments_on_my_posts: { page: 0, limit: 10 },
    comments_on_posts_i_commented: { page: 0, limit: 10 },
    reactions_on_my_content: { page: 0, limit: 10 },
    new_posts_in_active_boards: { page: 0, limit: 10 },
  });
  
  // Category-specific filter state
  const [categoryFilters, setCategoryFilters] = useState({
    comments_on_my_posts: false,
    comments_on_posts_i_commented: false,
    reactions_on_my_content: false,
    new_posts_in_active_boards: false,
  });

  // Fetch summary data
  const { data: summaryData, isLoading: summaryLoading } = useQuery<WhatsNewResponse>({
    queryKey: ['whatsNewSummary'],
    queryFn: async () => {
      if (!user?.cid || !token) {
        throw new Error('Authentication required');
      }
      return authFetchJson<WhatsNewResponse>('/api/me/whats-new', { token });
    },
    enabled: !!(user?.cid && token),
    staleTime: 30000, // 30 seconds
  });

  // Fetch all detailed data for all categories with per-category pagination
  const commentsOnMyPostsQuery = useQuery<WhatsNewResponse>({
    queryKey: ['whatsNewDetail', 'comments_on_my_posts', categoryPagination.comments_on_my_posts, categoryFilters.comments_on_my_posts],
    queryFn: async () => {
      if (!user?.cid || !token) {
        throw new Error('Authentication required');
      }
      const pagination = categoryPagination.comments_on_my_posts;
      const params = new URLSearchParams({
        type: 'comments_on_my_posts',
        limit: pagination.limit.toString(),
        offset: (pagination.page * pagination.limit).toString(),
        ...(categoryFilters.comments_on_my_posts && { showOnlyNew: 'true' })
      });
      return authFetchJson<WhatsNewResponse>(`/api/me/whats-new?${params}`, { token });
    },
    enabled: !!(user?.cid && token),
    staleTime: 30000,
  });
  
  const commentsOnPostsICommentedQuery = useQuery<WhatsNewResponse>({
    queryKey: ['whatsNewDetail', 'comments_on_posts_i_commented', categoryPagination.comments_on_posts_i_commented, categoryFilters.comments_on_posts_i_commented],
    queryFn: async () => {
      if (!user?.cid || !token) {
        throw new Error('Authentication required');
      }
      const pagination = categoryPagination.comments_on_posts_i_commented;
      const params = new URLSearchParams({
        type: 'comments_on_posts_i_commented',
        limit: pagination.limit.toString(),
        offset: (pagination.page * pagination.limit).toString(),
        ...(categoryFilters.comments_on_posts_i_commented && { showOnlyNew: 'true' })
      });
      return authFetchJson<WhatsNewResponse>(`/api/me/whats-new?${params}`, { token });
    },
    enabled: !!(user?.cid && token),
    staleTime: 30000,
  });
  
  const reactionsOnMyContentQuery = useQuery<WhatsNewResponse>({
    queryKey: ['whatsNewDetail', 'reactions_on_my_content', categoryPagination.reactions_on_my_content, categoryFilters.reactions_on_my_content],
    queryFn: async () => {
      if (!user?.cid || !token) {
        throw new Error('Authentication required');
      }
      const pagination = categoryPagination.reactions_on_my_content;
      const params = new URLSearchParams({
        type: 'reactions_on_my_content',
        limit: pagination.limit.toString(),
        offset: (pagination.page * pagination.limit).toString(),
        ...(categoryFilters.reactions_on_my_content && { showOnlyNew: 'true' })
      });
      return authFetchJson<WhatsNewResponse>(`/api/me/whats-new?${params}`, { token });
    },
    enabled: !!(user?.cid && token),
    staleTime: 30000,
  });
  
  const newPostsInActiveBoardsQuery = useQuery<WhatsNewResponse>({
    queryKey: ['whatsNewDetail', 'new_posts_in_active_boards', categoryPagination.new_posts_in_active_boards, categoryFilters.new_posts_in_active_boards],
    queryFn: async () => {
      if (!user?.cid || !token) {
        throw new Error('Authentication required');
      }
      const pagination = categoryPagination.new_posts_in_active_boards;
      const params = new URLSearchParams({
        type: 'new_posts_in_active_boards',
        limit: pagination.limit.toString(),
        offset: (pagination.page * pagination.limit).toString(),
        ...(categoryFilters.new_posts_in_active_boards && { showOnlyNew: 'true' })
      });
      return authFetchJson<WhatsNewResponse>(`/api/me/whats-new?${params}`, { token });
    },
    enabled: !!(user?.cid && token),
    staleTime: 30000,
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center overflow-x-hidden px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>
              Please sign in to view your activity updates.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isLoading = summaryLoading || commentsOnMyPostsQuery.isLoading || commentsOnPostsICommentedQuery.isLoading || reactionsOnMyContentQuery.isLoading || newPostsInActiveBoardsQuery.isLoading;

  // Handle first-time user case
  if (summaryData?.isFirstTimeUser) {
    return (
      <div className="min-h-screen overflow-x-hidden">
        <div className="container mx-auto px-4 py-8 max-w-full">
          <div className="flex items-center gap-4 mb-4">
            <Link href={buildHomeUrl()}>
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft size={16} />
                Back to Home
              </Button>
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">What&apos;s New</h1>
            <p className="text-muted-foreground">Stay updated with recent activity in your community</p>
          </div>

          <div className="max-w-2xl">
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  {getWelcomeMessage(null, user?.name)}
                </CardTitle>
                <CardDescription>
                  {summaryData.message}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href={buildHomeUrl()}>
                    <Button className="gap-2">
                      <MessageSquare size={16} />
                      Browse Discussions
                    </Button>
                  </Link>
                  <Link href={preserveCgParams('/create-board')}>
                    <Button variant="outline" className="gap-2">
                      <FileText size={16} />
                      Create a Board
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const summary = summaryData?.summary;

  // Helper functions for category management
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

  // Collapsible category header with counts and controls
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
    query: { data?: WhatsNewResponse; isLoading: boolean };
  }) => {
    const isCollapsed = collapsedCategories[categoryKey];
    const isFiltered = categoryFilters[categoryKey];
    const pagination = categoryPagination[categoryKey];
    
    return (
      <div className="space-y-4">
        {/* Header */}
        <div 
          className={`flex items-center justify-between py-4 border-l-4 pl-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors ${color}`}
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
          <div className="px-4 py-2 bg-gray-50 dark:bg-slate-800/50 rounded-lg space-y-3">
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
      </div>
    );
  };

  // Helper function to generate content preview
  const generateContentPreview = (content: string | undefined): string => {
    if (!content) return '';
    
    // Check if it's legacy JSON format
    if (MarkdownUtils.isLegacyJSON(content)) {
      return "left a comment"; // Placeholder for complex content
    }
    
    // For markdown content, generate a preview
    const preview = extractDescription(content, 100);
    return preview || "left a comment";
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

  // Activity item component with visual distinction, links, avatars, and content previews
  const ActivityItem = ({ item }: { item: ActivityItem }) => {
    const isNew = item.is_new;
    // Build URL with comment anchor for comment activities
    let postUrl = buildPostUrl(item.post_id, item.board_id);
    if (item.comment_id) {
      postUrl += `#comment-${item.comment_id}`;
    }
    
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
      contentPreview = generateContentPreview(item.comment_content);
    } else if (item.reaction_id) {
      // Reaction activity  
      actorName = item.reactor_name || 'Unknown User';
      actorAvatar = item.reactor_avatar || '';
      actorFallback = actorName.substring(0, 2).toUpperCase();
      const emoji = item.emoji || '👍';
      activityText = `reacted ${emoji} to`;
                     contentPreview = item.content_type === 'comment' && item.comment_preview 
                 ? `&quot;${item.comment_preview}...&quot;` 
                 : '';
    } else {
      // New post activity
      actorName = item.author_name || 'Unknown User';
      actorAvatar = item.author_avatar || '';
      actorFallback = actorName.substring(0, 2).toUpperCase();
      activityText = 'created a new post';
      contentPreview = generateContentPreview(item.post_content);
    }
    
    const timestamp = item.comment_created_at || item.post_created_at || item.reaction_created_at || '';
    
    return (
      <Link href={postUrl}>
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
              {/* Header with NEW badge and board */}
              <div className="flex items-center gap-2 mb-1">
                {isNew && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 text-xs px-2 py-0.5">
                    NEW
                  </Badge>
                )}
                <span className={`text-sm ${isNew ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}>
                  in {item.board_name}
                </span>
              </div>
              
              {              /* Main activity description */}
              <div className={`text-sm ${isNew ? 'text-foreground' : 'text-muted-foreground'} mb-1 overflow-hidden`}>
                <span className="font-medium">{actorName}</span>
                <span className="mx-1">{activityText}</span>
                {item.reaction_id ? (
                  <span className="font-medium">{item.content_type === 'post' ? 'post' : 'comment'}</span>
                ) : (
                  <span className="font-medium truncate inline-block max-w-[150px] sm:max-w-[200px] align-bottom">
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
      </Link>
    );
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      <div className="container mx-auto px-4 py-8 max-w-full">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href={buildHomeUrl()}>
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft size={16} />
                Back to Home
              </Button>
            </Link>
          </div>

                      <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">What&apos;s New</h1>
                <p className="text-muted-foreground">
                  {summary && summaryData?.previousVisit && (
                    <>Activity since your last visit {formatTimeSinceLastVisit(summaryData.previousVisit)}</>
                  )}
                </p>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowOnlyNew(!showOnlyNew)}
                className="gap-2"
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
        ) : (
          <div className="space-y-8">
            {/* Comments on My Posts */}
            {summary && (
              <div>
                <CollapsibleCategoryHeader
                  title="Comments on My Posts"
                  icon={MessageSquare}
                  newCount={summary.newCounts.commentsOnMyPosts}
                  totalCount={summary.totalCounts.commentsOnMyPosts}
                  color="border-l-blue-500"
                  categoryKey="comments_on_my_posts"
                  query={commentsOnMyPostsQuery}
                />
                {(!collapsedCategories.comments_on_my_posts || summary.newCounts.commentsOnMyPosts > 0) && (
                  <div className="mt-4">
                    {(() => {
                      const filteredItems = getFilteredItems(
                        commentsOnMyPostsQuery.data?.data, 
                        collapsedCategories.comments_on_my_posts
                      );
                      
                      return filteredItems.length > 0 ? (
                        <div className="space-y-3">
                          {filteredItems.map((item: ActivityItem, index: number) => (
                            <ActivityItem key={`${item.post_id}-${item.comment_id || item.reaction_id || index}`} item={item} />
                          ))}
                          {collapsedCategories.comments_on_my_posts && summary.newCounts.commentsOnMyPosts > 5 && (
                            <div className="text-center py-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleCategory('comments_on_my_posts')}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                Show {summary.newCounts.commentsOnMyPosts - 5} more new items...
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <Card>
                          <CardContent className="py-8 text-center">
                            <p className="text-muted-foreground">
                              {categoryFilters.comments_on_my_posts ? 'No new comments on your posts' : 'No comments on your posts yet'}
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

            {/* Comments on Posts I Joined */}
            {summary && (
              <div>
                <CollapsibleCategoryHeader
                  title="Comments on Posts I Joined"
                  icon={Users}
                  newCount={summary.newCounts.commentsOnPostsICommented}
                  totalCount={summary.totalCounts.commentsOnPostsICommented}
                  color="border-l-purple-500"
                  categoryKey="comments_on_posts_i_commented"
                  query={commentsOnPostsICommentedQuery}
                />
                {(!collapsedCategories.comments_on_posts_i_commented || summary.newCounts.commentsOnPostsICommented > 0) && (
                  <div className="mt-4">
                    {(() => {
                      const filteredItems = getFilteredItems(
                        commentsOnPostsICommentedQuery.data?.data, 
                        collapsedCategories.comments_on_posts_i_commented
                      );
                      
                      return filteredItems.length > 0 ? (
                        <div className="space-y-3">
                          {filteredItems.map((item: ActivityItem, index: number) => (
                            <ActivityItem key={`${item.post_id}-${item.comment_id || item.reaction_id || index}`} item={item} />
                          ))}
                          {collapsedCategories.comments_on_posts_i_commented && summary.newCounts.commentsOnPostsICommented > 5 && (
                            <div className="text-center py-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleCategory('comments_on_posts_i_commented')}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                Show {summary.newCounts.commentsOnPostsICommented - 5} more new items...
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <Card>
                          <CardContent className="py-8 text-center">
                            <p className="text-muted-foreground">
                              {categoryFilters.comments_on_posts_i_commented ? 'No new comments on posts you joined' : 'No comments on posts you joined yet'}
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

            {/* Reactions on My Content */}
            {summary && (
              <div>
                <CollapsibleCategoryHeader
                  title="Reactions on My Content"
                  icon={Heart}
                  newCount={summary.newCounts.reactionsOnMyContent}
                  totalCount={summary.totalCounts.reactionsOnMyContent}
                  color="border-l-pink-500"
                  categoryKey="reactions_on_my_content"
                  query={reactionsOnMyContentQuery}
                />
                {(!collapsedCategories.reactions_on_my_content || summary.newCounts.reactionsOnMyContent > 0) && (
                  <div className="mt-4">
                    {(() => {
                      const filteredItems = getFilteredItems(
                        reactionsOnMyContentQuery.data?.data, 
                        collapsedCategories.reactions_on_my_content
                      );
                      
                      return filteredItems.length > 0 ? (
                        <div className="space-y-3">
                          {filteredItems.map((item: ActivityItem, index: number) => (
                            <ActivityItem key={`${item.post_id}-${item.comment_id || item.reaction_id || index}`} item={item} />
                          ))}
                          {collapsedCategories.reactions_on_my_content && summary.newCounts.reactionsOnMyContent > 5 && (
                            <div className="text-center py-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleCategory('reactions_on_my_content')}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                Show {summary.newCounts.reactionsOnMyContent - 5} more new items...
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <Card>
                          <CardContent className="py-8 text-center">
                            <p className="text-muted-foreground">
                              {categoryFilters.reactions_on_my_content ? 'No new reactions on your content' : 'No reactions on your content yet'}
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

            {/* New Posts in Active Boards */}
            {summary && (
              <div>
                <CollapsibleCategoryHeader
                  title="New Posts in Active Boards"
                  icon={FileText}
                  newCount={summary.newCounts.newPostsInActiveBoards}
                  totalCount={summary.totalCounts.newPostsInActiveBoards}
                  color="border-l-orange-500"
                  categoryKey="new_posts_in_active_boards"
                  query={newPostsInActiveBoardsQuery}
                />
                {(!collapsedCategories.new_posts_in_active_boards || summary.newCounts.newPostsInActiveBoards > 0) && (
                  <div className="mt-4">
                    {(() => {
                      const filteredItems = getFilteredItems(
                        newPostsInActiveBoardsQuery.data?.data, 
                        collapsedCategories.new_posts_in_active_boards
                      );
                      
                      return filteredItems.length > 0 ? (
                        <div className="space-y-3">
                          {filteredItems.map((item: ActivityItem, index: number) => (
                            <ActivityItem key={`${item.post_id}-${item.comment_id || item.reaction_id || index}`} item={item} />
                          ))}
                          {collapsedCategories.new_posts_in_active_boards && summary.newCounts.newPostsInActiveBoards > 5 && (
                            <div className="text-center py-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleCategory('new_posts_in_active_boards')}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                Show {summary.newCounts.newPostsInActiveBoards - 5} more new items...
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <Card>
                          <CardContent className="py-8 text-center">
                            <p className="text-muted-foreground">
                              {categoryFilters.new_posts_in_active_boards ? 'No new posts in active boards' : 'No new posts in boards you&apos;re active in yet'}
                            </p>
                          </CardContent>
                        </Card>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* Browse Discussions Call-to-Action */}
            <div className="pt-8">
              <Card>
                <CardContent className="py-8 text-center">
                  <h3 className="text-lg font-semibold mb-4">Looking for more discussions?</h3>
                  <Link href={buildHomeUrl()}>
                    <Button className="gap-2">
                      <MessageSquare size={16} />
                      Browse Discussions
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 
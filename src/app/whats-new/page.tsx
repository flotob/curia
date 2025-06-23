'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, MessageSquare, Heart, FileText, Users, Eye, EyeOff } from 'lucide-react';
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

  // Fetch all detailed data for all categories
  const commentsOnMyPostsQuery = useQuery<WhatsNewResponse>({
    queryKey: ['whatsNewDetail', 'comments_on_my_posts', showOnlyNew],
    queryFn: async () => {
      if (!user?.cid || !token) {
        throw new Error('Authentication required');
      }
      const params = new URLSearchParams({
        type: 'comments_on_my_posts',
        limit: '20',
        offset: '0',
        ...(showOnlyNew && { showOnlyNew: 'true' })
      });
      return authFetchJson<WhatsNewResponse>(`/api/me/whats-new?${params}`, { token });
    },
    enabled: !!(user?.cid && token),
    staleTime: 30000,
  });
  
  const commentsOnPostsICommentedQuery = useQuery<WhatsNewResponse>({
    queryKey: ['whatsNewDetail', 'comments_on_posts_i_commented', showOnlyNew],
    queryFn: async () => {
      if (!user?.cid || !token) {
        throw new Error('Authentication required');
      }
      const params = new URLSearchParams({
        type: 'comments_on_posts_i_commented',
        limit: '20',
        offset: '0',
        ...(showOnlyNew && { showOnlyNew: 'true' })
      });
      return authFetchJson<WhatsNewResponse>(`/api/me/whats-new?${params}`, { token });
    },
    enabled: !!(user?.cid && token),
    staleTime: 30000,
  });
  
  const reactionsOnMyContentQuery = useQuery<WhatsNewResponse>({
    queryKey: ['whatsNewDetail', 'reactions_on_my_content', showOnlyNew],
    queryFn: async () => {
      if (!user?.cid || !token) {
        throw new Error('Authentication required');
      }
      const params = new URLSearchParams({
        type: 'reactions_on_my_content',
        limit: '20',
        offset: '0',
        ...(showOnlyNew && { showOnlyNew: 'true' })
      });
      return authFetchJson<WhatsNewResponse>(`/api/me/whats-new?${params}`, { token });
    },
    enabled: !!(user?.cid && token),
    staleTime: 30000,
  });
  
  const newPostsInActiveBoardsQuery = useQuery<WhatsNewResponse>({
    queryKey: ['whatsNewDetail', 'new_posts_in_active_boards', showOnlyNew],
    queryFn: async () => {
      if (!user?.cid || !token) {
        throw new Error('Authentication required');
      }
      const params = new URLSearchParams({
        type: 'new_posts_in_active_boards',
        limit: '20',
        offset: '0',
        ...(showOnlyNew && { showOnlyNew: 'true' })
      });
      return authFetchJson<WhatsNewResponse>(`/api/me/whats-new?${params}`, { token });
    },
    enabled: !!(user?.cid && token),
    staleTime: 30000,
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8">
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

  // Category section header with counts
  const CategoryHeader = ({ 
    title, 
    icon: Icon, 
    newCount, 
    totalCount, 
    color 
  }: { 
    title: string; 
    icon: React.ElementType; 
    newCount: number; 
    totalCount: number; 
    color: string; 
  }) => (
    <div className={`flex items-center justify-between py-4 border-l-4 pl-4 ${color}`}>
      <div className="flex items-center gap-3">
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
  );

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
        <div className={`p-4 border rounded-lg transition-all duration-200 hover:shadow-md cursor-pointer ${
          isNew 
            ? 'bg-white dark:bg-slate-800 border-green-200 dark:border-green-800 shadow-sm hover:border-green-300 dark:hover:border-green-700' 
            : 'bg-gray-50 dark:bg-slate-900/50 border-gray-200 dark:border-gray-700 opacity-60 hover:opacity-80'
        }`}>
          <div className="flex items-start gap-3">
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
              
              {/* Main activity description */}
              <div className={`text-sm ${isNew ? 'text-foreground' : 'text-muted-foreground'} mb-1`}>
                <span className="font-medium">{actorName}</span>
                <span className="mx-1">{activityText}</span>
                {item.reaction_id ? (
                  <span className="font-medium">{item.content_type === 'post' ? 'post' : 'comment'}</span>
                ) : (
                                     <span className="font-medium truncate inline-block max-w-[200px] align-bottom">
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
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
                <CategoryHeader
                  title="Comments on My Posts"
                  icon={MessageSquare}
                  newCount={summary.newCounts.commentsOnMyPosts}
                  totalCount={summary.totalCounts.commentsOnMyPosts}
                  color="border-l-blue-500"
                />
                <div className="mt-4">
                  {commentsOnMyPostsQuery.data?.data && commentsOnMyPostsQuery.data.data.length > 0 ? (
                    <div className="space-y-3">
                      {commentsOnMyPostsQuery.data.data.map((item: ActivityItem, index: number) => (
                        <ActivityItem key={`${item.post_id}-${item.comment_id || item.reaction_id || index}`} item={item} />
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="py-8 text-center">
                        <p className="text-muted-foreground">
                          {showOnlyNew ? 'No new comments on your posts' : 'No comments on your posts yet'}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}

            <Separator />

            {/* Comments on Posts I Joined */}
            {summary && (
              <div>
                <CategoryHeader
                  title="Comments on Posts I Joined"
                  icon={Users}
                  newCount={summary.newCounts.commentsOnPostsICommented}
                  totalCount={summary.totalCounts.commentsOnPostsICommented}
                  color="border-l-purple-500"
                />
                <div className="mt-4">
                  {commentsOnPostsICommentedQuery.data?.data && commentsOnPostsICommentedQuery.data.data.length > 0 ? (
                    <div className="space-y-3">
                      {commentsOnPostsICommentedQuery.data.data.map((item: ActivityItem, index: number) => (
                        <ActivityItem key={`${item.post_id}-${item.comment_id || item.reaction_id || index}`} item={item} />
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="py-8 text-center">
                        <p className="text-muted-foreground">
                          {showOnlyNew ? 'No new comments on posts you joined' : 'No comments on posts you joined yet'}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}

            <Separator />

            {/* Reactions on My Content */}
            {summary && (
              <div>
                <CategoryHeader
                  title="Reactions on My Content"
                  icon={Heart}
                  newCount={summary.newCounts.reactionsOnMyContent}
                  totalCount={summary.totalCounts.reactionsOnMyContent}
                  color="border-l-pink-500"
                />
                <div className="mt-4">
                  {reactionsOnMyContentQuery.data?.data && reactionsOnMyContentQuery.data.data.length > 0 ? (
                    <div className="space-y-3">
                      {reactionsOnMyContentQuery.data.data.map((item: ActivityItem, index: number) => (
                        <ActivityItem key={`${item.post_id}-${item.comment_id || item.reaction_id || index}`} item={item} />
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="py-8 text-center">
                        <p className="text-muted-foreground">
                          {showOnlyNew ? 'No new reactions on your content' : 'No reactions on your content yet'}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}

            <Separator />

            {/* New Posts in Active Boards */}
            {summary && (
              <div>
                <CategoryHeader
                  title="New Posts in Active Boards"
                  icon={FileText}
                  newCount={summary.newCounts.newPostsInActiveBoards}
                  totalCount={summary.totalCounts.newPostsInActiveBoards}
                  color="border-l-orange-500"
                />
                <div className="mt-4">
                  {newPostsInActiveBoardsQuery.data?.data && newPostsInActiveBoardsQuery.data.data.length > 0 ? (
                    <div className="space-y-3">
                      {newPostsInActiveBoardsQuery.data.data.map((item: ActivityItem, index: number) => (
                        <ActivityItem key={`${item.post_id}-${item.comment_id || item.reaction_id || index}`} item={item} />
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="py-8 text-center">
                        <p className="text-muted-foreground">
                          {showOnlyNew ? 'No new posts in active boards' : 'No new posts in boards you&apos;re active in yet'}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
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
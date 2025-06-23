'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, MessageSquare, Heart, FileText, Users, Eye, EyeOff } from 'lucide-react';
import { formatTimeSinceLastVisit, getWelcomeMessage } from '@/utils/dateUtils';
import { authFetchJson } from '@/utils/authFetch';
import { buildHomeUrl, preserveCgParams } from '@/utils/urlBuilder';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
  const [activeTab, setActiveTab] = useState('summary');
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

  // Fetch detailed data for specific tab
  const { data: detailData, isLoading: detailLoading } = useQuery<WhatsNewResponse | null>({
    queryKey: ['whatsNewDetail', activeTab, showOnlyNew],
    queryFn: async () => {
      if (!user?.cid || !token || activeTab === 'summary') {
        return null;
      }
      const params = new URLSearchParams({
        type: activeTab,
        limit: '20',
        offset: '0',
        ...(showOnlyNew && { showOnlyNew: 'true' })
      });
      return authFetchJson<WhatsNewResponse>(`/api/me/whats-new?${params}`, { token });
    },
    enabled: !!(user?.cid && token && activeTab !== 'summary'),
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

  const isLoading = summaryLoading || (activeTab !== 'summary' && detailLoading);

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

  // Enhanced summary cards with NEW/TOTAL display
  const SummaryCard = ({ 
    title, 
    icon: Icon, 
    newCount, 
    totalCount, 
    color, 
    tabId 
  }: { 
    title: string; 
    icon: React.ElementType; 
    newCount: number; 
    totalCount: number; 
    color: string; 
    tabId: string;
  }) => (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-md border-l-4 ${color}`}
      onClick={() => setActiveTab(tabId)}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {newCount > 0 ? (
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {newCount} NEW
            </div>
          ) : (
            <div className="text-2xl font-bold text-muted-foreground">
              0 new
            </div>
          )}
          <div className="text-sm text-muted-foreground">
            {totalCount} total
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Activity item component with visual distinction
  const ActivityItem = ({ item }: { item: ActivityItem }) => {
    const isNew = item.is_new;
    
    return (
      <div className={`p-4 border rounded-lg transition-all duration-200 ${
        isNew 
          ? 'bg-white dark:bg-slate-800 border-green-200 dark:border-green-800 shadow-sm' 
          : 'bg-gray-50 dark:bg-slate-900/50 border-gray-200 dark:border-gray-700 opacity-60'
      }`}>
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {isNew && (
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 text-xs px-2 py-0.5">
                  NEW
                </Badge>
              )}
              <span className={`text-sm ${isNew ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}>
                {item.board_name}
              </span>
            </div>
            
            <h3 className={`font-medium ${isNew ? 'text-foreground' : 'text-muted-foreground'} truncate`}>
              {item.post_title}
            </h3>
            
            {item.comment_content && (
              <p className={`text-sm mt-1 ${isNew ? 'text-muted-foreground' : 'text-muted-foreground/70'} line-clamp-2`}>
                {item.comment_content}
              </p>
            )}
            
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span>
                {item.commenter_name || item.author_name || item.reactor_name}
              </span>
              <span>
                {formatTimeSinceLastVisit(item.comment_created_at || item.post_created_at || item.reaction_created_at || '')}
              </span>
            </div>
          </div>
        </div>
      </div>
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
            
            {activeTab !== 'summary' && (
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
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
              {summary && (
                <>
                  <SummaryCard
                    title="Comments on My Posts"
                    icon={MessageSquare}
                    newCount={summary.newCounts.commentsOnMyPosts}
                    totalCount={summary.totalCounts.commentsOnMyPosts}
                    color="border-l-blue-500"
                    tabId="comments_on_my_posts"
                  />
                  <SummaryCard
                    title="Comments on Posts I Joined"
                    icon={Users}
                    newCount={summary.newCounts.commentsOnPostsICommented}
                    totalCount={summary.totalCounts.commentsOnPostsICommented}
                    color="border-l-purple-500"
                    tabId="comments_on_posts_i_commented"
                  />
                  <SummaryCard
                    title="Reactions on My Content"
                    icon={Heart}
                    newCount={summary.newCounts.reactionsOnMyContent}
                    totalCount={summary.totalCounts.reactionsOnMyContent}
                    color="border-l-pink-500"
                    tabId="reactions_on_my_content"
                  />
                  <SummaryCard
                    title="New Posts in Active Boards"
                    icon={FileText}
                    newCount={summary.newCounts.newPostsInActiveBoards}
                    totalCount={summary.totalCounts.newPostsInActiveBoards}
                    color="border-l-orange-500"
                    tabId="new_posts_in_active_boards"
                  />
                </>
              )}
            </div>

            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="comments_on_my_posts">My Posts</TabsTrigger>
              <TabsTrigger value="comments_on_posts_i_commented">Joined Posts</TabsTrigger>
              <TabsTrigger value="reactions_on_my_content">Reactions</TabsTrigger>
              <TabsTrigger value="new_posts_in_active_boards">New Posts</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Activity Overview</CardTitle>
                  <CardDescription>
                    Click on any category above to see detailed activity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href={buildHomeUrl()}>
                    <Button className="gap-2">
                      <MessageSquare size={16} />
                      Browse Discussions
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </TabsContent>

            {(['comments_on_my_posts', 'comments_on_posts_i_commented', 'reactions_on_my_content', 'new_posts_in_active_boards'] as const).map((tabId) => (
              <TabsContent key={tabId} value={tabId} className="space-y-4">
                {detailData && detailData.data && detailData.data.length > 0 ? (
                  <div className="space-y-3">
                    {detailData.data.map((item: ActivityItem, index: number) => (
                      <ActivityItem key={`${item.post_id}-${item.comment_id || item.reaction_id || index}`} item={item} />
                    ))}
                    
                    {detailData.pagination?.hasMore && (
                      <div className="text-center py-4">
                        <Button variant="outline">Load More</Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <p className="text-muted-foreground">
                        {showOnlyNew ? 'No new activity in this category' : 'No activity in this category yet'}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </div>
  );
} 
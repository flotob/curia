'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { formatTimeSinceLastVisit, getWelcomeMessage } from '@/utils/dateUtils';
import { authFetchJson } from '@/utils/authFetch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Heart, FileText, Users, Clock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface ActivitySummary {
  commentsOnMyPosts: number;
  commentsOnPostsICommented: number;
  reactionsOnMyContent: number;
  newPostsInActiveBoards: number;
}

interface WhatsNewResponse {
  isFirstTimeUser: boolean;
  previousVisit?: string;
  summary?: ActivitySummary;
  message?: string;
}

const WhatsNewPage = () => {
  const { user, isAuthenticated } = useAuth();
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [isFirstTime, setIsFirstTime] = useState(false);

  useEffect(() => {
    const fetchSummary = async () => {
      if (!isAuthenticated) return;
      
      try {
        setIsLoading(true);
        const response: WhatsNewResponse = await authFetchJson('/api/me/whats-new');
        
        if (response.isFirstTimeUser) {
          setIsFirstTime(true);
          setSummary({
            commentsOnMyPosts: 0,
            commentsOnPostsICommented: 0,
            reactionsOnMyContent: 0,
            newPostsInActiveBoards: 0,
          });
        } else {
          setSummary(response.summary || null);
        }
      } catch (error) {
        console.error('Failed to fetch activity summary:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummary();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>
              Please sign in to see what&apos;s new since your last visit.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="mb-8">
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const totalActivity = summary ? 
    summary.commentsOnMyPosts + 
    summary.commentsOnPostsICommented + 
    summary.reactionsOnMyContent + 
    summary.newPostsInActiveBoards : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft size={16} />
                Back to Home
              </Button>
            </Link>
          </div>
          
          <h1 className="text-3xl font-bold mb-2">What&apos;s New</h1>
          <p className="text-muted-foreground text-lg">
            {isFirstTime ? 
              getWelcomeMessage(null, user?.name) : 
              getWelcomeMessage(user?.previousVisit || null, user?.name)
            }
          </p>
          
          {!isFirstTime && user?.previousVisit && (
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <Clock size={16} />
              {formatTimeSinceLastVisit(user.previousVisit)}
            </div>
          )}
        </div>

        {/* First Time User State */}
        {isFirstTime && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users size={20} />
                Welcome to the Community!
              </CardTitle>
              <CardDescription>
                Start participating in discussions to see activity from other community members on your next visit.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/">
                  <Button className="gap-2">
                    <MessageSquare size={16} />
                    Browse Discussions
                  </Button>
                </Link>
                <Link href="/create-board">
                  <Button variant="outline" className="gap-2">
                    <FileText size={16} />
                    Create a Board
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Activity Summary Cards */}
        {!isFirstTime && summary && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card 
                className={`cursor-pointer transition-all hover:shadow-md ${selectedTab === 'comments-on-my-posts' ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setSelectedTab('comments-on-my-posts')}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Comments on My Posts</p>
                      <p className="text-2xl font-bold">{summary.commentsOnMyPosts}</p>
                    </div>
                    <MessageSquare className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-all hover:shadow-md ${selectedTab === 'comments-on-posts-i-commented' ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setSelectedTab('comments-on-posts-i-commented')}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Comments on Posts I Joined</p>
                      <p className="text-2xl font-bold">{summary.commentsOnPostsICommented}</p>
                    </div>
                    <MessageSquare className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-all hover:shadow-md ${selectedTab === 'reactions-on-my-content' ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setSelectedTab('reactions-on-my-content')}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Reactions on My Content</p>
                      <p className="text-2xl font-bold">{summary.reactionsOnMyContent}</p>
                    </div>
                    <Heart className="h-8 w-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-all hover:shadow-md ${selectedTab === 'new-posts-in-active-boards' ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setSelectedTab('new-posts-in-active-boards')}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">New Posts in My Boards</p>
                      <p className="text-2xl font-bold">{summary.newPostsInActiveBoards}</p>
                    </div>
                    <FileText className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Activity Details Tabs */}
            {totalActivity > 0 ? (
              <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 mb-6">
                  <TabsTrigger 
                    value="comments-on-my-posts" 
                    className="text-xs lg:text-sm flex items-center gap-1 lg:gap-2"
                  >
                    <MessageSquare size={14} />
                    <span className="hidden sm:inline">Comments on Mine</span>
                    <span className="sm:hidden">Mine</span>
                    {summary.commentsOnMyPosts > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {summary.commentsOnMyPosts}
                      </Badge>
                    )}
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="comments-on-posts-i-commented"
                    className="text-xs lg:text-sm flex items-center gap-1 lg:gap-2"
                  >
                    <MessageSquare size={14} />
                    <span className="hidden sm:inline">Posts I Joined</span>
                    <span className="sm:hidden">Joined</span>
                    {summary.commentsOnPostsICommented > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {summary.commentsOnPostsICommented}
                      </Badge>
                    )}
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="reactions-on-my-content"
                    className="text-xs lg:text-sm flex items-center gap-1 lg:gap-2"
                  >
                    <Heart size={14} />
                    <span className="hidden sm:inline">Reactions</span>
                    <span className="sm:hidden">❤️</span>
                    {summary.reactionsOnMyContent > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {summary.reactionsOnMyContent}
                      </Badge>
                    )}
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="new-posts-in-active-boards"
                    className="text-xs lg:text-sm flex items-center gap-1 lg:gap-2"
                  >
                    <FileText size={14} />
                    <span className="hidden sm:inline">New Posts</span>
                    <span className="sm:hidden">New</span>
                    {summary.newPostsInActiveBoards > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {summary.newPostsInActiveBoards}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="comments-on-my-posts">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare size={20} />
                        Comments on My Posts
                      </CardTitle>
                      <CardDescription>
                        New comments on posts you authored since your last visit
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">
                        Coming soon - detailed comment list with pagination and filters
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="comments-on-posts-i-commented">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare size={20} />
                        Comments on Posts I Joined
                      </CardTitle>
                      <CardDescription>
                        New comments on posts where you participated in the discussion
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">
                        Coming soon - detailed comment list with pagination and filters
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="reactions-on-my-content">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Heart size={20} />
                        Reactions on My Content
                      </CardTitle>
                      <CardDescription>
                        New emoji reactions on your posts and comments
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">
                        Coming soon - detailed reaction list with pagination and filters
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="new-posts-in-active-boards">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText size={20} />
                        New Posts in My Active Boards
                      </CardTitle>
                      <CardDescription>
                        New posts in boards where you&apos;ve been active
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">
                        Coming soon - detailed post list with pagination and filters
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>No New Activity</CardTitle>
                  <CardDescription>
                    No new activity since your last visit. Check back later or explore new discussions!
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/">
                    <Button className="gap-2">
                      <MessageSquare size={16} />
                      Browse Discussions
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default WhatsNewPage; 
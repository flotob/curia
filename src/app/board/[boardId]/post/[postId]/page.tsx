'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useCgLib } from '@/contexts/CgLibContext';
import { useSocket } from '@/contexts/SocketContext';
import { authFetchJson } from '@/utils/authFetch';
import { ApiPost } from '@/app/api/posts/route';
import { ApiComment } from '@/app/api/posts/[postId]/comments/route';
import { PostCard } from '@/components/voting/PostCard';
import { CommentList } from '@/components/voting/CommentList';
import { NewCommentForm } from '@/components/voting/NewCommentForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { ArrowLeft, Home, MessageSquare } from 'lucide-react';
import { buildHomeUrl, buildBoardUrl } from '@/utils/urlBuilder';

interface PostDetailPageProps {
  params: Promise<{
    boardId: string;
    postId: string;
  }>;
}

export default function PostDetailPage({ params }: PostDetailPageProps) {
  const [boardId, setBoardId] = useState<string>('');
  const [postId, setPostId] = useState<string>('');
  
  // All hooks must be called at the top level
  const { token } = useAuth();
  const { cgInstance } = useCgLib();
  const { joinBoard, leaveBoard, isConnected } = useSocket();
  
  useEffect(() => {
    params.then(({ boardId, postId }) => {
      setBoardId(boardId);
      setPostId(postId);
    });
  }, [params]);

  const boardIdNum = parseInt(boardId, 10);
  const postIdNum = parseInt(postId, 10);

  // 🚀 REAL-TIME: Auto-join board room for this post
  useEffect(() => {
    if (!isConnected || isNaN(boardIdNum) || !boardId) return;

    console.log(`[PostDetailPage] Auto-joining board room: ${boardIdNum}`);
    joinBoard(boardIdNum);

    return () => {
      console.log(`[PostDetailPage] Auto-leaving board room: ${boardIdNum}`);
      leaveBoard(boardIdNum);
    };
  }, [isConnected, boardIdNum, joinBoard, leaveBoard, boardId]);

  // Fetch the specific post
  const { data: post, isLoading: isLoadingPost, error: postError } = useQuery<ApiPost>({
    queryKey: ['post', postIdNum],
    queryFn: async () => {
      if (!token) throw new Error('No auth token');
      return authFetchJson<ApiPost>(`/api/posts/${postIdNum}`, { token });
    },
    enabled: !!token && !isNaN(postIdNum) && !!postId,
  });

  // Fetch comments for the post
  const { data: comments, isLoading: isLoadingComments } = useQuery<ApiComment[]>({
    queryKey: ['comments', postIdNum],
    queryFn: async () => {
      if (!token) throw new Error('No auth token');
      return authFetchJson<ApiComment[]>(`/api/posts/${postIdNum}/comments`, { token });
    },
    enabled: !!token && !isNaN(postIdNum) && !!postId,
  });
  
  // Handle navigation with CG context
  const handleNavigation = (url: string) => {
    if (cgInstance) {
      cgInstance.navigate(url)
        .then(() => console.log(`[PostDetailPage] Navigation to ${url} successful`))
        .catch(err => console.error(`[PostDetailPage] Navigation failed:`, err));
    }
  };

  // Early return for loading params state
  if (!boardId || !postId) {
    return <div>Loading...</div>;
  }

  // Loading state
  if (isLoadingPost) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Breadcrumb Skeleton */}
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-64" />
          
          {/* Post Skeleton */}
          <Card>
            <CardHeader>
              <div className="space-y-3">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-32" />
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-3/4" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-1/2" />
              </div>
            </CardContent>
          </Card>

          {/* Comments Skeleton */}
          <Card>
            <CardHeader>
              <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-24" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-48" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-2/3" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  if (postError || !post) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <Card>
            <CardContent className="py-12">
              <h1 className="text-2xl font-semibold text-slate-700 dark:text-slate-300 mb-4">
                Post Not Found
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                {postError instanceof Error ? postError.message : 'The post you\'re looking for doesn\'t exist or you don\'t have permission to view it.'}
              </p>
              <div className="space-x-4">
                <Button 
                  onClick={() => handleNavigation(buildBoardUrl(boardIdNum))}
                  variant="outline"
                >
                  <ArrowLeft size={16} className="mr-2" />
                  Back to Board
                </Button>
                <Button 
                  onClick={() => handleNavigation(buildHomeUrl())}
                >
                  <Home size={16} className="mr-2" />
                  Go Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Breadcrumb Navigation */}
        {/* <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink 
                onClick={() => handleNavigation(buildHomeUrl())}
                className="cursor-pointer hover:text-primary"
              >
                <Home size={16} className="mr-1" />
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight size={16} />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink 
                onClick={() => handleNavigation(buildBoardUrl(boardIdNum))}
                className="cursor-pointer hover:text-primary"
              >
                {boardInfo?.name || `Board ${boardId}`}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight size={16} />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage className="text-slate-600 dark:text-slate-400">
                {post.title}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb> */}

        {/* Post Detail Card - Full Content */}
        <PostCard 
          post={post} 
          showBoardContext={false}
          showFullContent={true}
        />

        {/* Comments Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageSquare size={20} className="mr-2" />
              Comments {comments && `(${comments.length})`}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* New Comment Form */}
            <NewCommentForm postId={postIdNum} />
            
            {/* Comments List */}
            {isLoadingComments ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-48" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-2/3" />
                  </div>
                ))}
              </div>
            ) : comments && comments.length > 0 ? (
              <CommentList postId={postIdNum} />
            ) : (
              <div className="text-center py-8">
                <MessageSquare size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                <p className="text-slate-500 dark:text-slate-400">
                  No comments yet. Be the first to start the discussion!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 
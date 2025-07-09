'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  ArrowUp, 
  MessageSquare, 
  Sparkles,
  ChevronRight,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { authFetchJson } from '@/utils/authFetch';
import { useRouter } from 'next/navigation';
import { useTimeSince } from '@/utils/timeUtils';
import { buildPostUrl } from '@/utils/urlBuilder';

interface RelatedPost {
  id: number;
  title: string;
  content: string;
  author_name: string;
  board_name: string;
  board_id: number;
  upvote_count: number;
  comment_count: number;
  created_at: string;
  similarity_score: number;
}

interface RelatedPostsApiResponse {
  message: string;
  relatedPosts: RelatedPost[];
  postId: number;
  totalResults: number;
  semanticStats: {
    similarity_threshold: number;
    processing_time_ms: number;
  };
}

interface RelatedPostsWidgetProps {
  postId: number;
  className?: string;
}

export function RelatedPostsWidget({ 
  postId, 
  className 
}: RelatedPostsWidgetProps) {
  const { token } = useAuth();
  const router = useRouter();

  // Fetch related posts
  const { data: apiResponse, isLoading, error } = useQuery<RelatedPostsApiResponse>({
    queryKey: ['relatedPosts', postId],
    queryFn: async () => {
      if (!token || !postId) return { relatedPosts: [], message: '', postId: 0, totalResults: 0, semanticStats: { similarity_threshold: 0, processing_time_ms: 0 } };
      return authFetchJson<RelatedPostsApiResponse>(`/api/posts/${postId}/related`, { token });
    },
    enabled: !!token && !!postId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Extract the actual posts array from the API response
  const relatedPosts = apiResponse?.relatedPosts || [];

  // Helper function to get similarity label
  const getSimilarityLabel = (score: number): string => {
    if (score >= 0.3) return 'Strong match';
    if (score >= 0.25) return 'Good match';
    return 'Relevant';
  };

  // Helper function to get similarity color
  const getSimilarityColor = (score: number): string => {
    if (score >= 0.3) return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
    if (score >= 0.25) return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
  };

  const handlePostClick = (relatedPost: RelatedPost) => {
    const url = buildPostUrl(relatedPost.id, relatedPost.board_id, true);
    router.push(url);
  };

  // Don't render if no posts or loading
  if (isLoading) {
    return (
      <Card className={cn("transition-all duration-200", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center space-x-2">
            <Sparkles size={16} className="text-primary" />
            <span>Related Posts</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse space-y-2">
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-3 bg-muted rounded w-3/4" />
              <div className="flex space-x-2">
                <div className="h-2 bg-muted rounded w-8" />
                <div className="h-2 bg-muted rounded w-8" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error || !relatedPosts || relatedPosts.length === 0) {
    return null; // Don't show widget if no related posts
  }

  return (
    <Card className={cn("transition-all duration-200 hover:shadow-sm", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles size={16} className="text-primary" />
            <span>Related Posts</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {relatedPosts.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {relatedPosts.map((post) => (
          <RelatedPostItem
            key={post.id}
            post={post}
            onClick={() => handlePostClick(post)}
            similarityLabel={getSimilarityLabel(post.similarity_score)}
            similarityColor={getSimilarityColor(post.similarity_score)}
          />
        ))}
      </CardContent>
    </Card>
  );
}

// Individual related post item component
interface RelatedPostItemProps {
  post: RelatedPost;
  onClick: () => void;
  similarityLabel: string;
  similarityColor: string;
}

function RelatedPostItem({ 
  post, 
  onClick, 
  similarityLabel, 
  similarityColor 
}: RelatedPostItemProps) {
  const timeSinceText = useTimeSince(post.created_at);

  return (
    <div 
      className="group cursor-pointer transition-all duration-200 hover:bg-accent/50 rounded-lg p-2 -m-2"
      onClick={onClick}
    >
      <div className="space-y-2">
        {/* Post title with similarity badge */}
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium line-clamp-2 leading-tight group-hover:text-primary transition-colors">
            {post.title}
          </h4>
          <Badge 
            variant="secondary" 
            className={cn(
              "text-xs px-1.5 py-0.5 flex-shrink-0 flex items-center gap-1",
              similarityColor
            )}
          >
            <Sparkles size={10} />
            {similarityLabel}
          </Badge>
        </div>

        {/* Board context */}
        {post.board_name && (
          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
            <FileText size={10} />
            <span className="truncate">📋 {post.board_name}</span>
          </div>
        )}

        {/* Engagement metrics */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
              <ArrowUp size={10} />
              <span>{post.upvote_count}</span>
            </div>
            <div className="flex items-center space-x-1">
              <MessageSquare size={10} />
              <span>{post.comment_count}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock size={10} />
              <span>{timeSinceText}</span>
            </div>
          </div>
          
          {/* Click indicator */}
          <ChevronRight 
            size={12} 
            className="text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200" 
          />
        </div>

        {/* Author info */}
        <div className="text-xs text-muted-foreground truncate">
          by {post.author_name}
        </div>
      </div>
    </div>
  );
} 
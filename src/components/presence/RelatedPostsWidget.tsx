'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowUp, 
  MessageSquare, 
  Sparkles,
  ChevronRight,
  Clock,
  FileText
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  author_profile_picture_url?: string;
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
      return authFetchJson<RelatedPostsApiResponse>(`/api/posts/${postId}/related?threshold=0.18`, { token });
    },
    enabled: !!token && !!postId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Extract the actual posts array from the API response
  const relatedPosts = apiResponse?.relatedPosts || [];



  const handlePostClick = (relatedPost: RelatedPost) => {
    const url = buildPostUrl(relatedPost.id, relatedPost.board_id, true);
    router.push(url);
  };

  // Don't render if no posts or loading
  if (isLoading) {
    return (
      <Card className={`transition-all duration-200 ${className || ''}`}>
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
    <Card className={`transition-all duration-200 hover:shadow-sm ${className || ''}`}>
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
}

function RelatedPostItem({ 
  post, 
  onClick
}: RelatedPostItemProps) {
  const timeSinceText = useTimeSince(post.created_at);

  return (
    <div 
      className="group cursor-pointer transition-all duration-200 hover:bg-accent/50 rounded-lg p-2 -m-2"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={post.author_profile_picture_url} alt={post.author_name} />
          <AvatarFallback className="text-xs">
            {post.author_name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          {/* Post title with optional similarity badge */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className="text-sm font-medium line-clamp-2 leading-tight group-hover:text-primary transition-colors">
              {post.title}
            </h4>
                          {/* Click indicator */}
              <ChevronRight 
                size={12} 
                className="text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0" 
              />
          </div>

          {/* Board context */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <FileText className="w-3 h-3" />
            <span>{post.board_name}</span>
          </div>
          
          {/* Engagement metrics and time */}
          <div className="flex items-center space-x-3 text-xs text-muted-foreground mb-1">
            <div className="flex items-center space-x-1">
              <ArrowUp className="w-3 h-3" />
              <span>{post.upvote_count}</span>
            </div>
            <div className="flex items-center space-x-1">
              <MessageSquare className="w-3 h-3" />
              <span>{post.comment_count}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>{timeSinceText.replace(' ago', '')}</span>
            </div>
          </div>
          
          {/* Author info - separate line */}
          <div className="text-xs text-muted-foreground">
            by {post.author_name}
          </div>
        </div>
      </div>
    </div>
  );
}
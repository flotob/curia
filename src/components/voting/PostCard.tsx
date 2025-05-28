'use client';

import React from 'react';
import Image from 'next/image';
import { MessageSquare, Share2, Bookmark, Clock } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { VoteButton } from './VoteButton';
import { ApiPost } from '@/app/api/posts/route'; // Assuming ApiPost is exported from your API route
import { cn } from '@/lib/utils';

interface PostCardProps {
  post: ApiPost;
  // currentUserId?: string | null; // To determine if current user has voted - this is now in post.user_has_upvoted
}

// Helper to format time since posted (simplified)
function timeSince(dateString: string): string {
  const date = new Date(dateString);
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? " year" : " years") + " ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? " month" : " months") + " ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? " day" : " days") + " ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? " hour" : " hours") + " ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? " minute" : " minutes") + " ago";
  if (seconds < 10) return "just now";
  return Math.floor(seconds) + " seconds ago";
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const authorDisplayName = post.author_name || 'Unknown Author';
  // Create a fallback for avatar from the first letter of the author's name
  const avatarFallback = authorDisplayName.substring(0, 2).toUpperCase();

  return (
    <Card className="w-full max-w-2xl mx-auto overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex">
        {/* Vote Section */}
        <div className="flex flex-col items-center justify-start p-3 md:p-4 bg-slate-50 dark:bg-slate-800 border-r border-border">
          <VoteButton 
            postId={post.id} 
            initialUpvoteCount={post.upvote_count} 
            initialUserHasUpvoted={post.user_has_upvoted}
            size="default"
          />
        </div>

        {/* Main Content Section */}
        <div className="flex-grow">
          <CardHeader className="pb-2">
            <div className="flex items-center text-xs text-muted-foreground mb-2">
              <Avatar className="h-6 w-6 mr-2">
                <AvatarImage src={post.author_profile_picture_url || undefined} alt={`${authorDisplayName}'s avatar`} />
                <AvatarFallback>{avatarFallback}</AvatarFallback>
              </Avatar>
              <span className="font-medium text-foreground">{authorDisplayName}</span>
              <span className="mx-1">•</span>
              <Clock size={14} className="mr-1 flex-shrink-0" /> 
              <span>{timeSince(post.created_at)}</span>
            </div>
            <CardTitle className="text-lg md:text-xl leading-tight">{post.title}</CardTitle>
            {post.content && (
              <CardDescription className="text-sm mt-1 line-clamp-3">
                {post.content}
              </CardDescription>
            )}
          </CardHeader>

          {(post.tags && post.tags.length > 0) && (
            <CardContent className="py-2">
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary">{tag}</Badge>
                ))}
              </div>
            </CardContent>
          )}

          <CardFooter className="flex justify-between items-center text-sm text-muted-foreground pt-2 pb-3 md:pb-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" className="p-1 h-auto">
                <MessageSquare size={16} className="mr-1.5" /> {post.comment_count}
              </Button>
              <Button variant="ghost" size="sm" className="p-1 h-auto">
                <Share2 size={16} /> 
                {/* <span className="ml-1.5 hidden md:inline">Share</span> Uncomment to show text */}
              </Button>
            </div>
            <Button variant="ghost" size="sm" className="p-1 h-auto">
              <Bookmark size={16} />
              {/* <span className="ml-1.5 hidden md:inline">Bookmark</span> Uncomment to show text */}
            </Button>
          </CardFooter>
        </div>
      </div>
    </Card>
  );
}; 
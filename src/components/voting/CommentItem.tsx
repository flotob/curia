'use client';

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ApiComment } from '@/app/api/posts/[postId]/comments/route'; // Import the ApiComment interface
import { Clock } from 'lucide-react';

interface CommentItemProps {
  comment: ApiComment;
}

// Helper to format time (can be moved to a shared util if used elsewhere)
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

export const CommentItem: React.FC<CommentItemProps> = ({ comment }) => {
  const authorDisplayName = comment.author_name || 'Unknown User';
  const avatarFallback = authorDisplayName.substring(0, 2).toUpperCase();

  return (
    <div className="flex items-start space-x-3 py-3">
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={comment.author_profile_picture_url || undefined} alt={`${authorDisplayName}'s avatar`} />
        <AvatarFallback>{avatarFallback}</AvatarFallback>
      </Avatar>
      <div className="flex-grow">
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{authorDisplayName}</span>
          <span className="mx-1">•</span>
          <Clock size={12} className="mr-0.5 flex-shrink-0" />
          <span>{timeSince(comment.created_at)}</span>
        </div>
        <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">
          {comment.content}
        </p>
        {/* TODO: Add reply button/functionality if supporting threaded comments directly here */}
        {/* <Button variant="link" size="sm" className="p-0 h-auto text-xs">Reply</Button> */}
      </div>
    </div>
  );
}; 
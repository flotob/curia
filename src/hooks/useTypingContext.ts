'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSocket } from '@/contexts/SocketContext';
import { authFetchJson } from '@/utils/authFetch';
import { useAuth } from '@/contexts/AuthContext';
import { ApiPost } from '@/app/api/posts/route';
import { TypingContext } from '@/components/presence/TypingIndicator';

// Typing context data interface
export interface TypingContextData {
  isTyping: boolean;
  context: TypingContext | null;
  postTitle?: string;
  postId?: number;
  boardId?: number;
  timestamp?: number;
}

// Enhanced user presence with typing info
export interface UserTypingState {
  userId: string;
  userName: string;
  isTyping: boolean;
  typingContext?: TypingContext;
  typingPostId?: number;
  typingBoardId?: number;
  typingTimestamp?: number;
}

// Hook to get typing context for a specific user
export const useTypingContext = (userId: string): TypingContextData => {
  const { token } = useAuth();
  const { boardOnlineUsers } = useSocket();
  
  // Find the user in our online users list
  const user = useMemo(() => {
    return boardOnlineUsers.find(u => u.userId === userId);
  }, [boardOnlineUsers, userId]);

  // Query for post title if user is typing on a specific post
  const { data: postData } = useQuery<ApiPost>({
    queryKey: ['typingPostContext', user?.typingPostId],
    queryFn: async () => {
      if (!user?.typingPostId || !token) throw new Error('No post ID or token');
      return authFetchJson<ApiPost>(`/api/posts/${user.typingPostId}`, { token });
    },
    enabled: !!user?.typingPostId && !!token,
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    gcTime: 5 * 60 * 1000,    // Garbage collect after 5 minutes
  });

  // Return typing context data
  return useMemo((): TypingContextData => {
    if (!user?.isTyping) {
      return { isTyping: false, context: null };
    }

    // Determine context based on available data
    let context: TypingContext = 'general';
    if (user.typingPostId) {
      context = 'commenting';
    } else if (user.typingBoardId) {
      context = 'posting';
    }

    return {
      isTyping: true,
      context,
      postTitle: postData?.title,
      postId: user.typingPostId,
      boardId: user.typingBoardId,
      timestamp: user.typingTimestamp,
    };
  }, [user, postData]);
};

// Hook to get all users currently typing in a board/post
export const useTypingUsers = (boardId?: number, postId?: number) => {
  const { boardOnlineUsers } = useSocket();
  
  return useMemo(() => {
    return boardOnlineUsers.filter(user => {
      if (!user.isTyping) return false;
      
      // If we're looking for specific post typers
      if (postId) {
        return user.typingPostId === postId;
      }
      
      // If we're looking for board typers (excluding post commenters)
      if (boardId) {
        return user.typingBoardId === boardId && !user.typingPostId;
      }
      
      // All typers
      return true;
    });
  }, [boardOnlineUsers, boardId, postId]);
};

// Hook to get typing count for current navigation context
export const useActiveTypingCount = (boardId?: number, postId?: number): number => {
  const typingUsers = useTypingUsers(boardId, postId);
  return typingUsers.length;
};

// Hook to get typing summary for display
export interface TypingSummary {
  totalTyping: number;
  postCommenters: number;
  boardPosters: number;
  generalTypers: number;
}

export const useTypingSummary = (boardId?: number): TypingSummary => {
  const { boardOnlineUsers } = useSocket();
  
  return useMemo(() => {
    const typingUsers = boardOnlineUsers.filter(user => user.isTyping);
    
    const summary: TypingSummary = {
      totalTyping: typingUsers.length,
      postCommenters: 0,
      boardPosters: 0,
      generalTypers: 0
    };

    typingUsers.forEach(user => {
      if (user.typingPostId) {
        summary.postCommenters++;
      } else if (user.typingBoardId === boardId) {
        summary.boardPosters++;
      } else {
        summary.generalTypers++;
      }
    });

    return summary;
  }, [boardOnlineUsers, boardId]);
};

// Utility function to format typing message
export const formatTypingMessage = (count: number, context: TypingContext = 'general'): string => {
  if (count === 0) return '';
  if (count === 1) {
    switch (context) {
      case 'commenting': return '1 user commenting';
      case 'posting': return '1 user posting';
      default: return '1 user typing';
    }
  }
  
  switch (context) {
    case 'commenting': return `${count} users commenting`;
    case 'posting': return `${count} users posting`;
    default: return `${count} users typing`;
  }
};

export default useTypingContext; 
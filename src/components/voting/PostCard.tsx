'use client';

import React, { useState, useEffect } from 'react';
// import Link from 'next/link';
// import NextImage from 'next/image';
import { MessageSquare, Share2, Bookmark, Clock, Trash, MoreVertical, ChevronDown, ChevronUp, Move, Shield } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, /* CardDescription */ } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { VoteButton } from './VoteButton';
import { ApiPost } from '@/app/api/posts/route';
import { ApiBoard } from '@/app/api/communities/[communityId]/boards/route';
import { ApiCommunity } from '@/app/api/communities/[communityId]/route';
import { ApiComment } from '@/app/api/posts/[postId]/comments/route';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { authFetchJson } from '@/utils/authFetch';
import { cn } from '@/lib/utils';
import { CommentList } from './CommentList';
import { NewCommentForm } from './NewCommentForm';
import { checkBoardAccess, getUserRoles } from '@/lib/roleService';
import { useTimeSince } from '@/utils/timeUtils';
import { useRouter, useSearchParams } from 'next/navigation';
import { SettingsUtils } from '@/types/settings';
import { getUPDisplayName } from '@/lib/upProfile';
import { buildExternalShareUrl } from '@/utils/urlBuilder';
import { ShareModal } from '@/components/ui/ShareModal';
import { ReactionBar } from '../reactions/ReactionBar';
import { UserProfilePopover } from '../mentions/UserProfilePopover';

// Tiptap imports for rendering post content
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import TiptapLink from '@tiptap/extension-link'; // For rendering links
import { EnhancedImageExtension } from '@/components/tiptap/EnhancedImageExtension';
import { Markdown } from 'tiptap-markdown';
import { MarkdownUtils } from '@/utils/markdownUtils';
import { MentionExtension } from '@/components/mentions/MentionExtension';
// highlight.js CSS is imported globally in layout.tsx

const lowlight = createLowlight(common);

interface PostCardProps {
  post: ApiPost;
  showBoardContext?: boolean; // Whether to show "in BoardName" context
  showFullContent?: boolean;  // Whether to show full content (for detail pages)
  boardInfo?: {               // Board context for shared board URL generation
    id: number;
    name: string;
    community_id: string;
    is_imported?: boolean;
    source_community_id?: string;
    source_community_name?: string;
  } | null;
}



export const PostCard: React.FC<PostCardProps> = ({ post, showBoardContext = false, showFullContent = false, boardInfo }) => {
  const authorDisplayName = post.author_name || 'Unknown Author';
  // Create a fallback for avatar from the first letter of the author's name
  const avatarFallback = authorDisplayName.substring(0, 2).toUpperCase();
  const [showComments, setShowComments] = useState(false);
  const [isPostContentExpanded, setIsPostContentExpanded] = useState(showFullContent);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [selectedBoardId, setSelectedBoardId] = useState<string>('');

  const [highlightedCommentId, setHighlightedCommentId] = useState<number | null>(null);
  const [replyingToCommentId, setReplyingToCommentId] = useState<number | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [isGeneratingShareUrl, setIsGeneratingShareUrl] = useState(false);
  const [isWebShareFallback, setIsWebShareFallback] = useState(false);
  const [isAuthorPopoverOpen, setIsAuthorPopoverOpen] = useState(false);
  
  // UP profile names for follower requirements (address -> display name)
  const [upProfileNames, setUpProfileNames] = useState<Record<string, string>>({});
  
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const timeSinceText = useTimeSince(post.created_at);

  // Gating detection - check both legacy gating and lock-based gating
  const hasLegacyGating = SettingsUtils.hasUPGating(post.settings);
  const hasLockGating = !!post.lock_id;
  const hasGating = hasLegacyGating || hasLockGating;
  const requirements = hasLegacyGating ? SettingsUtils.getUPGatingRequirements(post.settings) : null;
  
  // -------------------------------------------------------------------
  // 🆕 Per-post board context fetch (handles shared boards even when the
  // page itself wasn't filtered by that board)
  // -------------------------------------------------------------------
  const { data: boardContext } = useQuery<ApiBoard | null>({
    queryKey: ['postCardBoardContext', post.board_id],
    queryFn: async () => {
      if (!token || !user?.cid) return null;
      try {
        const response = await authFetchJson<{ board: ApiBoard | null }>(
          `/api/communities/${user.cid}/boards/${post.board_id}`,
          { token }
        );
        return response.board;
      } catch (err) {
        console.error('[PostCard] Failed to fetch per-post board context:', err);
        return null;
      }
    },
    enabled: !!token && !!user?.cid,
    staleTime: 5 * 60 * 1000, // cache 5 min
  });
  
  // For gated posts, redirect to detail view instead of inline comments
  const handleCommentClick = () => {
    if (hasGating) {
      // Navigate to post detail page for gated posts
      const detailUrl = buildInternalUrl(`/board/${post.board_id}/post/${post.id}`);
      router.push(detailUrl);
    } else {
      // Toggle inline comments for non-gated posts
      setShowComments(!showComments);
    }
  };

  // Handle when a new comment is posted (for inline comments)
  const handleCommentPosted = (newComment: ApiComment) => {
    console.log(`[PostCard] New comment posted: ${newComment.id}`);
    setHighlightedCommentId(newComment.id);
    setReplyingToCommentId(null); // Clear reply state
    
    // Clear highlight after animation
    setTimeout(() => {
      setHighlightedCommentId(null);
    }, 4000);
  };

  // Handle when user clicks reply on a comment in feed view
  const handleReplyToComment = (commentId: number) => {
    console.log(`[PostCard] Replying to comment: ${commentId}`);
    setReplyingToCommentId(commentId);
    // Scroll to comment form within this PostCard
    setTimeout(() => {
      const formElement = document.querySelector(`#postcard-${post.id} .new-comment-form`);
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };
  




  // Helper function to format access count for share button
  const formatAccessCount = (count: number): string => {
    if (count < 1000) return count.toString();
    if (count < 10000) return `${(count / 1000).toFixed(1)}k`;
    return `${Math.floor(count / 1000)}k`;
  };

  // Helper function to generate share button tooltip
  const getShareButtonTitle = (): string => {
    const accessCount = post.share_access_count || 0;
    const hasBeenShared = post.share_count > 0;
    
    if (isGeneratingShareUrl) return "Generating share URL...";
    if (!hasBeenShared) return "Share this post";
    if (accessCount === 0) return "Share this post (shared but not yet accessed)";
    if (accessCount === 1) return "Share this post (1 person accessed via shared link)";
    return `Share this post (${accessCount} people accessed via shared links)`;
  };



  // Get current page context to determine if elements should be clickable
  const currentBoardId = searchParams?.get('boardId');
  const isCurrentlyInThisBoard = currentBoardId === post.board_id?.toString();
  const isDetailView = showFullContent; // If showing full content, we're in detail view

  // Helper function to build URLs while preserving current parameters
  const buildInternalUrl = React.useCallback((path: string, additionalParams: Record<string, string> = {}) => {
    const params = new URLSearchParams();
    
    // Preserve existing params
    if (searchParams) {
      searchParams.forEach((value, key) => {
        params.set(key, value);
      });
    }
    
    // Add/override with new params
    Object.entries(additionalParams).forEach(([key, value]) => {
      params.set(key, value);
    });
    
    return `${path}?${params.toString()}`;
  }, [searchParams]);

  // Navigation handlers
  const handleBoardClick = React.useCallback(() => {
    if (!isCurrentlyInThisBoard && post.board_id) {
      const url = buildInternalUrl('/', { boardId: post.board_id.toString() });
      console.log(`[PostCard] Navigating to board ${post.board_id}: ${url}`);
      router.push(url);
    }
  }, [isCurrentlyInThisBoard, post.board_id, buildInternalUrl, router]);

  const handleTitleClick = React.useCallback(() => {
    if (!isDetailView && post.board_id) {
      const url = buildInternalUrl(`/board/${post.board_id}/post/${post.id}`);
      console.log(`[PostCard] Navigating to post detail ${post.id}: ${url}`);
      router.push(url);
    }
  }, [isDetailView, post.board_id, post.id, buildInternalUrl, router]);

  // 🏷️ Tag click handler with context-aware navigation
  const handleTagClick = React.useCallback((tag: string) => {
    console.log(`[PostCard] Tag clicked: "${tag}" in context:`, { isDetailView, currentBoardId, postBoardId: post.board_id });
    
    if (isDetailView) {
      // In post details view: Navigate to board page with tag active
      const url = buildInternalUrl('/', { 
        boardId: post.board_id.toString(),
        tags: tag 
      });
      console.log(`[PostCard] Navigating from post detail to board with tag: ${url}`);
      router.push(url);
    } else {
      // In board view: Scroll to top and activate tag
      const currentTags = searchParams?.get('tags');
      const tagList = currentTags ? currentTags.split(',').map(t => t.trim()) : [];
      
      // Add tag if not already present
      if (!tagList.includes(tag)) {
        tagList.push(tag);
        const url = buildInternalUrl('/', { tags: tagList.join(',') });
        console.log(`[PostCard] Adding tag filter and scrolling to top: ${url}`);
        router.push(url);
        
        // Scroll to top after a brief delay to allow navigation
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
      } else {
        // Tag already active, just scroll to top
        console.log(`[PostCard] Tag already active, scrolling to top`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [isDetailView, currentBoardId, post.board_id, buildInternalUrl, router, searchParams]);

  // Share handler with modal for desktop and Web Share API for mobile
  const handleShare = React.useCallback(async () => {
    if (!post.board_id) {
      console.error('[PostCard] Cannot share post: board_id missing');
      return;
    }

    // Prevent multiple concurrent share operations
    if (isGeneratingShareUrl) {
      console.log('[PostCard] Share URL generation already in progress');
      return;
    }

    setIsGeneratingShareUrl(true);

    let generatedShareUrl: string;
    
    try {
      console.log(`[PostCard] Generating share URL for post ${post.id}`);
      
      const effectiveBoard = boardInfo ?? boardContext;
      
      // 🔍 DEBUG LOGS ---------------------------------------------------
      console.log('[DEBUG-SHARE] effectiveBoard', effectiveBoard);
      console.log('[DEBUG-SHARE] communityShortId BEFORE fetch', user?.communityShortId);
      console.log('[DEBUG-SHARE] pluginId BEFORE fetch', user?.pluginId);
      
      // Detect shared board and get appropriate community context
      let communityShortId = user?.communityShortId;
      let pluginId = user?.pluginId;

      // For shared boards, use source community context instead of importing community
      if (effectiveBoard?.is_imported && effectiveBoard.source_community_id && token) {
        try {
          console.log(`[PostCard] Shared board detected, fetching source community context for ${effectiveBoard.source_community_id}`);
          const sourceCommunity = await authFetchJson<ApiCommunity>(
            `/api/communities/${effectiveBoard.source_community_id}`, 
            { token }
          );
          communityShortId = sourceCommunity.community_short_id;
          pluginId = sourceCommunity.plugin_id;
          console.log(`[PostCard] Using source community context: ${communityShortId} / ${pluginId}`);
          console.log('[DEBUG-SHARE] sourceCommunity response', sourceCommunity);
        } catch (error) {
          console.warn('[PostCard] Failed to fetch source community context, using importing community context:', error);
          // Fall back to importing community context
        }
      }
      
      console.log('[DEBUG-SHARE] buildExternalShareUrl params', {
        postId: post.id,
        boardId: post.board_id,
        communityShortId,
        pluginId
      });

      generatedShareUrl = await buildExternalShareUrl(
        post.id, 
        post.board_id, 
        communityShortId || undefined,
        pluginId || undefined,
        post.title,
        post.board_name
      );
      
      console.log(`[PostCard] Successfully created semantic URL: ${generatedShareUrl}`);
      console.log('[DEBUG-SHARE] communityShortId USED', communityShortId, 'pluginId USED', pluginId);
      
    } catch (shareUrlError) {
      console.warn('[PostCard] Failed to create semantic URL, using internal fallback:', shareUrlError);
      
      // Fallback to internal URL if semantic URL generation fails
      try {
        generatedShareUrl = window.location.origin + buildInternalUrl(`/board/${post.board_id}/post/${post.id}`);
        console.log(`[PostCard] Using internal fallback URL: ${generatedShareUrl}`);
      } catch (fallbackError) {
        console.error('[PostCard] Failed to generate any URL:', fallbackError);
        setIsGeneratingShareUrl(false);
        return;
      }
    }

    // Improved mobile detection for Web Share API
    const isWebShareSupported = typeof navigator.share === 'function';
    const isMobileDevice = 'ontouchstart' in window || 
                          navigator.maxTouchPoints > 0 ||
                          /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Try Web Share API if supported and on mobile device
    if (isWebShareSupported && isMobileDevice) {
      try {
        await navigator.share({
          title: post.title,
          text: `Check out this discussion: "${post.title}"`,
          url: generatedShareUrl,
        });
        console.log('[PostCard] Successfully shared using Web Share API');
        setIsGeneratingShareUrl(false);
        return;
        
      } catch (webShareError) {
        // Check if this is a user cancellation (not an error we should log)
        if (webShareError instanceof Error && webShareError.name === 'AbortError') {
          console.log('[PostCard] User cancelled Web Share');
          setIsGeneratingShareUrl(false);
          return;
        }
        
        console.warn('[PostCard] Web Share API failed (likely iframe restriction), falling back to modal:', webShareError);
        setIsWebShareFallback(true);
        // Continue to show modal with the semantic URL we successfully generated
      }
    }

    // Show modal with the URL (either desktop user or Web Share API failed)
    setShareUrl(generatedShareUrl);
    setShowShareModal(true);
    
    if (isWebShareSupported && isMobileDevice) {
      console.log('[PostCard] Fallback: showing modal with semantic URL due to Web Share failure');
    } else {
      setIsWebShareFallback(false); // Not a Web Share fallback for desktop users
      console.log('[PostCard] Showing share modal for desktop user');
    }
    
    setIsGeneratingShareUrl(false);
  }, [post.id, post.board_id, post.title, post.board_name, user?.communityShortId, user?.pluginId, buildInternalUrl, isGeneratingShareUrl, boardInfo?.is_imported, boardInfo?.source_community_id, boardContext?.is_imported, boardContext?.source_community_id, token]);

  // Update content expansion when showFullContent prop changes
  useEffect(() => {
    setIsPostContentExpanded(showFullContent);
  }, [showFullContent]);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error('No auth token');
      await authFetchJson(`/api/posts/${post.id}`, { method: 'DELETE', token });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  // Fetch available boards for moving
  const { data: boardsList } = useQuery<ApiBoard[]>({
    queryKey: ['boards', user?.cid],
    queryFn: async () => {
      if (!user?.cid || !token) throw new Error('Community context or token not available');
      return authFetchJson<ApiBoard[]>(`/api/communities/${user.cid}/boards`, { token });
    },
    enabled: !!user?.isAdmin && !!user?.cid && !!token,
  });

  // Filter boards based on user access permissions (though admins typically see all)
  const { data: accessibleBoardsList } = useQuery<ApiBoard[]>({
    queryKey: ['accessibleBoardsMove', boardsList, user?.userId, user?.roles],
    queryFn: async () => {
      if (!boardsList || !user || !user.cid) return [];
      
      // Admin override - admins can move posts to all boards
      if (user.isAdmin) {
        console.log('[PostCard] Admin user - showing all boards for move');
        return boardsList;
      }
      
      // Get user roles for permission checking (though this path likely won't execute for move)
      const userRoles = await getUserRoles(user.roles);
      
      // Filter boards based on access permissions
      const accessibleBoards = await Promise.all(
        boardsList.map(async (board) => {
          const hasAccess = await checkBoardAccess(board, userRoles);
          return hasAccess ? board : null;
        })
      );
      
      // Remove null entries (boards user can't access)
      const filteredBoards = accessibleBoards.filter((board): board is ApiBoard => board !== null);
      
      console.log(`[PostCard] Filtered boards for move: ${filteredBoards.length}/${boardsList.length} accessible`);
      return filteredBoards;
    },
    enabled: !!boardsList && !!user && !!user.cid,
  });

  const movePostMutation = useMutation({
    mutationFn: async (targetBoardId: string) => {
      if (!token) throw new Error('No auth token');
      await authFetchJson(`/api/posts/${post.id}/move`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ boardId: parseInt(targetBoardId) }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      setShowMoveDialog(false);
      setSelectedBoardId('');
    },
  });

  const handleMovePost = () => {
    if (!selectedBoardId) return;
    movePostMutation.mutate(selectedBoardId);
  };

  // Load UP profile names for follower requirements
  const fetchUPNames = React.useCallback(async (addresses: string[]) => {
    if (addresses.length === 0) return;
    
    console.log(`[PostCard] Fetching UP names for ${addresses.length} addresses`);
    
    const namePromises = addresses.map(async (address) => {
      try {
        const displayName = await getUPDisplayName(address);
        return { address, displayName };
      } catch (error) {
        console.error(`Failed to fetch UP name for ${address}:`, error);
        return { address, displayName: `${address.slice(0, 6)}...${address.slice(-4)}` };
      }
    });

    const nameResults = await Promise.all(namePromises);
    const newNames: Record<string, string> = {};
    
    nameResults.forEach(({ address, displayName }) => {
      newNames[address] = displayName;
    });

    setUpProfileNames(prev => ({ ...prev, ...newNames }));
  }, []);

  React.useEffect(() => {
    if (requirements?.followerRequirements && requirements.followerRequirements.length > 0) {
      const addressesToFetch = requirements.followerRequirements
        .filter(req => req.type !== 'minimum_followers') // Only fetch for address-based requirements
        .map(req => req.value)
        .filter(address => !upProfileNames[address]); // Don't refetch already loaded names

      fetchUPNames(addressesToFetch);
    }
  }, [requirements?.followerRequirements, fetchUPNames, upProfileNames]);

  const contentDisplayEditor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] }, // Match input form, allow H1-H4
        codeBlock: false, // Crucial: Let CodeBlockLowlight handle this
        // Other StarterKit defaults like blockquote, lists, bold, italic will be active
      }),
      TiptapLink.configure({
        openOnClick: false, // Set to false as we handle clicks via event delegation
        HTMLAttributes: {
          // target: '_blank', // Not strictly needed if openOnClick is false and we use cgInstance.navigate
          // rel: 'noopener noreferrer nofollow', // Good to keep for any links that might somehow bypass our handler
          class: 'break-words max-w-full overflow-wrap-anywhere word-break-break-all hyphens-auto', // Aggressive URL wrapping
          style: 'word-wrap: break-word; overflow-wrap: anywhere; word-break: break-word; max-width: 100%; white-space: normal;',
        },
      }),
      EnhancedImageExtension, // Enhanced image system with responsive layouts and modal
      CodeBlockLowlight.configure({ lowlight }), // For syntax highlighting
      Markdown.configure({ html: false, tightLists: true }), // <-- Enable markdown parsing for display
      // 🏷️ User mentions extension for rendering mentions in content
      MentionExtension,
    ],
    content: '', // Initial content, will be updated by useEffect
    editable: false,
    immediatelyRender: false, // Explicitly set for SSR compatibility
    editorProps: {
      attributes: {
        // REMOVED prose classes from here: class: 'prose dark:prose-invert prose-sm max-w-none',
        // Prose styling will be applied by the wrapping <article> element
      },
    },
  });

  useEffect(() => {
    if (contentDisplayEditor && post.content) {
      // Use backwards-compatible content loading
      MarkdownUtils.loadContent(contentDisplayEditor, post.content);
    }
  }, [contentDisplayEditor, post.content]);

  // Effect for handling link clicks in rendered Tiptap content
  useEffect(() => {
    if (!contentDisplayEditor) return;

    const editorElement = contentDisplayEditor.view.dom;
    if (!editorElement) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const anchor = target.closest('a');

      if (anchor && anchor.href) {
        const href = anchor.href;
        if (href.startsWith('/')) {
          // Internal link - use router navigation
          event.preventDefault();
          console.log(`[PostCard] Intercepted internal link click: ${href}, navigating with router.`);
          const urlWithParams = buildInternalUrl(href);
          router.push(urlWithParams);
        } else if (href.startsWith('http://') || href.startsWith('https://')) {
          // External link - let browser handle it naturally
          console.log(`[PostCard] External link click: ${href}, opening in browser.`);
          // Don't prevent default - let it open normally
        }
      }
    };

    editorElement.addEventListener('click', handleClick);

    return () => {
      editorElement.removeEventListener('click', handleClick);
    };
  }, [contentDisplayEditor, router, post.content, buildInternalUrl]); // Rerun if editor or router changes, or content changes (rebinding needed)

  return (
    <Card 
      id={`postcard-${post.id}`}
      className={cn(
        "w-full max-w-full overflow-x-hidden shadow-sm hover:shadow-md transition-shadow duration-200 group",
        hasGating && "border-l-4 border-l-blue-500"
      )} 
      style={{ wordWrap: 'break-word', overflowWrap: 'anywhere' }}
    >
      <div className="flex">
        {/* Vote Section */}
        <div className="flex flex-col items-center justify-start p-2 sm:p-3 md:p-4 bg-slate-50 dark:bg-slate-800 border-r border-border">
          <VoteButton 
            postId={post.id} 
            initialUpvoteCount={post.upvote_count} 
            initialUserHasUpvoted={post.user_has_upvoted}
            size="default"
          />
        </div>

        {/* Main Content Section */}
        <div className="flex-grow relative min-w-0 overflow-hidden">
          <CardHeader className="pb-2 px-3 sm:px-6">
            <div className="flex items-center text-xs text-muted-foreground mb-2 flex-wrap gap-1 w-full max-w-full overflow-hidden">
              <div className="flex items-center min-w-0">
                              <UserProfilePopover
                userId={post.author_user_id}
                username={authorDisplayName}
                open={isAuthorPopoverOpen}
                onOpenChange={setIsAuthorPopoverOpen}
              >
                <div className="flex items-center min-w-0 cursor-pointer group/author">
                  <Avatar className="h-5 w-5 sm:h-6 sm:w-6 mr-2 flex-shrink-0 group-hover/author:ring-2 group-hover/author:ring-primary group-hover/author:ring-opacity-30 transition-all">
                    <AvatarImage src={post.author_profile_picture_url || undefined} alt={`${authorDisplayName}'s avatar`} />
                    <AvatarFallback className="text-xs">{avatarFallback}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-foreground truncate min-w-0 group-hover/author:text-primary transition-colors">
                    {authorDisplayName}
                  </span>
                </div>
              </UserProfilePopover>
              </div>
              {showBoardContext && (
                <div className="flex items-center min-w-0">
                  <span className="mx-1 flex-shrink-0">in</span>
                  {!isCurrentlyInThisBoard ? (
                    <button 
                      onClick={handleBoardClick}
                      className="font-medium text-primary hover:text-primary/80 truncate cursor-pointer underline-offset-2 hover:underline transition-colors min-w-0"
                    >
                      {post.board_name}
                    </button>
                  ) : (
                    <span className="font-medium text-primary truncate min-w-0">{post.board_name}</span>
                  )}
                </div>
              )}
              <div className="flex items-center min-w-0">
                <span className="mx-1 flex-shrink-0">•</span>
                <Clock size={12} className="mr-1 flex-shrink-0" /> 
                <span className="truncate min-w-0">{timeSinceText}</span>
              </div>
              
              {/* Simple gated indicator */}
              {hasGating && (
                <>
                  <span className="mx-1 flex-shrink-0">•</span>
                  <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center">
                    <Shield size={10} className="mr-1" />
                    Gated
                  </span>
                </>
              )}
            </div>
            {!isDetailView ? (
              <CardTitle 
                className="text-base sm:text-lg md:text-xl leading-tight pr-8 cursor-pointer hover:text-primary transition-colors break-words"
                onClick={handleTitleClick}
              >
                {post.title}
              </CardTitle>
            ) : (
              <CardTitle className="text-base sm:text-lg md:text-xl leading-tight pr-8 break-words">{post.title}</CardTitle>
            )}
            {post.content && contentDisplayEditor && (
              <div className="mt-1"> {/* Main container for content block + button */}
                <div // Wrapper for text content and gradient
                  className={cn(
                    "relative", 
                    !isPostContentExpanded && "max-h-32 overflow-hidden"
                  )}
                >
                  <div // Inner Content area for prose styling and bottom padding for gradient
                    className={cn(
                      "prose dark:prose-invert prose-sm sm:prose-base max-w-none focus:outline-none break-words overflow-hidden",
                      // Aggressive link handling for mobile
                      "prose-a:break-words prose-a:max-w-full prose-a:overflow-wrap-anywhere prose-a:word-break-break-all prose-a:hyphens-auto",
                      // Additional word wrapping for all elements
                      "prose-p:break-words prose-p:overflow-wrap-anywhere prose-code:break-words prose-code:overflow-wrap-anywhere",
                      !isPostContentExpanded && "pb-8" // Increased padding for taller gradient + spacing
                    )}
                    style={{ wordWrap: 'break-word', overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                  >
                    <EditorContent editor={contentDisplayEditor} />
                  </div>
                  {!isPostContentExpanded && (
                    <div // Gradient div, taller now
                      className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card to-transparent pointer-events-none"
                    />
                  )}
                </div>

                {/* "Show more..." / "Show less..." buttons are now siblings, outside the overflow-hidden div */}
                {!isPostContentExpanded && !showFullContent && (
                  <div className="mt-1 text-left"> {/* Changed to text-left, removed text-center */}
                     <Button 
                        variant="link" // Reverted to link for text+icon style
                        size="sm"      // Standard small size
                        onClick={() => setIsPostContentExpanded(true)} 
                        className="text-primary hover:text-primary/80 px-2 py-1 h-auto font-medium"
                        aria-label="Show more content"
                     >
                        <ChevronDown size={18} className="mr-1.5" /> Show more
                     </Button>
                  </div>
                )}

                {isPostContentExpanded && !showFullContent && (
                  <div className="mt-1 text-left">
                     <Button 
                        variant="link"
                        size="sm"
                        onClick={() => setIsPostContentExpanded(false)} 
                        className="text-primary hover:text-primary/80 px-2 py-1 h-auto font-medium"
                        aria-label="Show less content"
                     >
                        <ChevronUp size={18} className="mr-1.5" /> Show less
                     </Button>
                  </div>
                )}
              </div>
            )}
            
            {/* Simple gating summary */}
            {hasGating && (
              <div className="mt-3">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-700">
                    <Shield size={10} className="mr-1" />
                    Gated Post
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {hasLockGating 
                      ? "Lock requirements must be met to comment"
                      : "Universal Profile required to comment"
                    }
                  </span>
                </div>
              </div>
            )}
          </CardHeader>

          {(post.tags && post.tags.length > 0) && (
            <CardContent className="py-2 px-3 sm:px-6">
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {post.tags.map((tag, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTagClick(tag)}
                    className="h-auto px-2 py-1 text-xs font-normal bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:text-foreground transition-colors rounded-full border border-transparent hover:border-primary/20"
                    title={`Filter by "${tag}" tag`}
                  >
                    #{tag}
                  </Button>
                ))}
              </div>
            </CardContent>
          )}

          <CardFooter className="flex justify-between items-center text-sm text-muted-foreground pt-2 pb-3 md:pb-4 px-3 sm:px-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <Button 
                variant="ghost" 
                size="sm" 
                className="p-1 h-auto text-xs sm:text-sm" 
                onClick={handleCommentClick} 
                aria-expanded={hasGating ? undefined : showComments}
                title={hasGating ? "View comments (gated post)" : "Toggle comments"}
              >
                <MessageSquare size={14} className="mr-1 sm:mr-1.5" /> 
                <span className="hidden xs:inline">{post.comment_count}</span>
                <span className="xs:hidden">{post.comment_count}</span>
                {hasGating && <span className="ml-1 text-blue-500">→</span>}
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="p-1 h-auto text-xs sm:text-sm" 
                onClick={handleShare}
                disabled={isGeneratingShareUrl}
                title={getShareButtonTitle()}
              >
                {isGeneratingShareUrl ? (
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-current" />
                ) : (
                  <>
                    <Share2 size={14} className="mr-1 sm:mr-1.5" />
                    <span>
                      Share{post.share_access_count > 0 && ` (${formatAccessCount(post.share_access_count)})`}
                    </span>
                  </>
                )}
              </Button>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="p-1 h-auto">
                <Bookmark size={14} />
              </Button>
              {user?.isAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="p-1 h-7 w-7 sm:h-8 sm:w-8">
                      <MoreVertical size={14} />
                      <span className="sr-only">Post Options</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem 
                      onClick={() => setShowMoveDialog(true)}
                      disabled={movePostMutation.isPending}
                    >
                      <Move size={14} className="mr-2" /> Move to Board
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => deleteMutation.mutate()}
                      disabled={deleteMutation.isPending}
                      className="text-destructive focus:text-destructive focus:bg-destructive/10"
                    >
                      <Trash size={14} className="mr-2" /> Delete Post
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </CardFooter>
          
          {/* ReactionBar */}
          <div className="px-3 sm:px-6 pb-3 opacity-50 group-hover:opacity-100 transition-opacity duration-300">
            <ReactionBar 
              postId={post.id}
            />
          </div>
        </div>
      </div>
      
      {/* Move Post Dialog */}
      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent className="sm:max-w-[425px] mx-4 max-w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle className="text-lg">Move Post to Another Board</DialogTitle>
            <DialogDescription className="text-sm">
              Select which board you want to move &quot;{post.title}&quot; to.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="board-select">Select Board</Label>
              {accessibleBoardsList && accessibleBoardsList.length > 0 ? (
                <Select value={selectedBoardId} onValueChange={setSelectedBoardId}>
                  <SelectTrigger id="board-select">
                    <SelectValue placeholder="Choose a board" />
                  </SelectTrigger>
                  <SelectContent>
                    {accessibleBoardsList.map((board) => (
                      <SelectItem key={board.id} value={board.id.toString()}>
                        <div>
                          <div className="font-medium">{board.name}</div>
                          {board.description && (
                            <div className="text-xs text-muted-foreground">{board.description}</div>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-3 border rounded-md bg-muted/50">
                  <p className="text-sm text-muted-foreground">Loading boards...</p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowMoveDialog(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button 
              onClick={handleMovePost}
              disabled={!selectedBoardId || movePostMutation.isPending}
              className="w-full sm:w-auto"
            >
              {movePostMutation.isPending ? (
                <>
                  <Move className="mr-2 h-4 w-4 animate-spin" />
                  Moving...
                </>
              ) : (
                <>
                  <Move className="mr-2 h-4 w-4" />
                  Move Post
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comments Section - Conditionally Rendered (only for non-gated posts) */}
      {showComments && !hasGating && (
        <div className="border-t border-border p-3 sm:p-4">
          <h4 className="text-sm sm:text-md font-semibold mb-3">Comments</h4>
          <div className="new-comment-form">
            <NewCommentForm 
              postId={post.id} 
              post={post} 
              parentCommentId={replyingToCommentId}
              onCommentPosted={handleCommentPosted} 
            />
            {replyingToCommentId && (
              <div className="mt-2 text-sm text-muted-foreground flex items-center justify-between">
                <span>Replying to comment #{replyingToCommentId}</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setReplyingToCommentId(null)}
                  className="text-xs"
                >
                  Cancel Reply
                </Button>
              </div>
            )}
          </div>
          <div className="mt-4">
            <CommentList 
              postId={post.id} 
              highlightCommentId={highlightedCommentId}
              onCommentHighlighted={() => setHighlightedCommentId(null)}
              onReply={handleReplyToComment}
            />
          </div>
        </div>
      )}

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => {
          setShowShareModal(false);
          setIsWebShareFallback(false);
        }}
        shareUrl={shareUrl}
        postTitle={post.title}
        isGenerating={isGeneratingShareUrl}
        isWebShareFallback={isWebShareFallback}
      />
    </Card>
  );
}; 
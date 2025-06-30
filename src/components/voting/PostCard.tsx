'use client';

import React, { useState, useEffect } from 'react';
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
import TiptapImage from '@tiptap/extension-image'; // Aliased Tiptap Image to TiptapImage
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
      TiptapImage, // Use aliased TiptapImage for rendering images
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
        "post-card-container",
        hasGating && "border-l-4 border-l-blue-500"
      )} 
    >
      {/* Vote Section */}
      <div className="vote-section">
        <VoteButton 
          postId={post.id} 
          initialUpvoteCount={post.upvote_count} 
          initialUserHasUpvoted={post.user_has_upvoted}
          size="default"
        />
      </div>

      {/* Main Content Section */}
      <div className="content-section">
        <CardHeader className="content-header">
          <div className="meta-info">
            <div className="author-info">
              <UserProfilePopover
                userId={post.author_user_id}
                username={authorDisplayName}
                open={isAuthorPopoverOpen}
                onOpenChange={setIsAuthorPopoverOpen}
              >
                <div className="author-display">
                  <Avatar className="author-avatar">
                    <AvatarImage src={post.author_profile_picture_url || undefined} alt={`${authorDisplayName}'s avatar`} />
                    <AvatarFallback className="avatar-fallback">{avatarFallback}</AvatarFallback>
                  </Avatar>
                  <span className="author-name">
                    {authorDisplayName}
                  </span>
                </div>
              </UserProfilePopover>
            </div>
            {showBoardContext && (
              <div className="board-context">
                <span className="context-separator">in</span>
                {!isCurrentlyInThisBoard ? (
                  <button 
                    onClick={handleBoardClick}
                    className="board-link"
                  >
                    {post.board_name}
                  </button>
                ) : (
                  <span className="board-name">{post.board_name}</span>
                )}
              </div>
            )}
            <div className="time-info">
              <span className="time-separator">•</span>
              <Clock size={12} className="time-icon" /> 
              <span className="time-text">{timeSinceText}</span>
            </div>
            
            {/* Simple gated indicator */}
            {hasGating && (
              <>
                <span className="gated-separator">•</span>
                <span className="gated-indicator">
                  <Shield size={10} className="gated-icon" />
                  Gated
                </span>
              </>
            )}
          </div>
          {!isDetailView ? (
            <CardTitle 
              className="post-title clickable"
              onClick={handleTitleClick}
            >
              {post.title}
            </CardTitle>
          ) : (
            <CardTitle className="post-title">{post.title}</CardTitle>
          )}
          
          {post.content && contentDisplayEditor && (
            <div className="content-container">
              <div 
                className={cn(
                  "content-wrapper", 
                  !isPostContentExpanded && "content-collapsed"
                )}
              >
                <div 
                  className={cn(
                    "content-inner",
                    !isPostContentExpanded && "content-with-gradient"
                  )}
                >
                  <EditorContent editor={contentDisplayEditor} />
                </div>
                {!isPostContentExpanded && (
                  <div className="content-gradient" />
                )}
              </div>

              {!isPostContentExpanded && !showFullContent && (
                <div className="expand-control">
                   <Button 
                      variant="link"
                      size="sm"
                      onClick={() => setIsPostContentExpanded(true)} 
                      className="expand-button"
                      aria-label="Show more content"
                   >
                      <ChevronDown size={18} className="mr-1.5" /> Show more
                   </Button>
                </div>
              )}

              {isPostContentExpanded && !showFullContent && (
                <div className="collapse-control">
                   <Button 
                      variant="link"
                      size="sm"
                      onClick={() => setIsPostContentExpanded(false)} 
                      className="collapse-button"
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
            <div className="gating-summary">
              <div className="gating-content">
                <Badge variant="outline" className="gating-badge">
                  <Shield size={10} className="mr-1" />
                  Gated Post
                </Badge>
                <span className="gating-text">
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
          <CardContent className="tags-section">
            <div className="tags-container">
              {post.tags.map((tag, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleTagClick(tag)}
                  className="tag-button"
                  title={`Filter by "${tag}" tag`}
                >
                  #{tag}
                </Button>
              ))}
            </div>
          </CardContent>
        )}

        <CardFooter className="footer-section">
          <div className="footer-actions">
            <Button 
              variant="ghost" 
              size="sm" 
              className="action-button" 
              onClick={handleCommentClick} 
              aria-expanded={hasGating ? undefined : showComments}
              title={hasGating ? "View comments (gated post)" : "Toggle comments"}
            >
              <MessageSquare size={14} className="action-icon" /> 
              <span className="action-text">{post.comment_count}</span>
              {hasGating && <span className="gated-arrow">→</span>}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="action-button" 
              onClick={handleShare}
              disabled={isGeneratingShareUrl}
              title={getShareButtonTitle()}
            >
              {isGeneratingShareUrl ? (
                <div className="loading-spinner-small" />
              ) : (
                <>
                  <Share2 size={14} className="action-icon" />
                  <span className="action-text">
                    Share{post.share_access_count > 0 && ` (${formatAccessCount(post.share_access_count)})`}
                  </span>
                </>
              )}
            </Button>
          </div>
          <div className="footer-controls">
            <Button variant="ghost" size="sm" className="control-button">
              <Bookmark size={14} />
            </Button>
            {user?.isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="admin-button">
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
        <div className="reactions-section">
          <ReactionBar 
            postId={post.id}
          />
        </div>
      </div>
      
      {/* Move Post Dialog */}
      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent className="move-dialog">
          <DialogHeader>
            <DialogTitle className="move-title">Move Post to Another Board</DialogTitle>
            <DialogDescription className="move-description">
              Select which board you want to move &quot;{post.title}&quot; to.
            </DialogDescription>
          </DialogHeader>
          <div className="move-content">
            <div className="board-selection">
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
                          <div className="board-option-name">{board.name}</div>
                          {board.description && (
                            <div className="board-option-desc">{board.description}</div>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="loading-boards">
                  <p className="loading-text">Loading boards...</p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="move-footer">
            <Button variant="outline" onClick={() => setShowMoveDialog(false)} className="cancel-button">
              Cancel
            </Button>
            <Button 
              onClick={handleMovePost}
              disabled={!selectedBoardId || movePostMutation.isPending}
              className="move-button"
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
        <div className="comments-section">
          <h4 className="comments-title">Comments</h4>
          <div className="new-comment-form">
            <NewCommentForm 
              postId={post.id} 
              post={post} 
              parentCommentId={replyingToCommentId}
              onCommentPosted={handleCommentPosted} 
            />
            {replyingToCommentId && (
              <div className="reply-status">
                <span>Replying to comment #{replyingToCommentId}</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setReplyingToCommentId(null)}
                  className="cancel-reply"
                >
                  Cancel Reply
                </Button>
              </div>
            )}
          </div>
          <div className="comments-list">
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
      
      <style jsx>{`
        /* Mobile-First CSS Grid Layout */
        .post-card-container {
          container-type: inline-size;
          width: 100%;
          max-width: 100%;
          overflow: hidden;
          display: grid;
          grid-template-columns: auto 1fr;
          grid-template-areas: 
            "vote content";
          box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
          transition: box-shadow 0.2s ease;
          word-wrap: break-word;
          overflow-wrap: anywhere;
        }
        
        .post-card-container:hover {
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
        }
        
        /* Vote Section */
        .vote-section {
          grid-area: vote;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          padding: 0.75rem;
          background: hsl(var(--muted) / 0.3);
          border-right: 1px solid hsl(var(--border));
          min-width: fit-content;
        }
        
        /* Content Section */
        .content-section {
          grid-area: content;
          display: grid;
          grid-template-rows: auto auto auto auto auto;
          grid-template-areas:
            "header"
            "tags"
            "footer"
            "reactions"
            "comments";
          min-width: 0;
          overflow: hidden;
        }
        
        .content-header {
          grid-area: header;
          padding: 0.75rem 1rem 0.5rem;
        }
        
        /* Meta Information */
        .meta-info {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          color: hsl(var(--muted-foreground));
          margin-bottom: 0.5rem;
          min-width: 0;
          overflow: hidden;
        }
        
        .author-info {
          display: flex;
          align-items: center;
          min-width: 0;
        }
        
        .author-display {
          display: flex;
          align-items: center;
          min-width: 0;
          cursor: pointer;
          transition: color 0.2s ease;
        }
        
        .author-display:hover {
          color: hsl(var(--primary));
        }
        
        .author-avatar {
          height: 1.25rem;
          width: 1.25rem;
          margin-right: 0.5rem;
          flex-shrink: 0;
          transition: all 0.2s ease;
        }
        
        .author-display:hover .author-avatar {
          ring: 2px solid hsl(var(--primary) / 0.3);
        }
        
        .avatar-fallback {
          font-size: 0.75rem;
        }
        
        .author-name {
          font-weight: 500;
          color: hsl(var(--foreground));
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          min-width: 0;
          transition: color 0.2s ease;
        }
        
        .author-display:hover .author-name {
          color: hsl(var(--primary));
        }
        
        .board-context {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          min-width: 0;
        }
        
        .context-separator {
          margin: 0 0.25rem;
          flex-shrink: 0;
        }
        
        .board-link {
          font-weight: 500;
          color: hsl(var(--primary));
          cursor: pointer;
          text-decoration: underline;
          text-decoration-color: transparent;
          text-underline-offset: 2px;
          transition: all 0.2s ease;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          min-width: 0;
          background: none;
          border: none;
          padding: 0;
        }
        
        .board-link:hover {
          color: hsl(var(--primary) / 0.8);
          text-decoration-color: currentColor;
        }
        
        .board-name {
          font-weight: 500;
          color: hsl(var(--primary));
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          min-width: 0;
        }
        
        .time-info {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          min-width: 0;
        }
        
        .time-separator {
          margin: 0 0.25rem;
          flex-shrink: 0;
        }
        
        .time-icon {
          flex-shrink: 0;
        }
        
        .time-text {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          min-width: 0;
        }
        
        .gated-separator {
          margin: 0 0.25rem;
          flex-shrink: 0;
        }
        
        .gated-indicator {
          display: flex;
          align-items: center;
          font-size: 0.75rem;
          color: hsl(var(--primary));
          flex-shrink: 0;
        }
        
        .gated-icon {
          margin-right: 0.25rem;
        }
        
        /* Post Title */
        .post-title {
          font-size: 1rem;
          line-height: 1.4;
          font-weight: 600;
          padding-right: 2rem;
          word-wrap: break-word;
          overflow-wrap: anywhere;
          margin-bottom: 0;
        }
        
        .post-title.clickable {
          cursor: pointer;
          transition: color 0.2s ease;
        }
        
        .post-title.clickable:hover {
          color: hsl(var(--primary));
        }
        
        /* Content Container */
        .content-container {
          margin-top: 0.25rem;
        }
        
        .content-wrapper {
          position: relative;
        }
        
        .content-collapsed {
          max-height: 8rem;
          overflow: hidden;
        }
        
        .content-inner {
          word-wrap: break-word;
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        
        .content-with-gradient {
          padding-bottom: 2rem;
        }
        
        .content-gradient {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 4rem;
          background: linear-gradient(to top, hsl(var(--card)), transparent);
          pointer-events: none;
        }
        
        .expand-control,
        .collapse-control {
          margin-top: 0.25rem;
          text-align: left;
        }
        
        .expand-button,
        .collapse-button {
          color: hsl(var(--primary));
          font-weight: 500;
          padding: 0.25rem 0.5rem;
          height: auto;
          transition: color 0.2s ease;
        }
        
        .expand-button:hover,
        .collapse-button:hover {
          color: hsl(var(--primary) / 0.8);
        }
        
        /* Gating Summary */
        .gating-summary {
          margin-top: 0.75rem;
        }
        
        .gating-content {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        
        .gating-badge {
          font-size: 0.75rem;
          background: hsl(var(--primary) / 0.1);
          border-color: hsl(var(--primary) / 0.2);
          color: hsl(var(--primary));
        }
        
        .gating-text {
          font-size: 0.75rem;
          color: hsl(var(--muted-foreground));
        }
        
        /* Tags Section */
        .tags-section {
          grid-area: tags;
          padding: 0.5rem 1rem;
        }
        
        .tags-container {
          display: flex;
          flex-wrap: wrap;
          gap: 0.375rem;
        }
        
        .tag-button {
          height: auto;
          padding: 0.25rem 0.5rem;
          font-size: 0.75rem;
          font-weight: 400;
          background: hsl(var(--secondary));
          color: hsl(var(--secondary-foreground));
          border-radius: 9999px;
          border: 1px solid transparent;
          transition: all 0.2s ease;
        }
        
        .tag-button:hover {
          background: hsl(var(--secondary) / 0.8);
          color: hsl(var(--foreground));
          border-color: hsl(var(--primary) / 0.2);
        }
        
        /* Footer Section */
        .footer-section {
          grid-area: footer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          color: hsl(var(--muted-foreground));
        }
        
        .footer-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .action-button {
          padding: 0.25rem;
          height: auto;
          font-size: 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        
        .action-icon {
          flex-shrink: 0;
        }
        
        .action-text {
          white-space: nowrap;
        }
        
        .gated-arrow {
          margin-left: 0.25rem;
          color: hsl(var(--primary));
        }
        
        .loading-spinner-small {
          width: 0.875rem;
          height: 0.875rem;
          border: 2px solid currentColor;
          border-top: 2px solid transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        .footer-controls {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        
        .control-button {
          padding: 0.25rem;
          height: 1.75rem;
          width: 1.75rem;
        }
        
        .admin-button {
          padding: 0.25rem;
          height: 1.75rem;
          width: 1.75rem;
        }
        
        /* Reactions Section */
        .reactions-section {
          grid-area: reactions;
          padding: 0 1rem 0.75rem;
          opacity: 0.5;
          transition: opacity 0.3s ease;
        }
        
        .post-card-container:hover .reactions-section {
          opacity: 1;
        }
        
        /* Comments Section */
        .comments-section {
          grid-area: comments;
          border-top: 1px solid hsl(var(--border));
          padding: 0.75rem 1rem;
        }
        
        .comments-title {
          font-size: 0.875rem;
          font-weight: 600;
          margin-bottom: 0.75rem;
        }
        
        .new-comment-form {
          margin-bottom: 1rem;
        }
        
        .reply-status {
          margin-top: 0.5rem;
          font-size: 0.875rem;
          color: hsl(var(--muted-foreground));
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        
        .cancel-reply {
          font-size: 0.75rem;
        }
        
        .comments-list {
          margin-top: 1rem;
        }
        
        /* Move Dialog */
        .move-dialog {
          max-width: min(90vw, 26.5rem);
          margin: 0 1rem;
        }
        
        .move-title {
          font-size: 1.125rem;
        }
        
        .move-description {
          font-size: 0.875rem;
        }
        
        .move-content {
          display: grid;
          gap: 1rem;
          padding: 1rem 0;
        }
        
        .board-selection {
          display: grid;
          gap: 0.5rem;
        }
        
        .board-option-name {
          font-weight: 500;
        }
        
        .board-option-desc {
          font-size: 0.75rem;
          color: hsl(var(--muted-foreground));
        }
        
        .loading-boards {
          padding: 0.75rem;
          border: 1px solid hsl(var(--border));
          border-radius: 0.375rem;
          background: hsl(var(--muted) / 0.5);
        }
        
        .loading-text {
          font-size: 0.875rem;
          color: hsl(var(--muted-foreground));
        }
        
        .move-footer {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .cancel-button,
        .move-button {
          width: 100%;
        }
        
        /* Container Queries for Progressive Enhancement */
        @container (min-width: 480px) {
          .vote-section {
            padding: 1rem;
          }
          
          .content-header {
            padding: 1rem 1.5rem 0.75rem;
          }
          
          .tags-section {
            padding: 0.75rem 1.5rem;
          }
          
          .footer-section {
            padding: 0.75rem 1.5rem;
          }
          
          .reactions-section {
            padding: 0 1.5rem 1rem;
          }
          
          .comments-section {
            padding: 1rem 1.5rem;
          }
          
          .author-avatar {
            height: 1.5rem;
            width: 1.5rem;
          }
          
          .meta-info {
            font-size: 0.875rem;
          }
          
          .post-title {
            font-size: 1.125rem;
          }
          
          .action-button {
            font-size: 0.875rem;
          }
          
          .move-footer {
            flex-direction: row;
            justify-content: flex-end;
          }
          
          .cancel-button,
          .move-button {
            width: auto;
          }
        }
        
        @container (min-width: 768px) {
          .vote-section {
            padding: 1.25rem;
          }
          
          .content-header {
            padding: 1.25rem 2rem 1rem;
          }
          
          .tags-section {
            padding: 1rem 2rem;
          }
          
          .footer-section {
            padding: 1rem 2rem;
          }
          
          .reactions-section {
            padding: 0 2rem 1.25rem;
          }
          
          .comments-section {
            padding: 1.25rem 2rem;
          }
          
          .post-title {
            font-size: 1.25rem;
          }
          
          .tags-container {
            gap: 0.5rem;
          }
          
          .footer-actions {
            gap: 1rem;
          }
        }
        
        /* Animation Keyframes */
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        
        /* Responsive Typography Scale */
        @container (min-width: 320px) {
          .post-card-container {
            font-size: 0.875rem;
            line-height: 1.5;
          }
        }
        
        @container (min-width: 640px) {
          .post-card-container {
            font-size: 0.9375rem;
            line-height: 1.6;
          }
        }
        
        @container (min-width: 768px) {
          .post-card-container {
            font-size: 1rem;
            line-height: 1.6;
          }
        }
        
        /* Prevent Horizontal Scroll */
        .post-card-container,
        .content-section,
        .post-card-container * {
          box-sizing: border-box;
          word-wrap: break-word;
          overflow-wrap: anywhere;
        }
        
        .content-section {
          overflow-x: hidden;
          width: 100%;
          min-width: 0;
        }
      `}</style>
    </Card>
  );
}; 
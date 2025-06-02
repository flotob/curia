'use client';

import React, { useState, useEffect } from 'react';
// import Link from 'next/link';
// import NextImage from 'next/image';
import { MessageSquare, Share2, Bookmark, Clock, Trash, MoreVertical, ChevronDown, ChevronUp, Move } from 'lucide-react';
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
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { authFetchJson } from '@/utils/authFetch';
import { cn } from '@/lib/utils';
import { CommentList } from './CommentList'; // Import CommentList
import { NewCommentForm } from './NewCommentForm'; // Import NewCommentForm
import { checkBoardAccess, getUserRoles } from '@/lib/roleService';
import { useTimeSince } from '@/utils/timeUtils';
import { useRouter, useSearchParams } from 'next/navigation';

// Tiptap imports for rendering post content
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import TiptapLink from '@tiptap/extension-link'; // For rendering links
import TiptapImage from '@tiptap/extension-image'; // Aliased Tiptap Image to TiptapImage
// highlight.js CSS is imported globally in layout.tsx

const lowlight = createLowlight(common);

interface PostCardProps {
  post: ApiPost;
  showBoardContext?: boolean; // Whether to show "in BoardName" context
  showFullContent?: boolean;  // Whether to show full content (for detail pages)
}



export const PostCard: React.FC<PostCardProps> = ({ post, showBoardContext = false, showFullContent = false }) => {
  const authorDisplayName = post.author_name || 'Unknown Author';
  // Create a fallback for avatar from the first letter of the author's name
  const avatarFallback = authorDisplayName.substring(0, 2).toUpperCase();
  const [showComments, setShowComments] = useState(false);
  const [isPostContentExpanded, setIsPostContentExpanded] = useState(showFullContent);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [selectedBoardId, setSelectedBoardId] = useState<string>('');
  
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const timeSinceText = useTimeSince(post.created_at);

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
          class: 'break-words max-w-full overflow-wrap-anywhere', // Force URLs to wrap properly
        },
      }),
      TiptapImage, // Use aliased TiptapImage for rendering images
      CodeBlockLowlight.configure({ lowlight }), // For syntax highlighting
      // Markdown.configure({ html: false, tightLists: true }), // Generally not needed for rendering from JSON
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
      try {
        const jsonContent = JSON.parse(post.content);
        contentDisplayEditor.commands.setContent(jsonContent);
      } catch (e) {
        console.warn('Post content is not valid JSON, rendering as plain text:', post.content, e);
        contentDisplayEditor.commands.setContent(post.content); 
      }
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
    <Card className="w-full max-w-full overflow-x-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
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
        <div className="flex-grow relative min-w-0">
          <CardHeader className="pb-2 px-3 sm:px-6">
            <div className="flex items-center text-xs text-muted-foreground mb-2 flex-wrap gap-1 w-full max-w-full overflow-hidden">
              <div className="flex items-center min-w-0">
                <Avatar className="h-5 w-5 sm:h-6 sm:w-6 mr-2 flex-shrink-0">
                  <AvatarImage src={post.author_profile_picture_url || undefined} alt={`${authorDisplayName}'s avatar`} />
                  <AvatarFallback className="text-xs">{avatarFallback}</AvatarFallback>
                </Avatar>
                <span className="font-medium text-foreground truncate min-w-0">{authorDisplayName}</span>
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
                      // Enhanced link handling for mobile
                      "prose-a:break-words prose-a:max-w-full prose-a:overflow-wrap-anywhere",
                      !isPostContentExpanded && "pb-8" // Increased padding for taller gradient + spacing
                    )}
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
          </CardHeader>

          {(post.tags && post.tags.length > 0) && (
            <CardContent className="py-2 px-3 sm:px-6">
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {post.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">{tag}</Badge>
                ))}
              </div>
            </CardContent>
          )}

          <CardFooter className="flex justify-between items-center text-sm text-muted-foreground pt-2 pb-3 md:pb-4 px-3 sm:px-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <Button variant="ghost" size="sm" className="p-1 h-auto text-xs sm:text-sm" onClick={() => setShowComments(!showComments)} aria-expanded={showComments}>
                <MessageSquare size={14} className="mr-1 sm:mr-1.5" /> 
                <span className="hidden xs:inline">{post.comment_count}</span>
                <span className="xs:hidden">{post.comment_count}</span>
              </Button>
              <Button variant="ghost" size="sm" className="p-1 h-auto">
                <Share2 size={14} /> 
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

      {/* Comments Section - Conditionally Rendered */}
      {showComments && (
        <div className="border-t border-border p-3 sm:p-4">
          <h4 className="text-sm sm:text-md font-semibold mb-3">Comments</h4>
          <NewCommentForm postId={post.id} />
          <div className="mt-4">
            <CommentList postId={post.id} />
          </div>
        </div>
      )}
    </Card>
  );
}; 
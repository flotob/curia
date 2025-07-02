'use client';

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ApiComment } from '@/app/api/posts/[postId]/comments/route'; // Import the ApiComment interface
import { Clock, Trash, MoreVertical, Reply } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authFetchJson } from '@/utils/authFetch';
import { useTimeSince } from '@/utils/timeUtils';
import { useRouter, useSearchParams } from 'next/navigation';
import { InlineReplyForm } from './InlineReplyForm';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import TiptapLink from '@tiptap/extension-link'; // For rendering links
import TiptapImage from '@tiptap/extension-image'; // For rendering images, if they ever appear in comments
import { MarkdownUtils } from '@/utils/markdownUtils';
import { MentionExtension } from '@/components/mentions/MentionExtension';
import { UserProfilePopover } from '@/components/mentions/UserProfilePopover';
import { ReactionBar } from '../reactions/ReactionBar';

const lowlight = createLowlight(common);

interface CommentItemProps {
  comment: ApiComment;
  depth?: number; // Nesting depth for indentation (default: 0)
  isHighlighted?: boolean; // Whether this comment should be highlighted
  onHighlightComplete?: () => void; // Callback when highlight animation completes
  childComments?: React.ReactNode; // Child comments to render inside this comment (for parent comments)
}

export const CommentItem: React.FC<CommentItemProps> = ({ 
  comment, 
  depth = 0,
  isHighlighted = false,
  onHighlightComplete,
  childComments
}) => {
  const authorDisplayName = comment.author_name || 'Unknown User';
  const avatarFallback = authorDisplayName.substring(0, 2).toUpperCase();
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const timeSinceText = useTimeSince(comment.created_at);

  // Highlight animation state
  const [showHighlight, setShowHighlight] = React.useState(false);
  const [isAuthorPopoverOpen, setIsAuthorPopoverOpen] = React.useState(false);
  // Inline reply state
  const [showInlineReply, setShowInlineReply] = React.useState(false);

  // Trigger highlight animation when isHighlighted becomes true
  React.useEffect(() => {
    if (isHighlighted) {
      // Start the highlight animation
      setShowHighlight(true);
      
      // Remove highlight after animation completes
      const timer = setTimeout(() => {
        setShowHighlight(false);
        if (onHighlightComplete) {
          onHighlightComplete();
        }
      }, 3000); // 3 seconds highlight duration

      return () => clearTimeout(timer);
    }
  }, [isHighlighted, onHighlightComplete]);

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

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error('No auth token');
      await authFetchJson(`/api/posts/${comment.post_id}/comments/${comment.id}`, { method: 'DELETE', token });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', comment.post_id] });
    },
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [3, 4] }, // Match comment input form, allow H3-H4
        codeBlock: false, // Crucial: Let CodeBlockLowlight handle this
        // Other StarterKit defaults like blockquote, lists, bold, italic will be active
      }),
      TiptapLink.configure({
        openOnClick: false, // Set to false as we handle clicks via event delegation
        HTMLAttributes: {
          // target: '_blank',
          // rel: 'noopener noreferrer nofollow',
          class: 'break-words max-w-full overflow-wrap-anywhere word-break-break-all hyphens-auto', // Aggressive URL wrapping
          style: 'word-wrap: break-word; overflow-wrap: anywhere; word-break: break-word; max-width: 100%; white-space: normal;',
        },
      }),
      TiptapImage, // For rendering images, if they ever appear in comments
      CodeBlockLowlight.configure({ lowlight }), // For syntax highlighting
      Markdown.configure({ html: false, tightLists: true }),
      MentionExtension,
    ],
    content: '', // Will be set by useEffect
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        // REMOVED prose classes from here
      },
    },
  });

  React.useEffect(() => {
    if (editor && comment.content) {
      // Use backwards-compatible content loading
      MarkdownUtils.loadContent(editor, comment.content);
    }
  }, [editor, comment.content]);

  // Effect for handling link clicks in rendered Tiptap content
  // Calculate indentation based on depth (moved before conditional returns)
  const indentStyle = React.useMemo(() => {
    const maxDisplayDepth = 5;
    const clampedDepth = Math.min(depth, maxDisplayDepth);
    return {
      paddingLeft: `${clampedDepth * 0.5}rem`, // 0.5rem per level
    };
  }, [depth]);

  React.useEffect(() => {
    if (!editor) return;

    const editorElement = editor.view.dom;
    if (!editorElement) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const anchor = target.closest('a');

      if (anchor && anchor.href) {
        const href = anchor.href;
        if (href.startsWith('/')) {
          // Internal link - use router navigation
          event.preventDefault();
          console.log(`[CommentItem] Intercepted internal link click: ${href}, navigating with router.`);
          const urlWithParams = buildInternalUrl(href);
          router.push(urlWithParams);
        } else if (href.startsWith('http://') || href.startsWith('https://')) {
          // External link - let browser handle it naturally
          console.log(`[CommentItem] External link click: ${href}, opening in browser.`);
          // Don't prevent default - let it open normally
        }
      }
    };

    editorElement.addEventListener('click', handleClick);

    return () => {
      editorElement.removeEventListener('click', handleClick);
    };
  }, [editor, router, comment.content, buildInternalUrl]); // Rerun if editor or router changes, or content changes

  if (!editor) {
    return null; // Or a loader/placeholder
  }

  // Determine if this is a parent comment (mini postcard) or a reply
  const isParentComment = depth === 0;
  
  return (
    <div 
      id={`comment-${comment.id}`}
      className={`transition-all duration-500 ease-out ${
        isParentComment 
          ? `bg-card rounded-xl border border-border/60 shadow-sm hover:shadow-md p-4 mb-4 ${
              showHighlight 
                ? 'ring-2 ring-blue-200/50 dark:ring-blue-800/50' 
                : ''
            }`
          : `py-2 ${
              showHighlight 
                ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg' 
                : ''
            }`
      }`}
      style={{
        transform: showHighlight ? 'scale(1.01)' : 'scale(1)',
        transition: 'all 0.5s ease-out',
        ...(isParentComment ? {} : indentStyle) // Only indent replies
      }}
    >
      {/* Header with Avatar and Actions */}
      <div className="flex items-start justify-between mb-2">
        <UserProfilePopover
          userId={comment.author_user_id}
          username={authorDisplayName}
          open={isAuthorPopoverOpen}
          onOpenChange={setIsAuthorPopoverOpen}
        >
          <div className="flex items-center space-x-2 cursor-pointer group/author">
            <Avatar className="h-7 w-7 flex-shrink-0 group-hover/author:ring-2 group-hover/author:ring-primary group-hover/author:ring-opacity-30 transition-all">
              <AvatarImage src={comment.author_profile_picture_url || undefined} alt={`${authorDisplayName}'s avatar`} />
              <AvatarFallback className="text-xs">{avatarFallback}</AvatarFallback>
            </Avatar>
            <span className="font-medium text-foreground group-hover/author:text-primary transition-colors text-sm">
              {authorDisplayName}
            </span>
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <span>•</span>
              <Clock size={10} className="flex-shrink-0" />
              <span>{timeSinceText}</span>
            </div>
          </div>
        </UserProfilePopover>
        
        <div className="flex items-center space-x-1">
          {/* Reply Button */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowInlineReply(true)}
            className="p-1 h-6 w-auto px-2 text-xs opacity-60 hover:opacity-100 transition-opacity"
            title="Reply to this comment"
          >
            <Reply size={10} className="mr-1" />
            Reply
          </Button>
          
          {/* Admin Menu */}
          {user?.isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="p-1 h-6 w-6">
                  <MoreVertical size={12} />
                  <span className="sr-only">Comment Options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <Trash size={12} className="mr-2" /> Delete Comment
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      
      {/* Content Area - Full Width */}
      <div className="text-sm pl-1">
        <article 
          className="prose dark:prose-invert prose-sm max-w-none break-words prose-a:break-words prose-a:max-w-full prose-a:overflow-wrap-anywhere prose-a:word-break-break-all prose-a:hyphens-auto prose-p:break-words prose-p:overflow-wrap-anywhere prose-code:break-words prose-code:overflow-wrap-anywhere prose-img:max-w-full prose-img:h-auto prose-img:rounded-lg prose-img:shadow-sm"
          style={{ wordWrap: 'break-word', overflowWrap: 'anywhere', wordBreak: 'break-word' }}
        >
          <EditorContent editor={editor} />
        </article>
      </div>

      {/* ReactionBar for comments */}
      <div className="pl-1 mt-1 opacity-60 hover:opacity-100 transition-opacity duration-300">
        <ReactionBar 
          commentId={comment.id}
          className="text-xs"
        />
      </div>

      {/* Inline Reply Form */}
      {showInlineReply && (
        <InlineReplyForm
          postId={comment.post_id}
          parentCommentId={comment.id}
          replyToUsername={authorDisplayName}
          onCancel={() => setShowInlineReply(false)}
          onReplyPosted={() => {
            setShowInlineReply(false);
            // Optional: could call onReply here if needed for additional handling
          }}
        />
      )}

      {/* Render children comments */}
      {childComments && (
        <div className="mt-2">
          {childComments}
        </div>
      )}
    </div>
  );
}; 
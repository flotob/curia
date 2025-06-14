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

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
// import { Markdown } from 'tiptap-markdown'; 
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import TiptapLink from '@tiptap/extension-link'; // For rendering links
import TiptapImage from '@tiptap/extension-image'; // For rendering images (though comments might not use images often)
// import { cn } from '@/lib/utils';
// Ensure highlight.js theme is available. If not imported globally, import here.
// For now, assuming it might be covered by NewCommentForm's import or a global one.
// import 'highlight.js/styles/github-dark.css'; 

const lowlight = createLowlight(common);

interface CommentItemProps {
  comment: ApiComment;
  depth?: number; // Nesting depth for indentation (default: 0)
  onReply?: (commentId: number) => void; // Callback when user clicks reply
  isHighlighted?: boolean; // Whether this comment should be highlighted
  onHighlightComplete?: () => void; // Callback when highlight animation completes
}

export const CommentItem: React.FC<CommentItemProps> = ({ 
  comment, 
  depth = 0,
  onReply,
  isHighlighted = false,
  onHighlightComplete 
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
      try {
        const jsonContent = JSON.parse(comment.content);
        editor.commands.setContent(jsonContent);
      } catch (e) {
        // If content is not JSON, set it as plain text (fallback)
        console.warn('Comment content is not valid JSON, rendering as plain text:', comment.content, e);
        editor.commands.setContent(comment.content); 
      }
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

  return (
    <div 
      id={`comment-${comment.id}`}
      className={`flex items-start space-x-3 py-3 transition-all duration-500 ease-out rounded-lg ${
        showHighlight 
          ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 shadow-sm ring-1 ring-blue-200/50 dark:ring-blue-800/50' 
          : ''
      }`}
      style={{
        transform: showHighlight ? 'scale(1.01)' : 'scale(1)',
        transition: 'all 0.5s ease-out',
        ...indentStyle
      }}
    >
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={comment.author_profile_picture_url || undefined} alt={`${authorDisplayName}'s avatar`} />
        <AvatarFallback>{avatarFallback}</AvatarFallback>
      </Avatar>
      <div className="flex-grow">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{authorDisplayName}</span>
            <span className="mx-1">•</span>
            <Clock size={12} className="mr-0.5 flex-shrink-0" />
            <span>{timeSinceText}</span>
          </div>
          <div className="flex items-center space-x-1">
            {/* Reply Button */}
            {onReply && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onReply(comment.id)}
                className="p-1 h-7 w-auto px-2 text-xs opacity-60 hover:opacity-100 transition-opacity"
                title="Reply to this comment"
              >
                <Reply size={12} className="mr-1" />
                Reply
              </Button>
            )}
            
            {/* Admin Menu */}
            {user?.isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="p-1 h-7 w-7">
                    <MoreVertical size={14} />
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
                  {/* Add more DropdownMenuItems here later */}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        <div className="mt-1 text-sm">
            <article 
              className="prose dark:prose-invert prose-sm max-w-none break-words prose-a:break-words prose-a:max-w-full prose-a:overflow-wrap-anywhere prose-a:word-break-break-all prose-a:hyphens-auto prose-p:break-words prose-p:overflow-wrap-anywhere prose-code:break-words prose-code:overflow-wrap-anywhere"
              style={{ wordWrap: 'break-word', overflowWrap: 'anywhere', wordBreak: 'break-word' }}
            >
                <EditorContent editor={editor} />
            </article>
        </div>
      </div>
    </div>
  );
}; 
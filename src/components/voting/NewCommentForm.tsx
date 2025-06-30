'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useTypingEvents } from '@/hooks/useTypingEvents';
import { authFetchJson } from '@/utils/authFetch';
import { ApiComment } from '@/app/api/posts/[postId]/comments/route';
import { ApiPost } from '@/app/api/posts/route';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from 'lucide-react';
import { EditorToolbar } from './EditorToolbar';

// Import our verification types
import { SettingsUtils } from '@/types/settings';
import { GatingRequirementsPanel } from '@/components/gating/GatingRequirementsPanel';
import { UniversalProfileProvider } from '@/contexts/UniversalProfileContext';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';

// New Tiptap Extension imports
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import { EnhancedImageExtension } from '@/components/tiptap/EnhancedImageExtension';
import { MarkdownUtils } from '@/utils/markdownUtils';
import { MentionExtension } from '@/components/mentions/MentionExtension';
// highlight.js CSS is in layout.tsx

const lowlight = createLowlight(common);

interface NewCommentFormProps {
  postId: number;
  parentCommentId?: number | null;
  onCommentPosted?: (newComment: ApiComment) => void;
  post?: ApiPost; // Optional post object for gating checks
}

interface CreateCommentMutationPayload {
  content: string; // Markdown content
  parent_comment_id?: number | null;
}

interface CreateCommentApiPayload {
    content: string; // Markdown content
    parent_comment_id?: number | null;
}

export const NewCommentForm: React.FC<NewCommentFormProps> = ({
  postId,
  parentCommentId = null,
  onCommentPosted,
  post, // New optional prop
}) => {
  const { token, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  // Calculate gating booleans before state initialization
  const hasSettingsGating = post ? SettingsUtils.hasAnyGating(post.settings) : false;
  const hasLockGating = post ? !!post.lock_id : false;
  const hasGating = hasSettingsGating || hasLockGating;

  // Set up typing events for real-time indicators
  const typingEvents = useTypingEvents({
    boardId: post?.board_id || 0, // Use board_id from post, fallback to 0
    postId: postId,
    enabled: isAuthenticated && !!post?.board_id, // Only enable if authenticated and we have board context
    onTypingStart: () => console.log('[NewCommentForm] Started typing on post', postId),
    onTypingStop: () => console.log('[NewCommentForm] Stopped typing on post', postId)
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Configure heading levels for comments via StarterKit
        heading: { levels: [3, 4] }, 
        // Disable StarterKit's default codeBlock to use CodeBlockLowlight's input rules and features
        codeBlock: false, 
        // Other StarterKit defaults (like paragraph, text, bold, italic, lists, blockquote) remain active.
      }),
      // Other standard node extensions (if not adequately covered by StarterKit or if specific configs are needed)
      Link.configure({
        openOnClick: false, 
        autolink: true,
        linkOnPaste: true,
      }),
      EnhancedImageExtension, // Enhanced image support with responsive behavior 
      // Explicitly use CodeBlockLowlight for its input rules and syntax highlighting
      CodeBlockLowlight.configure({ lowlight }),
      // Markdown extension for parsing pasted Markdown and potentially serializing
      Markdown.configure({
        html: false,          
        tightLists: true,
        transformPastedText: true,
      }),
      // Utility extensions
      Placeholder.configure({
        placeholder: 'Share your thoughts, questions, or feedback... Use the toolbar below to format your comment!',
      }),
      // 🏷️ User mentions extension
      MentionExtension,
    ],
    content: '',
    immediatelyRender: false, // Fix SSR hydration warnings
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert leading-relaxed focus:outline-none min-h-[100px] px-4 py-3 w-full',
      },
    },
    onUpdate: ({ editor }) => {
      // Trigger typing events when editor content changes
      const content = editor.getText().trim();
      typingEvents.handleInputChange(content);
    },
    onFocus: () => {
      // Trigger typing events when editor gains focus
      typingEvents.handleFocus();
    },
    onBlur: () => {
      // Trigger typing events when editor loses focus
      typingEvents.handleBlur();
    },
  });

  const addCommentMutation = useMutation<ApiComment, Error, CreateCommentMutationPayload>({
    mutationFn: async (commentData) => {
      if (!token) throw new Error('Authentication required to comment.');
      
      const apiPayload: CreateCommentApiPayload = {
        content: commentData.content, // Already Markdown from MarkdownUtils
        parent_comment_id: commentData.parent_comment_id,
      };

      return authFetchJson<ApiComment>(`/api/posts/${postId}/comments`, {
        method: 'POST',
        token,
        body: JSON.stringify(apiPayload),
      });
    },
    onSuccess: (newComment) => {
      editor?.commands.clearContent();
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] }); 
      if (onCommentPosted) {
        onCommentPosted(newComment);
      }
    },
    onError: (err) => {
      setError(err.message || 'Failed to post comment.');
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Stop typing indicator immediately when submitting
    typingEvents.handleSubmit();
    
    if (!editor) {
      setError('Editor is not initialized.');
      return;
    }

    if (editor.isEmpty) {
      setError('Comment cannot be empty.');
      return;
    }
    
    if (!isAuthenticated) {
        setError('You must be logged in to comment.');
        return;
    }

    // Extract Markdown content instead of JSON
    const markdownContent = MarkdownUtils.getMarkdown(editor);

    setError(null);

    try {
      // Submit comment (backend handles all gating verification)
      addCommentMutation.mutate({ 
        content: markdownContent, 
        parent_comment_id: parentCommentId
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to submit comment');
    }
  };

  // For non-authenticated users, show login prompt
  if (!isAuthenticated) {
    return (
      <div className="content-level-2 content-padding-2">
        <div className="text-center content-gap-compact">
          <p className="content-meta">
            Please log in to post a comment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="content-gap-1">
      {/* Show gating requirements panel for gated posts */}
      {hasGating && (
        <UniversalProfileProvider>
          <GatingRequirementsPanel 
            postId={postId}
          />
        </UniversalProfileProvider>
      )}
      
      {/* Authentication check for comment form */}
      {!isAuthenticated ? (
        <div className="content-level-2 content-padding-2">
          <div className="text-center content-gap-compact">
            <p className="content-meta">
              Please log in to post a comment.
            </p>
          </div>
        </div>
      ) : (
        <div className="comment-form">
          {/* Comment Form Header */}
          <div className="content-header">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="content-subtitle">
                  Add a Comment
                </h4>
                <p className="content-meta mt-0.5">
                  Share your thoughts on this post
                </p>
              </div>
            </div>
          </div>
        
          <form onSubmit={handleSubmit}>
            <div className="content-padding-1 content-gap-compact">
              <div className="content-gap-compact">
                <Label htmlFor="comment-content" className="content-subtitle">Your Comment</Label>
                <div className="relative group">
                  <div 
                    className="border-2 border-input rounded-xl overflow-hidden transition-all duration-200 group-focus-within:border-primary group-focus-within:shadow-lg group-focus-within:shadow-primary/10 bg-background cursor-text"
                    onClick={() => {
                      // Manually focus the editor when clicking the container
                      editor?.commands.focus();
                    }}
                  >
                    <EditorContent 
                      editor={editor} 
                      id="comment-content"
                      className="prose-headings:font-semibold prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-code:text-foreground"
                    />
                    <div 
                      className="border-t border-border/50 bg-muted/30"
                      onClick={(e) => {
                        // Prevent toolbar clicks from interfering with editor focus
                        e.stopPropagation();
                      }}
                    >
                      <EditorToolbar editor={editor} />
                    </div>
                  </div>
                </div>
              </div>
              
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}
              
              <div className="flex justify-end pt-2">
                <Button 
                  type="submit" 
                  disabled={
                    addCommentMutation.isPending || 
                    editor?.isEmpty
                  }
                  className="text-sm px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                >
                  {addCommentMutation.isPending && (
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  )} 
                  Post Comment
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}; 
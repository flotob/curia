'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { authFetchJson } from '@/utils/authFetch';
import { ApiComment } from '@/app/api/posts/[postId]/comments/route';
import { Button } from "@/components/ui/button";
import { Loader2, X } from 'lucide-react';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { MarkdownUtils } from '@/utils/markdownUtils';
import { MentionExtension } from '@/components/mentions/MentionExtension';

const lowlight = createLowlight(common);

interface InlineReplyFormProps {
  postId: number;
  parentCommentId: number;
  onCancel: () => void;
  onReplyPosted?: (newComment: ApiComment) => void;
  replyToUsername?: string;
}

interface CreateCommentApiPayload {
  content: string;
  parent_comment_id: number;
}

export const InlineReplyForm: React.FC<InlineReplyFormProps> = ({
  postId,
  parentCommentId,
  onCancel,
  onReplyPosted,
  replyToUsername
}) => {
  const { token, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [3, 4] },
        codeBlock: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
      }),
      Image,
      CodeBlockLowlight.configure({ lowlight }),
      Markdown.configure({
        html: false,
        tightLists: true,
        transformPastedText: true,
      }),
      Placeholder.configure({
        placeholder: replyToUsername 
          ? `Reply to ${replyToUsername}...` 
          : 'Write your reply...',
      }),
      MentionExtension,
    ],
    content: '',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert leading-relaxed focus:outline-none min-h-[60px] px-3 py-2 w-full',
      },
    },
    onCreate: ({ editor }) => {
      // Auto-focus when created
      setTimeout(() => editor.commands.focus(), 100);
    },
  });

  const addReplyMutation = useMutation<ApiComment, Error, CreateCommentApiPayload>({
    mutationFn: async (commentData) => {
      if (!token) throw new Error('Authentication required to reply.');

      return authFetchJson<ApiComment>(`/api/posts/${postId}/comments`, {
        method: 'POST',
        token,
        body: JSON.stringify(commentData),
      });
    },
    onSuccess: (newComment) => {
      editor?.commands.clearContent();
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      if (onReplyPosted) {
        onReplyPosted(newComment);
      }
      onCancel(); // Close the inline form
    },
    onError: (err) => {
      setError(err.message || 'Failed to post reply.');
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!editor) {
      setError('Editor is not initialized.');
      return;
    }

    if (editor.isEmpty) {
      setError('Reply cannot be empty.');
      return;
    }

    if (!isAuthenticated) {
      setError('You must be logged in to reply.');
      return;
    }

    const markdownContent = MarkdownUtils.getMarkdown(editor);
    setError(null);

    addReplyMutation.mutate({
      content: markdownContent,
      parent_comment_id: parentCommentId,
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="mt-2 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
        Please log in to reply.
      </div>
    );
  }

  return (
    <div className="mt-2 bg-muted/30 rounded-lg border border-border/40 p-3">
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Compact Editor */}
        <div className="relative">
          <div 
            className="border border-input rounded-lg overflow-hidden bg-background focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all"
            onClick={() => editor?.commands.focus()}
          >
            <EditorContent 
              editor={editor}
              className="prose-p:text-foreground prose-strong:text-foreground prose-code:text-foreground"
            />
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-3 py-2">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {replyToUsername && `Replying to ${replyToUsername}`}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="text-xs h-7 px-2"
            >
              <X size={12} className="mr-1" />
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={addReplyMutation.isPending || editor?.isEmpty}
              className="text-xs h-7 px-3"
            >
              {addReplyMutation.isPending && (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              )}
              Reply
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}; 
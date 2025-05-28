'use client';

import React, { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { authFetchJson } from '@/utils/authFetch';
import { ApiComment } from '@/app/api/posts/[postId]/comments/route';
import { Button } from "@/components/ui/button";
import { Loader2 } from 'lucide-react';
import { EditorToolbar } from './EditorToolbar';

import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';

// New Tiptap Extension imports
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Heading from '@tiptap/extension-heading';
import Blockquote from '@tiptap/extension-blockquote';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
// highlight.js CSS is in layout.tsx

const lowlight = createLowlight(common);

interface NewCommentFormProps {
  postId: number;
  parentCommentId?: number | null;
  onCommentPosted?: (newComment: ApiComment) => void;
}

interface CreateCommentMutationPayload {
  content: any;
  parent_comment_id?: number | null;
}

interface CreateCommentApiPayload {
    content: string; 
    parent_comment_id?: number | null;
}

export const NewCommentForm: React.FC<NewCommentFormProps> = ({
  postId,
  parentCommentId = null,
  onCommentPosted,
}) => {
  const { token, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // Using CodeBlockLowlight instead
        // We can be more granular here if needed, but StarterKit includes most basics
        // For comments, we might want to disable headings from StarterKit if we add the Heading extension separately
        // or ensure the Heading extension levels are appropriate for comments (e.g., only H3-H6)
        heading: false, // Disable starter kit heading if we use the specific Heading extension with levels
      }),
      CodeBlockLowlight.configure({ lowlight }),
      Markdown.configure({
        html: false,          
        tightLists: true,
      }),
      Placeholder.configure({
        placeholder: 'Write your comment here …',
      }),
      Link.configure({
        openOnClick: false, // Recommended for security and better UX
        autolink: true,
        linkOnPaste: true,
      }),
      Image, // Basic image support (users would need to paste URLs)
      Heading.configure({ levels: [3, 4] }), // Allow H3, H4 in comments if desired (or remove if no headings in comments)
      Blockquote,
      BulletList,
      OrderedList,
      ListItem,
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert prose-sm sm:prose-base focus:outline-none min-h-[80px] border border-input rounded-md px-3 py-2 w-full',
      },
    },
  });

  const addCommentMutation = useMutation<ApiComment, Error, CreateCommentMutationPayload>({
    mutationFn: async (commentData) => {
      if (!token) throw new Error('Authentication required to comment.');
      
      const apiPayload: CreateCommentApiPayload = {
        content: JSON.stringify(commentData.content),
        parent_comment_id: commentData.parent_comment_id,
      };

      return authFetchJson<ApiComment>(`/api/posts/${postId}/comments`, {
        method: 'POST',
        token,
        body: apiPayload as any,
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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const editorContentJson = editor?.getJSON();

    if (!editorContentJson || editor?.isEmpty) {
      setError('Comment cannot be empty.');
      return;
    }
    if (!isAuthenticated) {
        setError('You must be logged in to comment.');
        return;
    }
    setError(null);
    addCommentMutation.mutate({ content: editorContentJson, parent_comment_id: parentCommentId });
  };

  if (!isAuthenticated) {
    return (
      <div className="mt-4 p-4 border rounded-md bg-slate-50 dark:bg-slate-800">
        <p className="text-sm text-muted-foreground">
          Please log in to post a comment.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3">
      <div className="border rounded-md overflow-hidden">
        <EditorContent editor={editor} />
        <EditorToolbar editor={editor} /> 
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={addCommentMutation.isPending || editor?.isEmpty}>
          {addCommentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
          Post Comment
        </Button>
      </div>
    </form>
  );
}; 
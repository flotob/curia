'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useUniversalProfile } from '@/contexts/UniversalProfileContext';
import { authFetchJson } from '@/utils/authFetch';
import { ApiComment } from '@/app/api/posts/[postId]/comments/route';
import { ApiPost } from '@/app/api/posts/route';
import { Button } from "@/components/ui/button";
import { Loader2, Shield } from 'lucide-react';
import { EditorToolbar } from './EditorToolbar';

// Import our verification types
import { VerificationChallenge } from '@/lib/verification';
import { SettingsUtils } from '@/types/settings';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';

// New Tiptap Extension imports
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
// highlight.js CSS is in layout.tsx

const lowlight = createLowlight(common);

interface NewCommentFormProps {
  postId: number;
  parentCommentId?: number | null;
  onCommentPosted?: (newComment: ApiComment) => void;
  post?: ApiPost; // Optional post object for gating checks
}

interface CreateCommentMutationPayload {
  content: object; // Tiptap JSON content
  parent_comment_id?: number | null;
  challenge?: VerificationChallenge; // Optional challenge for gated posts
}

interface CreateCommentApiPayload {
    content: string; 
    parent_comment_id?: number | null;
    challenge?: VerificationChallenge; // Include challenge in API payload
}

export const NewCommentForm: React.FC<NewCommentFormProps> = ({
  postId,
  parentCommentId = null,
  onCommentPosted,
  post, // New optional prop
}) => {
  const { token, isAuthenticated } = useAuth();
  const { upAddress, signMessage, isConnected: isUPConnected } = useUniversalProfile();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingChallenge, setIsGeneratingChallenge] = useState(false);

  // Check if this post has gating enabled
  const hasGating = post ? SettingsUtils.hasUPGating(post.settings) : false;
  const gatingRequirements = hasGating && post ? SettingsUtils.getUPGatingRequirements(post.settings) : null;

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
      Image, // Basic image support 
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
        placeholder: 'Write your comment here …',
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert leading-snug focus:outline-none min-h-[80px] border border-input rounded-md px-3 py-2 w-full',
      },
    },
  });

  // Generate and sign challenge for gated posts
  const generateSignedChallenge = async (): Promise<VerificationChallenge> => {
    if (!upAddress || !token) {
      throw new Error('Universal Profile not connected or no auth token');
    }

    setIsGeneratingChallenge(true);
    
    try {
      // Request challenge from backend
      const challengeResponse = await authFetchJson<{
        challenge: VerificationChallenge;
        message: string;
      }>(`/api/posts/${postId}/challenge`, {
        method: 'POST',
        token,
        body: JSON.stringify({ upAddress }),
      });

      const { challenge, message } = challengeResponse;
      
      // Request signature from user
      const signature = await signMessage(message);
      
      // Return challenge with signature
      return {
        ...challenge,
        signature
      };
    } catch (error) {
      console.error('[NewCommentForm] Challenge generation failed:', error);
      throw new Error('Failed to generate verification challenge. Please try again.');
    } finally {
      setIsGeneratingChallenge(false);
    }
  };

  const addCommentMutation = useMutation<ApiComment, Error, CreateCommentMutationPayload>({
    mutationFn: async (commentData) => {
      if (!token) throw new Error('Authentication required to comment.');
      
      const apiPayload: CreateCommentApiPayload = {
        content: JSON.stringify(commentData.content),
        parent_comment_id: commentData.parent_comment_id,
        challenge: commentData.challenge, // Include challenge if present
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

    try {
      let challenge: VerificationChallenge | undefined;

      // Check if this post requires gating verification
      if (hasGating) {
        if (!isUPConnected || !upAddress) {
          setError('Please connect your Universal Profile to comment on this gated post.');
          return;
        }

        // Generate and sign challenge
        challenge = await generateSignedChallenge();
      }

      // Submit comment with optional challenge
      addCommentMutation.mutate({ 
        content: editorContentJson, 
        parent_comment_id: parentCommentId,
        challenge 
      });
    } catch (challengeError) {
      setError(challengeError instanceof Error ? challengeError.message : 'Verification failed');
    }
  };

  // Show UP connection requirement for gated posts
  if (hasGating && (!isUPConnected || !upAddress)) {
    return (
      <div className="mt-4 p-4 border rounded-md bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
        <div className="flex items-center mb-2">
          <Shield className="mr-2 h-4 w-4 text-amber-600 dark:text-amber-400" />
          <h4 className="font-medium text-amber-800 dark:text-amber-200">
            Gated Post
          </h4>
        </div>
        <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
          This post requires Universal Profile verification to comment. 
          {gatingRequirements?.minLyxBalance && (
            <> You need at least {gatingRequirements.minLyxBalance} LYX to participate.</>
          )}
        </p>
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Please connect your Universal Profile above to continue.
        </p>
      </div>
    );
  }

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
      {/* Show gating info if applicable */}
      {hasGating && isUPConnected && (
        <div className="p-3 border rounded-md bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-center">
            <Shield className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
            <p className="text-sm text-blue-700 dark:text-blue-300">
              This post requires verification with your Universal Profile before commenting.
            </p>
          </div>
        </div>
      )}
      
      <div className="border rounded-md overflow-hidden">
        <EditorContent editor={editor} />
        <EditorToolbar editor={editor} /> 
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      <div className="flex justify-end">
        <Button 
          type="submit" 
          disabled={
            addCommentMutation.isPending || 
            editor?.isEmpty || 
            isGeneratingChallenge ||
            (hasGating && (!isUPConnected || !upAddress))
          }
        >
          {(addCommentMutation.isPending || isGeneratingChallenge) && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )} 
          {isGeneratingChallenge ? 'Verifying...' : 'Post Comment'}
        </Button>
      </div>
    </form>
  );
}; 
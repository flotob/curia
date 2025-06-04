'use client';

import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useConditionalUniversalProfile, useUPActivation } from '@/contexts/ConditionalUniversalProfileProvider';
import { authFetchJson } from '@/utils/authFetch';
import { ApiComment } from '@/app/api/posts/[postId]/comments/route';
import { ApiPost } from '@/app/api/posts/route';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from "@/components/ui/label";
import { Loader2 } from 'lucide-react';
import { EditorToolbar } from './EditorToolbar';

// Import our verification types
import { VerificationChallenge } from '@/lib/verification';
import { SettingsUtils } from '@/types/settings';
import { InlineUPConnection } from '@/components/comment/InlineUPConnection';

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
  const { activateUP, hasUserTriggeredConnection } = useUPActivation();
  const { upAddress, signMessage, isConnected: isUPConnected } = useConditionalUniversalProfile();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingChallenge, setIsGeneratingChallenge] = useState(false);

  // Check if this post has gating enabled
  const hasGating = post ? SettingsUtils.hasUPGating(post.settings) : false;

  // Activate UP functionality when gating is detected (but don't initialize yet)
  useEffect(() => {
    if (hasGating) {
      console.log('[NewCommentForm] Gating detected, marking UP as needed');
      activateUP();
    }
  }, [hasGating, activateUP]);

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
        placeholder: 'Share your thoughts, questions, or feedback... Use the toolbar below to format your comment!',
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert leading-relaxed focus:outline-none min-h-[100px] px-4 py-3 w-full',
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
        if (!hasUserTriggeredConnection) {
          setError('Please connect your Universal Profile to comment on this gated post.');
          return;
        }
        
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

  // Show UP connection widget for gated posts
  if (hasGating && (!hasUserTriggeredConnection || !isUPConnected || !upAddress)) {
    return (
      <div className="mt-6">
        <InlineUPConnection postSettings={post?.settings} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Card className="mt-6 border-2 shadow-md">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Please log in to post a comment.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {/* Show inline UP connection widget for gated posts when connected */}
      {hasGating && hasUserTriggeredConnection && isUPConnected && (
        <InlineUPConnection postSettings={post?.settings} />
      )}
      
      <Card className="border-2 shadow-md hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="pb-3 bg-gradient-to-br from-background to-muted/10">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base bg-gradient-to-br from-foreground to-foreground/80 bg-clip-text">
                Add a Comment
              </CardTitle>
              <CardDescription className="text-xs">
                Share your thoughts on this post
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-3 px-4 sm:px-6">
            <div className="space-y-1.5">
              <Label htmlFor="comment-content" className="text-sm font-medium">Your Comment</Label>
              <div className="relative group">
                <div className="border-2 border-input rounded-xl overflow-hidden transition-all duration-200 group-focus-within:border-primary group-focus-within:shadow-lg group-focus-within:shadow-primary/10 bg-background">
                  <EditorContent 
                    editor={editor} 
                    id="comment-content"
                    className="prose-headings:font-semibold prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-code:text-foreground"
                  />
                  <div className="border-t border-border/50 bg-muted/30">
                    <EditorToolbar editor={editor} />
                  </div>
                </div>
                {/* Focus ring for better accessibility */}
                <div className="absolute inset-0 rounded-xl ring-2 ring-transparent group-focus-within:ring-primary/20 transition-all duration-200 pointer-events-none" />
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
                  editor?.isEmpty || 
                  isGeneratingChallenge ||
                  (hasGating && (!hasUserTriggeredConnection || !isUPConnected || !upAddress))
                }
                className="text-sm px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
              >
                {(addCommentMutation.isPending || isGeneratingChallenge) && (
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                )} 
                {isGeneratingChallenge ? 'Verifying...' : 'Post Comment'}
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}; 
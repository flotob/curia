'use client';

import React, { useState, useCallback } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { authFetchJson } from '@/utils/authFetch';
import { ApiPost } from '@/app/api/posts/route';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import Link from 'next/link'; 

// Tiptap imports
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown, markdownToTiptap } from 'tiptap-markdown';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import Placeholder from '@tiptap/extension-placeholder';
import TiptapLink from '@tiptap/extension-link'; // Renamed to avoid conflict with next/link
import Image from '@tiptap/extension-image';
import Heading from '@tiptap/extension-heading';
import Blockquote from '@tiptap/extension-blockquote';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import { EditorToolbar } from './EditorToolbar'; // Import the toolbar
// highlight.js CSS is now in layout.tsx

const lowlight = createLowlight(common);

// Debounce utility
function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<F>): Promise<ReturnType<F>> =>
    new Promise(resolve => {
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => resolve(func(...args)), waitFor);
    });
}

interface NewPostFormProps {
  onPostCreated?: (newPost: ApiPost) => void; 
}

interface CreatePostMutationPayload {
  title: string;
  content: any; // Tiptap JSON object
  tags?: string[]; 
}

interface CreatePostApiPayload {
    title: string;
    content: string; // Stringified Tiptap JSON
    tags?: string[];
}

interface SuggestedPost extends Partial<ApiPost> {}

export const NewPostForm: React.FC<NewPostFormProps> = ({ onPostCreated }) => {
  const { token, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [tags, setTags] = useState(''); 
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const contentEditor = useEditor({
    extensions: [
      StarterKit.configure({
        // codeBlock: false, // Kept false to allow CodeBlockLowlight to handle it
        // heading: { levels: [1, 2, 3, 4] }, // Let StarterKit handle headings
        // Defaults from StarterKit that we want to keep active, explicitly listed for clarity 
        // (though not strictly necessary if we are not overriding them to false)
        // paragraph: {},
        // text: {},
        // document: {},
        // bold: {},
        // italic: {},
        // strike: {},
        // history: {},
        // dropcursor: {},
        // gapcursor: {},
        // HardBreak is part of StarterKit but not explicitly listed here as an example

        // Configure heading levels for posts via StarterKit
        heading: { levels: [1, 2, 3, 4] }, 
        // Disable StarterKit's default codeBlock to use CodeBlockLowlight's input rules and features
        codeBlock: false, 
      }),
      // Other standard node extensions (if not adequately covered by StarterKit or if specific configs are needed)
      // Note: BulletList, OrderedList, ListItem, Blockquote are part of StarterKit by default.
      // We list them if we were to disable them in StarterKit and use standalone versions, but here StarterKit handles them.
      TiptapLink.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
      Image, 
      // Explicitly use CodeBlockLowlight for its input rules and syntax highlighting
      CodeBlockLowlight.configure({ lowlight }),
      // Markdown extension for parsing pasted Markdown
      Markdown.configure({ html: false, tightLists: true }),
      // Utility extensions
      Placeholder.configure({
        placeholder: 'Describe your post in detail (Markdown supported!)...',
      }),
      // REMOVED: Standalone Heading.configure(...) - StarterKit now handles headings
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert leading-snug focus:outline-none min-h-[150px] border border-input rounded-md px-3 py-2 w-full',
      },
      handlePaste(view, event) {
        const text = event.clipboardData?.getData('text/plain');
        if (text) {
          try {
            const json = markdownToTiptap(text, contentEditor?.extensionManager.extensions || []);
            if (json) {
              contentEditor?.commands.insertContent(json);
              event.preventDefault();
              return true;
            }
          } catch (e) {
            console.warn('Failed to parse pasted markdown', e);
          }
        }
        return false;
      },
    },
  });

  const { 
    data: suggestions, 
    isLoading: isLoadingSuggestions,
  } = useQuery<SuggestedPost[], Error>({
    queryKey: ['postSuggestions', searchQuery],
    queryFn: async () => {
      if (searchQuery.trim().length < 3) return [];
      return authFetchJson<SuggestedPost[]>(`/api/search/posts?q=${encodeURIComponent(searchQuery)}`);
    },
    enabled: searchQuery.trim().length >= 3, 
  });

  const debouncedSetSearchQuery = useCallback(
    debounce((query: string) => setSearchQuery(query), 500), 
    []
  );

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    // Optionally, update search query based on title AND/OR content in future
    debouncedSetSearchQuery(e.target.value); 
  };
  
  const createPostMutation = useMutation<ApiPost, Error, CreatePostMutationPayload>({
    mutationFn: async (postData) => {
      if (!token) throw new Error('Authentication required to create a post.');
      const apiPayload: CreatePostApiPayload = {
        title: postData.title,
        content: JSON.stringify(postData.content), 
        tags: postData.tags,
      };
      return authFetchJson<ApiPost>('/api/posts', {
        method: 'POST',
        token,
        body: apiPayload as any, 
      });
    },
    onSuccess: (data) => {
      console.log('Post created successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['posts'] }); 
      setTitle('');
      contentEditor?.commands.clearContent();
      setTags('');
      setSearchQuery('');
      setError(null);
      if (onPostCreated) {
        onPostCreated(data);
      }
    },
    onError: (error) => {
      console.error('Failed to create post:', error);
      setError(error.message || 'Could not create post. Please try again.');
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const currentContentJson = contentEditor?.getJSON();

    if (!title.trim() || !currentContentJson || contentEditor?.isEmpty) {
      setError('Title and content are required.');
      return;
    }
    if (!isAuthenticated) {
        setError('You must be logged in to create a post.');
        return;
    }
    const tagsArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    createPostMutation.mutate({ title, content: currentContentJson, tags: tagsArray });
  };

  if (!isAuthenticated) {
    return (
        <Card className="w-full max-w-lg mx-auto mt-8">
            <CardHeader>
                <CardTitle>Create a New Post</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Please log in to create a new post.</p>
            </CardContent>
        </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg mx-auto mt-8">
        <CardHeader>
            <CardTitle>Create a New Post</CardTitle>
            <CardDescription>Share an issue, need, or idea with the community.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
            <div className="space-y-1.5">
                <Label htmlFor="title">Title</Label>
                <Input 
                    id="title" 
                    placeholder="Enter a clear and concise title"
                    value={title} 
                    onChange={handleTitleChange} 
                    required 
                    disabled={createPostMutation.isPending}
                />
                {(isLoadingSuggestions || (searchQuery.length >=3 && suggestions && suggestions.length > 0)) && (
                    <div className="mt-2 p-3 border rounded-md bg-slate-50 dark:bg-slate-800 max-h-48 overflow-y-auto text-sm">
                        {isLoadingSuggestions && <p className="flex items-center text-muted-foreground"><Loader2 size={16} className="mr-2 animate-spin"/>Searching for similar posts...</p>}
                        {!isLoadingSuggestions && suggestions && suggestions.length > 0 && (
                            <>
                                <p className="font-semibold mb-1.5 text-muted-foreground">Similar posts found:</p>
                                <ul className="space-y-1">
                                    {suggestions.map(post => (
                                        <li key={post.id} className="text-muted-foreground hover:text-foreground">
                                            <span className="font-medium text-primary">{post.title}</span> ({post.upvote_count} upvotes)
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                        {!isLoadingSuggestions && suggestions && suggestions.length === 0 && searchQuery.length >=3 && (
                            <p className="text-muted-foreground">No similar posts found.</p>
                        )}
                    </div>
                )}
            </div>
            
            <div className="space-y-1.5">
                <Label htmlFor="content-editor-post">Content/Description</Label> 
                <div className="border rounded-md overflow-hidden"> {/* Wrapper for editor + toolbar */}
                    <EditorContent editor={contentEditor} id="content-editor-post" />
                    <EditorToolbar editor={contentEditor} />
                </div>
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input 
                    id="tags" 
                    placeholder="e.g., bug, feature-request, discussion"
                    value={tags} 
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTags(e.target.value)} 
                    disabled={createPostMutation.isPending}
                />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            </CardContent>
            <CardFooter>
            <Button type="submit" disabled={createPostMutation.isPending || contentEditor?.isEmpty}>
                {createPostMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
                Submit Post
            </Button>
            </CardFooter>
        </form>
    </Card>
  );
}; 
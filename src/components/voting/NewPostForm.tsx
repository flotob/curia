'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { authFetchJson } from '@/utils/authFetch';
import { ApiPost } from '@/app/api/posts/route';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, Search } from 'lucide-react';
import Link from 'next/link'; // For linking to suggested posts if we have a detail view

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
  onPostCreated?: (newPost: ApiPost) => void; // Optional callback after successful creation
}

interface CreatePostPayload {
  title: string;
  content: string;
  tags?: string[]; // Tags will be comma-separated string for input, then parsed
}

// Type for search suggestions (partial post data)
interface SuggestedPost extends Partial<ApiPost> {}

export const NewPostForm: React.FC<NewPostFormProps> = ({ onPostCreated }) => {
  const { token, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState(''); // Comma-separated string for input
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch search suggestions
  const { 
    data: suggestions, 
    isLoading: isLoadingSuggestions,
    // error: searchError, // We can handle search error display separately if needed
  } = useQuery<SuggestedPost[], Error>({
    queryKey: ['postSuggestions', searchQuery],
    queryFn: async () => {
      if (searchQuery.trim().length < 3) return []; // Min length for search
      return authFetchJson<SuggestedPost[]>(`/api/search/posts?q=${encodeURIComponent(searchQuery)}`);
    },
    enabled: searchQuery.trim().length >= 3, // Only run query if searchQuery is long enough
    // staleTime: 1000 * 60 * 5, // 5 minutes for suggestions
  });

  // Debounced function to update searchQuery state
  const debouncedSetSearchQuery = useCallback(
    debounce((query: string) => setSearchQuery(query), 500), // 500ms debounce
    []
  );

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    debouncedSetSearchQuery(e.target.value); // Update search query based on title
  };

  const createPostMutation = useMutation<ApiPost, Error, CreatePostPayload>({
    mutationFn: async (newPostData) => {
      if (!token) throw new Error('Authentication required to create a post.');
      return authFetchJson<ApiPost>('/api/posts', {
        method: 'POST',
        token,
        body: newPostData as any, // Explicitly cast body, authFetchJson handles object stringification
      });
    },
    onSuccess: (data) => {
      console.log('Post created successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['posts'] }); // Invalidate posts list to refresh feed
      setTitle('');
      setContent('');
      setTags('');
      setSearchQuery(''); // Clear search query and suggestions
      setError(null);
      if (onPostCreated) {
        onPostCreated(data);
      }
      // TODO: Show success toast/message
    },
    onError: (error) => {
      console.error('Failed to create post:', error);
      setError(error.message || 'Could not create post. Please try again.');
      // TODO: Show error toast/message
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required.');
      return;
    }
    if (!isAuthenticated) {
        setError('You must be logged in to create a post.');
        // TODO: Optionally trigger login flow here
        return;
    }

    const tagsArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);

    createPostMutation.mutate({ title, content, tags: tagsArray });
  };

  if (!isAuthenticated) {
    return (
        <Card className="w-full max-w-lg mx-auto mt-8">
            <CardHeader>
                <CardTitle>Create a New Post</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Please log in to create a new post.</p>
                {/* TODO: Add a login prompt/button if desired */}
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
                {/* Display suggestions */} 
                {(isLoadingSuggestions || (searchQuery.length >=3 && suggestions && suggestions.length > 0)) && (
                    <div className="mt-2 p-3 border rounded-md bg-slate-50 dark:bg-slate-800 max-h-48 overflow-y-auto text-sm">
                        {isLoadingSuggestions && <p className="flex items-center text-muted-foreground"><Loader2 size={16} className="mr-2 animate-spin"/>Searching for similar posts...</p>}
                        {!isLoadingSuggestions && suggestions && suggestions.length > 0 && (
                            <>
                                <p className="font-semibold mb-1.5 text-muted-foreground">Similar posts found:</p>
                                <ul className="space-y-1">
                                    {suggestions.map(post => (
                                        <li key={post.id} className="text-muted-foreground hover:text-foreground">
                                            {/* TODO: Link to post detail page or provide action (e.g., upvote) */}
                                            <span className="font-medium text-primary">{post.title}</span> ({post.upvote_count} upvotes)
                                            {/* <Link href={`/posts/${post.id}`} passHref><a className="text-blue-600 hover:underline">{post.title}</a></Link> - if detail page exists */}
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
                <Label htmlFor="content">Content/Description</Label>
                <Textarea 
                    id="content" 
                    placeholder="Describe your post in detail..."
                    value={content} 
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)} 
                    required 
                    rows={5}
                    disabled={createPostMutation.isPending}
                />
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
            <Button type="submit" disabled={createPostMutation.isPending} className="w-full">
                {createPostMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
                Submit Post
            </Button>
            </CardFooter>
        </form>
    </Card>
  );
}; 
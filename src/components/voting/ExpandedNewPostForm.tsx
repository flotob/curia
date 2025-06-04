'use client';

import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { authFetchJson } from '@/utils/authFetch';
import { ApiPost } from '@/app/api/posts/route';
import { ApiBoard } from '@/app/api/communities/[communityId]/boards/route';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, X } from 'lucide-react';
import { checkBoardAccess, getUserRoles } from '@/lib/roleService';
import { PostSettings } from '@/types/settings';
import { PostGatingControls } from '@/components/posting/PostGatingControls';

// Tiptap imports
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import Placeholder from '@tiptap/extension-placeholder';
import TiptapLink from '@tiptap/extension-link';
import TiptapImage from '@tiptap/extension-image';
import { EditorToolbar } from './EditorToolbar';

const lowlight = createLowlight(common);

interface ExpandedNewPostFormProps {
  onPostCreated?: (newPost: ApiPost) => void; 
  onCancel: () => void;
  boardId?: string | null;
  initialTitle?: string; // Pre-fill title from search query
}

interface CreatePostMutationPayload {
  title: string;
  content: object; // Tiptap JSON object
  tags?: string[]; 
  boardId: string;
  settings?: PostSettings;
}

interface CreatePostApiPayload {
  title: string;
  content: string; // Stringified Tiptap JSON
  tags?: string[];
  boardId: string;
  settings?: PostSettings;
}

export const ExpandedNewPostForm: React.FC<ExpandedNewPostFormProps> = ({ 
  onPostCreated, 
  onCancel,
  boardId,
  initialTitle = ''
}) => {
  const { token, isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState(initialTitle);
  const [tags, setTags] = useState(''); 
  const [selectedBoardId, setSelectedBoardId] = useState<string>(boardId || '');
  const [error, setError] = useState<string | null>(null);
  const [postSettings, setPostSettings] = useState<PostSettings['responsePermissions']>();

  // Update title when initialTitle prop changes
  useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle]);

  // Fetch available boards for the user's community
  const { data: boardsList, isLoading: isLoadingBoards } = useQuery<ApiBoard[]>({
    queryKey: ['boards', user?.cid],
    queryFn: async () => {
      if (!user?.cid || !token) throw new Error('Community context or token not available');
      return authFetchJson<ApiBoard[]>(`/api/communities/${user.cid}/boards`, { token });
    },
    enabled: !!isAuthenticated && !!token && !!user?.cid,
  });

  // Filter boards based on user access permissions
  const { data: accessibleBoardsList, isLoading: isFilteringBoards } = useQuery<ApiBoard[]>({
    queryKey: ['accessibleBoardsNewPost', boardsList, user?.userId, user?.roles],
    queryFn: async () => {
      if (!boardsList || !user || !user.cid) return [];
      
      // Admin override - admins can post to all boards
      if (user.isAdmin) {
        console.log('[ExpandedNewPostForm] Admin user - showing all boards');
        return boardsList;
      }
      
      // Get user roles for permission checking
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
      
      console.log(`[ExpandedNewPostForm] Filtered boards: ${filteredBoards.length}/${boardsList.length} accessible`);
      return filteredBoards;
    },
    enabled: !!boardsList && !!user && !!user.cid,
  });

  // Set default board when boardId prop changes or boards load
  useEffect(() => {
    if (boardId) {
      setSelectedBoardId(boardId);
    } else if (accessibleBoardsList && accessibleBoardsList.length > 0 && !selectedBoardId) {
      // If no board is pre-selected, default to first accessible board
      setSelectedBoardId(accessibleBoardsList[0].id.toString());
    }
  }, [boardId, accessibleBoardsList, selectedBoardId]);

  const contentEditor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] }, 
        codeBlock: false, 
      }),
      TiptapLink.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
      TiptapImage, 
      CodeBlockLowlight.configure({ lowlight }),
      Markdown.configure({ html: false, tightLists: true, transformPastedText: true }),
      Placeholder.configure({
        placeholder: 'Describe your post in detail... Use the toolbar below to format your content!',
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert leading-relaxed focus:outline-none min-h-[200px] px-4 py-3 w-full',
      },
    },
  });

  const createPostMutation = useMutation<ApiPost, Error, CreatePostMutationPayload>({
    mutationFn: async (postData) => {
      if (!token) throw new Error('Authentication required to create a post.');
      const apiPayload: CreatePostApiPayload = {
        title: postData.title,
        content: JSON.stringify(postData.content), 
        tags: postData.tags,
        boardId: postData.boardId,
        settings: postData.settings,
      };
      return authFetchJson<ApiPost>(`/api/posts`, {
        method: 'POST',
        token,
        body: JSON.stringify(apiPayload),
      });
    },
    onSuccess: (data) => {
      console.log('Post created successfully:', data);
      
      // Invalidate infinite scroll queries to refresh the feed
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      
      // Also invalidate accessible boards queries in case board list needs updating
      queryClient.invalidateQueries({ queryKey: ['accessibleBoardsNewPost'] });
      
      setTitle('');
      contentEditor?.commands.clearContent();
      setTags('');
      setPostSettings(undefined);
      setError(null);
      
      if (onPostCreated) {
        onPostCreated(data);
      }
      
      // Auto-close form after successful creation
      onCancel();
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
    if (!selectedBoardId) {
      setError('Please select a board for your post.');
      return;
    }
    if (!isAuthenticated) {
        setError('You must be logged in to create a post.');
        return;
    }
    const tagsArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    const settings = postSettings ? { responsePermissions: postSettings } : undefined;
    createPostMutation.mutate({ title, content: currentContentJson, tags: tagsArray, boardId: selectedBoardId, settings });
  };

  if (!isAuthenticated) {
    return (
      <Card className="w-full mx-auto mt-6 mb-8">
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
    <Card className="w-full mx-auto mt-4 sm:mt-6 mb-6 sm:mb-8 border-2 shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="px-4 sm:px-6 bg-gradient-to-br from-background to-muted/20">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg sm:text-xl bg-gradient-to-br from-foreground to-foreground/80 bg-clip-text">Create a New Post</CardTitle>
            <CardDescription className="text-sm">Share an issue, need, or idea with the community.</CardDescription>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground"
          >
            <X size={20} />
          </Button>
        </div>
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-sm font-medium">Title</Label>
            <Input 
              id="title" 
              placeholder="Enter a clear and compelling title..."
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              required 
              disabled={createPostMutation.isPending}
              className="text-sm sm:text-base border-2 rounded-xl px-4 py-3 transition-all duration-200 focus:border-primary focus:shadow-lg focus:shadow-primary/10"
            />
          </div>

          {/* Only show board selector if no specific board is provided */}
          {!boardId && (
            <div className="space-y-1.5">
              <Label htmlFor="board-select" className="text-sm font-medium">Board</Label>
              {isLoadingBoards || isFilteringBoards ? (
                <div className="flex items-center p-3 border rounded-md bg-muted/50">
                  <Loader2 size={14} className="mr-2 animate-spin" />
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    {isFilteringBoards ? 'Checking board permissions...' : 'Loading boards...'}
                  </span>
                </div>
              ) : accessibleBoardsList && accessibleBoardsList.length > 0 ? (
                <Select value={selectedBoardId} onValueChange={setSelectedBoardId} disabled={createPostMutation.isPending}>
                  <SelectTrigger id="board-select" className="text-sm sm:text-base">
                    <SelectValue placeholder="Select a board" />
                  </SelectTrigger>
                  <SelectContent>
                    {accessibleBoardsList.map((board) => (
                      <SelectItem key={board.id} value={board.id.toString()}>
                        <div>
                          <div className="font-medium text-sm">{board.name}</div>
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
                  <p className="text-xs sm:text-sm text-muted-foreground">No boards available</p>
                </div>
              )}
            </div>
          )}
          
          <div className="space-y-1.5">
            <Label htmlFor="content-editor-post" className="text-sm font-medium">Content/Description</Label> 
            <div className="relative group">
              <div className="border-2 border-input rounded-xl overflow-hidden transition-all duration-200 group-focus-within:border-primary group-focus-within:shadow-lg group-focus-within:shadow-primary/10 bg-background">
                <EditorContent 
                  editor={contentEditor} 
                  id="content-editor-post" 
                  className="prose-headings:font-semibold prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-code:text-foreground"
                />
                <div className="border-t border-border/50 bg-muted/30">
                  <EditorToolbar editor={contentEditor} />
                </div>
              </div>
              {/* Focus ring for better accessibility */}
              <div className="absolute inset-0 rounded-xl ring-2 ring-transparent group-focus-within:ring-primary/20 transition-all duration-200 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tags" className="text-sm font-medium">Tags (comma-separated)</Label>
            <Input 
              id="tags" 
              placeholder="e.g., bug, feature-request, discussion"
              value={tags} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTags(e.target.value)} 
              disabled={createPostMutation.isPending}
              className="text-sm sm:text-base border-2 rounded-xl px-4 py-3 transition-all duration-200 focus:border-primary focus:shadow-lg focus:shadow-primary/10"
            />
          </div>

          {/* Post Gating Controls */}
          <PostGatingControls
            value={postSettings}
            onChange={setPostSettings}
            disabled={createPostMutation.isPending}
          />
          
          {error && <p className="text-xs sm:text-sm text-red-500">{error}</p>}
        </CardContent>
        
        <CardFooter className="flex justify-end gap-2 px-4 sm:px-6">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            className="text-sm sm:text-base px-3 sm:px-4"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={createPostMutation.isPending || contentEditor?.isEmpty} className="text-sm sm:text-base px-3 sm:px-4">
            {createPostMutation.isPending && <Loader2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />} 
            Submit Post
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}; 
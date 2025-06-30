'use client';

import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useTypingEvents } from '@/hooks/useTypingEvents';
import { authFetchJson } from '@/utils/authFetch';
import { ApiPost } from '@/app/api/posts/route';
import { ApiBoard } from '@/app/api/communities/[communityId]/boards/route';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, Edit3 } from 'lucide-react';
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
import { EnhancedImageExtension } from '@/components/tiptap/EnhancedImageExtension';
import { EditorToolbar } from './EditorToolbar'; // Import the toolbar
import { MentionExtension } from '@/components/mentions/MentionExtension';
// highlight.js CSS is now in layout.tsx

const lowlight = createLowlight(common);

// Simple debounce utility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function debounce<T extends (...args: any[]) => any>(func: T, waitFor: number) {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), waitFor);
  };
}

interface NewPostFormProps {
  onPostCreated?: (newPost: ApiPost) => void; 
  boardId?: string | null; // Optional - pre-select this board if provided
}

interface CreatePostMutationPayload {
  title: string;
  content: object; // Tiptap JSON object
  tags?: string[]; 
  boardId: string; // Add boardId to the mutation payload
  settings?: PostSettings; // Add settings to the mutation payload
}

interface CreatePostApiPayload {
    title: string;
    content: string; // Stringified Tiptap JSON
    tags?: string[];
    boardId: string; // Add boardId to the API payload
    settings?: PostSettings; // Add settings to the API payload
}

type SuggestedPost = Partial<ApiPost>;

export const NewPostForm: React.FC<NewPostFormProps> = ({ onPostCreated, boardId }) => {
  const { token, isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);

  const [title, setTitle] = useState('');
  const [tags, setTags] = useState(''); 
  const [selectedBoardId, setSelectedBoardId] = useState<string>(boardId || ''); // Add board selection state
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [postSettings, setPostSettings] = useState<PostSettings['responsePermissions']>();

  // Set up typing events for real-time indicators when creating posts
  const typingEvents = useTypingEvents({
    boardId: selectedBoardId ? parseInt(selectedBoardId) : 0,
    postId: undefined, // No postId for new posts
    enabled: isAuthenticated && isExpanded && !!selectedBoardId, // Only enable when form is expanded and board is selected
    onTypingStart: () => console.log('[NewPostForm] Started typing in board', selectedBoardId),
    onTypingStop: () => console.log('[NewPostForm] Stopped typing in board', selectedBoardId)
  });

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
        console.log('[NewPostForm] Admin user - showing all boards');
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
      
      console.log(`[NewPostForm] Filtered boards: ${filteredBoards.length}/${boardsList.length} accessible`);
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
      EnhancedImageExtension, 
      // Explicitly use CodeBlockLowlight for its input rules and syntax highlighting
      CodeBlockLowlight.configure({ lowlight }),
      // Markdown extension for parsing pasted Markdown
      Markdown.configure({ html: false, tightLists: true, transformPastedText: true }),
      // Utility extensions
      Placeholder.configure({
        placeholder: 'Describe your post in detail... Use the toolbar below to format your content!',
      }),
      // 🏷️ User mentions extension
      MentionExtension,
      // REMOVED: Standalone Heading.configure(...) - StarterKit now handles headings
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert leading-relaxed focus:outline-none min-h-[200px] px-4 py-3 w-full',
      },
    },
    onUpdate: ({ editor }) => {
      // Trigger typing events when editor content changes
      const combinedContent = title + editor.getText().trim();
      typingEvents.handleInputChange(combinedContent);
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

  // Create debounced function without useCallback to avoid dependency issues
  const debouncedSetSearchQuery = debounce((query: string) => setSearchQuery(query), 500);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    // Optionally, update search query based on title AND/OR content in future
    debouncedSetSearchQuery(newTitle);
    
    // Trigger typing events when title changes
    const combinedContent = newTitle + (contentEditor?.getText() || '');
    typingEvents.handleInputChange(combinedContent);
  };
  
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
      setSearchQuery('');
      setPostSettings(undefined);
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
    
    // Stop typing indicator immediately when submitting
    typingEvents.handleSubmit();
    
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
        <Card className="w-full max-w-2xl mx-auto mt-6 mb-8">
            <CardHeader>
                <CardTitle>Create a New Post</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Please log in to create a new post.</p>
            </CardContent>
        </Card>
    );
  }

  if (!isExpanded) {
    return (
      <div 
        className="w-full mx-auto mt-4 sm:mt-6 mb-6 sm:mb-8 p-3 sm:p-4 border-2 border-dashed border-muted hover:border-primary/70 rounded-lg cursor-pointer transition-all duration-200 ease-in-out group bg-card hover:bg-muted/30"
        onClick={() => setIsExpanded(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setIsExpanded(true)}
        aria-label="Create a new post"
      >
        <div className="flex items-center text-muted-foreground group-hover:text-primary transition-colors">
          <Edit3 size={18} className="mr-3 flex-shrink-0 sm:mr-3" />
          <p className="text-sm sm:text-md font-medium">Share an issue, need, or idea...</p>
        </div>
      </div>
    );
  }

  return (
    <Card className="w-full mx-auto mt-4 sm:mt-6 mb-6 sm:mb-8 border-2 shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="px-4 sm:px-6 bg-gradient-to-br from-background to-muted/20">
            <CardTitle className="text-lg sm:text-xl bg-gradient-to-br from-foreground to-foreground/80 bg-clip-text">Create a New Post</CardTitle>
            <CardDescription className="text-sm">Share an issue, need, or idea with the community.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
            <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
            <div className="space-y-1.5">
                <Label htmlFor="title" className="text-sm font-medium">Title</Label>
                <Input 
                    id="title" 
                    placeholder="Enter a clear and compelling title..."
                    value={title} 
                    onChange={handleTitleChange}
                    onFocus={() => typingEvents.handleFocus()}
                    onBlur={() => typingEvents.handleBlur()}
                    required 
                    disabled={createPostMutation.isPending}
                    className="text-sm sm:text-base border-2 rounded-xl px-4 py-3 transition-all duration-200 focus:border-primary focus:shadow-lg focus:shadow-primary/10"
                />
                {(isLoadingSuggestions || (searchQuery.length >=3 && suggestions && suggestions.length > 0)) && (
                    <div className="mt-2 p-3 border rounded-md bg-slate-50 dark:bg-slate-800 max-h-40 sm:max-h-48 overflow-y-auto text-xs sm:text-sm">
                        {isLoadingSuggestions && <p className="flex items-center text-muted-foreground"><Loader2 size={14} className="mr-2 animate-spin"/>Searching for similar posts...</p>}
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

            {/* Only show board selector if no specific board is provided (i.e., on home page) */}
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
              onClick={() => {
                setIsExpanded(false);
              }}
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
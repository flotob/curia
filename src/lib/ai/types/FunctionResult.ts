export interface SearchResultsData {
  type: 'search_results';
  success: boolean;
  messageForAI?: string;
  errorForAI?: string;
  searchResults?: Array<{
    id: number;
    title: string;
    author: string;
    authorAvatar?: string;
    upvotes: number;
    snippet: string;
    boardName: string;
    created_at: string;
    // Navigation metadata
    boardId: number;
    postId: number;
    communityShortId?: string;
    pluginId?: string;
    navigationType: 'internal' | 'external';
  }>;
}

// Keep the old interface for backward compatibility during transition
export interface SearchResults {
  success: boolean;
  messageForAI?: string;
  errorForAI?: string;
  searchResults?: Array<{
    title: string;
    author: string;
    upvotes: number;
    snippet: string;
  }>;
}

export interface PostCreationGuidance {
  type: 'post_creation_guidance';
  explanation: string;
  buttonText: string;
  workflow: string;
}

export type FunctionResult = SearchResultsData | PostCreationGuidance; 
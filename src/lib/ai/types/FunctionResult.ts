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

export type FunctionResult = SearchResults | PostCreationGuidance; 
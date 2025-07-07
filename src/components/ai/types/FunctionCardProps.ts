import { PostCreationGuidance, SearchResultsData, LockSearchResultsData } from '@/lib/ai/types/FunctionResult';

export interface FunctionCardProps {
  data: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  onAction?: (action: string, params?: any) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
}

// Specific data types for each function card
export interface PostCreationGuidanceData {
  type: 'post_creation_guidance';
  explanation: string;
  buttonText: string;
  workflow: string;
}

// Add more specific data types as we add more function cards
export type FunctionCardData = PostCreationGuidance | SearchResultsData | LockSearchResultsData;

// Generic props with typed data
export interface TypedFunctionCardProps<T> {
  data: T;
  onAction?: (action: string, params?: any) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
}

// Specific card prop types
export type PostCreationGuidanceCardProps = TypedFunctionCardProps<PostCreationGuidance>;
export type SearchResultsCardProps = TypedFunctionCardProps<SearchResultsData>;
export type LockSearchResultsCardProps = TypedFunctionCardProps<LockSearchResultsData>;

// Re-export the data interfaces for convenience
export type { PostCreationGuidance, SearchResultsData, LockSearchResultsData }; 
import { SearchResultsData } from '@/lib/ai/types/FunctionResult';

export interface FunctionCardProps {
  data: any; // Will be typed per component
  onAction?: (action: string, params?: any) => void;
}

// Specific data types for each function card
export interface PostCreationGuidanceData {
  type: 'post_creation_guidance';
  explanation: string;
  buttonText: string;
  workflow: string;
}

// Add more specific data types as we add more function cards
export type FunctionCardData = PostCreationGuidanceData | SearchResultsData;

// Generic props with typed data
export interface TypedFunctionCardProps<T = FunctionCardData> {
  data: T;
  onAction?: (action: string, params?: any) => void;
} 
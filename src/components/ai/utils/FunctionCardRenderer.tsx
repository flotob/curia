import React, { Suspense, lazy } from 'react';
import { FunctionCardProps } from '../types/FunctionCardProps';

// Lazy load function card components for better performance
const PostCreationGuidanceCard = lazy(() => 
  import('../function-cards/PostCreationGuidanceCard').then(module => ({
    default: module.PostCreationGuidanceCard
  }))
);

// Registry mapping function result types to their components
const FUNCTION_CARD_COMPONENTS = {
  post_creation_guidance: PostCreationGuidanceCard,
  // Add more function card components as we create them
  // board_suggestions: BoardSuggestionCard,
  // user_profile: UserProfileCard,
} as const;

export type FunctionCardType = keyof typeof FUNCTION_CARD_COMPONENTS;

export interface FunctionCardRendererProps extends FunctionCardProps {
  type: FunctionCardType;
}

export function FunctionCardRenderer({ type, data, onAction }: FunctionCardRendererProps) {
  const Component = FUNCTION_CARD_COMPONENTS[type];
  
  if (!Component) {
    console.warn(`Unknown function card type: ${type}`);
    return null;
  }
  
  return (
    <Suspense fallback={
      <div className="mt-2 p-3 bg-muted rounded-md animate-pulse">
        <div className="h-4 bg-muted-foreground/20 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-muted-foreground/20 rounded w-1/2"></div>
      </div>
    }>
      <Component data={data} onAction={onAction} />
    </Suspense>
  );
}

// Helper function to check if a type is a valid function card type
export function isValidFunctionCardType(type: string): type is FunctionCardType {
  return type in FUNCTION_CARD_COMPONENTS;
} 
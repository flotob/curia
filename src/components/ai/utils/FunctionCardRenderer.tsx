import React, { Suspense, lazy } from 'react';

// Lazy load function card components for better performance
const PostCreationGuidanceCard = lazy(() => 
  import('../function-cards/PostCreationGuidanceCard').then(module => ({
    default: module.PostCreationGuidanceCard
  }))
);

const SearchResultsCard = lazy(() => 
  import('../function-cards/SearchResultsCard').then(module => ({
    default: module.SearchResultsCard
  }))
);

// Registry mapping function result types to their components
const FUNCTION_CARD_COMPONENTS = {
  post_creation_guidance: PostCreationGuidanceCard,
  search_results: SearchResultsCard,
  // Add more function card components as we create them
  // board_suggestions: BoardSuggestionCard,
  // user_profile: UserProfileCard,
} as const;

export type FunctionCardType = keyof typeof FUNCTION_CARD_COMPONENTS;

export interface FunctionCardRendererProps {
  type: FunctionCardType;
  data: any;
  onAction?: (action: string, params?: any) => void;
}

export function FunctionCardRenderer({ type, data, onAction }: FunctionCardRendererProps) {
  const Component = FUNCTION_CARD_COMPONENTS[type];
  
  if (!Component) {
    console.warn(`Unknown function card type: ${type}`);
    return null;
  }
  
  // Cast Component to any to bypass TypeScript's strict type checking
  // since we know the correct data type is passed based on the type discriminator
  const ComponentToRender = Component as any;
  
  return (
    <Suspense fallback={
      <div className="mt-2 p-3 bg-muted rounded-md animate-pulse">
        <div className="h-4 bg-muted-foreground/20 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-muted-foreground/20 rounded w-1/2"></div>
      </div>
    }>
      <ComponentToRender data={data} onAction={onAction} />
    </Suspense>
  );
}

// Helper function to check if a type is a valid function card type
export function isValidFunctionCardType(type: string): type is FunctionCardType {
  return type in FUNCTION_CARD_COMPONENTS;
} 
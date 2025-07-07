import React, { lazy, Suspense } from 'react';

// Lazy load function card components
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

const LockSearchResultsCard = lazy(() => 
  import('../function-cards/LockSearchResultsCard').then(module => ({
    default: module.LockSearchResultsCard
  }))
);

// Registry of function card components
const FUNCTION_CARD_COMPONENTS = {
  post_creation_guidance: PostCreationGuidanceCard,
  search_results: SearchResultsCard,
  lock_search_results: LockSearchResultsCard,
  // Add more function card components as we create them
  // board_suggestions: BoardSuggestionCard,
  // user_profile: UserProfileCard,
} as const;

export type FunctionCardType = keyof typeof FUNCTION_CARD_COMPONENTS;

export interface FunctionCardRendererProps {
  data: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  onAction?: (action: string, params?: any) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export function FunctionCardRenderer({ data, onAction }: FunctionCardRendererProps) {
  // Get the component type from the data
  const componentType = data.type as keyof typeof FUNCTION_CARD_COMPONENTS;
  const Component = FUNCTION_CARD_COMPONENTS[componentType];
  
  if (!Component) {
    console.warn(`[FunctionCardRenderer] No component found for type: ${componentType}`);
    return null;
  }
  
  // Cast Component to any to bypass TypeScript's strict type checking
  const ComponentToRender = Component as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  return (
    <Suspense fallback={<div className="animate-pulse bg-muted rounded-md h-20" />}>
      <ComponentToRender data={data} onAction={onAction} />
    </Suspense>
  );
}

// Helper function to check if a type is a valid function card type
export function isValidFunctionCardType(type: string): type is FunctionCardType {
  return type in FUNCTION_CARD_COMPONENTS;
} 
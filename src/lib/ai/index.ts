// Main AI system exports
export { FunctionRegistry } from './registry/FunctionRegistry';

export type { FunctionResult, SearchResults, PostCreationGuidance } from './types/FunctionResult';
export type { AIFunctionCall, FunctionContext } from './types/FunctionCall';

// Functions
export { searchCommunityKnowledge } from './functions/searchCommunityKnowledge';
export { searchCommunityComments } from './functions/searchCommunityComments';
export { showPostCreationGuidance } from './functions/showPostCreationGuidance';
export { getCommunityTrends } from './functions/getCommunityTrends';
export { searchLocks } from './functions/searchLocks'; 
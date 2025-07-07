// Types
export type { AIFunctionCall, FunctionContext } from './types/FunctionCall';
export type { FunctionResult, SearchResults, PostCreationGuidance } from './types/FunctionResult';

// Character System
export { ClippyCharacterSystem, type PromptContext } from './character/ClippyCharacterSystem';

// Registry
export { FunctionRegistry } from './registry/FunctionRegistry';

// Functions
export { searchCommunityKnowledge } from './functions/searchCommunityKnowledge';
export { showPostCreationGuidance } from './functions/showPostCreationGuidance';
export { getCommunityTrends } from './functions/getCommunityTrends'; 
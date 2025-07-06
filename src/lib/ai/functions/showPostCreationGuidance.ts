import { z } from 'zod';
import { AIFunctionCall, FunctionContext } from '../types/FunctionCall';
import { PostCreationGuidance } from '../types/FunctionResult';

export const showPostCreationGuidance: AIFunctionCall = {
  name: 'showPostCreationGuidance',
  description: 'Show guidance for creating a new post with actionable UI component',
  parameters: z.object({
    explanation: z.string().describe('Explain the search-first workflow for post creation'),
    buttonText: z.string().describe('Text for the action button')
  }),
  execute: async (params: { explanation: string; buttonText: string }, context: FunctionContext): Promise<PostCreationGuidance> => {
    // This function doesn't use context but interface requires it
    void context;
    return {
      type: 'post_creation_guidance',
      explanation: params.explanation,
      buttonText: params.buttonText,
      workflow: 'search_first'
    };
  }
}; 
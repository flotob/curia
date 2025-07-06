import { z } from 'zod';

export interface FunctionContext {
  userId: string;
  communityId: string;
  boardId?: string;
  postId?: string;
}

export interface AIFunctionCall {
  name: string;
  description: string;
  parameters: z.ZodSchema;
  execute: (params: any, context: FunctionContext) => Promise<any>;
} 
import { AIFunctionCall, FunctionContext } from '../types/FunctionCall';
import { searchCommunityKnowledge } from '../functions/searchCommunityKnowledge';
import { showPostCreationGuidance } from '../functions/showPostCreationGuidance';
import { getCommunityTrends } from '../functions/getCommunityTrends';
import { searchLocks } from '../functions/searchLocks';

export class FunctionRegistry {
  private functions = new Map<string, AIFunctionCall>();
  
  constructor() {
    // Register all available functions
    this.register(searchCommunityKnowledge);
    this.register(showPostCreationGuidance);
    this.register(getCommunityTrends);
    this.register(searchLocks);
  }
  
  register(fn: AIFunctionCall) {
    this.functions.set(fn.name, fn);
  }
  
  get(name: string): AIFunctionCall | undefined {
    return this.functions.get(name);
  }
  
  getAllForAI(context: FunctionContext) {
    const tools: Record<string, any> = {};
    this.functions.forEach((fn, name) => {
      tools[name] = {
        description: fn.description,
        parameters: fn.parameters,
        execute: async (params: any) => fn.execute(params, context)
      };
    });
    return tools;
  }
  
  getAvailableFunctions(): string[] {
    return Array.from(this.functions.keys());
  }
} 
/**
 * Backend URL Builder Library
 * 
 * Provides server-side semantic URL generation without HTTP API dependencies.
 * Designed for RSS feeds, Telegram notifications, email systems, and other
 * server contexts where frontend URL building patterns don't work.
 */

export { SemanticUrlBuilder } from './SemanticUrlBuilder';
export { SlugGenerator } from './SlugGenerator';
export { DatabaseService } from './DatabaseService';

export type {
  SemanticUrlParams,
  BulkUrlParams,
  BulkUrlResult,
  BulkUrlContext,
  UrlRecord,
  CreateUrlParams,
  SlugCollisionResult
} from './types';

// Import types for convenience functions
import { SemanticUrlBuilder } from './SemanticUrlBuilder';
import type { 
  SemanticUrlParams,
  BulkUrlParams,
  BulkUrlResult,
  BulkUrlContext
} from './types';

/**
 * Convenience function to create a semantic URL builder instance
 */
export function createSemanticUrlBuilder(): SemanticUrlBuilder {
  return new SemanticUrlBuilder();
}

/**
 * Convenience function for single URL generation with error handling
 */
export async function generateSemanticUrl(params: SemanticUrlParams): Promise<string> {
  const builder = new SemanticUrlBuilder();
  return builder.generateSemanticUrl(params);
}

/**
 * Convenience function for bulk URL generation with error handling
 */
export async function generateBulkSemanticUrls(
  posts: BulkUrlParams[],
  context: BulkUrlContext
): Promise<BulkUrlResult[]> {
  const builder = new SemanticUrlBuilder();
  return builder.generateBulkUrls(posts, context);
} 
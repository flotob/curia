/**
 * TypeScript interfaces for Backend URL Builder Library
 */

export interface SemanticUrlParams {
  postId: number;
  boardId: number;
  postTitle: string;
  boardName: string;
  communityShortId: string;
  pluginId: string;
  shareSource: string;
  baseUrl?: string; // Optional override for testing
}

export interface BulkUrlParams {
  postId: number;
  boardId: number;
  postTitle: string;
  boardName: string;
  shareSource?: string;
}

export interface BulkUrlResult {
  postId: number;
  url: string | null;
  error?: string;
}

export interface UrlRecord {
  id: number;
  slug: string;
  community_short_id: string;
  board_slug: string;
  post_id: number;
  board_id: number;
  plugin_id: string;
  share_token: string;
  post_title: string;
  board_name: string;
  created_at: string;
  access_count: number;
  expires_at?: string;
}

export interface CreateUrlParams {
  slug: string;
  community_short_id: string;
  board_slug: string;
  post_id: number;
  board_id: number;
  plugin_id: string;
  share_token: string;
  post_title: string;
  board_name: string;
  share_source: string;
}

export interface SlugCollisionResult {
  slug: string;
  isUnique: boolean;
  attempts: number;
}

export interface BulkUrlContext {
  communityShortId: string;
  pluginId: string;
  baseUrl: string;
} 
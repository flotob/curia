/**
 * TypeScript interfaces for the embed system
 */

export interface EmbedConfig {
  community: string | null;
  theme: 'light' | 'dark';
  container: string | null;
  height: string;
}

export interface EmbedState {
  currentPhase: 'auth' | 'forum';
  authContext: any | null;
  iframe: HTMLIFrameElement | null;
  loadingDiv: HTMLElement | null;
  container: HTMLElement;
  config: EmbedConfig;
}

export interface EmbedUrls {
  hostUrl: string;
  forumUrl: string;
}

export interface PostMessageData {
  type: string;
  [key: string]: any;
}

export interface EmbedReference {
  iframe: HTMLIFrameElement | null;
  container: HTMLElement;
  config: EmbedConfig;
  authContext: any | null;
  phase: 'auth' | 'forum';
}

// Global embed references
declare global {
  interface Window {
    curiaEmbed?: Record<string, EmbedReference>;
  }
} 
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

// Phase 3: Single embed per page (self-contained)
export interface Phase3EmbedReference {
  container: HTMLElement;
  pluginHost: any;
  config: EmbedConfig;
  destroy: () => void;
}

// Global embed references
declare global {
  interface Window {
    // Phase 3: Single embed per page
    curiaEmbed?: Phase3EmbedReference;
  }
} 
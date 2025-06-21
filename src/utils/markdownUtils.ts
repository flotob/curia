import { Editor } from '@tiptap/react';

/**
 * Utilities for handling backwards-compatible content between TipTap JSON and Markdown formats
 * 
 * This class enables:
 * - Loading both legacy JSON content and new Markdown content into TipTap editors
 * - Saving new content as clean Markdown instead of verbose JSON
 * - Zero-migration approach where database can contain mixed formats
 */
export class MarkdownUtils {
  /**
   * Extract clean Markdown from TipTap editor
   * Used when saving new content to database
   */
  static getMarkdown(editor: Editor): string {
    try {
      return editor.storage.markdown.getMarkdown();
    } catch (error) {
      console.warn('[MarkdownUtils] Failed to extract Markdown, falling back to plain text:', error);
      return editor.getText();
    }
  }
  
  /**
   * Load content into editor - handles both legacy JSON and new Markdown formats
   * This is the key backwards compatibility function
   */
  static loadContent(editor: Editor, content: string): void {
    if (!content || content.trim() === '') {
      editor.commands.setContent('');
      return;
    }

    if (this.isLegacyJSON(content)) {
      // Load existing JSON content (old posts/comments)
      try {
        const jsonContent = JSON.parse(content);
        editor.commands.setContent(jsonContent);
        console.log('[MarkdownUtils] Loaded legacy JSON content');
      } catch (error) {
        console.error('[MarkdownUtils] Failed to parse legacy JSON content:', error);
        // Fallback to plain text
        editor.commands.setContent(content);
      }
    } else {
      // Load new Markdown content (Markdown extension must be present)
      // TipTap's setContent signature currently lacks strict typing for parseOptions;
      // casting to unknown first then to appropriate type to avoid any
      const parseOpts = {
        parseOptions: {
          preserveWhitespace: 'full',
          from: 'markdown',
        },
      } as unknown as Parameters<typeof editor.commands.setContent>[2];
      // Use overload with parse options
      (editor.commands.setContent as unknown as (content: string, emitUpdate?: boolean, parseOptions?: typeof parseOpts) => void)(content, undefined, parseOpts);
      console.log('[MarkdownUtils] Loaded Markdown content');
    }
  }
  
  /**
   * Detect if content is legacy TipTap JSON format
   * Returns true for old content, false for new Markdown content
   */
  static isLegacyJSON(content: string): boolean {
    if (!content || typeof content !== 'string') {
      return false;
    }
    
    try {
      const parsed = JSON.parse(content);
      // TipTap JSON always has type: 'doc' and content array at root
      return parsed && 
             typeof parsed === 'object' && 
             parsed.type === 'doc' && 
             Array.isArray(parsed.content);
    } catch {
      // Not valid JSON = Markdown content
      return false;
    }
  }
  
  /**
   * Get a preview/summary of content regardless of format
   * Useful for search, meta descriptions, etc.
   */
  static getTextPreview(content: string, maxLength: number = 160): string {
    if (!content) return '';
    
    let text = '';
    
    if (this.isLegacyJSON(content)) {
      // Extract text from JSON structure
      try {
        const parsed = JSON.parse(content);
        text = this.extractTextFromJSON(parsed);
      } catch {
        text = content;
      }
    } else {
      // Extract text from Markdown (remove formatting)
      text = content
        .replace(/^#+\s+/gm, '')           // Remove heading markers
        .replace(/\*\*(.*?)\*\*/g, '$1')   // Remove bold markers
        .replace(/\*(.*?)\*/g, '$1')       // Remove italic markers
        .replace(/`([^`]+)`/g, '$1')       // Remove inline code markers
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Extract link text
        .replace(/^\s*[-*+]\s+/gm, '')     // Remove list markers
        .replace(/^\s*\d+\.\s+/gm, '')     // Remove numbered list markers
        .replace(/\n+/g, ' ')              // Replace newlines with spaces
        .trim();
    }
    
    if (text.length > maxLength) {
      return text.substring(0, maxLength).replace(/\s+\S*$/, '') + '...';
    }
    
    return text || 'Content preview not available.';
  }
  
  /**
   * Recursively extract plain text from TipTap JSON structure
   * Used for legacy content preview
   */
  private static extractTextFromJSON(node: unknown): string {
    if (!node || typeof node !== 'object') return '';
    
    const nodeObj = node as Record<string, unknown>;
    
    if (nodeObj.type === 'text' && typeof nodeObj.text === 'string') {
      return nodeObj.text;
    }
    
    if (nodeObj.content && Array.isArray(nodeObj.content)) {
      let text = '';
      for (const child of nodeObj.content) {
        text += this.extractTextFromJSON(child);
        // Add spacing after paragraphs and headings
        const childObj = child as Record<string, unknown>;
        if (childObj.type === 'paragraph' || childObj.type === 'heading') {
          text += ' ';
        }
      }
      return text;
    }
    
    return '';
  }
  
  /**
   * Development/debugging helper to analyze content format
   */
  static analyzeContent(content: string): {
    format: 'json' | 'markdown' | 'empty';
    size: number;
    preview: string;
  } {
    if (!content || content.trim() === '') {
      return { format: 'empty', size: 0, preview: '' };
    }
    
    const isJSON = this.isLegacyJSON(content);
    
    return {
      format: isJSON ? 'json' : 'markdown',
      size: content.length,
      preview: this.getTextPreview(content, 50)
    };
  }
} 
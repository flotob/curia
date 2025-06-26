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
   * Extract clean Markdown from TipTap editor with mention support
   * Used when saving new content to database
   */
  static getMarkdown(editor: Editor): string {
    try {
      // First try the standard markdown extraction
      const standardMarkdown = editor.storage.markdown.getMarkdown();
      
      // Check if content has mentions - if not, return standard markdown
      const hasReplacements = standardMarkdown.includes('[mention]');
      if (!hasReplacements) {
        return standardMarkdown;
      }
      
      // If we have mentions, do custom serialization
      const jsonContent = editor.getJSON();
      const customMarkdown = this.serializeToMarkdown(jsonContent);
      
      return customMarkdown;
    } catch (error) {
      console.warn('[MarkdownUtils] Failed to extract Markdown, falling back to plain text:', error);
      return editor.getText();
    }
  }

  /**
   * Custom markdown serialization that properly handles mentions
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static serializeToMarkdown(node: any): string {
    if (!node) return '';

    // Handle mention nodes
    if (node.type === 'mention') {
      const label = node.attrs?.label || node.attrs?.id || 'unknown';
      return `@${label}`;
    }

    // Handle text nodes
    if (node.type === 'text') {
      let text = node.text || '';
      
      // Apply marks (bold, italic, etc.)
      if (node.marks) {
        for (const mark of node.marks) {
          switch (mark.type) {
            case 'bold':
              text = `**${text}**`;
              break;
            case 'italic':
              text = `*${text}*`;
              break;
            case 'code':
              text = `\`${text}\``;
              break;
            case 'link':
              const href = mark.attrs?.href || '#';
              text = `[${text}](${href})`;
              break;
            case 'strike':
              text = `~~${text}~~`;
              break;
          }
        }
      }
      
      return text;
    }

    // Handle nodes with content
    if (node.content && Array.isArray(node.content)) {
      let content = '';
      for (const child of node.content) {
        content += this.serializeToMarkdown(child);
      }

      // Wrap content based on node type
      switch (node.type) {
        case 'doc':
          return content.trim();
        case 'paragraph':
          return content + '\n\n';
        case 'heading':
          const level = node.attrs?.level || 1;
          return '#'.repeat(level) + ' ' + content + '\n\n';
        case 'blockquote':
          return content.split('\n').map(line => line ? `> ${line}` : '>').join('\n') + '\n\n';
        case 'codeBlock':
          const language = node.attrs?.language || '';
          return `\`\`\`${language}\n${content}\n\`\`\`\n\n`;
        case 'bulletList':
          return content;
        case 'orderedList':
          return content;
        case 'listItem':
          return `- ${content.replace(/\n\n$/, '\n')}`;
        case 'hardBreak':
          return '  \n';
        default:
          return content;
      }
    }

    return '';
  }
  
  /**
   * Load content into editor - handles both legacy JSON and new Markdown formats
   * This is the key backwards compatibility function with mention parsing
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
      // Check if markdown content has mentions
      const hasMentions = /@\w+(?:#[a-fA-F0-9]+)?/g.test(content);
      
      if (hasMentions) {
        // Pre-process markdown to convert @username patterns to mention placeholders
        const processedContent = this.preprocessMentionsInMarkdown(content);
        
        // Load the processed markdown
        const parseOpts = {
          parseOptions: {
            preserveWhitespace: 'full',
            from: 'markdown',
          },
        } as unknown as Parameters<typeof editor.commands.setContent>[2];
        
        (editor.commands.setContent as unknown as (content: string, emitUpdate?: boolean, parseOptions?: typeof parseOpts) => void)(processedContent, undefined, parseOpts);
        
        // Post-process to convert mention placeholders to actual mention nodes
        this.postProcessMentions(editor);
        
        console.log('[MarkdownUtils] Loaded Markdown content with mentions');
      } else {
        // Load regular markdown content
        const parseOpts = {
          parseOptions: {
            preserveWhitespace: 'full',
            from: 'markdown',
          },
        } as unknown as Parameters<typeof editor.commands.setContent>[2];
        
        (editor.commands.setContent as unknown as (content: string, emitUpdate?: boolean, parseOptions?: typeof parseOpts) => void)(content, undefined, parseOpts);
        console.log('[MarkdownUtils] Loaded Markdown content');
      }
    }
  }

  /**
   * Pre-process markdown to replace @username patterns with mention placeholders
   */
  private static preprocessMentionsInMarkdown(content: string): string {
    // Replace @username patterns with special placeholders that won't be processed as markdown
    return content.replace(/@(\w+(?:#[a-fA-F0-9]+)?)/g, '{{MENTION:$1}}');
  }

  /**
   * Post-process editor content to convert mention placeholders to actual mention nodes
   */
  private static postProcessMentions(editor: Editor): void {
    const { state, dispatch } = editor.view;
    const { tr } = state;
    let modified = false;

    // Find and replace mention placeholders
    state.doc.descendants((node, pos) => {
      if (node.type.name === 'text' && node.text) {
        const mentionPattern = /\{\{MENTION:(\w+(?:#[a-fA-F0-9]+)?)\}\}/g;
        let match;
        const replacements: Array<{ from: number; to: number; username: string }> = [];

        while ((match = mentionPattern.exec(node.text)) !== null) {
          replacements.push({
            from: pos + match.index,
            to: pos + match.index + match[0].length,
            username: match[1]
          });
        }

        // Apply replacements in reverse order to maintain positions
        replacements.reverse().forEach(({ from, to, username }) => {
          const mentionNode = state.schema.nodes.mention?.create({
            id: username,
            label: username.split('#')[0] // Remove the # suffix for display
          });

          if (mentionNode) {
            tr.replaceWith(from, to, mentionNode);
            modified = true;
          }
        });
      }
    });

    if (modified) {
      dispatch(tr);
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
        .replace(/@(\w+)(?:#[a-fA-F0-9]+)?/g, '@$1') // Simplify mentions for preview
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
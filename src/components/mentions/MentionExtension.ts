import { mergeAttributes, Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import Suggestion from '@tiptap/suggestion';
import { MentionNode } from './MentionNode';
import { mentionSuggestion } from './mentionSuggestion';

export interface MentionOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  HTMLAttributes: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  suggestion: Omit<any, 'editor'>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mention: {
      insertMention: (options: { id: string; label: string }) => ReturnType;
    };
  }
}

export const MentionExtension = Node.create<MentionOptions>({
  name: 'mention',

  addOptions() {
    return {
      HTMLAttributes: {},
      suggestion: mentionSuggestion,
    };
  },

  group: 'inline',

  inline: true,

  selectable: false,

  atom: true,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: element => element.getAttribute('data-mention-id'),
        renderHTML: attributes => {
          if (!attributes.id) {
            return {};
          }
          return {
            'data-mention-id': attributes.id,
          };
        },
      },
      label: {
        default: null,
        parseHTML: element => element.getAttribute('data-mention-label'),
        renderHTML: attributes => {
          if (!attributes.label) {
            return {};
          }
          return {
            'data-mention-label': attributes.label,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-mention-id]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(
        { 'data-mention-id': HTMLAttributes.id, 'data-mention-label': HTMLAttributes.label },
        this.options.HTMLAttributes,
        HTMLAttributes
      ),
      `@${HTMLAttributes.label}`,
    ];
  },

  renderText({ node }) {
    // This is used for markdown serialization
    return `@${node.attrs.label}`;
  },

  addNodeView() {
    return ReactNodeViewRenderer(MentionNode);
  },

  addCommands() {
    return {
      insertMention:
        (options) =>
        ({ editor, tr }) => {
          const { id, label } = options;
          const mention = editor.schema.nodes.mention.create({ id, label });
          tr.replaceSelectionWith(mention);
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
}); 
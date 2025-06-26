import { ReactRenderer } from '@tiptap/react';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import { SuggestionOptions, SuggestionProps } from '@tiptap/suggestion';
import { MentionSuggestionWrapper } from './MentionSuggestionWrapper';
import { MentionListRef } from './MentionList';

let component: ReactRenderer<MentionListRef> | null = null;
let popup: TippyInstance | null = null;

export const mentionSuggestion: Omit<SuggestionOptions, 'editor'> = {
  char: '@',
  allowedPrefixes: [' ', '\n'],
  
  command: ({ editor, range, props }) => {
    // Insert the mention with proper formatting
    editor
      .chain()
      .focus()
      .insertContentAt(range, [
        {
          type: 'mention',
          attrs: props,
        },
        {
          type: 'text',
          text: ' ',
        },
      ])
      .run();
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: async (): Promise<any[]> => {
    // Return empty array - search is handled by the wrapper component
    return [];
  },

  render: () => {
    return {
      onStart: (props: SuggestionProps) => {
        component = new ReactRenderer(MentionSuggestionWrapper, {
          props,
          editor: props.editor,
        });

        if (!props.clientRect) {
          return;
        }

        // Create a temporary element for tippy positioning
        const dummyElement = document.createElement('div');
        
        popup = tippy(dummyElement, {
          getReferenceClientRect: () => {
            const rect = props.clientRect?.();
            return rect || { 
              width: 0, 
              height: 0, 
              top: 0, 
              right: 0, 
              bottom: 0, 
              left: 0,
              x: 0,
              y: 0,
              toJSON: () => ({})
            } as DOMRect;
          },
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
          theme: 'light-border',
          maxWidth: 'none',
          offset: [0, 4],
          zIndex: 9999,
        });
      },

      onUpdate: (props: SuggestionProps) => {
        if (!component || !popup) return;

        component.updateProps(props);

        if (!props.clientRect) {
          return;
        }

        popup.setProps({
          getReferenceClientRect: () => {
            const rect = props.clientRect?.();
            return rect || { 
              width: 0, 
              height: 0, 
              top: 0, 
              right: 0, 
              bottom: 0, 
              left: 0,
              x: 0,
              y: 0,
              toJSON: () => ({})
            } as DOMRect;
          },
        });
      },

      onKeyDown: (props: { event: KeyboardEvent }) => {
        if (props.event.key === 'Escape') {
          popup?.hide();
          return true;
        }

        if (!component?.ref) {
          return false;
        }

        return component.ref.onKeyDown(props);
      },

      onExit: () => {
        popup?.destroy();
        component?.destroy();
        popup = null;
        component = null;
      },
    };
  },
}; 
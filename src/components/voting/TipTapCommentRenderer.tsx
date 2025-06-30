'use client';

import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import TiptapLink from '@tiptap/extension-link';
import TiptapImage from '@tiptap/extension-image';
import { MarkdownUtils } from '@/utils/markdownUtils';
import { MentionExtension } from '@/components/mentions/MentionExtension';

const lowlight = createLowlight(common);

interface TipTapCommentRendererProps {
  content: string;
  buildInternalUrl: (path: string, additionalParams?: Record<string, string>) => string;
  router: AppRouterInstance;
}

const TipTapCommentRenderer: React.FC<TipTapCommentRendererProps> = React.memo(({
  content,
  buildInternalUrl,
  router
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [3, 4] },
        codeBlock: false,
      }),
      TiptapLink.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'break-words max-w-full overflow-wrap-anywhere word-break-break-all hyphens-auto',
          style: 'word-wrap: break-word; overflow-wrap: anywhere; word-break: break-word; max-width: 100%; white-space: normal;',
        },
      }),
      TiptapImage,
      CodeBlockLowlight.configure({ lowlight }),
      Markdown.configure({ html: false, tightLists: true }),
      MentionExtension,
    ],
    content: '',
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: {},
    },
  });

  React.useEffect(() => {
    if (editor && content) {
      MarkdownUtils.loadContent(editor, content);
    }
  }, [editor, content]);

  React.useEffect(() => {
    if (!editor) return;

    const editorElement = editor.view.dom;
    if (!editorElement) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const anchor = target.closest('a');

      if (anchor && anchor.href) {
        const href = anchor.href;
        if (href.startsWith('/')) {
          event.preventDefault();
          const urlWithParams = buildInternalUrl(href);
          router.push(urlWithParams);
        }
      }
    };

    editorElement.addEventListener('click', handleClick);

    return () => {
      editorElement.removeEventListener('click', handleClick);
    };
  }, [editor, router, buildInternalUrl]);

  if (!editor) {
    return (
      <div className="space-y-2 animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5"></div>
      </div>
    );
  }

  return (
    <article 
      className="prose dark:prose-invert prose-sm max-w-none break-words prose-a:break-words prose-a:max-w-full prose-a:overflow-wrap-anywhere prose-a:word-break-break-all prose-a:hyphens-auto prose-p:break-words prose-p:overflow-wrap-anywhere prose-code:break-words prose-code:overflow-wrap-anywhere"
      style={{ wordWrap: 'break-word', overflowWrap: 'anywhere', wordBreak: 'break-word' }}
    >
      <EditorContent editor={editor} />
    </article>
  );
});

TipTapCommentRenderer.displayName = 'TipTapCommentRenderer';

export default TipTapCommentRenderer;
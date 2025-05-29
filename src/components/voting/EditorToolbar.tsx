'use client';

import React from 'react'; // Added React import for React.ElementType
import { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Link as LinkIcon,
  Image as ImageIcon,
  Code,
  Quote,
  Heading2, // Corresponds to Heading level 2
  List, // For BulletList
  ListOrdered // For OrderedList
} from 'lucide-react';

interface EditorToolbarProps { // Changed from Props to avoid conflict if Props is used elsewhere
    editor: Editor | null;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor }) => {
  if (!editor) return null;

  // Helper to create toolbar buttons
  const ToolbarButton = (
    {
      onClick,
      isActive,
      icon: Icon,
      ariaLabel,
      title,
      disabled = false // Allow individual buttons to be disabled
    }: {
      onClick: () => void;
      isActive: boolean;
      icon: React.ElementType;
      ariaLabel: string;
      title?: string;
      disabled?: boolean;
    }
  ) => (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={title || ariaLabel}
      disabled={disabled || !editor.isEditable} // Also disable if editor is not editable
      className={`p-2 rounded-md hover:bg-muted/70 disabled:opacity-50 ${
        isActive ? 'bg-muted text-primary' : 'text-muted-foreground'
      }`}
    >
      <Icon size={18} />
    </button>
  );

  const handleLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL', previousUrl || 'https://');
    if (url === null) return; // User cancelled
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const handleImage = () => {
    const src = window.prompt('Enter image URL');
    if (src) {
      editor.chain().focus().setImage({ src }).run();
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1 border rounded-md p-1 bg-background">
      <ToolbarButton 
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        icon={Bold} 
        ariaLabel='Toggle bold' 
        title='Bold (Ctrl+B)'
        disabled={!editor.can().chain().focus().toggleBold().run()} />
      <ToolbarButton 
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        icon={Italic} 
        ariaLabel='Toggle italic' 
        title='Italic (Ctrl+I)'
        disabled={!editor.can().chain().focus().toggleItalic().run()} />
      <ToolbarButton 
        onClick={handleLink} 
        isActive={editor.isActive('link')} 
        icon={LinkIcon} 
        ariaLabel='Set link' 
        title='Link (Ctrl+K)'
        disabled={!editor.can().chain().focus().toggleLink({href: ''}).run()} />
      <ToolbarButton 
        onClick={handleImage} 
        isActive={editor.isActive('image')} 
        icon={ImageIcon} 
        ariaLabel='Insert image'
        disabled={!editor.can().chain().focus().setImage({src: ''}).run()} />
      <ToolbarButton 
        onClick={() => editor.chain().focus().toggleCodeBlock({ language: 'plaintext' }).run()}
        isActive={editor.isActive('codeBlock')}
        icon={Code} 
        ariaLabel='Toggle code block' 
        title='Code Block'
        disabled={!editor.can().chain().focus().toggleCodeBlock().run()} />
      <ToolbarButton 
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        icon={Quote} 
        ariaLabel='Toggle blockquote' 
        title='Blockquote'
        disabled={!editor.can().chain().focus().toggleBlockquote().run()} />
      <ToolbarButton 
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        icon={Heading2} 
        ariaLabel='Toggle H2 heading' 
        title='Heading 2'
        disabled={!editor.can().chain().focus().toggleHeading({ level: 2 }).run()} />
      <ToolbarButton 
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        icon={List} 
        ariaLabel='Toggle bullet list' 
        title='Bullet List'
        disabled={!editor.can().chain().focus().toggleBulletList().run()} />
      <ToolbarButton 
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        icon={ListOrdered} 
        ariaLabel='Toggle ordered list' 
        title='Ordered List'
        disabled={!editor.can().chain().focus().toggleOrderedList().run()} />
      {/* Add more buttons as needed, e.g., for other heading levels, strikethrough, etc. */}
    </div>
  );
}; 